import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDeferredCardDeviceChooser } from "../lib/app-v2-card-ready-gate.js";

test("V19 opens Chrome chooser synchronously and connects real GATT BEFORE readiness gate",async()=>{
 const events=[];let release;
 const server={getPrimaryServices:async()=>{events.push("services");return [];}};
 const device={
   name:"DTCO",
   gatt:{
     connected:false,
     async connect(){events.push("gatt-connect");this.connected=true;return server;},
     disconnect(){events.push("disconnect");this.connected=false;},
   },
 };
 const chooser=createDeferredCardDeviceChooser({
   bluetooth:{requestDevice(options){
     events.push("chooser");assert.deepEqual(options,{acceptAllDevices:true});
     return Promise.resolve(device);
   }},
   onDeviceSelected:selected=>{
     events.push("operator-checkpoint");
     assert.equal(selected,device);
     assert.equal(selected.gatt.connected,true);
     return new Promise(resolve=>{release=resolve;});
   },
 });
 const pending=chooser.requestDevice({acceptAllDevices:true});
 assert.deepEqual(events,["chooser"]);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(events,["chooser","gatt-connect","operator-checkpoint"]);
 assert.equal(device.gatt.connected,true);
 assert.equal(typeof release,"function");
 // No GOLDEN getPrimaryServices/command may run before field confirmation.
 assert.equal(events.includes("services"),false);
 release();
 const wrapped=await pending;
 assert.equal(await wrapped.gatt.connect(),server);
 assert.equal(wrapped.gatt.connected,true);
 assert.deepEqual(events,["chooser","gatt-connect","operator-checkpoint"]);
 await (await wrapped.gatt.connect()).getPrimaryServices();
 assert.equal(events.at(-1),"services");
 wrapped.gatt.disconnect();
 assert.equal(device.gatt.connected,false);
});

test("V19 aborting readiness checkpoint closes connected GATT and sends no card commands",async()=>{
 let connectCalls=0,disconnections=0,readyCalls=0;
 const device={gatt:{
  connected:false,
  async connect(){connectCalls++;this.connected=true;return {getPrimaryServices(){throw Error("must not start");}};},
  disconnect(){disconnections++;this.connected=false;},
 }};
 const chooser=createDeferredCardDeviceChooser({
  bluetooth:{requestDevice:async()=>device},
  onDeviceSelected:()=>{readyCalls++;return Promise.reject(new Error("not-ready"));},
 });
 await assert.rejects(chooser.requestDevice({acceptAllDevices:true}),/not-ready/);
 assert.equal(connectCalls,1);assert.equal(readyCalls,1);assert.equal(disconnections,1);
});

test("V19 cannot display ready checkpoint when GATT connect fails",async()=>{
 let readyCalls=0;
 const chooser=createDeferredCardDeviceChooser({
  bluetooth:{requestDevice:async()=>({gatt:{connected:false,connect:async()=>{throw Error("BT refused");}}})},
  onDeviceSelected:()=>{readyCalls++;return Promise.resolve();},
 });
 await assert.rejects(chooser.requestDevice({acceptAllDevices:true}),/BT refused/);
 assert.equal(readyCalls,0);
});

test("V19 will not start GOLDEN transfer if GATT drops while awaiting confirmation",async()=>{
 const device={gatt:{connected:false,async connect(){this.connected=true;return {}}}};
 const chooser=createDeferredCardDeviceChooser({
  bluetooth:{requestDevice:async()=>device},
  onDeviceSelected:async()=>{device.gatt.connected=false;},
 });
 await assert.rejects(chooser.requestDevice({acceptAllDevices:true}),/prekinuta pre potvrde/);
});

test("V19 preserves GOLDEN file but shows connected-BT checkpoint before reading",()=>{
 const bridge=readFileSync("lib/app-v2-card-transport-controller-bridge.js","utf8");
 const client=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 const ui=readFileSync("app/app/field-proven-premium-ui.tsx","utf8");
 const gate=readFileSync("lib/app-v2-card-ready-gate.js","utf8");
 assert.match(bridge,/createDeferredCardDeviceChooser\(/);
 assert.match(bridge,/readAppV2GoldenCardPayload\(/);
 assert.match(gate,/const connectedServer = await device\.gatt\.connect\(\);[\s\S]*?await onDeviceSelected\(device\)/);
 assert.match(client,/onDeviceSelected: \(\) => new Promise<void>/);
 assert.match(client,/PREVIEW V19/);
 assert.match(ui,/Bluetooth veza sa izabranim tahografom je uspostavljena/);
 assert.match(ui,/Kartica prepoznata — počni čitanje/);
 assert.doesNotMatch(client,/prepareAppV2CardHandoff|keepGattConnected/);
});
