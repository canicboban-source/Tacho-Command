import { parseDdpMessage } from "./tacho-download.js";

const checksum = (bytes) => bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);
const withChecksum = (bytes) => Object.freeze([...bytes, checksum(bytes)]);

export const DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION = withChecksum([
  0x80, 0xee, 0xf0, 0x02, 0x36, 0x00,
]);

export const DDP_REQUEST_GEN2V2_OVERVIEW = withChecksum([
  0x80, 0xee, 0xf0, 0x02, 0x36, 0x31,
]);

const POSITIVE_RESPONSE_BY_REQUEST = Object.freeze({
  0x81: 0xc1,
  0x10: 0x50,
  0x35: 0x75,
  0x36: 0x76,
  0x37: 0x77,
  0x82: 0xc2,
});

export function classifyDdpResponse(message = [], requestSid, expectedTrep = null) {
  const parsed = parseDdpMessage(message);
  if (!parsed.valid) {
    return Object.freeze({
      valid: false,
      matches: false,
      positive: false,
      negative: false,
      responsePending: false,
      sid: null,
      trep: null,
      negativeResponseCode: null,
      reason: parsed.reason,
    });
  }

  const sid = parsed.sid;
  const negative = sid === 0x7f && parsed.data[1] === requestSid;
  const negativeResponseCode = negative ? parsed.data[2] ?? null : null;
  const positiveSid = POSITIVE_RESPONSE_BY_REQUEST[requestSid] ?? ((requestSid + 0x40) & 0xff);
  const trep = sid === 0x76 ? parsed.data[1] ?? null : null;
  const trepMatches = expectedTrep === null || trep === expectedTrep;
  const positive = sid === positiveSid && trepMatches;

  return Object.freeze({
    valid: true,
    matches: positive || negative,
    positive,
    negative,
    responsePending: negative && negativeResponseCode === 0x78,
    sid,
    trep,
    negativeResponseCode,
    reason: null,
  });
}

export function parseDownloadInterfaceVersion(message = []) {
  const parsed = parseDdpMessage(message);
  if (!parsed.valid || parsed.sid !== 0x76 || parsed.data[1] !== 0x00 || parsed.data.length < 4) {
    return Object.freeze({ valid: false, generation: null, version: null });
  }
  return Object.freeze({
    valid: true,
    generation: parsed.data[2],
    version: parsed.data[3],
  });
}

export function buildDdpSubMessageAck(nextCounter) {
  if (!Number.isInteger(nextCounter) || nextCounter < 0 || nextCounter > 0xffff) {
    throw new RangeError("DDP sub-message counter must be a 16-bit unsigned integer");
  }
  return withChecksum([
    0x80,
    0xee,
    0xf0,
    0x04,
    0x83,
    0x76,
    (nextCounter >> 8) & 0xff,
    nextCounter & 0xff,
  ]);
}

export function createDdpTransferAssembler(expectedTrep) {
  return {
    expectedTrep,
    multipart: false,
    expectedCounter: 1,
    submessages: 0,
    payloadBytes: 0,
    complete: false,
  };
}

export function pushDdpTransferMessage(assembler, message = []) {
  if (assembler.complete) {
    return Object.freeze({
      status: "invalid",
      reason: "transfer-already-complete",
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  const parsed = parseDdpMessage(message);
  if (!parsed.valid) {
    return Object.freeze({
      status: "invalid",
      reason: parsed.reason,
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  if (parsed.sid === 0x7f && parsed.data[1] === 0x36) {
    const negativeResponseCode = parsed.data[2] ?? null;
    return Object.freeze({
      status: negativeResponseCode === 0x78 ? "response-pending" : "negative",
      reason: null,
      ack: null,
      negativeResponseCode,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  if (parsed.sid !== 0x76) {
    return Object.freeze({
      status: "ignored",
      reason: "unexpected-sid",
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  if (parsed.data[1] !== assembler.expectedTrep) {
    return Object.freeze({
      status: "ignored",
      reason: "unexpected-trep",
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  const dataLength = Number(message[3] ?? 0);
  if (!assembler.multipart && dataLength < 0xff) {
    assembler.submessages = 1;
    assembler.payloadBytes = Math.max(0, parsed.data.length - 2);
    assembler.complete = true;
    return Object.freeze({
      status: "complete",
      reason: null,
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  if (parsed.data.length < 4) {
    return Object.freeze({
      status: "invalid",
      reason: "missing-submessage-counter",
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  assembler.multipart = true;
  const counter = ((parsed.data[2] ?? 0) << 8) | (parsed.data[3] ?? 0);
  if (counter !== assembler.expectedCounter) {
    return Object.freeze({
      status: "invalid",
      reason: "submessage-counter",
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  assembler.submessages += 1;
  assembler.payloadBytes += Math.max(0, parsed.data.length - 4);

  if (dataLength < 0xff) {
    assembler.complete = true;
    return Object.freeze({
      status: "complete",
      reason: null,
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  if (counter === 0xffff) {
    return Object.freeze({
      status: "invalid",
      reason: "submessage-counter-overflow",
      ack: null,
      negativeResponseCode: null,
      submessages: assembler.submessages,
      payloadBytes: assembler.payloadBytes,
    });
  }

  assembler.expectedCounter = counter + 1;
  return Object.freeze({
    status: "pending",
    reason: null,
    ack: buildDdpSubMessageAck(assembler.expectedCounter),
    negativeResponseCode: null,
    submessages: assembler.submessages,
    payloadBytes: assembler.payloadBytes,
  });
}
