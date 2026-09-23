function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clampOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(-14 * 60, Math.min(14 * 60, Math.round(parsed)));
}

function dateIsoFromShiftedMinute(absoluteMinute) {
  return new Date(absoluteMinute * 60 * 1000).toISOString().slice(0, 10);
}

function minuteOfShiftedDay(absoluteMinute) {
  const date = new Date(absoluteMinute * 60 * 1000);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function baseUtcMinute(dateIso) {
  const parsed = Date.parse(String(dateIso) + "T00:00:00.000Z");
  return Number.isFinite(parsed) ? Math.floor(parsed / 60000) : null;
}

function appendSegment(dayMap, dateIso, segment) {
  let day = dayMap.get(dateIso);
  if (!day) {
    day = { dateIso, dateLabel: dateIso, segments: [], events: [] };
    dayMap.set(dateIso, day);
  }

  const previous = day.segments.at(-1);
  if (
    previous
    && previous.kind === segment.kind
    && previous.cardStatus === segment.cardStatus
    && previous.label === segment.label
    && previous.endMinute === segment.startMinute
  ) {
    previous.endMinute = segment.endMinute;
    previous.minutes += segment.minutes;
    return;
  }
  day.segments.push({ ...segment });
}

function appendEvent(dayMap, dateIso, event) {
  let day = dayMap.get(dateIso);
  if (!day) {
    day = { dateIso, dateLabel: dateIso, segments: [], events: [] };
    dayMap.set(dateIso, day);
  }
  if (!day.events.some((item) => item.kind === event.kind && item.minute === event.minute)) {
    day.events.push({ ...event });
  }
}

export function currentDeviceUtcOffsetMinutes() {
  return -new Date().getTimezoneOffset();
}

export function formatDeviceUtcOffset(offsetMinutes = currentDeviceUtcOffsetMinutes()) {
  const offset = clampOffset(offsetMinutes);
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  return "UTC" + sign + String(Math.floor(absolute / 60)).padStart(2, "0")
    + ":" + String(absolute % 60).padStart(2, "0");
}

/**
 * Card activity dates/minutes are kept canonical in storage. This function
 * projects them only for presentation using the phone's current UTC offset.
 * Re-running it after a phone time-zone change immediately reprojects the UI.
 */
export function projectCardStateToDeviceClock(cardState = {}, offsetMinutes = 0) {
  if (!plainObject(cardState) || !Array.isArray(cardState.historyDays)) return cardState;
  const offset = clampOffset(offsetMinutes);
  if (offset === 0) return cardState;

  const dayMap = new Map();

  for (const rawDay of cardState.historyDays) {
    if (!plainObject(rawDay)) continue;
    const dateIso = typeof rawDay.dateIso === "string"
      ? rawDay.dateIso
      : typeof rawDay.dateLabel === "string" ? rawDay.dateLabel : null;
    const base = dateIso ? baseUtcMinute(dateIso) : null;
    if (base === null) continue;

    for (const rawSegment of Array.isArray(rawDay.segments) ? rawDay.segments : []) {
      if (!plainObject(rawSegment)) continue;
      const start = Number(rawSegment.startMinute);
      const end = Number(rawSegment.endMinute);
      if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) continue;

      let cursor = base + start + offset;
      const shiftedEnd = base + end + offset;

      while (cursor < shiftedEnd) {
        const date = dateIsoFromShiftedMinute(cursor);
        const minute = minuteOfShiftedDay(cursor);
        const untilMidnight = cursor + (1440 - minute);
        const chunkEnd = Math.min(shiftedEnd, untilMidnight);
        const endMinute = minute + (chunkEnd - cursor);
        appendSegment(dayMap, date, {
          kind: rawSegment.kind,
          minutes: chunkEnd - cursor,
          startMinute: minute,
          endMinute,
          cardStatus: rawSegment.cardStatus ?? null,
          label: rawSegment.label ?? null,
        });
        cursor = chunkEnd;
      }
    }

    for (const rawEvent of Array.isArray(rawDay.events) ? rawDay.events : []) {
      if (!plainObject(rawEvent) || !Number.isInteger(rawEvent.minute)) continue;
      const shifted = base + rawEvent.minute + offset;
      appendEvent(dayMap, dateIsoFromShiftedMinute(shifted), {
        kind: rawEvent.kind,
        minute: minuteOfShiftedDay(shifted),
      });
    }
  }

  const dates = [...dayMap.keys()].sort();
  if (!dates.length) return cardState;

  const projected = dates.map((dateIso) => {
    const day = dayMap.get(dateIso);
    day.segments.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
    day.events.sort((a, b) => a.minute - b.minute);
    const drivingMinutes = day.segments
      .filter((segment) => segment.kind === "drive")
      .reduce((sum, segment) => sum + segment.minutes, 0);
    return Object.freeze({
      dateIso,
      dateLabel: dateIso,
      drivingMinutes,
      segments: Object.freeze(day.segments.map((segment) => Object.freeze(segment))),
      events: Object.freeze(day.events.map((event) => Object.freeze(event))),
    });
  }).slice(-56);

  const fortnightDrivingMinutes = projected.slice(-14)
    .reduce((sum, day) => sum + day.drivingMinutes, 0);

  return Object.freeze({
    ...cardState,
    historyDays: Object.freeze(projected),
    historyDaysAvailable: projected.length,
    historyRangeStartIso: projected[0]?.dateIso ?? null,
    historyRangeEndIso: projected.at(-1)?.dateIso ?? null,
    fortnightDrivingMinutes,
    deviceClockUtcOffsetMinutes: offset,
  });
}
