import { readFileSync, writeFileSync } from "node:fs";

function replaceExactly(path, before, after) {
  const source = readFileSync(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) throw Error("V21 anchor " + path + " count=" + count + " " + before.slice(0, 105));
  writeFileSync(path, source.replace(before, after));
}

// Remove the second, floating install widget on all three landing locales.
// The ONE visible landing CTA directly owns the one native Chrome prompt.
replaceExactly("app/page.tsx", 'import InstallGuide from "./install-guide";\n', "");
replaceExactly("app/page.tsx", "      <InstallGuide />\n", "");
replaceExactly("app/[locale]/page.tsx", 'import InstallGuide from "../install-guide";\n', "");
replaceExactly("app/[locale]/page.tsx", "      <InstallGuide />\n", "");

const landingPath = "app/landing-page.tsx";
let landing = readFileSync(landingPath, "utf8");
for (const [before, after] of [
  ['    installDone: "Aplikacija je instalirana",\n', ""],
  [', installDone: "App installed"', ""],
  [', installDone: "App installiert"', ""],
  [' installedLabel={t.installDone}', ""],
  ["Instaliraj V20 test aplikaciju", "Instaliraj V21 test aplikaciju"],
  ["Install V20 test app", "Install V21 test app"],
  ["V20-Test-App installieren", "V21-Test-App installieren"],
]) {
  const count = landing.split(before).length - 1;
  if (count !== 1) throw Error("V21 landing anchor " + count + ": " + before);
  landing = landing.replace(before, after);
}
writeFileSync(landingPath, landing);

replaceExactly(
  "app/app-v2/app-v2-client.tsx",
  'versionLine: formatTachoCommandVersionLine() + " · PREVIEW V20",',
  'versionLine: formatTachoCommandVersionLine() + " · PREVIEW V21",',
);

for (const path of ["tests/v17-production-clock.test.mjs", "tests/v19-install-proven-read.test.mjs"]) {
  replaceExactly(path, "PREVIEW V20", "PREVIEW V21");
}

const manifestPath = "public/manifest.webmanifest";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.short_name !== "TC V20 Test") throw Error("Expected isolated V20 preview manifest");
manifest.name = "TachoCommand V21 — Preview (test)";
manifest.short_name = "TC V21 Test";
manifest.id = "/app?v21-preview";
manifest.start_url = "/app?v21-preview";
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log("V21: one landing install button only; no installed badge; V20 card reader unchanged.");
