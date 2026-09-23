import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDeviceUtcOffset,
  projectCardStateToDeviceClock,
} from "../lib/app-v2-device-clock.js";

function card(days) {
  return {
    cardReadComplete: true,
    historyDays: days,
    historyDaysAvailable: days.length,
    fortnightDrivingMinutes: 0,
  };
}

test("UTC+2 shifts a card segment two hours forward on the phone clock", () => {
  const result = projectCardStateToDeviceClock(card([{
    dateIso: "2026-09-23",
    dateLabel: "2026-09-23",
    drivingMinutes: 60,
    segments: [{ kind: "drive", startMinute: 600, endMinute: 660, minutes: 60, cardStatus: "inserted" }],
    events: [],
  }]), 120);
  assert.equal(result.historyDays[0].dateIso, "2026-09-23");
  assert.deepEqual(
    { start: result.historyDays[0].segments[0].startMinute, end: result.historyDays[0].segments[0].endMinute },
    { start: 720, end: 780 },
  );
  assert.equal(result.historyDays[0].drivingMinutes, 60);
});

test("UTC+2 moves a late UTC segment across local midnight", () => {
  const result = projectCardStateToDeviceClock(card([{
    dateIso: "2026-09-23",
    dateLabel: "2026-09-23",
    drivingMinutes: 60,
    segments: [{ kind: "drive", startMinute: 1380, endMinute: 1440, minutes: 60, cardStatus: "inserted" }],
    events: [],
  }]), 120);
  assert.equal(result.historyDays.at(-1).dateIso, "2026-09-24");
  assert.deepEqual(
    { start: result.historyDays.at(-1).segments[0].startMinute, end: result.historyDays.at(-1).segments[0].endMinute },
    { start: 60, end: 120 },
  );
});

test("negative phone offset moves early UTC activity to previous local date", () => {
  const result = projectCardStateToDeviceClock(card([{
    dateIso: "2026-09-23",
    dateLabel: "2026-09-23",
    drivingMinutes: 30,
    segments: [{ kind: "drive", startMinute: 30, endMinute: 60, minutes: 30, cardStatus: "inserted" }],
    events: [],
  }]), -120);
  assert.equal(result.historyDays[0].dateIso, "2026-09-22");
  assert.equal(result.historyDays[0].segments[0].startMinute, 1350);
  assert.equal(result.historyDays[0].segments[0].endMinute, 1380);
});

test("projection does not mutate canonical stored card state", () => {
  const original = card([{
    dateIso: "2026-09-23",
    dateLabel: "2026-09-23",
    drivingMinutes: 60,
    segments: [{ kind: "drive", startMinute: 600, endMinute: 660, minutes: 60, cardStatus: "inserted" }],
    events: [{ kind: "card-inserted", minute: 600 }],
  }]);
  const before = JSON.stringify(original);
  const projected = projectCardStateToDeviceClock(original, 120);
  assert.equal(JSON.stringify(original), before);
  assert.notEqual(projected, original);
  assert.equal(projected.historyDays[0].events[0].minute, 720);
});

test("device offset label is explicit", () => {
  assert.equal(formatDeviceUtcOffset(120), "UTC+02:00");
  assert.equal(formatDeviceUtcOffset(-330), "UTC-05:30");
});
