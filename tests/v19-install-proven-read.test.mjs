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
test("V20 landing install CTA opens the sole Chrome prompt owner",()=>{
 const source=readFileSync("app/pwa-install-cta.tsx","utf8");
 const guide=readFileSync("app/install-guide.tsx","utf8");
 const landing=readFileSync("app/landing-page.tsx","utf8");
 assert.match(source,/tachocommand-open-install-guide/);
 assert.doesNotMatch(source,/beforeinstallprompt|await deferred\.prompt/);
 assert.match(guide,/beforeinstallprompt/);
 assert.match(guide,/await prompt\.prompt\(\)/);
 assert.match(guide,/catch \(error\)/);
 assert.match(guide,/Otvori u Chrome-u/);
 assert.match(guide,/tachocommand-open-install-guide/);
 assert.match(landing,/<PwaInstallCta /);
 assert.match(landing,/Instaliraj V19 test aplikaciju/);
});
test("Preview PWA identity differs from live and points to the same origin app",()=>{
 const m=JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));
 assert.equal(m.short_name,"TC V20 Test");
 assert.equal(m.start_url,"/app?v20-preview");
 assert.equal(m.id,"/app?v20-preview");
 assert.equal(m.scope,"/");
 assert.equal(m.display,"standalone");
 const sw=readFileSync("public/sw.js","utf8");
 assert.match(sw,/self\.addEventListener\("install"/);
});
