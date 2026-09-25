import {
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "./tacho-ble.js";
import { createUdsResponseCollector } from "./tacho-uds.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeUuid(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function writeGatt(characteristic, bytes) {
  const value = Uint8Array.from(bytes);
  if (characteristic?.properties?.write && characteristic.writeValueWithResponse) {
    return characteristic.writeValueWithResponse(value);
  }
  if (characteristic?.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
    return characteristic.writeValueWithoutResponse(value);
  }
  if (characteristic?.writeValue) return characteristic.writeValue(value);
  if (characteristic?.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
  if (characteristic?.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
  throw new Error("Write metoda nije dostupna na karakteristici");
}

export async function openAppV2FieldTransport({
  bluetooth,
  timeoutMs = 4000,
  settleMs = 1000,
} = {}) {
  if (!bluetooth || typeof bluetooth.requestDevice !== "function") {
    throw new Error("Web Bluetooth nije dostupan.");
  }

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [...TACHO_OPTIONAL_SERVICE_UUIDS, 0x180a],
  });
  if (!device?.gatt) throw new Error("GATT interfejs nije dostupan");

  const connectStarted = performance.now();
  const server = await device.gatt.connect();
  const connectDurationMs = Math.round(performance.now() - connectStarted);
  const services = await server.getPrimaryServices();
  const deviceInformation = {};
  const informationService = services.find((service) => normalizeUuid(service.uuid) === "0000180a-0000-1000-8000-00805f9b34fb");
  if (informationService) {
    for (const [key, uuid] of Object.entries({
      manufacturer: 0x2a29,
      model: 0x2a24,
      serialNumber: 0x2a25,
      firmware: 0x2a26,
    })) {
      try {
        const characteristic = await informationService.getCharacteristic(uuid);
        const value = await characteristic.readValue();
        const decoded = new TextDecoder().decode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)).replace(/[\x00-\x1f\x7f]/g, "").trim();
        if (decoded) deviceInformation[key] = decoded.slice(0, 96);
      } catch {
        // Device Information characteristics are optional.
      }
    }
  }
  const diagnostics = services.find(
    (service) => normalizeUuid(service.uuid) === normalizeUuid(TACHO_DIAGNOSTICS_SERVICE_UUID),
  );
  if (!diagnostics) throw new Error("Smart Tacho Diagnostics servis nije pronađen");

  const characteristics = await diagnostics.getCharacteristics();
  const fifo = characteristics.find(
    (characteristic) => normalizeUuid(characteristic.uuid) === normalizeUuid(TACHO_DIAGNOSTICS_FIFO_UUID),
  );
  const credits = characteristics.find(
    (characteristic) => normalizeUuid(characteristic.uuid) === normalizeUuid(TACHO_DIAGNOSTICS_CREDITS_UUID),
  );
  if (!fifo || !credits) throw new Error("FIFO/Credits karakteristike nisu pronađene");

  let writeQueue = Promise.resolve();
  const queueWrite = (characteristic, bytes) => {
    const operation = writeQueue.catch(() => {}).then(() => writeGatt(characteristic, bytes));
    writeQueue = operation.catch(() => {});
    return operation;
  };

  let pendingRequest = null;
  let creditResolver = null;
  let closed = false;

  fifo.addEventListener("characteristicvaluechanged", (event) => {
    const view = event?.target?.value;
    if (!view?.byteLength) return;
    const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));

    void queueWrite(credits, [1]).catch(() => {});

    if (!pendingRequest) return;
    const result = pendingRequest.collector.push(packet);
    if (result.status === "complete") {
      const request = pendingRequest;
      pendingRequest = null;
      request.resolve(Array.from(result.response ?? []));
    } else if (result.status === "invalid") {
      const request = pendingRequest;
      pendingRequest = null;
      request.reject(new Error("ITS paket nije validan: " + String(result.reason ?? "unknown")));
    }
  });

  credits.addEventListener("characteristicvaluechanged", (event) => {
    const view = event?.target?.value;
    if (!view?.byteLength || !creditResolver) return;
    const resolve = creditResolver;
    creditResolver = null;
    resolve(view.getUint8(0));
  });

  await credits.startNotifications();
  await fifo.startNotifications();

  const serverCreditPromise = new Promise((resolve) => {
    creditResolver = resolve;
  });
  await queueWrite(credits, [1]);
  const serverCredit = await Promise.race([
    serverCreditPromise,
    sleep(timeoutMs).then(() => null),
  ]);
  creditResolver = null;

  if (serverCredit === null) throw new Error("Server credit timeout");
  if (serverCredit === 0xff) throw new Error("Tahograf je odbio flow control");

  const sendUds = async (payload, requestTimeoutMs = timeoutMs) => {
    if (closed) throw new Error("Field transport je zatvoren");
    if (pendingRequest) throw new Error("Paralelni UDS zahtev nije dozvoljen");

    const collector = createUdsResponseCollector(payload);
    return new Promise((resolve, reject) => {
      let completed = false;
      const timer = setTimeout(() => {
        if (pendingRequest?.collector === collector) pendingRequest = null;
        if (completed) return;
        completed = true;
        resolve(null);
      }, requestTimeoutMs);

      const finishResolve = (response) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        resolve(response);
      };
      const finishReject = (error) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        reject(error);
      };

      pendingRequest = {
        collector,
        resolve: finishResolve,
        reject: finishReject,
      };

      queueWrite(fifo, [1, 1, ...payload]).catch((error) => {
        if (pendingRequest?.collector === collector) pendingRequest = null;
        finishReject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  };

  const handshakeStarted = performance.now();
  const testerPresent = await sendUds([0x3e, 0x00], timeoutMs);
  if (!testerPresent || testerPresent[2] !== 0x7e) {
    throw new Error("TesterPresent nije dobio pozitivan odgovor");
  }
  const handshakeDurationMs = Math.round(performance.now() - handshakeStarted);

  if (settleMs > 0) await sleep(settleMs);

  const close = async () => {
    if (closed) return;
    closed = true;
    pendingRequest = null;
    creditResolver = null;
    try {
      await queueWrite(credits, [0xff]);
    } catch {}
    try {
      device.gatt.disconnect?.();
    } catch {}
  };

  return Object.freeze({
    deviceLabel: device.name || "Tahograf",
    deviceInformation: Object.freeze(deviceInformation),
    connectDurationMs,
    handshakeDurationMs,
    isConnected: () => Boolean(device.gatt?.connected),
    sendUds,
    close,
  });
}


export function openBrowserAppV2FieldTransport(options = {}) {
  const bluetooth = typeof navigator === "undefined" ? null : navigator.bluetooth;
  return openAppV2FieldTransport({
    ...options,
    bluetooth,
  });
}
