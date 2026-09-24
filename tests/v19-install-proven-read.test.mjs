import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("V21 retains the original GOLDEN card-reader entry point", () => {
  const client = readFileSync("app/app-v2/app-v2-client.tsx", "utf8");
  const bridge = readFileSync("lib/app-v2-card-transport-controller-bridge.js", "utf8");
  assert.match(client, /runBrowserAppV2GoldenCardRead\(\{/);
  assert.match(client, /PREVIEW V22/);
  assert.doesNotMatch(client, /onDeviceSelected|awaitingCardRecognition|createDeferredCardDeviceChooser|keepGattConnected/);
  assert.match(bridge, /readBrowserAppV2GoldenCardPayload\(\{/);
});

test("V21 landing has only one install button and no invented installed state", () => {
  const cta = readFileSync("app/pwa-install-cta.tsx", "utf8");
  const landing = readFileSync("app/landing-page.tsx", "utf8");
  const root = readFileSync("app/page.tsx", "utf8");
  const locales = readFileSync("app/[locale]/page.tsx", "utf8");
  assert.match(cta, /beforeinstallprompt/);
  assert.match(cta, /prompt\.prompt\(\)/);
  assert.match(cta, /<button type="button"/);
  assert.doesNotMatch(cta, /display-mode: standalone|appinstalled|installedLabel|tachocommand-open-install-guide/);
  assert.match(landing, /<PwaInstallCta /);
  assert.match(landing, /Instaliraj V22 test aplikaciju/);
  assert.doesNotMatch(landing, /installedLabel=|installDone:/);
  assert.doesNotMatch(root, /InstallGuide/);
  assert.doesNotMatch(locales, /InstallGuide/);
});

test("V21 asks Chrome for native install directly from the click, otherwise gives browser steps", () => {
  const cta = readFileSync("app/pwa-install-cta.tsx", "utf8");
  assert.match(cta, /onClick=\{onInstallClick\}/);
  assert.match(cta, /const prompt = promptEvent;/);
  assert.match(cta, /prompt\.prompt\(\)/);
  assert.match(cta, /if \(!promptEvent\) \{/);
  assert.match(cta, /setShowGuide\(true\)/);
  assert.match(cta, /instructions/);
  assert.match(cta, /unavailableLabel/);
});

test("V21 preview manifest and offline assets support Chrome PWA installation on separate origin", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  assert.equal(manifest.short_name, "TC V22 Test");
  assert.equal(manifest.start_url, "/app?v22-preview");
  assert.equal(manifest.id, "/app?v22-preview");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some(icon => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "512x512"));
  const sw = readFileSync("public/sw.js", "utf8");
  assert.match(sw, /self\.addEventListener\("install"/);
  assert.match(sw, /self\.addEventListener\("fetch"/);
});
