import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectCardTimelineForPhone } from "../lib/app-v2-phone-timeline.js";

function day(dateIso,startMinute,endMinute) {
  return {dateIso,dateLabel:dateIso,drivingMinutes:endMinute-startMinute,
    segments:[{kind:"drive",startMinute,endMinute,minutes:endMinute-startMinute,cardStatus:"inserted"}],
    events:[]};
}
function card(...days) {
  return {cardReadComplete:true,historyDays:days,historyDaysAvailable:days.length,
    fortnightDrivingMinutes:815};
}

test("Europe/Vienna converts a September UTC 10:00 activity to phone 12:00 (+2)",()=>{
 const projected=projectCardTimelineForPhone(card(day("2026-09-23",600,660)),"Europe/Vienna");
 assert.equal(projected.historyDays[0].segments[0].startMinute,720);
 assert.equal(projected.historyDays[0].segments[0].endMinute,780);
 assert.equal(projected.fortnightDrivingMinutes,815);
});

test("historical winter and summer records use per-event offset, not today's offset",()=>{
 const winter=projectCardTimelineForPhone(card(day("2026-01-15",600,660)),"Europe/Vienna");
 const summer=projectCardTimelineForPhone(card(day("2026-09-23",600,660)),"Europe/Vienna");
 assert.equal(winter.historyDays[0].segments[0].startMinute,660);
 assert.equal(summer.historyDays[0].segments[0].startMinute,720);
});

test("late UTC activity moves into next local calendar date",()=>{
 const projected=projectCardTimelineForPhone(card(day("2026-09-23",1380,1440)),"Europe/Vienna");
 assert.equal(projected.historyDays[0].dateIso,"2026-09-24");
 assert.equal(projected.historyDays[0].segments[0].startMinute,60);
 assert.equal(projected.historyDays[0].segments[0].endMinute,120);
});

test("different phone zones change only the projection; original storage data stays untouched",()=>{
 const source=card(day("2026-09-23",600,660));const original=JSON.stringify(source);
 const vienna=projectCardTimelineForPhone(source,"Europe/Vienna");
 const london=projectCardTimelineForPhone(source,"Europe/London");
 assert.equal(vienna.historyDays[0].segments[0].startMinute,720);
 assert.equal(london.historyDays[0].segments[0].startMinute,660);
 assert.equal(JSON.stringify(source),original);
});

test("V17 uses the production direct-card chooser, not the experimental retained-GATT handoff",()=>{
 const client=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 const golden=readFileSync("lib/app-v2-golden-card-browser-transport.js","utf8");
 assert.match(client,/const result = await runBrowserAppV2GoldenCardRead\(\{/);
 assert.doesNotMatch(client,/prepareAppV2CardHandoff|transportOptions:|keepGattConnected/);
 assert.match(golden,/const device = await bluetooth\.requestDevice\(\{/);
 assert.match(client,/PREVIEW V17/);
 assert.match(client,/projectCardTimelineForPhone/);
});
test("Landing communicates stationary-only safety in Serbian English and German",()=>{
 const landing=readFileSync("app/landing-page.tsx","utf8");
 assert.match(landing,/Bezbednost pre svega/);
 assert.match(landing,/Safety first:/);
 assert.match(landing,/Sicherheit zuerst:/);
 assert.match(landing,/tcx-safety-note/);
});
