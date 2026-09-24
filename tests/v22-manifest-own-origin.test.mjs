import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("Production HTML manifest and metadataBase reference the canonical domain",()=>{
 const layout=readFileSync("app/layout.tsx","utf8");
 assert.match(layout,/metadataBase: new URL\("https:\/\/www\.tachocommand\.com"\)/);
 assert.match(layout,/manifest: "\/manifest\.webmanifest"/);
 assert.doesNotMatch(layout,/tachocommand-app-v22-preview/);
});
test("Production install manifest preserves the installed app identity",()=>{
 const m=JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));
 assert.equal(m.id,"/app");
 assert.equal(m.start_url,"/app");
 assert.equal(m.scope,"/");
 assert.equal(m.short_name,"TachoCommand");
 assert.equal(m.display,"standalone");
 for(const icon of m.icons)assert.match(icon.src,/^\/icon-(192|512)\.png$/);
 const root=readFileSync("app/landing-page.tsx","utf8");
 assert.match(root,/Instaliraj aplikaciju/);
 assert.doesNotMatch(root,/app installed|Aplikacija je instalirana|App installed/);
});
test("Card transfer stays on original production GOLDEN bridge with no experimental readiness gate",()=>{
 const source=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 assert.match(source,/formatTachoCommandVersionLine\(\)/);
 assert.match(source,/runBrowserAppV2GoldenCardRead\(\{/);
 assert.doesNotMatch(source,/prepareAppV2CardHandoff|onDeviceSelected|awaitingCardRecognition/);
});
