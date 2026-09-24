import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { reportAppV2CardReadOutcome } from "../lib/app-v2-card-telemetry.js";
import { sanitizeTechnicalTelemetryBatch } from "../lib/technical-telemetry.js";

const cryptoImpl = { randomUUID, getRandomValues: (bytes) => bytes.fill(5) };

test("card telemetry sends one anonymous outcome without card contents", async () => {
  let sent;
  const result = await reportAppV2CardReadOutcome({
    status: "accepted",
    cryptoImpl,
    postTelemetry: async (events) => {
      sent = events;
      return { status: "accepted", accepted: 1 };
    },
  });
  assert.equal(result.status, "accepted");
  assert.match(result.attemptCode, /^TC-/);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].phase, "card_read");
  assert.equal(sent[0].event, "snapshot_complete");
  assert.equal(sanitizeTechnicalTelemetryBatch(sent).length, 1);
  assert.deepEqual(Object.keys(sent[0]).sort(), ["attemptCode", "deviceFamily", "event", "outcome", "phase", "sessionId"]);
});

test("failed reads report a bounded error and telemetry failure never changes read status", async () => {
  let sent;
  const result = await reportAppV2CardReadOutcome({
    status: "read_error",
    cryptoImpl,
    postTelemetry: async (events) => {
      sent = events;
      throw new Error("offline");
    },
  });
  assert.equal(result.status, "network_unavailable");
  assert.equal(sent[0].event, "error");
  assert.equal(sent[0].errorCode, "unknown");
  assert.equal(sanitizeTechnicalTelemetryBatch(sent).length, 1);
});
