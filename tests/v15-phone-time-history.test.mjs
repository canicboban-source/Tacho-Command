import test from "node:test";
import assert from "node:assert/strict";
import { projectCardHistoryToPhoneZone } from "../lib/app-v2-phone-time-history.js";

function fixture(day, segments, capturedAtIso = "2026-09-23T14:27:00.000Z") {
  const source = {
    cardReadComplete: true,
    lastCardReadAtIso: capturedAtIso,
    historyDaysAvailable: 1,
    historyDays: [{dateIso: day, dateLabel: day, segments, events: []}],
    fortnightDrivingMinutes: 0,
  };
  return source;
}

test("the phone UTC+2 shifts activity and keeps raw card/snapshot immutable", () => {
  const card = fixture("2026-09-22", [
    {kind:"rest",startMinute:0,endMinute:600,cardStatus:"inserted"},
    {kind:"drive",startMinute:600,endMinute:660,cardStatus:"inserted"},
  ]);
  const raw=JSON.stringify(card);
  const local=projectCardHistoryToPhoneZone(card,{timeZone:"Etc/GMT-2"});
  assert.equal(JSON.stringify(card),raw);
  assert.equal(local.historyDays[0].dateIso,"2026-09-22");
  const drive=local.historyDays[0].segments.find(s=>s.kind==="drive");
  assert.equal(drive.startMinute,720);
  assert.equal(drive.endMinute,780);
  assert.equal(local.historyDays[0].drivingMinutes,60);
  assert.equal(local.fortnightDrivingMinutes,60);
});
test("UTC card midnight crossing belongs to the proper phone-local day", () => {
  const card=fixture("2026-09-22", [
    {kind:"drive",startMinute:23*60,endMinute:1440,cardStatus:"inserted"},
  ],"2026-09-24T12:00:00.000Z");
  const local=projectCardHistoryToPhoneZone(card,{timeZone:"Etc/GMT-2"});
  assert.equal(local.historyDays.length,1);
  assert.equal(local.historyDays[0].dateIso,"2026-09-23");
  assert.equal(local.historyDays[0].segments[0].startMinute,60);
  assert.equal(local.historyDays[0].segments[0].endMinute,120);
});
test("today never invents driving from the last card change until future midnight", () => {
  const card=fixture("2026-09-23", [
    {kind:"rest",startMinute:0,endMinute:11*60,cardStatus:"inserted"},
    {kind:"drive",startMinute:11*60,endMinute:1440,cardStatus:"inserted"},
  ]);
  const local=projectCardHistoryToPhoneZone(card,{timeZone:"Etc/GMT-2"});
  const latest=local.historyDays[0];
  assert.equal(latest.dateIso,"2026-09-23");
  assert.equal(latest.drivingMinutes,207); // 11:00 UTC until 14:27 UTC
  assert.equal(latest.segments.at(-1).endMinute,16*60+27);
});
test("display follows phone IANA time zone; underlying card does not shift", () => {
  const card=fixture("2026-09-23",[
    {kind:"drive",startMinute:0,endMinute:120,cardStatus:"inserted"},
  ],"2026-09-25T00:00:00.000Z");
  const serbian=projectCardHistoryToPhoneZone(card,{timeZone:"Europe/Belgrade"});
  const newYork=projectCardHistoryToPhoneZone(card,{timeZone:"America/New_York"});
  assert.equal(serbian.historyDays[0].dateIso,"2026-09-23");
  assert.equal(serbian.historyDays[0].segments[0].startMinute,120);
  assert.equal(newYork.historyDays[0].dateIso,"2026-09-22");
  assert.equal(newYork.historyDays[0].segments[0].startMinute,20*60);
  assert.equal(card.historyDays[0].dateIso,"2026-09-23");
});
test("fall-back DST repeated hour is never presented as a verified 24h timeline", () => {
  const card=fixture("2026-10-25",[
    {kind:"rest",startMinute:0,endMinute:180,cardStatus:"inserted"},
  ],"2026-10-26T00:00:00.000Z");
  const local=projectCardHistoryToPhoneZone(card,{timeZone:"Europe/Belgrade"});
  const day=local.historyDays[0];
  assert.equal(day.localTimeAmbiguous,true);
  assert.equal(day.segments.reduce((n,s)=>n+s.minutes,0),180);
  assert.ok(day.segments.every(s=>s.startMinute===null&&s.endMinute===null));
});
test("invalid zone or untimed card records do not invent a chronology",()=>{
  const card=fixture("2026-09-23",[{kind:"drive",startMinute:null,endMinute:null,minutes:20}]);
  assert.equal(projectCardHistoryToPhoneZone(card,{timeZone:"Etc/GMT-2"}),card);
  assert.equal(projectCardHistoryToPhoneZone(card,{timeZone:"INVALID_TIME_ZONE"}),card);
});
