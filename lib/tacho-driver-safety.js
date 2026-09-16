const MINUTES = Object.freeze({
  euWarningContinuousDrive: 4 * 60 + 15,
  euLegalContinuousDrive: 4 * 60 + 30,
  euQualifyingFullBreak: 45,
  euSplitBreakFirst: 15,
  euSplitBreakSecond: 30,
  atRegionalWarningContinuousDrive: 3 * 60 + 45,
  atRegionalLegalContinuousDrive: 4 * 60,
  atRegionalQualifyingFullBreak: 30,
  atRegionalSplitBreak20: 20,
  atRegionalSplitBreak15: 15,
  weeklyDrive: 56 * 60,
  fortnightDrive: 90 * 60,
});

export const LEGAL_PROFILES = Object.freeze({
  UNKNOWN: "unknown",
  EU_561_STANDARD: "eu-561-standard",
  REGULAR_PASSENGER_LE_50KM: "regular-passenger-le-50km",
  AT_REGIONAL_PASSENGER_LE_50KM: "at-regional-passenger-le-50km",
});

const BREAK_PROFILES = Object.freeze({
  EU_561: "eu-561",
  AT_REGIONAL_PASSENGER_LE_50KM: "at-regional-passenger-le-50km",
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
  const breakProfile = options.breakProfile ?? BREAK_PROFILES.EU_561;
  if (!Object.values(BREAK_PROFILES).includes(breakProfile)) {
    throw new TypeError(`Unsupported break profile ${String(breakProfile)}`);
  }

  const profileDefaults = breakProfile === BREAK_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM
    ? {
        warningAt: MINUTES.atRegionalWarningContinuousDrive,
        legalLimit: MINUTES.atRegionalLegalContinuousDrive,
      }
    : {
        warningAt: MINUTES.euWarningContinuousDrive,
        legalLimit: MINUTES.euLegalContinuousDrive,
      };

  const warningAt = Number.isInteger(options.warningAtMinutes)
    ? options.warningAtMinutes : profileDefaults.warningAt;
  const legalLimit = Number.isInteger(options.legalLimitMinutes)
    ? options.legalLimitMinutes : profileDefaults.legalLimit;
  if (warningAt < 1 || warningAt >= legalLimit) {
    throw new RangeError("warningAtMinutes must be positive and below legalLimitMinutes");
  }

  const segments = flattenActivityDays(days);
  let drivingMinutes = 0;
  let euSplitBreakArmed = false;
  let atBreak15Count = 0;
  let atBreak20Count = 0;
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

  const applyReset = (segment, reason) => {
    resets.push(Object.freeze({
      date: segment.date,
      startMinute: segment.startMinute,
      durationMinutes: segment.durationMinutes,
      reason,
      drivingMinutesBeforeReset: drivingMinutes,
    }));
    drivingMinutes = 0;
    euSplitBreakArmed = false;
    atBreak15Count = 0;
    atBreak20Count = 0;
    warned = false;
    exceeded = false;
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

    if (breakProfile === BREAK_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM) {
      if (duration >= MINUTES.atRegionalQualifyingFullBreak) {
        applyReset(segment, "at-full-30-plus");
        continue;
      }
      if (duration >= MINUTES.atRegionalSplitBreak20) {
        atBreak20Count += 1;
        atBreak15Count += 1;
      } else if (duration >= MINUTES.atRegionalSplitBreak15) {
        atBreak15Count += 1;
      }
      if (atBreak20Count >= 2) {
        applyReset(segment, "at-2x20");
      } else if (atBreak15Count >= 3) {
        applyReset(segment, "at-3x15");
      }
      continue;
    }

    let resetReason = null;
    if (duration >= MINUTES.euQualifyingFullBreak) {
      resetReason = "full-45";
    } else if (duration >= MINUTES.euSplitBreakSecond && euSplitBreakArmed) {
      resetReason = "split-15-plus-30";
    } else if (duration >= MINUTES.euSplitBreakFirst) {
      euSplitBreakArmed = true;
    }

    if (resetReason) applyReset(segment, resetReason);
  }

  return Object.freeze({
    breakProfile,
    warningAtMinutes: warningAt,
    legalLimitMinutes: legalLimit,
    currentDrivingSinceQualifyingBreakMinutes: drivingMinutes,
    warningActive: warned && !exceeded,
    exceeded: drivingMinutes > legalLimit,
    splitBreakArmed: breakProfile === BREAK_PROFILES.EU_561 ? euSplitBreakArmed : false,
    atRegionalBreakProgress: breakProfile === BREAK_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM
      ? Object.freeze({ qualifying15MinuteParts: atBreak15Count, qualifying20MinuteParts: atBreak20Count })
      : null,
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

  const isAtRegional = legalProfile === LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM;
  const continuousDriving = analyzeContinuousDriving(days, {
    ...options,
    breakProfile: isAtRegional
      ? BREAK_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM
      : BREAK_PROFILES.EU_561,
  });
  const legalAlerts = [];
  const scopeAlerts = [];

  if (legalProfile === LEGAL_PROFILES.EU_561_STANDARD) {
    for (const alert of continuousDriving.alerts) {
      if (alert.kind === "continuous-driving-exceeded") legalAlerts.push(alert);
    }
    legalAlerts.push(...evaluateEu561WeeklyDriving(days).alerts);
  } else if (legalProfile === LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM) {
    for (const alert of continuousDriving.alerts) {
      if (alert.kind === "continuous-driving-exceeded") legalAlerts.push(alert);
    }
    scopeAlerts.push(Object.freeze({
      kind: "at-regional-passenger-le-50km-profile-active",
      message: "Austrian regional line <=50 km break rules active: 4h driving; 30+ min, 2x20, or 3x15 qualifying break patterns.",
    }));
  } else if (legalProfile === LEGAL_PROFILES.REGULAR_PASSENGER_LE_50KM) {
    scopeAlerts.push(Object.freeze({
      kind: "eu-561-not-applicable-regular-passenger-le-50km",
      message: "EU 561/2006 legal verdicts are disabled; select the relevant national rules profile.",
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
