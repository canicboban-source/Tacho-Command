import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("V21 retains the original GOLDEN card-reader entry point", () => {
  const client = readFileSync("app/app-v2/app-v2-client.tsx", "utf8");
  const bridge = readFileSync("lib/app-v2-card-transport-controller-bridge.js", "utf8");
  assert.match(client, /runBrowserAppV2GoldenCardRead\(\{/);
  assert.match(client, /PREVIEW V19/); // V19 and V20 overlays update marker before V21.
  assert.doesNotMatch(client, /onDeviceSelected|awaitingCardRecognition|createDeferredCardDeviceChooser|keepGattConnected/);
  assert.match(bridge, /readBrowserAppV2GoldenCardPayload\(\{/);
});

test("V21 displays only the landing install button, never any installed badge", () => {
  const cta = readFileSync("app/pwa-install-cta.tsx", "utf8");
  const landing = readFileSync("app/landing-page.tsx", "utf8");
  const root = readFileSync("app/page.tsx", "utf8");
  const locales = readFileSync("app/[locale]/page.tsx", "utf8");
  assert.match(cta, /beforeinstallprompt/);
  assert.match(cta, /prompt\.prompt\(\)/);
  assert.match(cta, /<button type="button"/);
  assert.doesNotMatch(cta, /display-mode: standalone|appinstalled|installedLabel|tachocommand-open-install-guide/);
  assert.match(landing, /<PwaInstallCta /);
  assert.match(landing, /Instaliraj V21 test aplikaciju/);
  assert.doesNotMatch(landing, /installedLabel=|installDone:/);
  assert.doesNotMatch(root, /InstallGuide/);
  assert.doesNotMatch(locales, /InstallGuide/);
});

test("V21 install CTA shows actionable browser instructions if Chrome offers no prompt", () => {
  const cta = readFileSync("app/pwa-install-cta.tsx", "utf8");
  assert.match(cta, /if \(!promptEvent\) \{/);
  assert.match(cta, /setShowGuide\(true\)/);
  assert.match(cta, /instructions/);
  assert.match(cta, /unavailableLabel/);
});

test("V21 keeps preview PWA separate from the production app", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  assert.equal(manifest.short_name, "TC V21 Test");
  assert.equal(manifest.start_url, "/app?v21-preview");
  assert.equal(manifest.id, "/app?v21-preview");
  assert.equal(manifest.display, "standalone");
});
