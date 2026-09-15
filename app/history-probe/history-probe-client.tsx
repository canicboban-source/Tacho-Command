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
  classifyDdpResponse,
  parseDownloadInterfaceVersion,
} from "../../lib/tacho-history-probe.js";

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
type DdpResult = { message: number[]; classification: DdpClassification };
type PendingDdp = {
  requestSid: number;
  expectedTrep: number | null;
  resolve: (result: DdpResult | null) => void;
  reject: (error: Error) => void;
};

const APP_VERSION = "0.32a-download-path-probe-p3-stop-control";
const SOURCE_BASELINE = "ba241d2048a2c4e6dd547b1fd1469b6bd03362fb";
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

export default function HistoryProbeClient() {
  const [running, setRunning] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [downloadVersion, setDownloadVersion] = useState("—");
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
    setLogs((previous) => [{ time, level, message }, ...previous.slice(0, 79)]);
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
    setRunning(true);
    stopRequestedRef.current = false;
    abortCurrentRef.current = null;
    creditsRef.current = null;
    gattWriteQueueRef.current = Promise.resolve();

    let communicationStarted = false;
    let uploadStarted = false;
    let lastVuResponseAt = 0;
    let sendDdp: ((message: readonly number[], requestSid: number, expectedTrep?: number | null, timeoutMs?: number) => Promise<DdpResult | null>) | null = null;
    const requireNotStopped = () => {
      if (stopRequestedRef.current) throw createStopError();
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

      const assembler = createItsMessageAssembler();
      let pendingRequest: PendingDdp | null = null;
      let creditResolver: ((credit: number) => void) | null = null;
      abortCurrentRef.current = () => {
        if (!pendingRequest) return;
        const request = pendingRequest;
        pendingRequest = null;
        request.reject(createStopError());
      };

      fifo.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength) return;
        const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
        void queueGattWrite(credits, [1]).catch(() => {});

        const assembled = pushItsPacket(assembler, packet);
        if (assembled.status === "invalid") {
          const request = pendingRequest;
          pendingRequest = null;
          request?.reject(new Error(`ITS paket nije validan: ${assembled.reason ?? "unknown"}`));
          return;
        }
        if (assembled.status !== "complete" || !assembled.message || !pendingRequest) return;

        const request = pendingRequest;
        const classification = classifyDdpResponse(
          assembled.message,
          request.requestSid,
          request.expectedTrep,
        );
        if (!classification.valid) {
          pendingRequest = null;
          request.reject(new Error(`DDP odgovor nije validan: ${classification.reason ?? "unknown"}`));
          return;
        }
        lastVuResponseAt = performance.now();
        if (classification.responsePending) {
          addLog("info", `DDP SID 0x${request.requestSid.toString(16).toUpperCase()} je RESPONSE PENDING; čekam završni odgovor.`);
          return;
        }
        if (!classification.matches) return;

        pendingRequest = null;
        request.resolve({ message: Array.from(assembled.message), classification });
      });

      credits.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength || !creditResolver) return;
        const resolve = creditResolver;
        creditResolver = null;
        resolve(view.getUint8(0));
      });

      await credits.startNotifications();
      requireNotStopped();
      await fifo.startNotifications();
      requireNotStopped();
      const serverCreditPromise = new Promise<number>((resolve) => { creditResolver = resolve; });
      await queueGattWrite(credits, [1]);
      requireNotStopped();
      const serverCredit = await Promise.race([serverCreditPromise, sleep(4000).then(() => null)]);
      creditResolver = null;
      requireNotStopped();
      if (serverCredit === null) throw new Error("Download server credit timeout");
      if (serverCredit === 0xff) throw new Error("Tahograf je odbio Download flow control");
      addLog("pass", `Download BLE FIFO/Credits spremni. Server credit: ${serverCredit}`);

      sendDdp = async (
        message: readonly number[],
        requestSid: number,
        expectedTrep: number | null = null,
        timeoutMs = 7000,
      ) => {
        requireNotStopped();
        if (pendingRequest) throw new Error("Paralelni DDP zahtev nije dozvoljen");

        if (lastVuResponseAt > 0) {
          const elapsed = performance.now() - lastVuResponseAt;
          const remaining = DDP_P3_GUARD_MS - elapsed;
          if (remaining > 0) {
            addLog("info", `DDP P3 guard: čekam ${Math.ceil(remaining)} ms pre sledećeg zahteva.`);
            await sleep(remaining);
            requireNotStopped();
          }
        }

        return new Promise<DdpResult | null>((resolve, reject) => {
          let settled = false;
          const finishResolve = (result: DdpResult | null) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(result);
          };
          const finishReject = (error: Error) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            reject(error);
          };
          const timer = window.setTimeout(() => {
            if (pendingRequest?.requestSid === requestSid) pendingRequest = null;
            finishResolve(null);
          }, timeoutMs);

          pendingRequest = {
            requestSid,
            expectedTrep,
            resolve: finishResolve,
            reject: finishReject,
          };
          queueGattWrite(fifo, [1, 1, ...message]).catch((error) => {
            if (pendingRequest?.requestSid === requestSid) pendingRequest = null;
            finishReject(error instanceof Error ? error : new Error(String(error)));
          });
        });
      };

      const requirePositive = (label: string, result: DdpResult | null) => {
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

      requirePositive(
        "DDP StartCommunication",
        await sendDdp(DDP_START_COMMUNICATION_REQUEST, 0x81),
      );
      communicationStarted = true;
      requireNotStopped();

      requirePositive(
        "DDP StartDiagnosticSession 0x81",
        await sendDdp(DDP_START_DIAGNOSTIC_SESSION_REQUEST, 0x10),
      );
      requireNotStopped();

      requirePositive(
        "DDP RequestUpload",
        await sendDdp(DDP_REQUEST_UPLOAD, 0x35),
      );
      uploadStarted = true;
      requireNotStopped();

      const versionResult = requirePositive(
        "DDP DownloadInterfaceVersion TREP 00",
        await sendDdp(DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION, 0x36, 0x00),
      );
      requireNotStopped();
      const parsedVersion = parseDownloadInterfaceVersion(versionResult.message);
      if (!parsedVersion.valid) throw new Error("DownloadInterfaceVersion payload nije validan");
      const versionLabel = `Gen ${parsedVersion.generation} / v${parsedVersion.version}`;
      setDownloadVersion(versionLabel);
      addLog(
        parsedVersion.generation === 2 && parsedVersion.version === 2 ? "pass" : "warn",
        `DownloadInterfaceVersion: ${versionLabel}.`,
      );

      requirePositive(
        "DDP RequestTransferExit",
        await sendDdp(DDP_REQUEST_TRANSFER_EXIT, 0x37),
      );
      uploadStarted = false;
      requireNotStopped();

      requirePositive(
        "DDP StopCommunication",
        await sendDdp(DDP_STOP_COMMUNICATION_REQUEST, 0x82),
      );
      communicationStarted = false;

      addLog("pass", "0.32a Download putanja je potvrđena bez zahteva za podatke kartice.");
    } catch (error) {
      const stoppedByUser = error instanceof Error && error.name === "AbortError";
      addLog(stoppedByUser ? "info" : "fail", error instanceof Error ? error.message : String(error));

      if (sendDdp) {
        if (uploadStarted) {
          try {
            stopRequestedRef.current = false;
            await sendDdp(DDP_REQUEST_TRANSFER_EXIT, 0x37, null, 3000);
            addLog("info", "Recovery: RequestTransferExit poslat.");
          } catch {}
        }
        if (communicationStarted) {
          try {
            stopRequestedRef.current = false;
            await sendDdp(DDP_STOP_COMMUNICATION_REQUEST, 0x82, null, 3000);
            addLog("info", "Recovery: StopCommunication poslat.");
          } catch {}
        }
      }
    } finally {
      abortCurrentRef.current = null;
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>TachoCommand — 56-day path probe</h1>
          <p style={{ margin: "4px 0", color: "#6b7280", fontSize: 13 }}>{APP_VERSION}</p>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 12 }}>source baseline: {SOURCE_BASELINE.slice(0, 7)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={runProbe} disabled={running}>
            {running ? "Proveravam…" : "Pokreni 0.32a probe"}
          </button>
          <button
            type="button"
            onClick={stopProbe}
            disabled={!running}
            style={{ background: running ? "#991b1b" : undefined, color: running ? "#fff" : undefined }}
          >
            Prekini sesiju
          </button>
        </div>
      </div>

      <p style={{ padding: 12, background: "#fef3c7", borderRadius: 10, fontSize: 13, lineHeight: 1.5 }}>
        0.32a proverava samo standardni Download BLE transport i DDP DownloadInterfaceVersion.
        Ne šalje Card Download TREP 06, ne čita karticu i ne pravi .DDD fajl.
        DDP zahtevi poštuju P3 razmak pre sledećeg tester zahteva.
        Card-download korak je namerno odvojen jer standardni download može ažurirati LastCardDownload na kartici.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Uređaj</small>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{deviceName}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Download interface</small>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{downloadVersion}</div>
        </article>
      </div>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 17 }}>Dnevnik</h2>
          <button type="button" onClick={copyLog} disabled={logs.length === 0}>Kopiraj dnevnik</button>
        </div>
        <div style={{ minHeight: 180, padding: 12, background: "#111827", color: "#e5e7eb", borderRadius: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
          {logs.length === 0 ? <div style={{ color: "#9ca3af" }}>Još nema događaja.</div> : null}
          {logs.map((entry, index) => (
            <div key={`${entry.time}-${index}`} style={{ marginBottom: 4 }}>
              [{entry.time}] {entry.level.toUpperCase()}: {entry.message}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
