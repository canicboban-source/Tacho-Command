import { readFileSync, writeFileSync } from "node:fs";
const ORIGIN="https://tachocommand-app-v22-preview.canicboban.workers.dev";
function replaceOnce(path, before, after) {
  const text=readFileSync(path,"utf8");
  const count=text.split(before).length-1;
  if(count!==1)throw Error("V22 anchor "+path+" count="+count+": "+before.slice(0,90));
  writeFileSync(path,text.replace(before,after));
}
replaceOnce("app/layout.tsx",
  'metadataBase: new URL("https://tachocommand.com"),',
  'metadataBase: new URL("'+ORIGIN+'"),');
replaceOnce("app/layout.tsx",
  '  manifest: "/manifest.webmanifest",',
  '  manifest: "'+ORIGIN+'/manifest.webmanifest",');
replaceOnce("app/layout.tsx",
  '  applicationName: "TachoCommand",',
  '  applicationName: "TachoCommand V22 Test",');
replaceOnce("app/app-v2/app-v2-client.tsx",
  'versionLine: formatTachoCommandVersionLine() + " · PREVIEW V21",',
  'versionLine: formatTachoCommandVersionLine() + " · PREVIEW V22",');
let landing=readFileSync("app/landing-page.tsx","utf8");
for(const [before,after] of [
 ["Instaliraj V21 test aplikaciju","Instaliraj V22 test aplikaciju"],
 ["Install V21 test app","Install V22 test app"],
 ["V21-Test-App installieren","V22-Test-App installieren"],
]){
 if(landing.split(before).length!==2)throw Error("V22 landing label not unique: "+before);
 landing=landing.replace(before,after);
}
writeFileSync("app/landing-page.tsx",landing);
const path="public/manifest.webmanifest";
const manifest=JSON.parse(readFileSync(path,"utf8"));
if(manifest.short_name!=="TC V21 Test"||manifest.id!=="/app?v21-preview")throw Error("V22 needs V21 preview manifest");
manifest.name="TachoCommand V22 — Preview (test)";
manifest.short_name="TC V22 Test";
manifest.description="Izolovana TachoCommand V22 PWA probna verzija; produkcijska aplikacija ostaje netaknuta.";
manifest.id="/app?v22-preview";
manifest.start_url="/app?v22-preview";
writeFileSync(path,JSON.stringify(manifest,null,2)+"\n");
for(const testPath of ["tests/v17-production-clock.test.mjs","tests/v19-install-proven-read.test.mjs"]) {
 const content=readFileSync(testPath,"utf8");
 if(content.split("PREVIEW V21").length!==2)throw Error("Missing V21 marker "+testPath);
 writeFileSync(testPath,content.replace("PREVIEW V21","PREVIEW V22"));
}
const installTests="tests/v19-install-proven-read.test.mjs";
let install=readFileSync(installTests,"utf8");
for(const [before,after] of [
 ["Instaliraj V21 test aplikaciju","Instaliraj V22 test aplikaciju"],
 ["TC V21 Test","TC V22 Test"],
 ["/app?v21-preview","/app?v22-preview"],
]) {
 if(install.split(before).length!==2)throw Error("V22 install assertion missing "+before);
 install=install.replace(before,after);
}
writeFileSync(installTests,install);
console.log("V22 manifest HTML points to own worker origin, not tachocommand.com; no Golden changes.");
