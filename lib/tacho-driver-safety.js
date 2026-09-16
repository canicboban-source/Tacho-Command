const MINUTES = Object.freeze({
  warningContinuousDrive: 4 * 60 + 15,
  legalContinuousDrive: 4 * 60 + 30,
  qualifyingFullBreak: 45,
  splitBreakFirst: 15,
  splitBreakSecond: 30,
  weeklyDrive: 56 * 60,
  fortnightDrive: 90 * 60,
});

export const LEGAL_PROFILES = Object.freeze({
  UNKNOWN: "unknown",
  EU_561_STANDARD: "eu-561-standard",
  REGULAR_PASSENGER_LE_50KM: "regular-passenger-le-50km",
});

function isoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`Expected ISO calendar date, got ${String(value)}`);
  }
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`Invalid ISO calendar date ${value}`);
  }
  return value;
}

function dayNumber(value) {
  return Math.floor(new Date(`${isoDate(value)}T00:00:00Z`).getTime() / 86400000);
}

function dateFromDayNumber(day) {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

function mondayOf(date) {
  const d = new Date(`${isoDate(date)}T00:00:00Z`);
  const weekday = d.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function nextMonday(date) {
  return dateFromDayNumber(dayNumber(mondayOf(date)) + 7);
}

function assertActivity(activity) {
  if (!["rest", "availability", "work", "driving", null].includes(activity)) {
    throw new TypeError(`Unknown activity ${String(activity)}`);
  }
}

function normalizeDays(days) {
  if (!Array.isArray(days)) throw new TypeError("days must be an array");
  const normalized = days.map((day) => {
    const date = isoDate(day?.date);
    if (!Array.isArray(day?.segments)) throw new TypeError(`segments missing for ${date}`);
    let lastEnd = 0;
    const segments = day.segments.map((segment) => {
      const startMinute = Number(segment?.startMinute);
      const endMinute = Number(segment?.endMinute);
      assertActivity(segment?.activity ?? null);
      if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute)
          || startMinute < 0 || endMinute > 1440 || endMinute <= startMinute) {
        throw new RangeError(`Invalid segment ${startMinute}..${endMinute} on ${date}`);
      }
      if (startMinute < lastEnd) throw new Error(`Overlapping segments on ${date}`);
      lastEnd = endMinute;
      return Object.freeze({
        startMinute,
        endMinute,
        activity: segment?.activity ?? null,
      });
    });
    return Object.freeze({ date, segments: Object.freeze(segments) });
  });
  for (let i = 1; i < normalized.length; i += 1) {
    if (dayNumber(normalized[i].date) <= dayNumber(normalized[i - 1].date)) {
      throw new Error("days must be strictly chronological");
    }
  }
  return Object.freeze(normalized);
}

function absoluteMinute(date, minute) {
  return dayNumber(date) * 1440 + minute;
}

function splitAbsoluteMinute(value) {
  const day = Math.floor(value / 1440);
  const minute = value - day * 1440;
  return Object.freeze({ date: dateFromDayNumber(day), minute });
}

export function flattenActivityDays(days) {
  const normalized = normalizeDays(days);
  const result = [];
  for (const day of normalized) {
    for (const segment of day.segments) {
      result.push(Object.freeze({
        date: day.date,
        startMinute: segment.startMinute,
        endMinute: segment.endMinute,
        startAbsoluteMinute: absoluteMinute(day.date, segment.startMinute),
        endAbsoluteMinute: absoluteMinute(day.date, segment.endMinute),
        durationMinutes: segment.endMinute - segment.startMinute,
        activity: segment.activity,
      }));
    }
  }
  return Object.freeze(result);
}

export function analyzeContinuousDriving(days, options = {}) {
  const warningAt = Number.isInteger(options.warningAtMinutes)
    ? options.warningAtMinutes : MINUTES.warningContinuousDrive;
  const legalLimit = Number.isInteger(options.legalLimitMinutes)
    ? options.legalLimitMinutes : MINUTES.legalContinuousDrive;
  if (warningAt < 1 || warningAt >= legalLimit) {
    throw new RangeError("warningAtMinutes must be positive and below legalLimitMinutes");
  }

  const segments = flattenActivityDays(days);
  let drivingMinutes = 0;
  let splitBreakArmed = false;
  let warned = false;
  let exceeded = false;
  const alerts = [];
  const resets = [];

  const addThresholdEvent = (segment, threshold, kind) => {
    const before = drivingMinutes;
    const after = before + segment.durationMinutes;
    if (before < threshold && after >= threshold) {
      const atAbs = segment.startAbsoluteMinute + (threshold - before);
      const at = splitAbsoluteMinute(atAbs);
      alerts.push(Object.freeze({
        kind,
        atDate: at.date,
        atMinute: at.minute,
        accumulatedDrivingMinutes: threshold,
      }));
    }
  };

  for (const segment of segments) {
    if (segment.activity === "driving") {
      addThresholdEvent(segment, warningAt, "continuous-driving-warning");
      addThresholdEvent(segment, legalLimit + 1, "continuous-driving-exceeded");
      const before = drivingMinutes;
      drivingMinutes += segment.durationMinutes;
      if (before < warningAt && drivingMinutes >= warningAt) warned = true;
      if (drivingMinutes > legalLimit) exceeded = true;
      continue;
    }

    if (segment.activity !== "rest") continue;
    const duration = segment.durationMinutes;
    let resetReason = null;
    if (duration >= MINUTES.qualifyingFullBreak) {
      resetReason = "full-45";
    } else if (duration >= MINUTES.splitBreakSecond && splitBreakArmed) {
      resetReason = "split-15-plus-30";
    } else if (duration >= MINUTES.splitBreakFirst) {
      splitBreakArmed = true;
    }

    if (resetReason) {
      resets.push(Object.freeze({
        date: segment.date,
        startMinute: segment.startMinute,
        durationMinutes: duration,
        reason: resetReason,
        drivingMinutesBeforeReset: drivingMinutes,
      }));
      drivingMinutes = 0;
      splitBreakArmed = false;
      warned = false;
      exceeded = false;
    }
  }

  return Object.freeze({
    warningAtMinutes: warningAt,
    legalLimitMinutes: legalLimit,
    currentDrivingSinceQualifyingBreakMinutes: drivingMinutes,
    warningActive: warned && !exceeded,
    exceeded: drivingMinutes > legalLimit,
    splitBreakArmed,
    alerts: Object.freeze(alerts),
    resets: Object.freeze(resets),
  });
}

function dailyDrivingTotals(days) {
  const totals = new Map();
  for (const segment of flattenActivityDays(days)) {
    if (segment.activity !== "driving") continue;
    totals.set(segment.date, (totals.get(segment.date) ?? 0) + segment.durationMinutes);
  }
  return totals;
}

export function summarizeCalendarDriving(days) {
  const totals = dailyDrivingTotals(days);
  return Object.freeze([...totals.entries()].map(([date, drivingMinutes]) => Object.freeze({
    date,
    drivingMinutes,
  })));
}

export function summarizeWeeklyDriving(days) {
  const totals = dailyDrivingTotals(days);
  const weeks = new Map();
  for (const [date, minutes] of totals) {
    const monday = mondayOf(date);
    weeks.set(monday, (weeks.get(monday) ?? 0) + minutes);
  }
  return Object.freeze([...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStartDate, drivingMinutes]) => Object.freeze({
      weekStartDate,
      weekEndDate: dateFromDayNumber(dayNumber(weekStartDate) + 6),
      drivingMinutes,
    })));
}

export function evaluateEu561WeeklyDriving(days) {
  const weeks = summarizeWeeklyDriving(days);
  const alerts = [];
  for (const week of weeks) {
    if (week.drivingMinutes > MINUTES.weeklyDrive) {
      alerts.push(Object.freeze({
        kind: "weekly-driving-exceeded",
        weekStartDate: week.weekStartDate,
        drivingMinutes: week.drivingMinutes,
        limitMinutes: MINUTES.weeklyDrive,
      }));
    }
  }
  for (let i = 0; i + 1 < weeks.length; i += 1) {
    if (weeks[i + 1].weekStartDate !== nextMonday(weeks[i].weekStartDate)) continue;
    const total = weeks[i].drivingMinutes + weeks[i + 1].drivingMinutes;
    if (total > MINUTES.fortnightDrive) {
      alerts.push(Object.freeze({
        kind: "fortnight-driving-exceeded",
        firstWeekStartDate: weeks[i].weekStartDate,
        secondWeekStartDate: weeks[i + 1].weekStartDate,
        drivingMinutes: total,
        limitMinutes: MINUTES.fortnightDrive,
      }));
    }
  }
  return Object.freeze({ weeks, alerts: Object.freeze(alerts) });
}

export function evaluateDriverSafety(days, options = {}) {
  const legalProfile = options.legalProfile ?? LEGAL_PROFILES.UNKNOWN;
  if (!Object.values(LEGAL_PROFILES).includes(legalProfile)) {
    throw new TypeError(`Unsupported legal profile ${String(legalProfile)}`);
  }

  const continuousDriving = analyzeContinuousDriving(days, options);
  const legalAlerts = [];
  const scopeAlerts = [];

  if (legalProfile === LEGAL_PROFILES.EU_561_STANDARD) {
    for (const alert of continuousDriving.alerts) {
      if (alert.kind === "continuous-driving-exceeded") legalAlerts.push(alert);
    }
    legalAlerts.push(...evaluateEu561WeeklyDriving(days).alerts);
  } else if (legalProfile === LEGAL_PROFILES.REGULAR_PASSENGER_LE_50KM) {
    scopeAlerts.push(Object.freeze({
      kind: "eu-561-not-applicable-regular-passenger-le-50km",
      message: "EU 561/2006 legal verdicts are disabled; apply the relevant national rules profile.",
    }));
  } else {
    scopeAlerts.push(Object.freeze({
      kind: "legal-profile-required",
      message: "Select the applicable legal regime before classifying legal infringements.",
    }));
  }

  const operationalAlerts = continuousDriving.alerts
    .filter((alert) => alert.kind === "continuous-driving-warning");

  return Object.freeze({
    legalProfile,
    continuousDriving,
    operationalAlerts: Object.freeze(operationalAlerts),
    legalAlerts: Object.freeze(legalAlerts),
    scopeAlerts: Object.freeze(scopeAlerts),
    weeklyDriving: summarizeWeeklyDriving(days),
    limits: MINUTES,
  });
}
