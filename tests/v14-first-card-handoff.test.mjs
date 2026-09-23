import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { prepareAppV2CardHandoff } from "../lib/app-v2-card-handoff.js";

test("v14 handoff reuses connected selected device without a second GATT connect", async () => {
  const waits=[];
  let calls=0;
  const device={gatt:{connected:true,async connect(){calls++;}}};
  const result=await prepareAppV2CardHandoff({device,sleep:async(ms)=>waits.push(ms)});
  assert.deepEqual(result,{connected:true,recovered:false});
  assert.equal(calls,0);
  assert.deepEqual(waits,[1200]);
});

test("v14 handoff reconnects the already selected device after Diagnostics drops BLE", async () => {
  const waits=[];
  let calls=0;
  const device={gatt:{connected:false,async connect(){calls++;this.connected=true;return this;}}};
  const result=await prepareAppV2CardHandoff({device,sleep:async(ms)=>waits.push(ms)});
  assert.deepEqual(result,{connected:true,recovered:true});
  assert.equal(calls,1);
  assert.deepEqual(waits,[1200,650]);
});

test("v14 rejects failed reconnect before golden card transfer begins", async () => {
  const device={gatt:{connected:false,async connect(){throw new Error("radio busy");}}};
  await assert.rejects(
    prepareAppV2CardHandoff({device,sleep:async()=>{}}),
    /nije ponovo povezao.*radio busy/,
  );
});
test("v14 rejects link loss after reconnect settles instead of launching card transfer", async () => {
  const device={gatt:{connected:false,async connect(){this.connected=true;}}};
  await assert.rejects(
    prepareAppV2CardHandoff({device,sleep:async(ms)=>{if(ms===650)device.gatt.connected=false;}}),
    /nije povezan za početak/,
  );
});
test("v14 attaches read disconnect listener only after handoff preflight and clears stale events",()=>{
  const source=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
  assert.match(source, /await transport\.close\(\{ keepGattConnected: true \}\);[\s\S]*?await prepareAppV2CardHandoff\(\{ device: selectedDevice \}\);[\s\S]*?addEventListener\?\.\("gattserverdisconnected"/);
  assert.match(source, /lastCardProgressAtRef\.current = Date\.now\(\);[\s\S]*?setCardDiagnostic\(null\);/);
  assert.match(source, /if \(result\.status === "accepted" && result\.session\?\.currentCard\) \{\s*setCardDiagnostic\(null\);/);
  assert.match(source, /PREVIEW V14/);
});
test("v14 keeps the existing golden transfer protocol outside the changed files",()=>{
  const source=readFileSync("lib/app-v2-field-transport.js","utf8");
  assert.match(source, /if \(device\.gatt\.connected !== false\) \{/);
  assert.doesNotMatch(source,/buildAppV2GoldenAck|RequestUpload|RequestTransferExit/);
});
