import assert from "node:assert/strict";
import test from "node:test";
import {
  LEGAL_PROFILES,
  analyzeContinuousDriving,
  evaluateDriverSafety,
  evaluateEu561WeeklyDriving,
} from "../lib/tacho-driver-safety.js";

const day = (date, segments) => ({ date, segments });
const seg = (startMinute, endMinute, activity) => ({ startMinute, endMinute, activity });

test("4h15 is an operational warning and not yet a legal exceedance", () => {
  const days = [day("2026-09-16", [seg(0, 255, "driving")])];
  const result = evaluateDriverSafety(days, { legalProfile: LEGAL_PROFILES.EU_561_STANDARD });
  assert.equal(result.operationalAlerts.length, 1);
  assert.equal(result.operationalAlerts[0].kind, "continuous-driving-warning");
  assert.equal(result.legalAlerts.length, 0);
  assert.equal(result.continuousDriving.warningActive, true);
});

test("4h30 exactly is not exceeded, minute 271 is", () => {
  const exact = analyzeContinuousDriving([day("2026-09-16", [seg(0, 270, "driving")])]);
  assert.equal(exact.exceeded, false);
  assert.equal(exact.alerts.some((x) => x.kind === "continuous-driving-exceeded"), false);

  const over = evaluateDriverSafety([day("2026-09-16", [seg(0, 271, "driving")])], {
    legalProfile: LEGAL_PROFILES.EU_561_STANDARD,
  });
  assert.equal(over.legalAlerts.some((x) => x.kind === "continuous-driving-exceeded"), true);
});

test("45 minute rest resets accumulated driving", () => {
  const result = analyzeContinuousDriving([day("2026-09-16", [
    seg(0, 200, "driving"), seg(200, 245, "rest"), seg(245, 445, "driving"),
  ])]);
  assert.equal(result.currentDrivingSinceQualifyingBreakMinutes, 200);
  assert.equal(result.alerts.filter((x) => x.kind === "continuous-driving-warning").length, 0);
});

test("15 then 30 split rest resets, but 30 alone only arms first part", () => {
  const split = analyzeContinuousDriving([day("2026-09-16", [
    seg(0, 160, "driving"), seg(160, 175, "rest"), seg(175, 250, "driving"),
    seg(250, 280, "rest"), seg(280, 380, "driving"),
  ])]);
  assert.equal(split.currentDrivingSinceQualifyingBreakMinutes, 100);
  assert.equal(split.resets.some((x) => x.reason === "split-15-plus-30"), true);

  const thirtyOnly = analyzeContinuousDriving([day("2026-09-16", [
    seg(0, 160, "driving"), seg(160, 190, "rest"), seg(190, 290, "driving"),
  ])]);
  assert.equal(thirtyOnly.currentDrivingSinceQualifyingBreakMinutes, 260);
  assert.equal(thirtyOnly.warningActive, true);
});

test("other work and availability do not reset Article 7 driving accumulation", () => {
  const result = analyzeContinuousDriving([day("2026-09-16", [
    seg(0, 150, "driving"), seg(150, 180, "work"), seg(180, 200, "availability"), seg(200, 306, "driving"),
  ])]);
  assert.equal(result.currentDrivingSinceQualifyingBreakMinutes, 256);
  assert.equal(result.warningActive, true);
});

test("EU legal verdicts are disabled for regular passenger routes <=50 km without national profile", () => {
  const result = evaluateDriverSafety([day("2026-09-16", [seg(0, 400, "driving")])], {
    legalProfile: LEGAL_PROFILES.REGULAR_PASSENGER_LE_50KM,
  });
  assert.equal(result.legalAlerts.length, 0);
  assert.equal(result.scopeAlerts[0].kind, "eu-561-not-applicable-regular-passenger-le-50km");
  assert.equal(result.operationalAlerts.length, 1);
});

test("unknown legal scope suppresses infringement verdicts", () => {
  const result = evaluateDriverSafety([day("2026-09-16", [seg(0, 400, "driving")])]);
  assert.equal(result.legalAlerts.length, 0);
  assert.equal(result.scopeAlerts[0].kind, "legal-profile-required");
});

test("weekly 56h and two-week 90h limits are evaluated only on consecutive calendar weeks", () => {
  const days = [];
  for (let i = 0; i < 7; i += 1) days.push(day(`2026-08-${String(3 + i).padStart(2, "0")}`, [seg(0, 480, "driving")]));
  for (let i = 0; i < 5; i += 1) days.push(day(`2026-08-${String(10 + i).padStart(2, "0")}`, [seg(0, 480, "driving")]));
  const result = evaluateEu561WeeklyDriving(days);
  assert.equal(result.alerts.some((x) => x.kind === "weekly-driving-exceeded"), false);
  assert.equal(result.alerts.some((x) => x.kind === "fortnight-driving-exceeded"), true);
});

test("Austrian regional <=50 km profile warns at 3h45 and exceeds only after 4h", () => {
  const warning = evaluateDriverSafety([day("2026-09-16", [seg(0, 225, "driving")])], {
    legalProfile: LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM,
  });
  assert.equal(warning.continuousDriving.warningAtMinutes, 225);
  assert.equal(warning.continuousDriving.legalLimitMinutes, 240);
  assert.equal(warning.operationalAlerts.length, 1);
  assert.equal(warning.legalAlerts.length, 0);

  const exact = evaluateDriverSafety([day("2026-09-16", [seg(0, 240, "driving")])], {
    legalProfile: LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM,
  });
  assert.equal(exact.legalAlerts.length, 0);

  const over = evaluateDriverSafety([day("2026-09-16", [seg(0, 241, "driving")])], {
    legalProfile: LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM,
  });
  assert.equal(over.legalAlerts.some((x) => x.kind === "continuous-driving-exceeded"), true);
});

test("Austrian regional profile accepts a single 30, 40 or 45 minute break", () => {
  for (const breakMinutes of [30, 40, 45]) {
    const result = evaluateDriverSafety([day("2026-09-16", [
      seg(0, 180, "driving"),
      seg(180, 180 + breakMinutes, "rest"),
      seg(180 + breakMinutes, 280 + breakMinutes, "driving"),
    ])], { legalProfile: LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM });
    assert.equal(result.continuousDriving.currentDrivingSinceQualifyingBreakMinutes, 100);
    assert.equal(result.continuousDriving.resets.some((x) => x.reason === "at-full-30-plus"), true);
  }
});

test("Austrian regional profile accepts 2x20 minute split breaks", () => {
  const result = evaluateDriverSafety([day("2026-09-16", [
    seg(0, 90, "driving"), seg(90, 110, "rest"),
    seg(110, 180, "driving"), seg(180, 200, "rest"),
    seg(200, 260, "driving"),
  ])], { legalProfile: LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM });
  assert.equal(result.continuousDriving.currentDrivingSinceQualifyingBreakMinutes, 60);
  assert.equal(result.continuousDriving.resets.some((x) => x.reason === "at-2x20"), true);
});

test("Austrian regional profile accepts 3x15 minute split breaks", () => {
  const result = evaluateDriverSafety([day("2026-09-16", [
    seg(0, 60, "driving"), seg(60, 75, "rest"),
    seg(75, 135, "driving"), seg(135, 150, "rest"),
    seg(150, 210, "driving"), seg(210, 225, "rest"),
    seg(225, 285, "driving"),
  ])], { legalProfile: LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM });
  assert.equal(result.continuousDriving.currentDrivingSinceQualifyingBreakMinutes, 60);
  assert.equal(result.continuousDriving.resets.some((x) => x.reason === "at-3x15"), true);
});

test("Austrian regional profile does not reset on an incomplete split", () => {
  const result = evaluateDriverSafety([day("2026-09-16", [
    seg(0, 90, "driving"), seg(90, 110, "rest"),
    seg(110, 190, "driving"), seg(190, 205, "rest"),
    seg(205, 275, "driving"),
  ])], { legalProfile: LEGAL_PROFILES.AT_REGIONAL_PASSENGER_LE_50KM });
  assert.equal(result.continuousDriving.currentDrivingSinceQualifyingBreakMinutes, 240);
  assert.equal(result.continuousDriving.resets.length, 0);
  assert.equal(result.continuousDriving.atRegionalBreakProgress.qualifying15MinuteParts, 2);
  assert.equal(result.continuousDriving.atRegionalBreakProgress.qualifying20MinuteParts, 1);
});
