"use client";

import { useRef, useState } from "react";
import {
  TACHO_DOWNLOAD_CREDITS_UUID,
  TACHO_DOWNLOAD_FIFO_UUID,
  TACHO_DOWNLOAD_SERVICE_UUID,
} from "../../lib/tacho-ble.js";
import {
  DDP_REQUEST_TRANSFER_EXIT,
  DDP_REQUEST_UPLOAD,
  DDP_START_COMMUNICATION_REQUEST,
  DDP_START_DIAGNOSTIC_SESSION_REQUEST,
  DDP_STOP_COMMUNICATION_REQUEST,
  createItsMessageAssembler,
  pushItsPacket,
} from "../../lib/tacho-download.js";
import {
  DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION,
  DDP_REQUEST_GEN2V2_OVERVIEW,
  classifyDdpResponse,
  createDdpTransferAssembler,
  parseDownloadInterfaceVersion,
  pushDdpTransferMessage,
} from "../../lib/tacho-history-overview-probe.js";

type BleCharacteristic = {
  uuid: string;
  value?: DataView | null;
  properties?: { write?: boolean; writeWithoutResponse?: boolean };
  startNotifications: () => Promise<BleCharacteristic>;
  writeValueWithResponse?: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  writeValue?: (value: BufferSource) => Promise<void>;
  addEventListener: (type: "characteristicvaluechanged", listener: (event: Event) => void) => void;
};

type BleService = { uuid: string; getCharacteristics: () => Promise<BleCharacteristic[]> };
type BleServer = { getPrimaryServices: () => Promise<BleService[]> };
type BleDevice = { name?: string; gatt?: { connect: () => Promise<BleServer> } };
type LogEntry = { time: string; level: "info" | "pass" | "warn" | "fail"; message: string };
type DdpClassification = ReturnType<typeof classifyDdpResponse>;
type SimpleResult = { message: number[]; classification: DdpClassification };
type CreditWaiter = { resolve: () => void; reject: (error: Error) => void; timer: number };

const APP_VERSION = "0.32b-gen2v2-overview-credit-safe";
const SOURCE_BASELINE = "b65c610e9bae6402c9c1acec2c27027bb48c9d74";
const DDP_P3_GUARD_MS = 100;
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const createStopError = () => {
  const error = new Error("Sesija je prekinuta od korisnika.");
  error.name = "AbortError";
  return error;
};

const writeGatt = async (characteristic: BleCharacteristic, bytes: number[]) => {
  const value = Uint8Array.from(bytes);
  if (characteristic.properties?.write && characteristic.writeValueWithResponse) {
    return characteristic.writeValueWithResponse(value);
  }
  if (characteristic.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
    return characteristic.writeValueWithoutResponse(value);
  }
  if (characteristic.writeValue) return characteristic.writeValue(value);
  if (characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
  if (characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
  throw new Error("Write metoda nije dostupna na karakteristici");
};

export default function HistoryOverviewProbeClient() {
  const [running, setRunning] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [downloadVersion, setDownloadVersion] = useState("—");
  const [overviewSummary, setOverviewSummary] = useState("—");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const creditsRef = useRef<BleCharacteristic | null>(null);
  const gattWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stopRequestedRef = useRef(false);
  const abortCurrentRef = useRef<(() => void) | null>(null);

  const queueGattWrite = (characteristic: BleCharacteristic, bytes: number[]) => {
    const operation = gattWriteQueueRef.current
      .catch(() => {})
      .then(() => writeGatt(characteristic, bytes));
    gattWriteQueueRef.current = operation.catch(() => {});
    return operation;
  };

  const addLog = (level: LogEntry["level"], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((previous) => [{ time, level, message }, ...previous.slice(0, 99)]);
  };

  const stopProbe = () => {
    if (!running || stopRequestedRef.current) return;
    stopRequestedRef.current = true;
    addLog("info", "Prekid zatražen. Ne šaljem nove test zahteve; zatvaram aktivnu sesiju.");
    abortCurrentRef.current?.();
  };

  const runProbe = async () => {
    setLogs([]);
    setDownloadVersion("—");
    setOverviewSummary("—");
    setRunning(true);
    stopRequestedRef.current = false;
    abortCurrentRef.current = null;
    creditsRef.current = null;
    gattWriteQueueRef.current = Promise.resolve();

    let communicationStarted = false;
    let uploadStarted = false;
    let lastVuResponseAt = 0;
    let serverCredits = 0;
    let peerClosed = false;
    const creditWaiters: CreditWaiter[] = [];
    let messageHandler: ((message: number[]) => void) | null = null;

    const requireNotStopped = () => {
      if (stopRequestedRef.current) throw createStopError();
    };

    const rejectCreditWaiters = (error: Error) => {
      while (creditWaiters.length) {
        const waiter = creditWaiters.shift();
        if (!waiter) continue;
        window.clearTimeout(waiter.timer);
        waiter.reject(error);
      }
    };

    const releaseCreditWaiters = () => {
      while (serverCredits > 0 && creditWaiters.length > 0) {
        const waiter = creditWaiters.shift();
        if (!waiter) continue;
        serverCredits -= 1;
        window.clearTimeout(waiter.timer);
        waiter.resolve();
      }
    };

    const consumeServerCredit = async (timeoutMs = 5000) => {
      if (peerClosed) throw new Error("Tahograf je zatvorio Download flow control");
      if (serverCredits > 0) {
        serverCredits -= 1;
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const waiter: CreditWaiter = {
          resolve,
          reject,
          timer: window.setTimeout(() => {
            const index = creditWaiters.indexOf(waiter);
            if (index >= 0) creditWaiters.splice(index, 1);
            reject(new Error("Download server credit timeout"));
          }, timeoutMs),
        };
        creditWaiters.push(waiter);
      });
    };

    try {
      const bluetooth = (navigator as Navigator & {
        bluetooth?: {
          requestDevice: (options: {
            acceptAllDevices: boolean;
            optionalServices: readonly string[];
          }) => Promise<BleDevice>;
        };
      }).bluetooth;
      if (!bluetooth) throw new Error("Web Bluetooth nije podržan. Koristite Chrome na Android telefonu.");

      addLog("info", "Otvaram Bluetooth izbor uređaja za Download servis...");
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [TACHO_DOWNLOAD_SERVICE_UUID],
      });
      requireNotStopped();
      setDeviceName(device.name || "Tahograf");
      if (!device.gatt) throw new Error("GATT interfejs nije dostupan");

      const server = await device.gatt.connect();
      requireNotStopped();
      const services = await server.getPrimaryServices();
      requireNotStopped();
      const downloadService = services.find(
        (service) => service.uuid.toLowerCase() === TACHO_DOWNLOAD_SERVICE_UUID.toLowerCase(),
      );
      if (!downloadService) throw new Error("Smart Tacho Download servis nije pronađen");

      const characteristics = await downloadService.getCharacteristics();
      requireNotStopped();
      const fifo = characteristics.find(
        (characteristic) => characteristic.uuid.toLowerCase() === TACHO_DOWNLOAD_FIFO_UUID.toLowerCase(),
      );
      const credits = characteristics.find(
        (characteristic) => characteristic.uuid.toLowerCase() === TACHO_DOWNLOAD_CREDITS_UUID.toLowerCase(),
      );
      if (!fifo || !credits) throw new Error("Download FIFO/Credits karakteristike nisu pronađene");
      creditsRef.current = credits;

      const itsAssembler = createItsMessageAssembler();

      credits.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength) return;
        const value = view.getUint8(0);
        if (value === 0xff) {
          peerClosed = true;
          const error = new Error("Tahograf je zatvorio Download flow control");
          rejectCreditWaiters(error);
          abortCurrentRef.current?.();
          return;
        }
        if (value === 0) return;
        serverCredits += value;
        addLog("info", `Server credit +${value}; dostupno ${serverCredits}.`);
        releaseCreditWaiters();
      });

      fifo.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength) return;
        const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
        void queueGattWrite(credits, [1]).catch(() => {});
        const assembled = pushItsPacket(itsAssembler, packet);
        if (assembled.status === "invalid") {
          addLog("fail", `ITS paket nije validan: ${assembled.reason ?? "unknown"}`);
          abortCurrentRef.current?.();
          return;
        }
        if (assembled.status !== "complete" || !assembled.message) return;
        messageHandler?.(Array.from(assembled.message));
      });

      await credits.startNotifications();
      requireNotStopped();
      await fifo.startNotifications();
      requireNotStopped();
      await queueGattWrite(credits, [1]);
      addLog("pass", "Download BLE FIFO/Credits indikacije su uključene; dodeljen je prvi client credit.");

      const waitP3 = async (ignoreStop = false) => {
        if (!ignoreStop) requireNotStopped();
        if (lastVuResponseAt <= 0) return;
        const remaining = DDP_P3_GUARD_MS - (performance.now() - lastVuResponseAt);
        if (remaining > 0) await sleep(remaining);
        if (!ignoreStop) requireNotStopped();
      };

      const sendApplicationMessage = async (message: readonly number[], ignoreStop = false) => {
        await waitP3(ignoreStop);
        await consumeServerCredit();
        if (!ignoreStop) requireNotStopped();
        await queueGattWrite(fifo, [1, 1, ...message]);
      };

      const sendSimple = (
        message: readonly number[],
        requestSid: number,
        expectedTrep: number | null = null,
        timeoutMs = 7000,
        ignoreStop = false,
      ) => {
        if (messageHandler) return Promise.reject(new Error("Paralelni DDP zahtev nije dozvoljen"));
        return new Promise<SimpleResult | null>((resolve, reject) => {
          let settled = false;
          let timer = 0;
          const cleanup = () => {
            window.clearTimeout(timer);
            if (messageHandler === handler) messageHandler = null;
            abortCurrentRef.current = null;
          };
          const finishResolve = (result: SimpleResult | null) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(result);
          };
          const finishReject = (error: Error) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error);
          };
          const armTimer = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => finishResolve(null), timeoutMs);
          };
          const handler = (response: number[]) => {
            const classification = classifyDdpResponse(response, requestSid, expectedTrep);
            if (!classification.valid) {
              finishReject(new Error(`DDP odgovor nije validan: ${classification.reason ?? "unknown"}`));
              return;
            }
            if (!classification.matches) return;
            lastVuResponseAt = performance.now();
            if (classification.responsePending) {
              addLog("info", `DDP SID 0x${requestSid.toString(16).toUpperCase()} je RESPONSE PENDING; čekam završni odgovor.`);
              armTimer();
              return;
            }
            finishResolve({ message: response, classification });
          };
          messageHandler = handler;
          abortCurrentRef.current = () => finishReject(createStopError());
          armTimer();
          void sendApplicationMessage(message, ignoreStop).catch(finishReject);
        });
      };

      const sendOverview = (timeoutMs = 10000) => {
        if (messageHandler) return Promise.reject(new Error("Paralelni DDP zahtev nije dozvoljen"));
        const transferAssembler = createDdpTransferAssembler(0x31);
        return new Promise<{ submessages: number; payloadBytes: number } | null>((resolve, reject) => {
          let settled = false;
          let timer = 0;
          const cleanup = () => {
            window.clearTimeout(timer);
            if (messageHandler === handler) messageHandler = null;
            abortCurrentRef.current = null;
          };
          const finishResolve = (result: { submessages: number; payloadBytes: number } | null) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(result);
          };
          const finishReject = (error: Error) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error);
          };
          const armTimer = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => finishResolve(null), timeoutMs);
          };
          const handler = (response: number[]) => {
            const result = pushDdpTransferMessage(transferAssembler, response);
            if (result.status === "ignored") return;
            lastVuResponseAt = performance.now();
            if (result.status === "response-pending") {
              addLog("info", "DDP Overview je RESPONSE PENDING; čekam bez retransmisije.");
              armTimer();
              return;
            }
            if (result.status === "negative") {
              const nrc = Number(result.negativeResponseCode ?? 0).toString(16).padStart(2, "0").toUpperCase();
              finishReject(new Error(`DDP Overview: NRC 0x${nrc}`));
              return;
            }
            if (result.status === "invalid") {
              finishReject(new Error(`DDP Overview nije validan: ${result.reason ?? "unknown"}`));
              return;
            }
            if (result.status === "pending" && result.ack) {
              addLog("info", `Overview submessage ${result.submessages} potvrđen; šaljem ACK za sledeći brojač.`);
              armTimer();
              void sendApplicationMessage(result.ack).catch(finishReject);
              return;
            }
            if (result.status === "complete") {
              finishResolve({ submessages: result.submessages, payloadBytes: result.payloadBytes });
            }
          };
          messageHandler = handler;
          abortCurrentRef.current = () => finishReject(createStopError());
          armTimer();
          void sendApplicationMessage(DDP_REQUEST_GEN2V2_OVERVIEW).catch(finishReject);
        });
      };

      const requirePositive = (label: string, result: SimpleResult | null) => {
        if (!result) throw new Error(`${label}: TIMEOUT`);
        if (result.classification.negative) {
          const nrc = Number(result.classification.negativeResponseCode ?? 0)
            .toString(16).padStart(2, "0").toUpperCase();
          throw new Error(`${label}: NRC 0x${nrc}`);
        }
        if (!result.classification.positive) throw new Error(`${label}: neočekivan odgovor`);
        addLog("pass", `${label}: POSITIVE.`);
        return result;
      };

      requirePositive("DDP StartCommunication", await sendSimple(DDP_START_COMMUNICATION_REQUEST, 0x81));
      communicationStarted = true;
      requireNotStopped();

      requirePositive(
        "DDP StartDiagnosticSession 0x81",
        await sendSimple(DDP_START_DIAGNOSTIC_SESSION_REQUEST, 0x10),
      );
      requireNotStopped();

      requirePositive("DDP RequestUpload", await sendSimple(DDP_REQUEST_UPLOAD, 0x35));
      uploadStarted = true;
      requireNotStopped();

      const versionResult = requirePositive(
        "DDP DownloadInterfaceVersion TREP 00",
        await sendSimple(DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION, 0x36, 0x00),
      );
      const parsedVersion = parseDownloadInterfaceVersion(versionResult.message);
      if (!parsedVersion.valid) throw new Error("DownloadInterfaceVersion payload nije validan");
      const versionLabel = `Gen ${parsedVersion.generation} / v${parsedVersion.version}`;
      setDownloadVersion(versionLabel);
      if (parsedVersion.generation !== 2 || parsedVersion.version !== 2) {
        throw new Error(`0.32b zahteva Gen2v2; tahograf je vratio ${versionLabel}`);
      }
      addLog("pass", `DownloadInterfaceVersion potvrđen: ${versionLabel}.`);
      requireNotStopped();

      const overview = await sendOverview();
      if (!overview) throw new Error("DDP Gen2v2 Overview TREP 31: TIMEOUT");
      setOverviewSummary(`${overview.submessages} submessage · ${overview.payloadBytes} B payload`);
      addLog(
        "pass",
        `Gen2v2 Overview TREP 31 potvrđen: ${overview.submessages} submessage, ${overview.payloadBytes} B. Sadržaj nije sačuvan niti prikazan.`,
      );

      requirePositive("DDP RequestTransferExit", await sendSimple(DDP_REQUEST_TRANSFER_EXIT, 0x37));
      uploadStarted = false;
      requireNotStopped();

      requirePositive("DDP StopCommunication", await sendSimple(DDP_STOP_COMMUNICATION_REQUEST, 0x82));
      communicationStarted = false;

      addLog("pass", "0.32b je potvrdio Gen2v2 Overview putanju bez Card Download TREP 06.");
    } catch (error) {
      const stoppedByUser = error instanceof Error && error.name === "AbortError";
      addLog(stoppedByUser ? "info" : "fail", error instanceof Error ? error.message : String(error));
      messageHandler = null;
      abortCurrentRef.current = null;
      stopRequestedRef.current = false;

      const recoverySimple = async (message: readonly number[], requestSid: number, label: string) => {
        try {
          const result = await (async () => {
            const currentMessageHandler = messageHandler;
            if (currentMessageHandler) messageHandler = null;
            return sendSimple(message, requestSid, null, 3000, true);
          })();
          if (result?.classification.positive) addLog("info", `Recovery: ${label} potvrđen.`);
          else addLog("warn", `Recovery: ${label} nije potvrđen.`);
        } catch {
          addLog("warn", `Recovery: ${label} nije potvrđen.`);
        }
      };

      if (uploadStarted && !peerClosed) await recoverySimple(DDP_REQUEST_TRANSFER_EXIT, 0x37, "RequestTransferExit");
      if (communicationStarted && !peerClosed) await recoverySimple(DDP_STOP_COMMUNICATION_REQUEST, 0x82, "StopCommunication");
    } finally {
      abortCurrentRef.current = null;
      messageHandler = null;
      rejectCreditWaiters(new Error("Sesija je završena"));
      stopRequestedRef.current = false;
      if (creditsRef.current) {
        try {
          await queueGattWrite(creditsRef.current, [0xff]);
        } catch {}
      }
      creditsRef.current = null;
      setRunning(false);
    }
  };

  const copyLog = async () => {
    const text = [...logs]
      .reverse()
      .map((entry) => `[${entry.time}] ${entry.level.toUpperCase()}: ${entry.message}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>TachoCommand 0.32b</h1>
      <p style={{ marginTop: 0, opacity: 0.72 }}>Gen2v2 Overview probe · credit-safe · bez driver-card download-a</p>

      <section style={{ padding: 16, border: "1px solid #5555", borderRadius: 14, marginBottom: 16 }}>
        <p><strong>Uređaj:</strong> {deviceName}</p>
        <p><strong>Download interface:</strong> {downloadVersion}</p>
        <p><strong>Overview:</strong> {overviewSummary}</p>
        <p><strong>Build:</strong> {APP_VERSION}</p>
        <p style={{ fontSize: 13, opacity: 0.72 }}><strong>Source:</strong> {SOURCE_BASELINE}</p>
        <p style={{ fontSize: 13 }}>
          Ovaj probe šalje samo DDP setup, TREP 00 i Gen2v2 Overview TREP 31. Ne šalje Card Download TREP 06,
          ne pravi .DDD fajl i ne čuva niti prikazuje Overview payload.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button disabled={running} onClick={() => void runProbe()} style={{ padding: "10px 14px" }}>
            {running ? "Test u toku…" : "Pokreni 0.32b probe"}
          </button>
          <button disabled={!running} onClick={stopProbe} style={{ padding: "10px 14px" }}>Prekini sesiju</button>
          <button disabled={!logs.length} onClick={() => void copyLog()} style={{ padding: "10px 14px" }}>Kopiraj log</button>
        </div>
      </section>

      <section>
        <h2>Log</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {logs.length === 0 ? <p style={{ opacity: 0.65 }}>Još nema događaja.</p> : logs.map((entry, index) => (
            <div key={`${entry.time}-${index}`} style={{ padding: 10, border: "1px solid #5554", borderRadius: 10 }}>
              <strong>{entry.level.toUpperCase()}</strong> · {entry.time}<br />{entry.message}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
