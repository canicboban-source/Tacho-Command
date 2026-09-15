import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION,
  classifyDdpResponse,
  parseDownloadInterfaceVersion,
} from "../lib/tacho-history-probe.js";

const clientSource = await readFile(
  new URL("../app/history-probe/history-probe-client.tsx", import.meta.url),
  "utf8",
);
const pageSource = await readFile(
  new URL("../app/history-probe/page.tsx", import.meta.url),
  "utf8",
);

test("builds the generation-2 download-interface-version request", () => {
  assert.deepEqual(
    DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION,
    [0x80, 0xee, 0xf0, 0x02, 0x36, 0x00, 0x96],
  );
});

test("classifies a generation-2 version-2 DownloadInterfaceVersion response", () => {
  const response = [0x80, 0xf0, 0xee, 0x04, 0x76, 0x00, 0x02, 0x02, 0xdc];
  const classification = classifyDdpResponse(response, 0x36, 0x00);
  assert.equal(classification.valid, true);
  assert.equal(classification.positive, true);
  assert.equal(classification.negative, false);

  const version = parseDownloadInterfaceVersion(response);
  assert.deepEqual(version, { valid: true, generation: 2, version: 2 });
});

test("surfaces matching DDP negative responses without treating response-pending as final success", () => {
  const responsePending = [0x80, 0xf0, 0xee, 0x03, 0x7f, 0x36, 0x78, 0x8e];
  const pending = classifyDdpResponse(responsePending, 0x36, 0x00);
  assert.equal(pending.matches, true);
  assert.equal(pending.negative, true);
  assert.equal(pending.responsePending, true);
  assert.equal(pending.negativeResponseCode, 0x78);

  const unsupported = [0x80, 0xf0, 0xee, 0x03, 0x7f, 0x36, 0x12, 0x28];
  const rejected = classifyDdpResponse(unsupported, 0x36, 0x00);
  assert.equal(rejected.matches, true);
  assert.equal(rejected.negative, true);
  assert.equal(rejected.responsePending, false);
  assert.equal(rejected.negativeResponseCode, 0x12);
});

test("0.32a route is a bounded download-path probe and cannot request driver-card data", () => {
  assert.match(pageSource, /history-probe-client/);
  assert.match(clientSource, /0\.32a-download-path-probe/);
  assert.match(clientSource, /TACHO_DOWNLOAD_SERVICE_UUID/);
  assert.match(clientSource, /DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION/);
  assert.match(clientSource, /DDP_REQUEST_TRANSFER_EXIT/);
  assert.match(clientSource, /DDP_STOP_COMMUNICATION_REQUEST/);
  assert.match(clientSource, /ne šalje Card Download TREP 06/);
  assert.doesNotMatch(clientSource, /DDP_REQUEST_DRIVER_CARD_SLOT_1/);
  assert.doesNotMatch(clientSource, /TACHO_DIAGNOSTICS_SERVICE_UUID/);
  assert.doesNotMatch(clientSource, /0x31\s*,\s*0x01\s*,\s*0xf2\s*,\s*0x11/i);
  assert.doesNotMatch(clientSource, /localStorage|sessionStorage|indexedDB/);
});
