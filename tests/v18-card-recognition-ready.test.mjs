import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDeferredCardDeviceChooser } from "../lib/app-v2-card-ready-gate.js";

test("V18 opens Chrome chooser immediately and holds device before GATT",async()=>{
 const events=[];let release;
 const device={gatt:{connected:false,connect:async()=>{events.push("gatt");}}};
 const browser={
   requestDevice(options) {
     events.push("chooser");
     assert.deepEqual(options,{acceptAllDevices:true});
     return Promise.resolve(device);
   },
 };
 const chooser=createDeferredCardDeviceChooser({
   bluetooth:browser,
   onDeviceSelected:selected=>{
     events.push("selected");
     assert.equal(selected,device);
     return new Promise(resolve=>{release=resolve;});
   },
 });
 const pending=chooser.requestDevice({acceptAllDevices:true}).then(()=>{
   events.push("ready");
 });
 assert.deepEqual(events,["chooser"]);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(events,["chooser","selected"]);
 assert.equal(device.gatt.connected,false);
 assert.equal(typeof release,"function");
 release();
 await pending;
 assert.deepEqual(events,["chooser","selected","ready"]);
});
test("V18 never continues to card if operator does not confirm readiness",async()=>{
 const device={gatt:{connected:false}};
 const chooser=createDeferredCardDeviceChooser({
  bluetooth:{requestDevice:async()=>device},
  onDeviceSelected:()=>Promise.reject(new Error("readiness-not-confirmed")),
 });
 await assert.rejects(chooser.requestDevice({acceptAllDevices:true}),/readiness-not-confirmed/);
});
test("V18 keeps golden protocol untouched and adds an explicit readiness control",()=>{
 const bridge=readFileSync("lib/app-v2-card-transport-controller-bridge.js","utf8");
 const client=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 const ui=readFileSync("app/app/field-proven-premium-ui.tsx","utf8");
 assert.match(bridge,/createDeferredCardDeviceChooser\(/);
 assert.match(bridge,/readAppV2GoldenCardPayload\(/);
 assert.match(client,/onDeviceSelected: \(\) => new Promise<void>/);
 assert.match(client,/180_000/);
 assert.match(client,/PREVIEW V18/);
 assert.match(ui,/Kartica prepoznata — počni čitanje/);
 assert.match(ui,/Dok čekate, ne šaljemo zahtev za čitanje/);
 assert.doesNotMatch(client,/prepareAppV2CardHandoff|keepGattConnected/);
});
