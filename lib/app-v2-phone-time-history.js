// Presentation-only transformation. Never rewrite the UTC card source,
// golden card payload, stored snapshot, or the tachograph's native counters.
// Driver-card day dates and activity change minutes are anchored in UTC.
const MINUTE_MS = 60000;
const UTC_DAY_MS = 24 * 60 * MINUTE_MS;
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVITY_KINDS = new Set(["drive", "work", "availability", "rest"]);

export function getPhoneTimeZone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === "string" && zone ? zone : "UTC";
  } catch {
    return "UTC";
  }
}

function utcDayStart(value) {
  if (typeof value !== "string" || !VALID_DATE.test(value)) return null;
  const epoch = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(epoch) && new Date(epoch).toISOString().slice(0, 10) === value ? epoch : null;
}

function localParts(formatter, epoch) {
  const fields = {};
  for (const { type, value } of formatter.formatToParts(new Date(epoch))) {
    if (type === "year" || type === "month" || type === "day" || type === "hour" || type === "minute") {
      fields[type] = Number(value);
    }
  }
  if (![fields.year, fields.month, fields.day, fields.hour, fields.minute].every(Number.isInteger)) {
    throw new Error("Telefon nije potvrdio lokalno vreme.");
  }
  const hour = fields.hour % 24;
  const dateIso = String(fields.year).padStart(4, "0") + "-"
    + String(fields.month).padStart(2, "0") + "-"
    + String(fields.day).padStart(2, "0");
  const minute = hour * 60 + fields.minute;
  const offsetMinutes = (Date.UTC(fields.year, fields.month - 1, fields.day, hour, fields.minute) - epoch) / MINUTE_MS;
  return { dateIso, minute, offsetMinutes };
}

function appendSegment(day, kind, cardStatus, startMinute, duration) {
  const last = day.segments.at(-1);
  if (last && last.kind === kind && last.cardStatus === cardStatus && last.endMinute === startMinute
      && last.endMinute !== null) {
    last.endMinute += duration;
    last.minutes += duration;
  } else {
    day.segments.push({
      kind, cardStatus, startMinute,
      endMinute: startMinute + duration,
      minutes: duration,
    });
  }
}

/**
 * Project original UTC-dated card activity onto the phone's IANA time zone.
 * The projection is derived in memory on every zone change; source records
 * and localStorage remain untouched. The current UTC card day is clipped at
 * the instant the complete card read finished, avoiding invented future activity.
 *
 * This is for a driver-facing local clock, NOT legal time or tachograph UTC.
 */
export function projectCardHistoryToPhoneZone(card, {
  timeZone = getPhoneTimeZone(),
  capturedAtIso = card?.lastCardReadAtIso ?? null,
} = {}) {
  if (!card || !Array.isArray(card.historyDays) || !card.historyDays.length) return card;

  let formatter;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
  } catch {
    // Do not claim phone-local conversion when the zone cannot be resolved.
    return card;
  }

  const capturedEpoch = capturedAtIso === null ? NaN : Date.parse(capturedAtIso);
  const ceiling = Number.isFinite(capturedEpoch) ? Math.floor(capturedEpoch / MINUTE_MS) * MINUTE_MS : null;
  const dates = new Map();
  const offsetChanges = new Set();
  let lastOffset = null;
  let lastOffsetDay = null;
  let anyProjected = false;

  function ensureDay(dateIso) {
    let day = dates.get(dateIso);
    if (!day) {
      day = { dateIso, dateLabel: dateIso, segments: [], events: [] };
      dates.set(dateIso, day);
    }
    return day;
  }

  // This helper intentionally does not synthesize activity when a source
  // segment is not timestamped. The unmodified card will remain available.
  for (const day of card.historyDays) {
    const utcMidnight = utcDayStart(day?.dateIso ?? day?.dateLabel);
    if (utcMidnight === null || !Array.isArray(day.segments)) return card;

    for (const source of day.segments) {
      if (!ACTIVITY_KINDS.has(source?.kind)) continue;
      const start = Number(source.startMinute);
      const end = Number(source.endMinute);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 1440 || end <= start) {
        // Do not invent positions from an untimed or malformed source.
        return card;
      }
      let position = utcMidnight + start * MINUTE_MS;
      let limit = utcMidnight + end * MINUTE_MS;
      if (ceiling !== null) limit = Math.min(limit, ceiling);
      if (position >= limit) continue;

      while (position < limit) {
        const current = localParts(formatter, position);
        if (lastOffset !== null && lastOffset !== current.offsetMinutes) {
          if (lastOffsetDay) offsetChanges.add(lastOffsetDay);
          offsetChanges.add(current.dateIso);
        }
        lastOffset = current.offsetMinutes;
        lastOffsetDay = current.dateIso;

        // Fast path: append up to an hour if that span has neither a date
        // boundary nor a daylight-saving change; otherwise advance a minute.
        const remaining = Math.round((limit - position) / MINUTE_MS);
        let step = Math.min(60, remaining, 1440 - current.minute);
        if (step > 1) {
          const endPart = localParts(formatter, position + (step - 1) * MINUTE_MS);
          if (endPart.dateIso !== current.dateIso
              || endPart.offsetMinutes !== current.offsetMinutes
              || endPart.minute !== current.minute + step - 1) step = 1;
        }
        appendSegment(ensureDay(current.dateIso), source.kind, source.cardStatus ?? null, current.minute, step);
        position += step * MINUTE_MS;
        anyProjected = true;
      }
    }

    // Source events are UTC day-minute instants and must follow the same
    // local-day crossing as activities; suppress events after capture.
    for (const event of Array.isArray(day.events) ? day.events : []) {
      if (event?.kind !== "card-inserted" && event?.kind !== "card-removed") continue;
      if (!Number.isInteger(event.minute) || event.minute < 0 || event.minute > 1440) continue;
      const instant = utcMidnight + event.minute * MINUTE_MS;
      if (ceiling !== null && instant > ceiling) continue;
      const local = localParts(formatter, instant);
      const target = ensureDay(local.dateIso);
      if (!target.events.some((other) => other.kind === event.kind && other.minute === local.minute)) {
        target.events.push({ kind: event.kind, minute: local.minute });
      }
    }
  }
  if (!anyProjected) return card;

  const projected = [...dates.values()]
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
    .slice(-56)
    .map((day) => {
      day.segments.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
      const repeatedHour = day.segments.some((segment, index) =>
        index > 0 && segment.startMinute < day.segments[index - 1].endMinute
      );
      // In a DST fallback, two distinct instants have the same local clock
      // minute. A 24-hour bar cannot represent both without misleading users.
      const timelineAmbiguous = offsetChanges.has(day.dateIso) || repeatedHour;
      const segments = day.segments.map((segment) => Object.freeze(timelineAmbiguous
        ? { ...segment, startMinute: null, endMinute: null }
        : segment));
      const drivingMinutes = segments.filter((segment) => segment.kind === "drive")
        .reduce((sum, segment) => sum + segment.minutes, 0);
      return Object.freeze({
        dateIso: day.dateIso, dateLabel: day.dateLabel,
        drivingMinutes,
        segments: Object.freeze(segments),
        events: Object.freeze(day.events.sort((a, b) => a.minute - b.minute)
          .map((event) => Object.freeze(event))),
        localTimeAmbiguous: timelineAmbiguous,
      });
    });

  const last14 = projected.slice(-14);
  return Object.freeze({
    ...card,
    historyDays: Object.freeze(projected.reverse()),
    historyDaysAvailable: Math.min(56, projected.length),
    fortnightDrivingMinutes: last14.reduce((sum, day) => sum + day.drivingMinutes, 0),
  });
}
