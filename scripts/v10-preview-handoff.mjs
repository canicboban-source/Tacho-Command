import { readFileSync, writeFileSync } from "node:fs";

const path = "app/app-v2/app-v2-client.tsx";
let source = readFileSync(path, "utf8");
function change(before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error("V10 patch anchor count " + count + ": " + before.slice(0, 90));
  source = source.replace(before, after);
}

// Lock out periodic LIVE readers synchronously with the CARD click, rather
// than disconnecting while a speed/live UDS request is still in flight.
change(
  '  const cardReadBusyRef = useRef(false);',
  '  const cardReadBusyRef = useRef(false);\n  const cardHandoffRef = useRef(false);',
);
change(
  '      if (udsMonitorBusyRef.current || liveTransportRef.current !== transport) return;',
  '      if (cardHandoffRef.current || cardReadBusyRef.current || udsMonitorBusyRef.current || liveTransportRef.current !== transport) return;',
);
change(
  '      if (cardReadBusyRef.current || udsMonitorBusyRef.current || liveTransportRef.current !== transport) return;',
  '      if (cardHandoffRef.current || cardReadBusyRef.current || udsMonitorBusyRef.current || liveTransportRef.current !== transport) return;',
);
change(
  '    if (cardSession.busy || liveRunState === "running") return;\n    const transport = liveTransportRef.current;',
  '    if (cardSession.busy || cardHandoffRef.current || liveRunState === "running") return;\n    cardHandoffRef.current = true;\n    cardReadBusyRef.current = true;\n    stopSpeedGuard();\n    const transport = liveTransportRef.current;',
);
change(
  '      setLiveRunState("error");\n      return;\n    }\n\n    try {\n      await transport.assertStationary();',
  '      setLiveRunState("error");\n      cardReadBusyRef.current = false;\n      cardHandoffRef.current = false;\n      return;\n    }\n\n    try {\n      // A running LIVE/guard UDS read must finish before a new safety query.\n      const deadline = Date.now() + 9000;\n      while (udsMonitorBusyRef.current && Date.now() < deadline) {\n        await new Promise<void>((resolve) => window.setTimeout(resolve, 100));\n      }\n      if (udsMonitorBusyRef.current) throw new Error("LIVE provera je zauzeta; ponovo povežite tahograf.");\n      await transport.assertStationary();',
);
change(
  '      await closePersistentLive(error instanceof Error ? error.message : "Brzina nije potvrđena — BLE veza je prekinuta.");\n      return;\n    }\n\n    // Diagnostics/LIVE and the proven Download protocol',
  '      await closePersistentLive(error instanceof Error ? error.message : "Brzina nije potvrđena — BLE veza je prekinuta.");\n      cardReadBusyRef.current = false;\n      cardHandoffRef.current = false;\n      return;\n    }\n\n    // Diagnostics/LIVE and the proven Download protocol',
);
change(
  '    stopSpeedGuard();\n    liveTransportRef.current = null;\n    setLiveConnected(false);',
  '    liveTransportRef.current = null;\n    setLiveConnected(false);',
);
change(
  '      await transport.close();\n    } catch {',
  '      await transport.close();\n      // The tachograph needs time to release the Diagnostics service before\n      // the known device reconnects on the separate Download service.\n      await new Promise<void>((resolve) => window.setTimeout(resolve, 1200));\n    } catch {',
);
change(
  '      setLiveRunState("error");\n      return;\n    }\n\n    const readingSession = beginAppV2CardRead(cardSession);',
  '      setLiveRunState("error");\n      cardReadBusyRef.current = false;\n      cardHandoffRef.current = false;\n      return;\n    }\n\n    const readingSession = beginAppV2CardRead(cardSession);',
);
change(
  '      cardReadBusyRef.current = false;\n      try { await wakeLock?.release(); } catch {}',
  '      cardReadBusyRef.current = false;\n      cardHandoffRef.current = false;\n      try { await wakeLock?.release(); } catch {}',
);
writeFileSync(path, source);

const testPath = "tests/v10-preview-handoff.test.mjs";
writeFileSync(testPath, `import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync("app/app-v2/app-v2-client.tsx", "utf8");
test("v10 serializes card handoff against in-flight LIVE and guard requests", () => {
  assert.match(source, /cardHandoffRef\\.current = true;[\\s\\S]*?stopSpeedGuard\\(\\)/);
  assert.match(source, /while \\(udsMonitorBusyRef\\.current && Date\\.now\\(\\) < deadline\\)/);
  assert.match(source, /await transport\\.assertStationary\\(\\)/);
  assert.match(source, /await transport\\.close\\(\\)/);
  assert.match(source, /device: selectedDevice/);
  assert.match(source, /cardHandoffRef\\.current = false/);
});
test("v10 keeps the verified card implementation out of the source changes", () => {
  assert.doesNotMatch(source, /requestDevice\\(/);
  assert.match(source, /runBrowserAppV2GoldenCardRead\\(/);
});
`);
console.log("V10 source handoff patch and regression test applied");
