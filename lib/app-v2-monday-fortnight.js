const DAY_MS = 86_400_000;

function localDateIso(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter(({ type }) => type !== "literal")
    .map(({ type, value }) => [type, value]));
  return values.year + "-" + values.month + "-" + values.day;
}

/**
 * Two calendar weeks means last Monday 00:00 through the current local day:
 * previous Monday + current week, not the rolling last 14 card records.
 * Compute from the phone's local date. The card's validated daily totals
 * remain unchanged and only days actually present on the card are counted.
 */
export function previousMondayIso(now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const date = localDateIso(now, timeZone);
  const current = Date.parse(date + "T00:00:00.000Z");
  if (!Number.isFinite(current)) throw new Error("Nije moguće odrediti datum telefona.");
  const weekday = new Date(current).getUTCDay(); // Sun=0, Mon=1
  const daysFromMonday = (weekday + 6) % 7;
  return new Date(current - (daysFromMonday + 7) * DAY_MS).toISOString().slice(0, 10);
}

export function calendarFortnightFromMonday(historyDays, {
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
} = {}) {
  if (!Array.isArray(historyDays) || historyDays.length === 0) return null;
  const begin = previousMondayIso(now, timeZone);
  const today = localDateIso(now, timeZone);
  const uniqueDates = new Set();
  let total = 0;
  for (const day of historyDays) {
    const date = day?.dateIso ?? day?.dateLabel;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (date < begin || date > today) continue;
    if (uniqueDates.has(date)) continue;
    const minutes = Number(day.drivingMinutes);
    if (!Number.isFinite(minutes) || minutes < 0) return null;
    uniqueDates.add(date);
    total += minutes;
  }
  // A shorter or incomplete card history cannot silently stand in for 2 weeks.
  // A day with zero driving is still represented by an explicit daily record.
  if (!uniqueDates.has(begin)) return null;
  return Math.round(total);
}
