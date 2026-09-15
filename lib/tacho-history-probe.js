import { parseDdpMessage } from "./tacho-download.js";

const checksum = (bytes) => bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);
const withChecksum = (bytes) => Object.freeze([...bytes, checksum(bytes)]);

export const DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION = withChecksum([
  0x80, 0xee, 0xf0, 0x02, 0x36, 0x00,
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
