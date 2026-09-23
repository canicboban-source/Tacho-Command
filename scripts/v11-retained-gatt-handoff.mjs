import { readFileSync, writeFileSync } from "node:fs";

function update(path, before, after) {
  const content = readFileSync(path, "utf8");
  const occurrences = content.split(before).length - 1;
  if (occurrences !== 1) throw new Error("V11 source anchor " + path + ": " + occurrences + " for " + before.slice(0, 100));
  writeFileSync(path, content.replace(before, after));
}

// The v10 field result is that CARD immediately drops Bluetooth. v10 still
// calls transport.close(), whose final statement disconnects the underlying
// BluetoothDevice. Keep the selected GATT link while handing off services.
// This changes only the Diagnostics lifecycle, NOT the golden card protocol.
const field = "lib/app-v2-field-transport.js";
update(
  field,
  "  const close = async () => {\n    if (closed) return;",
  "  const close = async ({ keepGattConnected = false } = {}) => {\n    if (closed) return;",
);
update(
  field,
  "    try {\n      device.gatt.disconnect?.();\n    } catch {}\n  };\n\n  return Object.freeze({",
  "    if (keepGattConnected) {\n      if (device.gatt.connected === false) {\n        throw new Error(\"Tahograf je prekinuo BLE pri prelazu LIVE → CARD.\");\n      }\n      return;\n    }\n    try {\n      device.gatt.disconnect?.();\n    } catch {}\n  };\n\n  return Object.freeze({",
);

const client = "app/app-v2/app-v2-client.tsx";
update(
  client,
  "      await transport.close();\n      // The tachograph needs time to release the Diagnostics service before",
  "      await transport.close({ keepGattConnected: true });\n      // The tachograph needs time to release the Diagnostics service before",
);
update(
  client,
  "      // the known device reconnects on the separate Download service.",
  "      // the existing GATT link changes to the separate Download service.",
);

const v10Test = "tests/v10-preview-handoff.test.mjs";
update(
  v10Test,
  "assert.match(source, /await transport\\.close\\(\\)/);",
  "assert.match(source, /await transport\\.close\\(\\{ keepGattConnected: true \\}\\)/);",
);

writeFileSync("tests/v11-retained-gatt-handoff.test.mjs", `import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("v11 switches to card on the selected connected GATT device", () => {
  const client = readFileSync("app/app-v2/app-v2-client.tsx", "utf8");
  assert.match(client, /await transport\\.close\\(\\{ keepGattConnected: true \\}\\)/);
  assert.match(client, /device: selectedDevice/);
});
test("diagnostics handoff preserves GATT, ordinary close still disconnects", () => {
  const transport = readFileSync("lib/app-v2-field-transport.js", "utf8");
  assert.match(transport, /const close = async \\(\\{ keepGattConnected = false \\} = \\{\\}\\) =>/);
  assert.match(transport, /if \\(keepGattConnected\\) \\{[\\s\\S]*?return;[\\s\\S]*?device\\.gatt\\.disconnect\\?\\.\\(\\)/);
  assert.match(transport, /if \\(device\\.gatt\\.connected === false\\)/);
});
`);
console.log("V11 retained-GATT handoff patch applied without changing golden transport");
