import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calendarFortnightFromMonday, previousMondayIso } from "../lib/app-v2-monday-fortnight.js";

function d(dateIso, drivingMinutes) {
  return { dateIso, dateLabel: dateIso, drivingMinutes };
}

test("previous Monday is the start of the two-calendar-week display period", () => {
  const now = new Date("2026-09-23T17:56:00.000Z"); // Wed, Europe/Vienna 19:56
  assert.equal(previousMondayIso(now, "Europe/Vienna"), "2026-09-14");
});

test("two-week value sums previous Monday through today, not rolling last 14 records", () => {
  const now = new Date("2026-09-23T17:56:00.000Z");
  const history = [
    d("2026-09-13", 999), // Sunday before the calendar period: excluded
    d("2026-09-14", 10),
    d("2026-09-15", 20),
    d("2026-09-16", 30),
    d("2026-09-17", 40),
    d("2026-09-18", 50),
    d("2026-09-19", 60),
    d("2026-09-20", 0),
    d("2026-09-21", 70),
    d("2026-09-22", 80),
    d("2026-09-23", 90),
    d("2026-09-24", 999), // future local day: excluded
  ];
  assert.equal(calendarFortnightFromMonday(history, { now, timeZone: "Europe/Vienna" }), 450);
});

test("two-week display refuses an incomplete history that does not reach previous Monday", () => {
  const now = new Date("2026-09-23T17:56:00.000Z");
  assert.equal(calendarFortnightFromMonday([
    d("2026-09-15", 20),
    d("2026-09-23", 90),
  ], { now, timeZone: "Europe/Vienna" }), null);
});

test("56-day UI displays newest card day first without changing parser order", () => {
  const ui = readFileSync("app/app/field-proven-premium-ui.tsx", "utf8");
  const parser = readFileSync("lib/app-v2-parser-card-adapter.js", "utf8");
  assert.match(ui, /state\.historyDays\.slice\(0, 56\)\.reverse\(\)/);
  assert.match(parser, /sort\(\(left, right\) => left\.dateIso\.localeCompare\(right\.dateIso\)\)/);
});

test("V20 retains the field-proven V19 production card transfer path", () => {
  const client = readFileSync("app/app-v2/app-v2-client.tsx", "utf8");
  const bridge = readFileSync("lib/app-v2-card-transport-controller-bridge.js", "utf8");
  assert.match(client, /runBrowserAppV2GoldenCardRead\(\{/);
  assert.match(client, /formatTachoCommandVersionLine\(\)/);
  assert.doesNotMatch(client, /prepareAppV2CardHandoff|onDeviceSelected|awaitingCardRecognition|keepGattConnected/);
  assert.match(bridge, /readBrowserAppV2GoldenCardPayload\(\{/);
});
