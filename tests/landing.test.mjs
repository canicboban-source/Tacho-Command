import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const landing = await readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8");
const landingStyles = await readFile(new URL("../app/landing-oled.css", import.meta.url), "utf8");
const launcher = await readFile(new URL("../app/trial-launcher.tsx", import.meta.url), "utf8");
const appPage = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
const installGuide = await readFile(new URL("../app/install-guide.tsx", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

test("public root tells the field-proven V22 product story without invented diagnostics", () => {
  assert.match(landing, /FIELD PROVEN/);
  assert.match(landing, /VDO DTCO 4\.1a/);
  assert.match(landing, /GEN2 V2/);
  assert.match(landing, /56 dana/);
  assert.doesNotMatch(landing, /67\.295 B|56 \/ 56/);
  assert.match(landing, /data-release=\{LANDING_RELEASE\}/);
  assert.match(appPage, /AppV2Client/);
});

test("landing offers SR, EN and DE and labels illustrations as schematic", () => {
  assert.match(landing, /value="sr"/);
  assert.match(landing, /value="en"/);
  assert.match(landing, /value="de"/);
  assert.match(landing, /Shematski prikazi funkcija aplikacije/);
  assert.match(landing, /Schematic views of app features/);
  assert.match(landing, /Schematische Ansichten der App-Funktionen/);
  assert.doesNotMatch(landing, /screenshots\/cockpit\.(?:webp|png)/);
  assert.match(landing, /legal: \{ privacy:/);
  assert.match(launcher, /loadingLabel/);
  assert.match(launcher, /errorLabel/);
});

test("landing leads with proven card reading and starts pairing from the app", () => {
  assert.match(landing, /Očitaj karticu telefonom/);
  assert.match(landing, /Pregledaj poslednjih 56 dana/);
  assert.match(landing, /Read your driver card on your phone/);
  assert.match(landing, /Fahrerkarte mit dem Smartphone auslesen/);
  assert.match(landing, /U aplikaciji pritisni „Poveži tahograf“/);
  assert.match(landing, /Tap “Connect tachograph” in the app/);
  assert.match(landing, /In der App „Tachograph verbinden“ antippen/);
  assert.doesNotMatch(landing, /OLED|≤50 km|AT LINE|candidate infringement|9,99/);
  assert.match(landing, /<Link className="tcx-primary" href="\/app"/);
});

test("landing keeps compatibility claims bounded to real field evidence", () => {
  assert.match(landing, /FIELD TESTED/);
  assert.match(landing, /PLANNED \/ NOT YET CLAIMED/);
  assert.match(landing, /iPhone \/ Safari Web Bluetooth path/);
  assert.match(landing, /Other Smart Tacho 2 models without field tests/);
  assert.match(landing, /Full cryptographic signature validation in UI/);
  assert.doesNotMatch(landing, /100% Read-Only/);
});

test("mobile landing hero stays inside narrow phone viewports", () => {
  assert.match(landingStyles, /\.tcx-hero-copy \{[^}]*width: 100%;[^}]*min-width: 0;/);
  assert.match(landingStyles, /\.tcx-hero h1 \{[^}]*font-size: clamp\(2\.35rem, 12vw, 3\.5rem\);[^}]*overflow-wrap: anywhere;/);
  assert.doesNotMatch(landingStyles, /font-size: clamp\(3rem, 16vw, 4\.7rem\)/);
});

test("beginner install guide documents Chrome home-screen installation and direct PWA prompt", () => {
  assert.match(installGuide, /tri tačke gore desno/);
  assert.match(installGuide, /Install app/);
  assert.match(installGuide, /Dodaj na početni ekran/);
  assert.match(installGuide, /beforeinstallprompt/);
  assert.match(installGuide, /appinstalled/);
  assert.match(installGuide, /display-mode: standalone/);
  assert.match(installGuide, /tachocommand-locale/);
});

test("base install guide offers a native prompt and an actionable fallback", () => {
  assert.match(installGuide, /onClick=\{\(\) => installed \? setOpen\(true\) : installPrompt \? void installNow\(\) : setOpen\(true\)\}/);
});

test("PWA keeps the existing production identity when V22 is installed", () => {
  assert.equal(manifest.name, "TachoCommand");
  assert.equal(manifest.id, "/app");
  assert.equal(manifest.start_url, "/app");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#020304");
  assert.match(serviceWorker, /tachocommand-shell-v49-app-beta-1/);
  assert.match(serviceWorker, /CORE_ASSETS = \["\/", "\/app"/);
  assert.match(serviceWorker, /caches\.match\("\/"\)/);
});
