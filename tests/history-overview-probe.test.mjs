import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION,
  DDP_REQUEST_GEN2V2_OVERVIEW,
  buildDdpSubMessageAck,
  createDdpTransferAssembler,
  parseDownloadInterfaceVersion,
  pushDdpTransferMessage,
} from "../lib/tacho-history-overview-probe.js";

const clientSource = await readFile(
  new URL("../app/history-overview-probe/history-overview-probe-client.tsx", import.meta.url),
  "utf8",
);
const pageSource = await readFile(
  new URL("../app/history-overview-probe/page.tsx", import.meta.url),
  "utf8",
);

const checksum = (bytes) => bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);
const frame = (data) => {
  const prefix = [0x80, 0xf0, 0xee, data.length, ...data];
  return [...prefix, checksum(prefix)];
};

test("uses the Appendix 7 Gen2v2 preflight and overview requests", () => {
  assert.deepEqual(
    DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION,
    [0x80, 0xee, 0xf0, 0x02, 0x36, 0x00, 0x96],
  );
  assert.deepEqual(
    DDP_REQUEST_GEN2V2_OVERVIEW,
    [0x80, 0xee, 0xf0, 0x02, 0x36, 0x31, 0xc7],
  );
});

test("parses Gen2v2 DownloadInterfaceVersion 02 02", () => {
  const response = frame([0x76, 0x00, 0x02, 0x02]);
  assert.deepEqual(parseDownloadInterfaceVersion(response), {
    valid: true,
    generation: 2,
    version: 2,
  });
});

test("builds Appendix 7 SID 83 ACK with the next sub-message counter", () => {
  assert.deepEqual(
    buildDdpSubMessageAck(2),
    [0x80, 0xee, 0xf0, 0x04, 0x83, 0x76, 0x00, 0x02, 0x5d],
  );
});

test("assembles a multipart TREP 31 transfer without retaining payload bytes", () => {
  const assembler = createDdpTransferAssembler(0x31);
  const firstPayload = Array.from({ length: 251 }, (_, index) => index & 0xff);
  const first = frame([0x76, 0x31, 0x00, 0x01, ...firstPayload]);
  assert.equal(first[3], 0xff);

  const pending = pushDdpTransferMessage(assembler, first);
  assert.equal(pending.status, "pending");
  assert.equal(pending.submessages, 1);
  assert.equal(pending.payloadBytes, 251);
  assert.deepEqual(pending.ack, buildDdpSubMessageAck(2));

  const final = frame([0x76, 0x31, 0x00, 0x02, 0xaa, 0xbb]);
  const complete = pushDdpTransferMessage(assembler, final);
  assert.equal(complete.status, "complete");
  assert.equal(complete.submessages, 2);
  assert.equal(complete.payloadBytes, 253);
  assert.equal(complete.ack, null);
  assert.equal("chunks" in assembler, false);
  assert.equal("payload" in complete, false);
});

test("accepts a single-message TREP 31 response without inventing a sub-message counter", () => {
  const assembler = createDdpTransferAssembler(0x31);
  const complete = pushDdpTransferMessage(assembler, frame([0x76, 0x31, 0xaa, 0xbb]));
  assert.equal(complete.status, "complete");
  assert.equal(complete.submessages, 1);
  assert.equal(complete.payloadBytes, 2);
  assert.equal(complete.ack, null);
});

test("fails closed on an out-of-order multipart counter", () => {
  const assembler = createDdpTransferAssembler(0x31);
  const firstPayload = Array.from({ length: 251 }, () => 0x11);
  const pending = pushDdpTransferMessage(assembler, frame([0x76, 0x31, 0x00, 0x01, ...firstPayload]));
  assert.equal(pending.status, "pending");

  const invalid = pushDdpTransferMessage(assembler, frame([0x76, 0x31, 0x00, 0x03, 0x22]));
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.reason, "submessage-counter");
});

test("keeps NRC 78 as wait-without-retransmit", () => {
  const assembler = createDdpTransferAssembler(0x31);
  const pending = pushDdpTransferMessage(assembler, frame([0x7f, 0x36, 0x78]));
  assert.equal(pending.status, "response-pending");
  assert.equal(pending.negativeResponseCode, 0x78);
  assert.equal(pending.submessages, 0);
});

test("0.32b route is credit-safe, bounded and cannot request driver-card data", () => {
  assert.match(pageSource, /history-overview-probe-client/);
  assert.match(clientSource, /0\.32b-gen2v2-overview-credit-safe/);
  assert.match(clientSource, /DDP_REQUEST_GEN2V2_OVERVIEW/);
  assert.match(clientSource, /createDdpTransferAssembler/);
  assert.match(clientSource, /serverCredits \+= value/);
  assert.match(clientSource, /consumeServerCredit/);
  assert.match(clientSource, /Overview submessage/);
  assert.match(clientSource, /Sadržaj nije sačuvan niti prikazan/);
  assert.match(clientSource, /Prekini sesiju/);
  assert.match(clientSource, /DDP_P3_GUARD_MS = 100/);
  assert.doesNotMatch(clientSource, /DDP_REQUEST_DRIVER_CARD_SLOT_1/);
  assert.doesNotMatch(clientSource, /0x36\s*,\s*0x06/);
  assert.doesNotMatch(clientSource, /localStorage|sessionStorage|indexedDB/);
});
