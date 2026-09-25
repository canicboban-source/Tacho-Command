"use client";

import { useState } from "react";
import { openBrowserAppV2FieldTransport } from "../../lib/app-v2-field-transport.js";

type DeviceResult = {
  name: string;
  manufacturer?: string;
  model?: string;
  firmware?: string;
  serialNumber?: string;
  connectDurationMs: number;
  responseTimesMs: number[];
  interruptions: number;
  status: string;
  checkedAt: string;
};

const shell = {
  maxWidth: 560, margin: "0 auto", minHeight: "100dvh", padding: "24px 18px 44px",
  background: "#0d1b22", color: "#f1f7fa", fontFamily: "system-ui, sans-serif",
} as const;
const panel = {
  background: "#142a35", border: "1px solid #355568", borderRadius: 20,
  padding: 20, marginTop: 18,
} as const;
const button = {
  width: "100%", padding: "18px 16px", border: 0, borderRadius: 14,
  color: "#0c222b", background: "#43c3e3", fontWeight: 800, fontSize: 17,
} as const;

export default function DeviceCheckClient() {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Spremno za proveru");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeviceResult | null>(null);
  const [failureReport, setFailureReport] = useState<Record<string, unknown> | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    setError(null);
    setFailureReport(null);
    setCopied(false);
    const startedAt = performance.now();
    const responseTimesMs: number[] = [];
    let phase = "izbor Bluetooth uređaja i povezivanje";
    setStage("Izaberi tahograf u Chrome Bluetooth dijalogu…");
    let transport: Awaited<ReturnType<typeof openBrowserAppV2FieldTransport>> | null = null;
    try {
      transport = await openBrowserAppV2FieldTransport({ timeoutMs: 4000, settleMs: 0 });
      phase = "dijagnostički odgovori";
      setStage("Veza je otvorena. Merim tri odgovora tahografa…");
      for (let index = 0; index < 3; index++) {
        if (!transport.isConnected()) {
          throw new Error("Bluetooth veza se prekinula tokom provere.");
        }
        const start = performance.now();
        const reply = await transport.sendUds([0x3e, 0x00], 4000);
        if (!reply || reply[0] !== 1 || reply[1] !== 1 || reply[2] !== 0x7e) {
          throw new Error("Tahograf nije potvrdio dijagnostički odgovor " + (index + 1) + "/3.");
        }
        responseTimesMs.push(Math.round(performance.now() - start));
      }
      setResult({
        name: transport.deviceLabel,
        ...transport.deviceInformation,
        connectDurationMs: transport.connectDurationMs,
        responseTimesMs,
        interruptions: 0,
        status: "Tri odgovora potvrđena",
        checkedAt: new Date().toLocaleString("sr-RS"),
      });
      setStage("Provera završena");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Neuspešna provera veze.";
      setError(message);
      setFailureReport({
        checkedAt: new Date().toLocaleString("sr-RS"),
        phase,
        elapsedMs: Math.round(performance.now() - startedAt),
        confirmedResponses: responseTimesMs.length,
        responseTimesMs,
        disconnected: transport ? !transport.isConnected() : null,
        error: message,
      });
      setStage("Provera nije završena");
    } finally {
      if (transport) await transport.close();
      setBusy(false);
    }
  };

  const copy = async () => {
    const report = result ?? failureReport;
    if (!report) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main style={shell}>
      <header>
        <p style={{ color: "#7ad5ed", letterSpacing: "0.12em", fontWeight: 800 }}>TACHOCOMMAND · KONTROLNI WORKER</p>
        <h1 style={{ fontSize: 31, lineHeight: 1.15, margin: "12px 0" }}>Provera tahografa i veze</h1>
        <p style={{ color: "#bfd0d7", lineHeight: 1.55 }}>
          Ova provera ne očitava karticu. Identitet uređaja i merenja ostaju na telefonu;
          šalju se samo ako sam izabereš „Kopiraj rezultat”.
        </p>
      </header>
      <section style={panel}>
        <p>Pokreni na zaustavljenom vozilu u Chrome-u. Izaberi tahograf i potvrdi uparivanje na njemu ako traži.</p>
        <button type="button" disabled={busy} onClick={run} style={{ ...button, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Provera u toku…" : "Poveži i proveri"}
        </button>
        <p role="status" aria-live="polite">{stage}</p>
        {error && <p style={{ color: "#ff9b91" }} role="alert">{error}</p>}
      </section>
      {failureReport && <section style={panel}>
        <h2 style={{ marginTop: 0 }}>Neuspešan pokušaj</h2>
        <p>Faza: {String(failureReport.phase)} · Trajanje: {String(failureReport.elapsedMs)} ms ·
          Potvrđenih odgovora: {String(failureReport.confirmedResponses)}/3</p>
        <p>Prekid veze: {failureReport.disconnected === null ? "nije utvrđeno" : failureReport.disconnected ? "da" : "nije potvrđen"}</p>
        <button type="button" onClick={copy} style={button}>{copied ? "Kopirano" : "Kopiraj dijagnostiku"}</button>
      </section>}
      {result && <section style={panel}>
        <h2 style={{ marginTop: 0 }}>Rezultat · {result.checkedAt}</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 8px", overflowWrap: "anywhere" }}>
          {([
            ["Bluetooth naziv", result.name],
            ["Proizvođač", result.manufacturer || "Nedostupno"],
            ["Model / vrsta", result.model || "Nedostupno"],
            ["Serijski broj", result.serialNumber || "Nedostupno"],
            ["Firmver", result.firmware || "Nedostupno"],
            ["GATT povezivanje", result.connectDurationMs + " ms"],
            ["Odgovori", result.responseTimesMs.join(" / ") + " ms"],
            ["Prekidi", String(result.interruptions)],
          ] as const).map(([label, value]) => <div key={label}><dt style={{ color: "#a2bcc8" }}>{label}</dt><dd style={{ margin: "4px 0", fontWeight: 750 }}>{value}</dd></div>)}
        </dl>
        <p style={{ color: "#bfd0d7", lineHeight: 1.5 }}>
          Ova vremena mere odziv protokola, ne jačinu Bluetooth signala. Chrome ne izlaže RSSI ovoj stranici.
          „Nedostupno” znači da uređaj nije objavio podatak preko standardnog Bluetooth servisa.
        </p>
        <button type="button" onClick={copy} style={button}>{copied ? "Kopirano" : "Kopiraj rezultat"}</button>
      </section>}
    </main>
  );
}
