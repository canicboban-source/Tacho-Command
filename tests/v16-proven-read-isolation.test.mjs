import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
test("V16 retains proven V14 CARD transport; timezone experiment is not active in transfer UI",()=>{
 const client=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 assert.match(client,/await prepareAppV2CardHandoff\(\{ device: selectedDevice \}\)/);
 assert.match(client,/PREVIEW V16/);
 assert.doesNotMatch(client,/projectCardStateToDeviceClock|deviceUtcOffsetMinutes|syncPhoneClock/);
 assert.match(client,/lastCardProgressRef\.current\?\.submessages \?\? 0/);
});
test("V16 landing warns in all supported languages to use the app only when safely stopped",()=>{
 const land=readFileSync("app/landing-page.tsx","utf8");
 assert.match(land,/Bezbednost pre svega/);
 assert.match(land,/Safety first:/);
 assert.match(land,/Sicherheit zuerst:/);
 assert.match(land,/tcx-safety-note/);
});
