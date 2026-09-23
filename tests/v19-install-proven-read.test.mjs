import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("V19 always invokes original production Golden read without manual pre-BLE gate",()=>{
 const client=readFileSync("app/app-v2/app-v2-client.tsx","utf8");
 const bridge=readFileSync("lib/app-v2-card-transport-controller-bridge.js","utf8");
 assert.match(client,/const result = await runBrowserAppV2GoldenCardRead\(\{/);
 assert.match(client,/PREVIEW V19/);
 assert.doesNotMatch(client,/onDeviceSelected|awaitingCardRecognition|createDeferredCardDeviceChooser|keepGattConnected/);
 assert.match(bridge,/readBrowserAppV2GoldenCardPayload\(\{/);
 assert.doesNotMatch(bridge,/onDeviceSelected|createDeferredCardDeviceChooser/);
});
test("Install CTA prompts only after Chrome makes installation available, otherwise explains manual steps",()=>{
 const source=readFileSync("app/pwa-install-cta.tsx","utf8");
 assert.match(source,/beforeinstallprompt/);
 assert.match(source,/appinstalled/);
 assert.match(source,/await deferred\.prompt\(\)/);
 assert.match(source,/if \(!deferred\) \{\s*setShowGuide\(true\)/);
 assert.match(source,/decision\.outcome !== "accepted"/);
 assert.match(source,/Wait for appinstalled/);
 const landing=readFileSync("app/landing-page.tsx","utf8");
 assert.match(landing,/<PwaInstallCta /);
 assert.match(landing,/Instaliraj V19 test aplikaciju/);
 assert.match(landing,/Install V19 test app/);
 assert.match(landing,/V19-Test-App installieren/);
});
test("Preview PWA identity differs from live and points to the same origin app",()=>{
 const m=JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));
 assert.equal(m.short_name,"TC V19 Test");
 assert.equal(m.start_url,"/app?v19-preview");
 assert.equal(m.id,"/app?v19-preview");
 assert.equal(m.scope,"/");
 assert.equal(m.display,"standalone");
 const sw=readFileSync("public/sw.js","utf8");
 assert.match(sw,/self\.addEventListener\("install"/);
});
