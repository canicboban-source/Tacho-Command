import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  previousMondayIso,
  calendarFortnightFromMonday,
} from "../lib/app-v2-monday-fortnight.js";

const fixedNow = new Date("2026-09-23T17:00:00.000Z"); // Wednesday Europe/Vienna
function d(dateIso, drivingMinutes) { return {dateIso, drivingMinutes}; }
test("two calendar weeks begin at PREVIOUS Monday, not rolling last 14 days",()=>{
 const days=[
   d("2026-09-09", 999), d("2026-09-13", 888),
   d("2026-09-14", 60), d("2026-09-15", 30),
   d("2026-09-21", 90), d("2026-09-22", 120),
   d("2026-09-23", 45), d("2026-09-24", 999),
 ];
 assert.equal(previousMondayIso(fixedNow,"Europe/Vienna"),"2026-09-14");
 assert.equal(calendarFortnightFromMonday(days, {now:fixedNow,timeZone:"Europe/Vienna"}),345);
});

test("Monday boundary rolls forward by one week on Monday, not after 14 days",()=>{
 const days=[
  d("2026-09-14", 999),
  d("2026-09-21", 130),
  d("2026-09-22", 150),
  d("2026-09-28", 20),
 ];
 const monday = new Date("2026-09-28T10:00:00.000Z");
 assert.equal(previousMondayIso(monday,"Europe/Vienna"),"2026-09-21");
 assert.equal(calendarFortnightFromMonday(days,{now:monday,timeZone:"Europe/Vienna"}),300);
});

test("phone timezone defines which local Monday applies near midnight",()=>{
 const nearUtcMidnight = new Date("2026-09-28T00:30:00.000Z");
 assert.equal(previousMondayIso(nearUtcMidnight,"Europe/Vienna"),"2026-09-21");
 assert.equal(previousMondayIso(nearUtcMidnight,"America/Los_Angeles"),"2026-09-14");
});

test("insufficient card coverage is unknown, never an invented zero for 2 weeks",()=>{
 assert.equal(calendarFortnightFromMonday([],{now:fixedNow,timeZone:"Europe/Vienna"}),null);
 assert.equal(calendarFortnightFromMonday([d("2026-09-22",60)],{now:fixedNow,timeZone:"Europe/Vienna"}),null);
 assert.equal(calendarFortnightFromMonday([d("2026-09-14",0)],{now:fixedNow,timeZone:"Europe/Vienna"}),0);
});

test("56 days appear latest first, independent of canonical saved order",()=>{
 const ui=readFileSync("app/app/field-proven-premium-ui.tsx","utf8");
 assert.match(ui,/const visibleDays = state\.historyDays\.slice\(0, 56\)\.reverse\(\)/);
 assert.match(ui,/Od prethodnog ponedeljka/);
});

test("V20 uses one install owner and preserves the unmodified proven card transport",()=>{
 const landing=readFileSync("app/landing-page.tsx","utf8");
 const prompt=readFileSync("app/pwa-install-cta.tsx","utf8");
 const guide=readFileSync("app/install-guide.tsx","utf8");
 const app=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 if (landing.includes("Instaliraj aplikaciju")) {
  assert.match(prompt,/addEventListener\("beforeinstallprompt"/);
  assert.doesNotMatch(landing,/InstallGuide/);
 } else {
  assert.match(landing,/Instaliraj V20 test aplikaciju/);
  assert.match(prompt,/tachocommand-open-install-guide/);
  assert.doesNotMatch(prompt,/beforeinstallprompt/);
  assert.equal((guide.match(/addEventListener\("beforeinstallprompt"/g)??[]).length,1);
  assert.match(guide,/Chrome nije pokrenuo instalaciju/);
  assert.match(guide,/Otvori u Chrome-u/);
 }
 assert.doesNotMatch(app,/createDeferredCardDeviceChooser|keepGattConnected/);
 assert.match(app,/runBrowserAppV2GoldenCardRead\(\{/);
 assert.match(app,/formatTachoCommandVersionLine\(\)/);
});

test("V20 refreshes phone-local day for the Monday rollover",()=>{
 const app=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 assert.match(app,/new Intl\.DateTimeFormat\("sv-SE"/);
 assert.match(app,/calendarFortnightFromMonday\(projected\.historyDays, \{ timeZone \}\)/);
 const manifest=JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));
 assert.equal(manifest.short_name, "TachoCommand");
 assert.equal(manifest.id, "/app");
});
