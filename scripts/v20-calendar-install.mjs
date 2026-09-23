import { readFileSync, writeFileSync } from "node:fs";
const edits=[{"path":"app/app-v2/app-v2-client.tsx","before":"import { phoneTimeZone, phoneUtcOffsetLabel, projectCardTimelineForPhone } from \"../../lib/app-v2-phone-timeline.js\";","after":"import { phoneTimeZone, phoneUtcOffsetLabel, projectCardTimelineForPhone } from \"../../lib/app-v2-phone-timeline.js\";\nimport { calendarFortnightFromMonday } from \"../../lib/app-v2-monday-fortnight.js\";"},{"path":"app/app-v2/app-v2-client.tsx","before":"      const next = phoneTimeZone() + \"|\" + phoneUtcOffsetLabel();","after":"      const zone = phoneTimeZone();\n      const date = new Intl.DateTimeFormat(\"sv-SE\", { timeZone: zone, year: \"numeric\", month: \"2-digit\", day: \"2-digit\" }).format(new Date());\n      const next = zone + \"|\" + phoneUtcOffsetLabel() + \"|\" + date;"},{"path":"app/app-v2/app-v2-client.tsx","before":"  const displayCard = useMemo(() => {\n    if (!phoneZoneKey || !cardState) return cardState ?? {};\n    return projectCardTimelineForPhone(cardState, phoneZoneKey.split(\"|\")[0]);\n  }, [cardState, phoneZoneKey]);","after":"  const displayCard = useMemo(() => {\n    if (!phoneZoneKey || !cardState) return cardState ?? {};\n    const timeZone = phoneZoneKey.split(\"|\")[0];\n    const projected = projectCardTimelineForPhone(cardState, timeZone);\n    // Two calendar weeks: previous Monday through current local day. Preserve\n    // the downloaded UTC card snapshot; these figures are display-only.\n    return Object.freeze({\n      ...projected,\n      fortnightDrivingMinutes: calendarFortnightFromMonday(projected.historyDays, { timeZone }),\n    });\n  }, [cardState, phoneZoneKey]);"},{"path":"app/app-v2/app-v2-client.tsx","before":"            versionLine: formatTachoCommandVersionLine() + \" · PREVIEW V19\",","after":"            versionLine: formatTachoCommandVersionLine() + \" · PREVIEW V20\","},{"path":"app/app/field-proven-premium-ui.tsx","before":"    [\"DVE NEDELJE\", formatMinutes(state.fortnightDrivingMinutes), \"Iz istorije kartice\"],","after":"    [\"DVE NEDELJE\", formatMinutes(state.fortnightDrivingMinutes), \"Od prethodnog ponedeljka · istorija kartice\"],"},{"path":"app/app/field-proven-premium-ui.tsx","before":"  const visibleDays = state.historyDays.slice(0, 56);","after":"  // The verified parser returns oldest→newest; display the newest day first.\n  const visibleDays = state.historyDays.slice(0, 56).reverse();"},{"path":"app/landing-page.tsx","before":"import PwaInstallCta from \"./pwa-install-cta\";","after":"import PwaInstallCta from \"./pwa-install-cta\";"},{"path":"app/landing-page.tsx","before":"    installInstructions: \"Otvori ovaj preview u Chrome-u, zatim ⋮ → Instaliraj aplikaciju (ili Dodaj na početni ekran). Ako je ponuda nedostupna, otvori /app i pokušaj ponovo iz Chrome menija.\",","after":"    installInstructions: \"Ako vidiš X umesto kartica u vrhu pregledača, otvori stranicu u punom Chrome-u (⋮ → Otvori u Chrome-u). Zatim ⋮ → Instaliraj aplikaciju / Dodaj na početni ekran.\","}];
for (const {path,before,after} of edits) {
  if(before===after)continue;
  const source=readFileSync(path,"utf8");
  const matches=source.split(before).length-1;
  if(matches!==1)throw Error("V20 anchor "+path+" count="+matches+": "+before.slice(0,100));
  writeFileSync(path,source.replace(before,after));
}
for(const path of ["tests/v17-production-clock.test.mjs","tests/v19-install-proven-read.test.mjs"]){
  const content=readFileSync(path,"utf8");
  if(!content.includes("PREVIEW V19"))throw Error("Old preview marker absent: "+path);
  writeFileSync(path,content.replace(/PREVIEW V19/g,"PREVIEW V20"));
}

const manifestPath = "public/manifest.webmanifest";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.short_name !== "TC V19 Test") throw Error("V20 requires isolated V19 preview manifest");
manifest.name = "TachoCommand V20 — Preview (test)";
manifest.short_name = "TC V20 Test";
manifest.description = "Izolovana probna verzija TachoCommand V20 — test. Ne zamenjuje produkciju.";
manifest.id = "/app?v20-preview";
manifest.start_url = "/app?v20-preview";
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const landingPath = "app/landing-page.tsx";
let landing = readFileSync(landingPath, "utf8");
for (const [oldLabel, newLabel] of [
  ["Instaliraj V19 test aplikaciju", "Instaliraj V20 test aplikaciju"],
  ["Install V19 test app", "Install V20 test app"],
  ["V19-Test-App installieren", "V20-Test-App installieren"],
]) {
  if (landing.split(oldLabel).length !== 2) throw Error("V20 landing install label missing: " + oldLabel);
  landing = landing.replace(oldLabel, newLabel);
}
writeFileSync(landingPath, landing);
console.log("V20 calendar fortnight and newest-first history applied; Golden protocol unchanged.");
