import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientUrl = new URL("../app/app-v2/app-v2-client.tsx", import.meta.url);

test("App V3 presentation routes full-card reads through the proven controller bridge", async () => {
  const source = await readFile(clientUrl, "utf8");

  assert.match(source, /runBrowserAppV2GoldenCardRead/);
  assert.match(source, /beginAppV2CardRead/);
  assert.match(source, /storage: window\.localStorage/);
  assert.match(source, /result\.status === "accepted"/);
  assert.match(source, /setCardState\(result\.session\.currentCard\)/);
});

test("App V2 prevents concurrent LIVE and CARD Bluetooth sessions", async () => {
  const source = await readFile(clientUrl, "utf8");

  assert.match(source, /if \(liveRunState === "running" \|\| cardSession\.busy\) return/);
  assert.match(source, /if \(cardSession\.busy \|\| liveRunState === "running"\) return/);
  assert.match(source, /cardSession\.busy\s*\? "card-reading"/);
  assert.match(source, /liveRunState === "running"\s*\? "connecting"/);
});

test("App V3 selects the card device from the click before closing LIVE", async () => {
  const source = await readFile(clientUrl, "utf8");
  assert.match(source, /keepTransportOpen: true/);
  const chooserAt = source.indexOf("await selectBrowserAppV2GoldenCardDevice");
  const stationaryAt = source.indexOf("await transport.assertStationary()", chooserAt);
  const closeAt = source.indexOf("await closeLiveForCard(transport)", chooserAt);
  const cardReadAt = source.indexOf("await runBrowserAppV2GoldenCardRead", chooserAt);
  assert.ok(chooserAt >= 0, "card chooser must be called from the button handler");
  assert.ok(stationaryAt > chooserAt, "stationary guard must follow device selection");
  assert.ok(closeAt > stationaryAt, "LIVE must close after the stationary guard");
  assert.ok(cardReadAt > closeAt, "card transport must start only after bounded LIVE close");
  assert.match(source, /transport\.assertStationary\(\)/);
  assert.match(source, /LIVE_TEARDOWN_TIMEOUT_MS = 1500/);
  assert.match(source, /Promise\.race\(\[/);
  assert.match(source, /transport\.device\?\.gatt\?\.disconnect\?\.\(\)/);
  assert.match(source, /await closeLiveForCard\(transport\)/);
  assert.match(source, /LIVE_TO_CARD_SETTLE_MS = 1000/);
  assert.match(source, /device: selectedCardDevice/);
  assert.match(source, /disconnectOnFinish: true/);
  assert.match(source, /window\.setInterval/);
  assert.match(source, /setLiveConnected\(true\)/);
  assert.match(source, /connected: liveConnected/);
  assert.match(source, /\["live", "incomplete"\]\.includes\(result\.status\)/);
  assert.match(source, /refreshed\.status !== "incomplete"/);
});

test("App V3 holds a screen wake lock only while the card read is active", async () => {
  const source = await readFile(clientUrl, "utf8");
  assert.match(source, /wakeLock\.request\("screen"\)/);
  assert.match(source, /wakeLock\?\.release\(\)/);
  assert.match(source, /\.finally\(async \(\) =>/);
});

test("App V2 derives visible LIVE state from the retained transport", async () => {
  const clientSource = await readFile(clientUrl, "utf8");
  const uiSource = await readFile(
    new URL("../app/app/field-proven-premium-ui.tsx", import.meta.url),
    "utf8",
  );

  assert.match(clientSource, /setLiveConnected\(false\)/);
  assert.match(clientSource, /liveConnected\s*\? "connected"/);
  assert.match(uiSource, /LIVE veza je aktivna/);
  assert.match(uiSource, /LIVE povezano/);
  assert.match(uiSource, /controls\.phase === "connected"/);
});

test("App V2 keeps card transport details out of UI source", async () => {
  const source = await readFile(clientUrl, "utf8");

  for (const forbidden of [
    "requestDevice(",
    "TACHO_DOWNLOAD_SERVICE_UUID",
    "CARD_SLOT1",
    "RequestTransferExit",
    "StopCommunication",
    "buildAppV2GoldenAck",
    "parseAppV2CardPayload",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside UI source");
  }

  assert.match(source, /formatTachoCommandVersionLine/);
  assert.match(source, /onReadCard: runCardRead/);
  assert.match(source, /onProgress: \(progress: CardReadProgress\) => setCardReadProgress\(progress\)/);
  assert.match(source, /cardReadProgress,/);
  assert.match(source, /setRestoreState\("restored"\);\s*return;/);
});
