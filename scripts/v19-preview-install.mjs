import {readFileSync,writeFileSync} from "node:fs";
const edits=[{"path":"app/landing-page.tsx","before":"import TrialLauncher from \"./trial-launcher\";","after":"import TrialLauncher from \"./trial-launcher\";\nimport PwaInstallCta from \"./pwa-install-cta\";"},{"path":"app/landing-page.tsx","before":"    guide: \"Vodič za povezivanje\",","after":"    guide: \"Vodič za povezivanje\",\n    installTest: \"Instaliraj V19 test aplikaciju\",\n    installInstructions: \"Otvori ovaj preview u Chrome-u, zatim ⋮ → Instaliraj aplikaciju (ili Dodaj na početni ekran). Ako je ponuda nedostupna, otvori /app i pokušaj ponovo iz Chrome menija.\",\n    installUnavailable: \"Chrome nije ponudio instalacioni dijalog. Koristi meni pregledača.\",\n    installDone: \"Aplikacija je instalirana\","},{"path":"app/landing-page.tsx","before":"open: \"Open app\", guide: \"Connection guide\",","after":"open: \"Open app\", guide: \"Connection guide\", installTest: \"Install V19 test app\", installInstructions: \"Open this preview in Chrome, then tap ⋮ → Install app (or Add to Home screen). If unavailable, open /app and try again from Chrome menu.\", installUnavailable: \"Chrome did not offer an installation prompt. Use the browser menu.\", installDone: \"App installed\","},{"path":"app/landing-page.tsx","before":"open: \"App öffnen\", guide: \"Verbindungsanleitung\",","after":"open: \"App öffnen\", guide: \"Verbindungsanleitung\", installTest: \"V19-Test-App installieren\", installInstructions: \"Diese Vorschau in Chrome öffnen und ⋮ → App installieren (oder Zum Startbildschirm hinzufügen) wählen. Falls nicht verfügbar: /app öffnen und im Chrome-Menü erneut versuchen.\", installUnavailable: \"Chrome bietet derzeit keinen Installationsdialog an. Browsermenü verwenden.\", installDone: \"App installiert\","},{"path":"app/landing-page.tsx","before":"            <TrialLauncher label={t.start} loadingLabel={t.starting} errorLabel={t.trialError} className=\"tcx-primary\" />\n            <a className=\"tcx-secondary\"","after":"            <TrialLauncher label={t.start} loadingLabel={t.starting} errorLabel={t.trialError} className=\"tcx-primary\" />\n            <PwaInstallCta label={t.installTest} instructions={t.installInstructions} unavailableLabel={t.installUnavailable} installedLabel={t.installDone} />\n            <a className=\"tcx-secondary\""},{"path":"app/landing-oled.css","before":".tcx-secondary span { color: var(--tcx-cyan); }","after":".tcx-secondary span { color: var(--tcx-cyan); }\n.tcx-install-cta { display: inline-flex; flex-direction: column; gap: 7px; max-width: min(100%, 410px); }\n.tcx-install-cta > .tcx-secondary { width: 100%; }\n.tcx-install-cta small { font-size: .76rem; color: #bbd1c8; line-height: 1.55; }"},{"path":"app/app-v2/app-v2-client.tsx","before":"            versionLine: formatTachoCommandVersionLine() + \" · PREVIEW V17\",","after":"            versionLine: formatTachoCommandVersionLine() + \" · PREVIEW V19\","}];
for(const {path,before,after} of edits){
 const c=readFileSync(path,"utf8");
 const matches=c.split(before).length-1;
 if(matches!==1)throw Error("V19 anchor "+path+" "+matches+" "+before.slice(0,110));
 writeFileSync(path,c.replace(before,after));
}
const manifestPath="public/manifest.webmanifest";
const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
manifest.name="TachoCommand V19 — Preview (test)";
manifest.short_name="TC V19 Test";
manifest.description="Izolovana TachoCommand V19 test aplikacija. Ne zamenjuje produkcijsku aplikaciju.";
// Preview has its own origin and manifest identity, entirely separate from live.
manifest.id="/app?v19-preview";
manifest.start_url="/app?v19-preview";
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
const testPath="tests/v17-production-clock.test.mjs";
const t=readFileSync(testPath,"utf8");
if(!t.includes("PREVIEW V17"))throw Error("V19 earlier preview marker missing");
writeFileSync(testPath,t.replace(/PREVIEW V17/g,"PREVIEW V19"));
console.log("V19 original production card flow active; preview-only install prompt and fallback added.");
