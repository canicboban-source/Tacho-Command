import { postTechnicalTelemetry } from "./technical-telemetry-client.js";
import { createTechnicalTelemetryAttemptCode } from "./technical-telemetry.js";

// Report only the outcome. Never include card bytes, card identity, or device identifiers.
export async function reportAppV2CardReadOutcome({
  status,
  cryptoImpl = globalThis.crypto,
  postTelemetry = postTechnicalTelemetry,
} = {}) {
  if (!cryptoImpl || typeof cryptoImpl.randomUUID !== "function") {
    return Object.freeze({ status: "unavailable", attemptCode: null, accepted: 0 });
  }

  let sessionId;
  let attemptCode;
  try {
    sessionId = cryptoImpl.randomUUID();
    attemptCode = createTechnicalTelemetryAttemptCode(cryptoImpl);
  } catch {
    return Object.freeze({ status: "unavailable", attemptCode: null, accepted: 0 });
  }

  const accepted = status === "accepted";
  const event = {
    sessionId,
    attemptCode,
    event: accepted ? "snapshot_complete" : "error",
    phase: "card_read",
    outcome: accepted ? "complete" : "error",
    deviceFamily: "unknown",
    ...(!accepted && { errorCode: "unknown" }),
  };

  try {
    const result = await postTelemetry([event]);
    return Object.freeze({
      status: result?.status ?? "rejected",
      attemptCode,
      accepted: result?.status === "accepted" ? Number(result.accepted ?? 0) : 0,
    });
  } catch {
    return Object.freeze({ status: "network_unavailable", attemptCode, accepted: 0 });
  }
}
