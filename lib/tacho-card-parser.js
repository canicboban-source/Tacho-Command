const ACTIVITY_NAMES = Object.freeze(["rest", "availability", "work", "driving"]);

function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (Array.isArray(input)) return Uint8Array.from(input);
  throw new TypeError("Expected byte-like input");
}

function u16(bytes, offset = 0) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32(bytes, offset = 0) {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  ) >>> 0;
}

function hexTag(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function parseDddTlv(input) {
  const bytes = toBytes(input);
  const objects = [];
  let offset = 0;

  while (offset < bytes.length) {
    if (bytes.length - offset < 5) {
      throw new Error(`Truncated DDD TLV header at offset ${offset}`);
    }
    const tag = hexTag(bytes.subarray(offset, offset + 3));
    const length = u16(bytes, offset + 3);
    if (length === 0xffff) {
      throw new Error(`Reserved DDD TLV length FFFF at offset ${offset}`);
    }
    const valueStart = offset + 5;
    const valueEnd = valueStart + length;
    if (valueEnd > bytes.length) {
      throw new Error(`Truncated DDD TLV value ${tag} at offset ${offset}`);
    }
    objects.push(Object.freeze({
      tag,
      fileId: tag.slice(0, 4),
      suffix: tag.slice(4, 6),
      offset,
      length,
      value: bytes.slice(valueStart, valueEnd),
    }));
    offset = valueEnd;
  }

  return Object.freeze(objects);
}

export function parseActivityChangeInfo(input) {
  let word;
  if (Number.isInteger(input)) {
    word = input;
  } else {
    const bytes = toBytes(input);
    if (bytes.length !== 2) throw new Error("ActivityChangeInfo must be exactly 2 bytes");
    word = u16(bytes, 0);
  }
  if (word < 0 || word > 0xffff) throw new RangeError("ActivityChangeInfo must be a 16-bit word");

  const slotBit = (word >>> 15) & 1;
  const statusBit = (word >>> 14) & 1;
  const cardStatusBit = (word >>> 13) & 1;
  const activityCode = (word >>> 11) & 0x03;
  const timeMinutes = word & 0x07ff;

  const inserted = cardStatusBit === 0;
  const followingKnown = inserted ? null : statusBit === 1;
  const activityRelevant = inserted || followingKnown;

  return Object.freeze({
    rawWord: word,
    slot: slotBit === 0 ? "driver" : "co-driver",
    cardStatus: inserted ? "inserted" : "not-inserted",
    drivingStatus: inserted ? (statusBit === 0 ? "single" : "crew") : null,
    followingActivityStatus: inserted ? null : (followingKnown ? "known" : "unknown"),
    activityCode,
    activity: activityRelevant ? ACTIVITY_NAMES[activityCode] : null,
    timeMinutes,
    timeValid: timeMinutes <= 1439,
  });
}

function readCircular(buffer, offset, length) {
  if (!Number.isInteger(offset) || offset < 0 || offset >= buffer.length) {
    throw new RangeError(`Circular offset ${offset} outside buffer`);
  }
  if (!Number.isInteger(length) || length < 0 || length > buffer.length) {
    throw new RangeError(`Circular length ${length} invalid for buffer ${buffer.length}`);
  }
  if (offset + length <= buffer.length) return buffer.slice(offset, offset + length);
  const first = buffer.slice(offset);
  const second = buffer.slice(0, length - first.length);
  const result = new Uint8Array(length);
  result.set(first, 0);
  result.set(second, first.length);
  return result;
}

export function parseCardActivityDailyRecord(input) {
  const bytes = toBytes(input);
  if (bytes.length < 12) throw new Error("CardActivityDailyRecord shorter than 12-byte header");

  const previousRecordLength = u16(bytes, 0);
  const recordLength = u16(bytes, 2);
  if (recordLength !== bytes.length) {
    throw new Error(`CardActivityDailyRecord length field ${recordLength} != actual ${bytes.length}`);
  }
  if ((recordLength - 12) % 2 !== 0) {
    throw new Error("CardActivityDailyRecord ActivityChangeInfo area is not 2-byte aligned");
  }

  const recordDateEpochSeconds = u32(bytes, 4);
  const recordDate = new Date(recordDateEpochSeconds * 1000);
  if (Number.isNaN(recordDate.getTime())) throw new Error("Invalid activity record date");
  const recordDateIso = recordDate.toISOString().slice(0, 10);

  const activityDailyPresenceCounter = u16(bytes, 8);
  const activityDayDistanceKm = u16(bytes, 10);
  const changes = [];
  let lastMinute = -1;

  for (let offset = 12; offset < recordLength; offset += 2) {
    const change = parseActivityChangeInfo(bytes.subarray(offset, offset + 2));
    if (!change.timeValid) {
      throw new Error(`ActivityChangeInfo minute ${change.timeMinutes} outside 0..1439`);
    }
    if (change.timeMinutes < lastMinute) {
      throw new Error("ActivityChangeInfo minutes are not monotonic");
    }
    lastMinute = change.timeMinutes;
    changes.push(change);
  }

  if (changes.length === 0 || changes[0].timeMinutes !== 0) {
    throw new Error("CardActivityDailyRecord must contain a 00:00 ActivityChangeInfo");
  }

  return Object.freeze({
    previousRecordLength,
    recordLength,
    recordDateEpochSeconds,
    recordDate: recordDateIso,
    activityDailyPresenceCounter,
    activityDayDistanceKm,
    changes: Object.freeze(changes),
  });
}

export function parseCardDriverActivity(input) {
  const bytes = toBytes(input);
  if (bytes.length < 16) throw new Error("CardDriverActivity is too short");

  const activityPointerOldestDayRecord = u16(bytes, 0);
  const activityPointerNewestRecord = u16(bytes, 2);
  const buffer = bytes.slice(4);

  for (const [name, pointer] of [
    ["oldest", activityPointerOldestDayRecord],
    ["newest", activityPointerNewestRecord],
  ]) {
    if (pointer >= buffer.length) {
      throw new Error(`${name} activity pointer ${pointer} outside ${buffer.length}-byte buffer`);
    }
  }

  const records = [];
  const seenPointers = new Set();
  let pointer = activityPointerOldestDayRecord;
  let previousLength = null;

  while (true) {
    if (seenPointers.has(pointer)) {
      throw new Error(`Circular activity traversal looped at pointer ${pointer}`);
    }
    seenPointers.add(pointer);

    const header = readCircular(buffer, pointer, 12);
    const recordLength = u16(header, 2);
    if (recordLength < 14 || recordLength > buffer.length || (recordLength - 12) % 2 !== 0) {
      throw new Error(`Invalid daily activity record length ${recordLength} at pointer ${pointer}`);
    }

    const recordBytes = readCircular(buffer, pointer, recordLength);
    const record = parseCardActivityDailyRecord(recordBytes);

    if (records.length === 0) {
      if (record.previousRecordLength !== 0) {
        throw new Error("Oldest activity record must have previousRecordLength = 0");
      }
    } else if (record.previousRecordLength !== previousLength) {
      throw new Error(
        `Activity previousRecordLength ${record.previousRecordLength} != previous record ${previousLength}`,
      );
    }

    records.push(Object.freeze({ ...record, pointer }));
    previousLength = record.recordLength;

    if (pointer === activityPointerNewestRecord) break;
    pointer = (pointer + record.recordLength) % buffer.length;

    if (records.length > Math.floor(buffer.length / 14) + 1) {
      throw new Error("Too many activity records for circular buffer");
    }
  }

  return Object.freeze({
    activityPointerOldestDayRecord,
    activityPointerNewestRecord,
    bufferLength: buffer.length,
    records: Object.freeze(records),
  });
}

export function extractDriverActivity(input, generation = "gen2") {
  const targetTag = generation === "gen1" ? "050400" : "050402";
  const objects = parseDddTlv(input);
  const block = objects.find((object) => object.tag === targetTag);
  if (!block) throw new Error(`DDD does not contain ${targetTag} Driver_Activity_Data`);
  return Object.freeze({
    generation,
    tag: targetTag,
    ...parseCardDriverActivity(block.value),
  });
}

export function buildActivitySegments(dailyRecord, endMinute = 1440) {
  if (!Number.isInteger(endMinute) || endMinute < 0 || endMinute > 1440) {
    throw new RangeError("endMinute must be an integer from 0 to 1440");
  }
  const changes = dailyRecord?.changes ?? [];
  const segments = [];

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index];
    if (change.timeMinutes >= endMinute) break;
    let nextMinute = endMinute;
    for (let nextIndex = index + 1; nextIndex < changes.length; nextIndex += 1) {
      if (changes[nextIndex].timeMinutes > change.timeMinutes) {
        nextMinute = Math.min(endMinute, changes[nextIndex].timeMinutes);
        break;
      }
    }
    if (nextMinute <= change.timeMinutes) continue;
    segments.push(Object.freeze({
      startMinute: change.timeMinutes,
      endMinute: nextMinute,
      durationMinutes: nextMinute - change.timeMinutes,
      activity: change.activity,
      slot: change.slot,
      cardStatus: change.cardStatus,
      drivingStatus: change.drivingStatus,
      followingActivityStatus: change.followingActivityStatus,
    }));
  }

  return Object.freeze(segments);
}

export function summarizeActivityMinutes(dailyRecord, endMinute = 1440) {
  const totals = { rest: 0, availability: 0, work: 0, driving: 0, unknown: 0 };
  for (const segment of buildActivitySegments(dailyRecord, endMinute)) {
    const key = segment.activity ?? "unknown";
    totals[key] += segment.durationMinutes;
  }
  return Object.freeze(totals);
}

function addUtcDays(dateIso, offset) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ISO date ${dateIso}`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function buildCalendarWindow(records, endDate, dayCount = 56) {
  if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 366) {
    throw new RangeError("dayCount must be between 1 and 366");
  }
  const recordByDate = new Map(records.map((record) => [record.recordDate, record]));
  const startDate = addUtcDays(endDate, -(dayCount - 1));
  const days = [];

  for (let index = 0; index < dayCount; index += 1) {
    const date = addUtcDays(startDate, index);
    days.push(Object.freeze({
      date,
      record: recordByDate.get(date) ?? null,
    }));
  }

  return Object.freeze({
    startDate,
    endDate,
    dayCount,
    days: Object.freeze(days),
  });
}
