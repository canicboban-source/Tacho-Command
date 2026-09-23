import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const origin="https://tachocommand-app-v22-preview.canicboban.workers.dev";
test("Preview HTML manifest and metadataBase reference its own installable Worker origin",()=>{
 const layout=readFileSync("app/layout.tsx","utf8");
 assert.match(layout,/metadataBase: new URL\("https:\/\/tachocommand-app-v22-preview\.canicboban\.workers\.dev"\)/);
 assert.match(layout,/manifest: "https:\/\/tachocommand-app-v22-preview\.canicboban\.workers\.dev\/manifest\.webmanifest"/);
 assert.doesNotMatch(layout,/metadataBase: new URL\("https:\/\/tachocommand\.com"\)/);
});
test("Preview install manifest is a standalone V22 app, never production hostname",()=>{
 const m=JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));
 assert.equal(m.id,"/app?v22-preview");
 assert.equal(m.start_url,"/app?v22-preview");
 assert.equal(m.scope,"/");
 assert.equal(m.short_name,"TC V22 Test");
 assert.equal(m.display,"standalone");
 for(const icon of m.icons)assert.match(icon.src,/^\/icon-(192|512)\.png$/);
 const root=readFileSync("app/landing-page.tsx","utf8");
 assert.match(root,/Instaliraj V22 test aplikaciju/);
 assert.doesNotMatch(root,/app installed|Aplikacija je instalirana|App installed/);
});
test("Card transfer stays on original production GOLDEN bridge with no experimental readiness gate",()=>{
 const source=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 assert.match(source,/PREVIEW V22/);
 assert.match(source,/runBrowserAppV2GoldenCardRead\(\{/);
 assert.doesNotMatch(source,/prepareAppV2CardHandoff|onDeviceSelected|awaitingCardRecognition/);
});
