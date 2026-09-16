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

test("EU legal verdicts are disabled for regular passenger routes <=50 km", () => {
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
  for (let i = 0; i < 7; i += 1) days.push(day(`2026-08-${String(3 + i).padStart(2, "0")}`, [seg(0, 480, "driving")])); // 56h
  for (let i = 0; i < 5; i += 1) days.push(day(`2026-08-${String(10 + i).padStart(2, "0")}`, [seg(0, 480, "driving")])); // +40h => 96h
  const result = evaluateEu561WeeklyDriving(days);
  assert.equal(result.alerts.some((x) => x.kind === "weekly-driving-exceeded"), false);
  assert.equal(result.alerts.some((x) => x.kind === "fortnight-driving-exceeded"), true);
});
