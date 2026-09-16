import assert from "node:assert/strict";
import test from "node:test";

import {
  buildActivitySegments,
  buildCalendarWindow,
  extractDriverActivity,
  parseActivityChangeInfo,
  parseCardDriverActivity,
  parseDddTlv,
  summarizeActivityMinutes,
} from "../lib/tacho-card-parser.js";

const be16 = (value) => [(value >> 8) & 0xff, value & 0xff];
const be32 = (value) => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

const changeWord = ({ slot = 0, status = 0, card = 0, activity = 0, minute = 0 }) =>
  ((slot & 1) << 15) |
  ((status & 1) << 14) |
  ((card & 1) << 13) |
  ((activity & 3) << 11) |
  (minute & 0x07ff);

const dailyRecord = ({ previous = 0, date = "2026-09-15", distance = 123, changes }) => {
  const epoch = Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
  const length = 12 + changes.length * 2;
  return Uint8Array.from([
    ...be16(previous),
    ...be16(length),
    ...be32(epoch),
    ...be16(1),
    ...be16(distance),
    ...changes.flatMap((word) => be16(word)),
  ]);
};

const circularWrite = (buffer, offset, bytes) => {
  bytes.forEach((value, index) => {
    buffer[(offset + index) % buffer.length] = value;
  });
};

test("parses strict top-level DDD TLV objects", () => {
  const bytes = Uint8Array.from([
    0x05, 0x04, 0x02, 0x00, 0x03, 0xaa, 0xbb, 0xcc,
    0x05, 0x04, 0x03, 0x00, 0x02, 0x11, 0x22,
  ]);
  const objects = parseDddTlv(bytes);
  assert.equal(objects.length, 2);
  assert.equal(objects[0].tag, "050402");
  assert.equal(objects[0].fileId, "0504");
  assert.equal(objects[0].suffix, "02");
  assert.deepEqual(Array.from(objects[0].value), [0xaa, 0xbb, 0xcc]);
  assert.equal(objects[1].tag, "050403");
});

test("decodes ActivityChangeInfo bit fields for card recordings", () => {
  const driving = parseActivityChangeInfo(changeWord({ activity: 3, minute: 540 }));
  assert.deepEqual(
    {
      slot: driving.slot,
      cardStatus: driving.cardStatus,
      drivingStatus: driving.drivingStatus,
      followingActivityStatus: driving.followingActivityStatus,
      activity: driving.activity,
      timeMinutes: driving.timeMinutes,
    },
    {
      slot: "driver",
      cardStatus: "inserted",
      drivingStatus: "single",
      followingActivityStatus: null,
      activity: "driving",
      timeMinutes: 540,
    },
  );

  const manualWork = parseActivityChangeInfo(
    changeWord({ slot: 1, status: 1, card: 1, activity: 2, minute: 60 }),
  );
  assert.equal(manualWork.slot, "co-driver");
  assert.equal(manualWork.cardStatus, "not-inserted");
  assert.equal(manualWork.followingActivityStatus, "known");
  assert.equal(manualWork.activity, "work");
  assert.equal(manualWork.timeMinutes, 60);

  const unknown = parseActivityChangeInfo(
    changeWord({ status: 0, card: 1, activity: 3, minute: 120 }),
  );
  assert.equal(unknown.followingActivityStatus, "unknown");
  assert.equal(unknown.activity, null);
});

test("parses a wrapped CardDriverActivity daily record from the circular buffer", () => {
  const changes = [
    changeWord({ activity: 0, minute: 0 }),
    changeWord({ activity: 2, minute: 480 }),
    changeWord({ activity: 3, minute: 540 }),
  ];
  const record = dailyRecord({ changes });
  const buffer = new Uint8Array(64);
  const pointer = 54;
  circularWrite(buffer, pointer, record);

  const block = Uint8Array.from([
    ...be16(pointer),
    ...be16(pointer),
    ...buffer,
  ]);
  const parsed = parseCardDriverActivity(block);
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0].recordDate, "2026-09-15");
  assert.equal(parsed.records[0].activityDayDistanceKm, 123);
  assert.equal(parsed.records[0].changes.length, 3);
  assert.equal(parsed.records[0].changes[2].activity, "driving");
  assert.equal(parsed.records[0].changes[2].timeMinutes, 540);
});

test("follows the previous-record-length chain across multiple records", () => {
  const first = dailyRecord({
    date: "2026-09-14",
    changes: [
      changeWord({ activity: 0, minute: 0 }),
      changeWord({ activity: 2, minute: 480 }),
    ],
  });
  const second = dailyRecord({
    previous: first.length,
    date: "2026-09-15",
    changes: [
      changeWord({ activity: 0, minute: 0 }),
      changeWord({ activity: 3, minute: 540 }),
    ],
  });
  const buffer = new Uint8Array(80);
  const oldest = 60;
  circularWrite(buffer, oldest, first);
  const newest = (oldest + first.length) % buffer.length;
  circularWrite(buffer, newest, second);

  const block = Uint8Array.from([...be16(oldest), ...be16(newest), ...buffer]);
  const parsed = parseCardDriverActivity(block);
  assert.deepEqual(parsed.records.map((record) => record.recordDate), [
    "2026-09-14",
    "2026-09-15",
  ]);
});

test("builds activity segments and minute totals without guessing unknown card-out activity", () => {
  const record = {
    changes: [
      parseActivityChangeInfo(changeWord({ activity: 0, minute: 0 })),
      parseActivityChangeInfo(changeWord({ activity: 2, minute: 480 })),
      parseActivityChangeInfo(changeWord({ status: 0, card: 1, activity: 3, minute: 600 })),
      parseActivityChangeInfo(changeWord({ status: 1, card: 1, activity: 0, minute: 660 })),
    ],
  };
  const segments = buildActivitySegments(record, 720);
  assert.deepEqual(segments.map((segment) => [segment.activity, segment.durationMinutes]), [
    ["rest", 480],
    ["work", 120],
    [null, 60],
    ["rest", 60],
  ]);
  assert.deepEqual(summarizeActivityMinutes(record, 720), {
    rest: 540,
    availability: 0,
    work: 120,
    driving: 0,
    unknown: 60,
  });
});

test("creates an inclusive 56-day calendar window and preserves days without a record", () => {
  const records = [
    { recordDate: "2026-09-15", marker: "a" },
    { recordDate: "2026-09-16", marker: "b" },
  ];
  const window = buildCalendarWindow(records, "2026-09-16", 56);
  assert.equal(window.startDate, "2026-07-23");
  assert.equal(window.endDate, "2026-09-16");
  assert.equal(window.days.length, 56);
  assert.equal(window.days.at(-1).record.marker, "b");
  assert.equal(window.days.at(-3).record, null);
});

test("extracts the Gen2 Driver_Activity_Data TLV by exact tag", () => {
  const record = dailyRecord({
    changes: [
      changeWord({ activity: 0, minute: 0 }),
      changeWord({ activity: 3, minute: 600 }),
    ],
  });
  const buffer = new Uint8Array(64);
  circularWrite(buffer, 0, record);
  const value = Uint8Array.from([...be16(0), ...be16(0), ...buffer]);
  const tlv = Uint8Array.from([
    0x05, 0x04, 0x02,
    ...be16(value.length),
    ...value,
  ]);
  const parsed = extractDriverActivity(tlv, "gen2");
  assert.equal(parsed.tag, "050402");
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0].changes[1].activity, "driving");
});
