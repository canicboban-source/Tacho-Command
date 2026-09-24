"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TrialLauncher from "./trial-launcher";
import PwaInstallCta from "./pwa-install-cta";
import { trackProductAnalytics } from "../lib/product-analytics-client.js";
import { formatTachoCommandVersionLine, TACHOCOMMAND_VERSIONS } from "../lib/product-version.js";

export type Locale = "sr" | "en" | "de";

type LandingPageProps = Readonly<{
  initialLocale?: Locale;
  canonicalLocaleRoute?: boolean;
}>;

const LANDING_RELEASE = TACHOCOMMAND_VERSIONS.product;

const copy = {
  sr: {
    nav: ["Zašto", "Kako radi", "Povezivanje", "Poverenje", "FAQ"],
    badge: "PROVERENO NA TAHOGRAFU • VDO DTCO 4.1a",
    heroA: "Očitaj karticu telefonom.",
    heroB: "Pregledaj poslednjih 56 dana.",
    heroText: "Poveži se sa podržanim tahografom, očitaj vozačku karticu i pregledaj dane, aktivnosti i periode na telefonu. Testirano na VDO DTCO 4.1a uz Android i Chrome.",
    start: "Pokreni 3-dnevni demo",
    starting: "Pokrećem…",
    trialError: "Demo trenutno nije dostupan. Pokušaj ponovo za nekoliko minuta.",
    open: "Otvori aplikaciju",
    guide: "Vodič za povezivanje",
    installTest: "Instaliraj aplikaciju",
    installInstructions: "Otvori ovu stranicu u Chrome-u na Android telefonu. U meniju ⋮ izaberi „Instaliraj aplikaciju“. Ako se ponudi samo prečica, instalacija još nije dostupna u tom pregledaču.",
    installUnavailable: "Chrome nije ponudio instalacioni dijalog. Koristi meni pregledača.",
    alreadyInstalled: "Postojeća TC ikona",
    installedHelp: "Otvori TC ikonu na telefonu. Ako vodi na početnu stranu, dodirni „Otvori aplikaciju“. Chrome prepoznaje postojeću ikonu, ali to samo po sebi ne potvrđuje da aplikacija startuje pravilno. Ne briši sačuvane podatke.",
    noPromptHelp: "Chrome trenutno ne nudi instalacioni dijalog. Ako u meniju vidiš „Open TachoCommand“, probaj postojeću TC ikonu; ako ona vodi na početnu stranu, dodirni „Otvori aplikaciju“. Ne briši postojeću aplikaciju ili podatke samo zbog ažuriranja.",
    closeInstall: "Razumem",
    safetyNote: "Bezbednost pre svega: TachoCommand koristite za povezivanje i očitavanje samo kada je vozilo bezbedno zaustavljeno. Ne rukujte telefonom tokom vožnje.",
    heroPreview: ["KARTICA", "Očitaj poslednjih 56 dana", "TAHOGRAF", "Poveži tahograf", "Ilustracija · bez stvarnih podataka"],
    periodPreview: ["DANAS", "OVA NEDELJA", "DVE NEDELJE"],
    proofTitle: "Očitavanje potvrđeno u vozilu.",
    proofText: "Na tri tahografa TachoCommand je očitao vozačku karticu preko Bluetooth veze. Poslednje očitavanje na DTCO 4.1a ponovljeno je uspešno; prikazano je 56 dana, sa današnjim danom na vrhu.",
    proof: [["56 dana", "istorije prikazano posle očitavanja"], ["3", "tahografa sa potvrđenim očitavanjem"]],
    whyKicker: "ZAŠTO TACHOCOMMAND",
    whyTitle: "Vozaču ne treba još jedan meni. Treba mu odgovor.",
    whyText: "TachoCommand prikazuje potvrđene podatke iz tahografa i očitane kartice u preglednoj istoriji na telefonu. Tahograf i kartica ostaju merodavni izvori.",
    valueCards: [
      ["01", "Očitaj karticu", "Pokreni očitavanje iz aplikacije dok vozilo miruje i prati stvarni napredak."],
      ["02", "Pregledaj 56 dana", "Dani i aktivnosti sa kartice prikazani su u preglednoj istoriji, najnoviji prvo."],
      ["03", "Vidi LIVE podatke", "Trenutna aktivnost i periodi prikazuju se kada su dostupni potvrđeni podaci."],
      ["04", "Znaj šta je provereno", "Kompatibilnost navodimo za uređaje i tokove koji su prošli fizički test."],
    ],
    productKicker: "PREGLED APLIKACIJE",
    productTitle: "Očitavanje, istorija, periodi.",
    productText: "Shematski prikazi funkcija aplikacije. Pravi podaci se pojavljuju tek posle povezivanja i očitavanja.",
    productNames: ["LIVE", "56 dana", "Periodi"],
    productDescriptions: [
      "Trenutna aktivnost iz tahografa kada je veza potvrđena.",
      "Očitani dani i aktivnosti kartice, najnoviji prvo.",
      "Dnevna, nedeljna i dvonedeljna vrednost kada su podaci dostupni.",
    ],
    beginnerKicker: "PRVI PUT POVEZUJEŠ TELEFON?",
    beginnerTitle: "Od nule do očitane kartice, bez nagađanja.",
    beginnerText: "Vodič je pisan za vozača koji prvi put povezuje telefon i tahograf. Svaki korak govori šta treba da vidiš ako je sve u redu.",
    steps: [
      ["01", "Parkiraj i ubaci karticu", "Vozilo miruje. Driver kartica je u slotu 1. Telefon koristi samo dok je vozilo zaustavljeno."],
      ["02", "Na DTCO uključi pairing", "Driver 1 → Bluetooth → Pairing. Tahograf prelazi u režim povezivanja."],
      ["03", "Otvori TachoCommand", "U aplikaciji pritisni „Poveži tahograf“ i izaberi svoj DTCO u Chrome dijalogu."],
      ["04", "Uporedi 6-cifreni PIN", "Isti PIN mora biti prikazan na telefonu i tahografu. Potvrdi na oba uređaja."],
      ["05", "Proveri status veze", "Kada se uređaj poveže, aplikacija prikazuje dostupne potvrđene podatke."],
      ["06", "Očitaj karticu", "Pokreni očitavanje dok vozilo miruje. Posle uspeha otvori pregled 56 dana."],
    ],
    troubleTitle: "Ako nešto zapne, ne pogađamo.",
    trouble: [
      ["Ne vidiš DTCO?", "Prvo pokušaj kroz „Poveži tahograf“ u aplikaciji. Proveri Pairing na DTCO i Bluetooth dozvolu telefona."],
      ["PIN se ne pojavljuje?", "Ponovo proveri Pairing meni i pokušaj povezivanje iz aplikacije. Postojeće uparivanje ne briši naslepo."],
      ["Aplikacija ne vidi Bluetooth?", "Koristi podržan Android + Chrome preko HTTPS veze. iPhone/Safari trenutno nisu potvrđani za ovu putanju."],
      ["Kartica se ne očitava?", "TachoCommand prikazuje tačan STOP/FAIL korak umesto da naslepo ponavlja zahtev."],
    ],
    privacyKicker: "PRIVATNOST I POVERENJE",
    privacyTitle: "Tvoja kartica nije marketinški podatak.",
    privacyText: "Sadržaj vozačke kartice ne objavljujemo u javnom kodu. Beleške sa terenskih provera su očišćene od ličnih podataka. Pregled 56 dana ne mora da prikazuje ime, broj kartice ili registraciju.",
    trust: [
      ["Provera u vozilu", "Funkciju zovemo potvrđenom tek kada radi na stvarnom tahografu."],
      ["Bez slepog ponavljanja", "Kod prekida očitavanja aplikacija ne šalje tahografu zahteve u nedogled."],
      ["Jasna granica", "Aplikacija prikazuje očitane podatke, bez automatskog pravnog zaključka."],
      ["Jasan prikaz", "Očitani podaci se obrađuju pre prikaza u aplikaciji."],
    ],
    compatibilityKicker: "KOMPATIBILNOST",
    compatibilityTitle: "Kažemo samo ono što smo stvarno dokazali.",
    tested: "PROVERENO U VOZILU",
    planned: "JOŠ NIJE POTVRĐENO",
    testedItems: ["VDO DTCO 4.1a", "Očitavanje vozačke kartice preko Bluetooth veze", "Android telefon i Chrome", "Prikaz poslednjih 56 dana"],
    plannedItems: ["iPhone i Safari", "Drugi modeli tahografa bez terenske provere", "Potpuna provera digitalnog potpisa u aplikaciji"],
    priceKicker: "BETA",
    priceTitle: "Prvo dokaz. Onda naplata.",
    priceText: "Beta i demo su dostupni za proveru proizvoda. Kupovina se otvara tek nakon posebne odluke i provere javnog izdanja.",
    priceBullets: ["3 dana probnog pristupa bez platne kartice", "Početna stranica na srpskom, engleskom i nemačkom", "Očitavanje kartice na proverenim uređajima"],
    locked: "Kupovina se otvara nakon bete",
    once: "JEDNOM",
    faqTitle: "Pitanja koja početnik stvarno postavlja.",
    faqs: [
      ["Da li TachoCommand menja ili programira tahograf?", "Ne. Trenutni dokazani card-download tok čita podatke kroz podržanu Smart Tacho 2 komunikaciju. Tahograf i kartica ostaju merodavni izvori."],
      ["Moram li da budem tehničar da bih ga povezao?", "Ne. Landing i onboarding vode te korak po korak kroz pairing, PIN potvrdu, izbor uređaja i očitavanje."],
      ["Da li aplikacija donosi pravni zaključak?", "Ne. Prikazuje dostupne očitane podatke; tahograf, kartica i važeći propisi ostaju merodavni."],
      ["Kako da pronađem tahograf?", "Prvo otvori aplikaciju i pritisni „Poveži tahograf“. Na terenskim testovima aplikacija je pronalazila DTCO i kada ga Android Bluetooth lista nije prikazivala."],
      ["Da li aplikacija šalje moje raw podatke na GitHub?", "Ne. Lični .ddd field fixture ne commitujemo u repo; testovi koriste sintetičke podatke."],
    ],
    footer: "TachoCommand pomaže vozaču da pregleda očitane podatke. Tahograf i kartica ostaju merodavni izvori.",
    trustline: ["VDO DTCO 4.1a", "Očitana kartica", "Prikaz 56 dana"],
    pairing: ["Povezivanje sa tahografom", "Uključi povezivanje", "Zatim otvori aplikaciju", "Telefon", "Poveži tahograf", "Ako se pojavi broj za potvrdu, proveri da li je isti na telefonu i tahografu."],
    troubleshooting: "POMOĆ PRI POVEZIVANJU",
    language: "Jezik",
    legal: { privacy: "Privatnost", terms: "Uslovi", impressum: "Impressum" },
  },
  en: {
    nav: ["Why", "How it works", "Connect", "Trust", "FAQ"],
    badge: "FIELD PROVEN • VDO DTCO 4.1a • GEN2 V2",
    heroA: "Read your driver card on your phone.",
    heroB: "See the last 56 days.",
    heroText: "Connect to a supported tachograph, read your driver card and review days, activities and periods on your phone. Tested on VDO DTCO 4.1a with Android and Chrome.",
    start: "Start 3-day demo", starting: "Starting…", trialError: "The demo is temporarily unavailable. Please try again in a few minutes.", open: "Open app", guide: "Connection guide", installTest: "Install app", installInstructions: "Open this page in Chrome on Android. In the ⋮ menu choose Install app. If Chrome offers only a shortcut, installation is not available in that browser yet.", installUnavailable: "Chrome did not offer an installation prompt. Use the browser menu.", safetyNote: "Safety first: connect and read the driver card only when the vehicle is safely stopped. Do not operate your phone while driving.",
    alreadyInstalled: "Existing TachoCommand icon", installedHelp: "Open the TC icon on your phone. If it opens the landing page, tap ‘Open app’. Chrome detecting an icon does not confirm the app starts correctly. Keep your saved data.", noPromptHelp: "Chrome has not offered an install prompt. If the menu shows ‘Open TachoCommand’, try the existing TC icon. If it opens the landing page, tap ‘Open app’. Do not clear app data to update.", closeInstall: "Got it",
    proofTitle: "Not a promise. Proof from a real vehicle.",
    proofText: "TachoCommand has read a driver card over Bluetooth on three tachographs. The latest read on a VDO DTCO 4.1a was repeated successfully and displayed 56 days, with today first.",
    proof: [["56 days", "of history shown after reading"], ["3", "tachographs with a confirmed read"]],
    whyKicker: "WHY TACHOCOMMAND", whyTitle: "Drivers do not need another menu. They need an answer.", whyText: "TachoCommand shows confirmed tachograph and card data as a clear history on your phone. The tachograph and card remain authoritative.",
    valueCards: [["01","Read your card","Start a read in the app while stationary and follow the real progress."],["02","Review 56 days","Card days and activities appear in a clear history, newest first."],["03","See LIVE data","Current activity and periods appear when confirmed data is available."],["04","Know what was tested","We name compatibility only for devices and flows tested on physical hardware."]],
    productKicker: "APP OVERVIEW", productTitle: "Read, history, periods.", productText: "Schematic views of app features. Real values appear only after connection and card reading.", productNames: ["LIVE","56 days","Periods"], productDescriptions: ["Current tachograph activity after connection is confirmed.","Card days and activities, newest first.","Daily, weekly and two-week values when data is available."],
    beginnerKicker: "FIRST TIME CONNECTING?", beginnerTitle: "From zero to a read card without guesswork.", beginnerText: "The guide is written for a driver who has never used Web Bluetooth or the DTCO Bluetooth menu. Every step tells you what success should look like.",
    steps: [["01","Park and insert the card","Vehicle stationary. Driver card in slot 1. Use the phone only while stopped."],["02","Enable pairing on DTCO","Driver 1 → Bluetooth → Pairing."],["03","Open TachoCommand","Tap “Connect tachograph” in the app and choose your DTCO in Chrome's device dialog."],["04","Compare the 6-digit PIN","The same PIN must be visible on phone and tachograph. Confirm both."],["05","Check the connection","Once connected, the app shows available confirmed data."],["06","Read the card","Start reading while stationary. After success, open the 56-day view."]],
    troubleTitle: "If something fails, we do not guess.", trouble: [["DTCO not visible?","Try “Connect tachograph” in the app first. Check DTCO Pairing and the phone's Bluetooth permission."],["No PIN?","Check the Pairing menu and try from the app again. Do not delete an existing pairing blindly."],["No Bluetooth in the app?","Use supported Android + Chrome over HTTPS. iPhone/Safari is not yet proven for this path."],["Card read fails?","TachoCommand reports the exact STOP/FAIL stage instead of blind retries."]],
    privacyKicker: "PRIVACY & TRUST", privacyTitle: "Your driver card is not marketing data.", privacyText: "Raw driver-card content is not committed to the public repository. Field logs are sanitised. The UI does not need to expose identity data to deliver a useful 56-day view.", trust: [["Field-first","A feature is proven only after it works on a real tachograph."],["No blind retries","STOP/FAIL states do not hammer the DTCO with repeated requests."],["Clear boundary","The app displays read data without an automatic legal conclusion."],["Local clarity","Raw bytes become validated normalized data before UI rendering."]],
    compatibilityKicker: "COMPATIBILITY", compatibilityTitle: "We only claim what we have actually proven.", tested: "FIELD TESTED", planned: "PLANNED / NOT YET CLAIMED", testedItems: ["Continental VDO DTCO 4.1a","Smart Tacho 2 BLE Download path","Android + Chrome + HTTPS","Gen2 v2 Driver Card Slot 1 download","56-day activity parsing"], plannedItems: ["iPhone / Safari Web Bluetooth path","Other Smart Tacho 2 models without field tests","Full cryptographic signature validation in UI","Additional national rule packs"],
    heroPreview: ["CARD", "Read the last 56 days", "TACHOGRAPH", "Connect tachograph", "Illustration · no real data"],
    periodPreview: ["TODAY", "THIS WEEK", "TWO WEEKS"],
    priceKicker: "BETA", priceTitle: "Proof first. Payment later.", priceText: "The beta and demo let you explore the product. Checkout opens only after a separate public-release decision and review.", priceBullets: ["3-day demo without payment card","Landing in Serbian, English and German","Card reading on confirmed devices"], locked: "Checkout opens after beta", once: "ONCE",
    faqTitle: "Questions beginners actually ask.", faqs: [["Does TachoCommand modify the tachograph?","No. The proven card-download path reads data through the supported Smart Tacho 2 communication path. The tachograph and card remain authoritative."],["Do I need to be technical?","No. Pairing, PIN confirmation, device selection and card reading are guided step by step."],["Does the app make legal decisions?","No. It displays available read data; the tachograph, card and applicable rules remain authoritative."],["How do I find the tachograph?","Open the app and tap “Connect tachograph” first. In field tests the app found a DTCO even when it was absent from Android's Bluetooth list."],["Do my raw card files go to GitHub?","No. The personal .ddd field fixture is not committed; tests use synthetic data."]],
    footer: "TachoCommand helps drivers review data read from their card. The tachograph and card remain the authoritative sources.", trustline: ["VDO DTCO 4.1a", "Card read", "56-day view"], pairing: ["Connect to the tachograph", "Enable pairing", "Then open the app", "Phone", "Connect tachograph", "If a confirmation number appears, check that it matches on your phone and tachograph."], troubleshooting: "CONNECTION HELP", language: "Language", legal: { privacy: "Privacy", terms: "Terms", impressum: "Imprint" },
  },
  de: {
    nav: ["Warum", "So funktioniert es", "Verbinden", "Vertrauen", "FAQ"],
    badge: "IM FELD BESTÄTIGT • VDO DTCO 4.1a • GEN2 V2",
    heroA: "Fahrerkarte mit dem Smartphone auslesen.",
    heroB: "Die letzten 56 Tage ansehen.",
    heroText: "Mit einem unterstützten Tachographen verbinden, die Fahrerkarte auslesen und Tage, Tätigkeiten und Zeiträume am Smartphone ansehen. Mit VDO DTCO 4.1a, Android und Chrome getestet.",
    start: "3-Tage-Demo starten", starting: "Wird gestartet…", trialError: "Die Demo ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.", open: "App öffnen", guide: "Verbindungsanleitung", installTest: "App installieren", installInstructions: "Diese Seite in Chrome auf Android öffnen. Im Menü ⋮ App installieren wählen. Wenn Chrome nur eine Verknüpfung anbietet, ist die Installation in diesem Browser noch nicht verfügbar.", installUnavailable: "Chrome bietet derzeit keinen Installationsdialog an. Browsermenü verwenden.", safetyNote: "Sicherheit zuerst: Smartphone nur bei sicher stehendem Fahrzeug verbinden und die Fahrerkarte auslesen. Telefon während der Fahrt nicht bedienen.",
    alreadyInstalled: "Vorhandenes TachoCommand-Symbol", installedHelp: "TC-Symbol auf dem Smartphone öffnen. Führt es zur Startseite, ‘App öffnen’ antippen. Dass Chrome ein Symbol erkennt, bestätigt noch keinen korrekten App-Start. Gespeicherte Daten nicht löschen.", noPromptHelp: "Chrome bietet keinen Installationsdialog an. Wenn das Menü ‘Open TachoCommand’ zeigt, das vorhandene TC-Symbol versuchen. Führt es zur Startseite, ‘App öffnen’ antippen. App-Daten nicht löschen.", closeInstall: "Verstanden",
    proofTitle: "Im Fahrzeug geprüft, wiederholt bestätigt.", proofText: "TachoCommand hat an drei Tachographen eine Fahrerkarte über Bluetooth ausgelesen. Der letzte Lesevorgang am VDO DTCO 4.1a wurde erfolgreich wiederholt; 56 Tage werden mit dem heutigen Tag zuerst angezeigt.", proof: [["56 Tage","Verlauf nach dem Auslesen angezeigt"],["3","Tachographen mit bestätigtem Lesevorgang"]],
    whyKicker: "WARUM TACHOCOMMAND", whyTitle: "Fahrer brauchen kein weiteres Menü. Sie brauchen eine Antwort.", whyText: "TachoCommand zeigt bestätigte Daten aus Tachograph und Fahrerkarte als übersichtliche Historie am Smartphone. Tachograph und Karte bleiben maßgeblich.",
    valueCards: [["01","Fahrerkarte auslesen","Das Auslesen in der App im Stillstand starten und den tatsächlichen Fortschritt verfolgen."],["02","56 Tage ansehen","Kartentage und Tätigkeiten erscheinen in einer klaren Historie, neueste zuerst."],["03","LIVE-Daten sehen","Aktuelle Tätigkeit und Zeiträume erscheinen, wenn bestätigte Daten vorliegen."],["04","Geprüfte Kompatibilität","Wir nennen nur Geräte und Abläufe, die an echter Hardware getestet wurden."]],
    productKicker: "APP-ÜBERBLICK", productTitle: "Auslesen, Verlauf, Zeiträume.", productText: "Schematische Ansichten der App-Funktionen. Echte Werte erscheinen erst nach Verbindung und Auslesen.", productNames: ["LIVE","56 Tage","Zeiträume"], productDescriptions: ["Aktuelle Tätigkeit nach bestätigter Verbindung.","Kartentage und Tätigkeiten, neueste zuerst.","Tages-, Wochen- und Zweiwochenwerte, wenn Daten vorliegen."],
    beginnerKicker: "ZUM ERSTEN MAL VERBINDEN?", beginnerTitle: "Von null bis zur gelesenen Karte — ohne Rätselraten.", beginnerText: "Die Anleitung ist für Fahrer geschrieben, die Web Bluetooth oder das DTCO-Bluetooth-Menü noch nie benutzt haben.",
    steps: [["01","Sicher parken und Karte einstecken","Fahrzeug steht. Fahrerkarte in Slot 1. Smartphone nur im Stand benutzen."],["02","Pairing am DTCO einschalten","Driver 1 → Bluetooth → Pairing."],["03","TachoCommand öffnen","In der App „Tachograph verbinden“ antippen und den DTCO im Chrome-Gerätedialog auswählen."],["04","6-stellige PIN vergleichen","Auf Smartphone und Tachograph muss dieselbe PIN stehen. Auf beiden bestätigen."],["05","Verbindung prüfen","Nach der Verbindung zeigt die App verfügbare bestätigte Daten."],["06","Fahrerkarte auslesen","Das Auslesen im Stillstand starten. Nach Erfolg die 56-Tage-Ansicht öffnen."]],
    troubleTitle: "Wenn etwas hängt, raten wir nicht.", trouble: [["DTCO nicht sichtbar?","Zuerst „Tachograph verbinden“ in der App versuchen. Pairing am DTCO und Bluetooth-Berechtigung prüfen."],["Keine PIN?","Pairing-Menü prüfen und erneut aus der App verbinden. Bestehende Kopplung nicht blind löschen."],["Kein Bluetooth in der App?","Unterstütztes Android + Chrome über HTTPS verwenden. iPhone/Safari ist noch nicht bestätigt."],["Karte wird nicht gelesen?","TachoCommand zeigt die genaue STOP/FAIL-Stufe statt blind zu wiederholen."]],
    privacyKicker: "DATENSCHUTZ & VERTRAUEN", privacyTitle: "Deine Fahrerkarte ist kein Marketingdatensatz.", privacyText: "Rohe Fahrerkartendaten werden nicht ins öffentliche Repository committed. Feldlogs sind bereinigt. Für die 56-Tage-Ansicht müssen Identitätsdaten nicht offengelegt werden.", trust: [["Field-first","Funktion gilt erst nach realem Tachographentest als bestätigt."],["No blind retries","STOP/FAIL löst keine unkontrollierten Wiederholungen aus."],["Klare Grenze","Die App zeigt gelesene Daten ohne automatische rechtliche Bewertung."],["Klare Datenkette","Rohdaten werden vor der UI in geprüfte normalisierte Daten umgewandelt."]],
    compatibilityKicker: "KOMPATIBILITÄT", compatibilityTitle: "Wir behaupten nur, was wir wirklich nachgewiesen haben.", tested: "IM FELD GETESTET", planned: "GEPLANT / NOCH NICHT BESTÄTIGT", testedItems: ["Continental VDO DTCO 4.1a","Smart Tacho 2 BLE Download-Pfad","Android + Chrome + HTTPS","Gen2 v2 Fahrerkarte Slot 1 Download","56-Tage-Aktivitätsparser"], plannedItems: ["iPhone / Safari Web-Bluetooth-Pfad","Andere Smart-Tacho-2-Modelle ohne Feldtest","Vollständige kryptografische Signaturprüfung in der UI","Weitere nationale Regelprofile"],
    heroPreview: ["KARTE", "Die letzten 56 Tage auslesen", "TACHOGRAPH", "Tachograph verbinden", "Illustration · keine echten Daten"],
    periodPreview: ["HEUTE", "DIESE WOCHE", "ZWEI WOCHEN"],
    priceKicker: "BETA", priceTitle: "Erst beweisen. Dann bezahlen.", priceText: "Beta und Demo ermöglichen eine Produktprüfung. Checkout öffnet erst nach einer eigenen Entscheidung und Prüfung für die öffentliche Version.", priceBullets: ["3 Tage Demo ohne Zahlungskarte","Landing auf Serbisch, Englisch und Deutsch","Kartenlesen an bestätigten Geräten"], locked: "Checkout öffnet nach der Beta", once: "EINMALIG",
    faqTitle: "Fragen, die Einsteiger wirklich stellen.", faqs: [["Verändert TachoCommand den Tachographen?","Nein. Der bestätigte Kartendownload liest Daten über den unterstützten Smart-Tacho-2-Kommunikationsweg."],["Muss ich technisch sein?","Nein. Pairing, PIN-Bestätigung, Geräteauswahl und Auslesen werden Schritt für Schritt erklärt."],["Fällt die App rechtliche Entscheidungen?","Nein. Sie zeigt verfügbare gelesene Daten; Tachograph, Karte und geltende Regeln bleiben maßgeblich."],["Wie finde ich den Tachographen?","Zuerst die App öffnen und „Tachograph verbinden“ antippen. In Feldtests fand die App einen DTCO auch dann, wenn er nicht in der Android-Bluetooth-Liste erschien."],["Gehen meine Kartendaten zu GitHub?","Nein. Die persönliche .ddd-Datei wird nicht committed; Tests nutzen synthetische Daten."]],
    footer: "TachoCommand hilft Fahrern, ausgelesene Daten anzusehen. Tachograph und Fahrerkarte bleiben maßgebliche Quellen.", trustline: ["VDO DTCO 4.1a", "Karte ausgelesen", "56-Tage-Ansicht"], pairing: ["Mit dem Tachographen verbinden", "Kopplung aktivieren", "Dann die App öffnen", "Smartphone", "Tachograph verbinden", "Falls eine Bestätigungsnummer erscheint, muss sie auf Smartphone und Tachograph übereinstimmen."], troubleshooting: "HILFE BEIM VERBINDEN", language: "Sprache", legal: { privacy: "Datenschutz", terms: "Bedingungen", impressum: "Impressum" },
  },
} as const;

const viewBars = [7, 8, 14, 20, 5, 12, 19, 15];

export default function LandingPage({ initialLocale = "sr", canonicalLocaleRoute = false }: LandingPageProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Older home-screen installs still launch the landing start URL. Redirect
    // only the standalone app window; a normal Chrome tab keeps the landing.
    if (window.matchMedia("(display-mode: standalone)").matches && window.location.pathname === "/") {
      window.location.replace("/app");
      return;
    }
    if (canonicalLocaleRoute) {
      window.localStorage.setItem("tachocommand-locale", initialLocale);
      return;
    }

    const saved = window.localStorage.getItem("tachocommand-locale") as Locale | null;
    if (saved && ["sr", "en", "de"].includes(saved)) {
      setLocale(saved);
      return;
    }
    const language = navigator.language.toLowerCase();
    if (language.startsWith("de")) setLocale("de");
    else if (language.startsWith("en")) setLocale("en");
  }, [canonicalLocaleRoute, initialLocale]);

  const t = copy[locale];
  const changeLocale = (next: Locale) => {
    window.localStorage.setItem("tachocommand-locale", next);
    void trackProductAnalytics("locale_change", { locale: next, surface: "landing" });

    if (canonicalLocaleRoute) {
      router.push(`/${next}`);
      return;
    }

    setLocale(next);
  };

  return (
    <main className="tcx-shell" data-release={LANDING_RELEASE} lang={locale}>
      <header className="tcx-nav">
        <Link className="tcx-brand" href="/app" aria-label={t.open}>
          <span className="tcx-brand-mark">TC</span>
          <strong>Tacho<span>Command</span></strong>
        </Link>
        <nav className="tcx-nav-links" aria-label={t.language}>
          <a href="#why">{t.nav[0]}</a>
          <a href="#product">{t.nav[1]}</a>
          <a href="#connect">{t.nav[2]}</a>
          <a href="#trust">{t.nav[3]}</a>
          <a href="#faq">{t.nav[4]}</a>
        </nav>
        <div className="tcx-nav-actions">
          <label className="tcx-language">
            <span>{t.language}</span>
            <select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
              <option value="sr">SR</option>
              <option value="en">EN</option>
              <option value="de">DE</option>
            </select>
          </label>
          <Link className="tcx-app-link" href="/app" onClick={() => void trackProductAnalytics("open_app_click", { locale, surface: "landing" })}>{t.open}</Link>
        </div>
      </header>

      <section className="tcx-hero" id="top">
        <div className="tcx-hero-grid" aria-hidden="true" />
        <div className="tcx-hero-copy">
          <span className="tcx-proof-badge"><i />{t.badge} · BETA {LANDING_RELEASE}</span>
          <h1>{t.heroA}<br /><span>{t.heroB}</span></h1>
          <p>{t.heroText}</p>
          <div className="tcx-safety-note"><strong>✓</strong><span>{t.safetyNote}</span></div>
          <div className="tcx-actions">
            <Link className="tcx-primary" href="/app" onClick={() => void trackProductAnalytics("open_app_click", { locale, surface: "landing" })}>{t.open}</Link>
            <PwaInstallCta label={t.installTest} instructions={t.installInstructions} unavailableLabel={t.installUnavailable} installedLabel={t.alreadyInstalled} installedHelp={t.installedHelp} noPromptHelp={t.noPromptHelp} closeLabel={t.closeInstall} />
            <a className="tcx-secondary" href="#connect" onClick={() => void trackProductAnalytics("connection_guide_click", { locale, surface: "landing" })}>{t.guide}<span>↓</span></a>
          </div>
          <div className="tcx-hero-trustline">{t.trustline.map((item) => <span key={item}>✓ {item}</span>)}</div>
        </div>

        <div className="tcx-device-stage" aria-label={t.heroPreview[4]}>
          <div className="tcx-device-glow" />
          <div className="tcx-phone">
            <div className="tcx-phone-top"><span>TC</span><span>{t.heroPreview[4]}</span></div>
            <div className="tcx-phone-brand"><span className="tcx-mini-logo">TC</span><strong>TachoCommand</strong></div>
            <div className="tcx-status-card"><div><small>{t.heroPreview[0]}</small><strong>{t.heroPreview[1]}</strong></div></div>
            <div className="tcx-status-card tcx-preview-secondary"><div><small>{t.heroPreview[2]}</small><strong>{t.heroPreview[3]}</strong></div></div>
            <div className="tcx-timeline-mini" aria-hidden="true">{viewBars.map((width, i) => <div key={i}><span style={{ width: `${width}%` }} /><b style={{ width: `${100-width}%` }} /></div>)}</div>
            <div className="tcx-phone-footer"><span>VDO DTCO 4.1a</span><span>{t.productNames[1]}</span></div>
          </div>
        </div>
      </section>

      <section className="tcx-proof" aria-labelledby="proof-title">
        <div className="tcx-section-copy tcx-section-copy-wide">
          <span className="tcx-kicker">{t.tested}</span>
          <h2 id="proof-title">{t.proofTitle}</h2>
          <p>{t.proofText}</p>
        </div>
        <div className="tcx-proof-grid">{t.proof.map(([value, label]) => <article key={value}><strong>{value}</strong><span>{label}</span></article>)}</div>
      </section>

      <section className="tcx-section" id="why">
        <div className="tcx-section-copy">
          <span className="tcx-kicker">{t.whyKicker}</span>
          <h2>{t.whyTitle}</h2>
          <p>{t.whyText}</p>
        </div>
        <div className="tcx-value-grid">
          {t.valueCards.map(([, title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className="tcx-section tcx-product" id="product">
        <div className="tcx-section-copy tcx-section-copy-wide">
          <span className="tcx-kicker">{t.productKicker}</span>
          <h2>{t.productTitle}</h2>
          <p>{t.productText}</p>
        </div>
        <div className="tcx-product-grid">
          {t.productNames.map((name, index) => (
            <article className="tcx-product-card" key={name}>
              <div className="tcx-product-screen">
                <div className="tcx-screen-head"><span>TC</span><small>{name}</small></div>
                {index === 0 && <div className="tcx-screen-big"><small>{t.heroPreview[2]}</small><strong>—</strong><span>{t.heroPreview[3]}</span></div>}
                {index === 1 && <div className="tcx-timeline-mini">{viewBars.map((width, i) => <div key={i}><span style={{ width: `${width}%` }} /><b style={{ width: `${100-width}%` }} /></div>)}</div>}
                {index === 2 && <div className="tcx-period-preview">{t.periodPreview.map((label) => <div key={label}><span>{label}</span><strong>—</strong></div>)}</div>}
              </div>
              <div className="tcx-product-copy"><div><h3>{name}</h3><p>{t.productDescriptions[index]}</p></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="tcx-connect" id="connect">
        <div className="tcx-connect-intro">
          <span className="tcx-kicker">{t.beginnerKicker}</span>
          <h2>{t.beginnerTitle}</h2>
          <p>{t.beginnerText}</p>
        </div>
        <div className="tcx-connect-layout">
          <div className="tcx-step-list">
            {t.steps.map(([, title, body]) => <article key={title}><div><h3>{title}</h3><p>{body}</p></div></article>)}
          </div>
          <aside className="tcx-pair-card">
            <span className="tcx-kicker">{t.pairing[0]}</span>
            <div className="tcx-pair-device"><small>VDO DTCO 4.1a</small><strong>{t.pairing[1]}</strong><span>{t.pairing[2]}</span></div>
            <div className="tcx-pair-arrow">↓</div>
            <div className="tcx-pair-phone"><small>{t.pairing[3]}</small><strong>TachoCommand</strong><span>{t.pairing[4]}</span></div>
            <p>{t.pairing[5]}</p>
          </aside>
        </div>
        <div className="tcx-trouble">
          <div><span className="tcx-kicker">{t.troubleshooting}</span><h3>{t.troubleTitle}</h3></div>
          <div className="tcx-trouble-grid">{t.trouble.map(([q, a]) => <article key={q}><strong>{q}</strong><p>{a}</p></article>)}</div>
        </div>
      </section>

      <section className="tcx-trust" id="trust">
        <div className="tcx-trust-copy">
          <span className="tcx-kicker">{t.privacyKicker}</span>
          <h2>{t.privacyTitle}</h2>
          <p>{t.privacyText}</p>
        </div>
        <div className="tcx-trust-grid">{t.trust.map(([title, body]) => <article key={title}><i>✓</i><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      </section>

      <section className="tcx-section tcx-compat">
        <div className="tcx-section-copy tcx-section-copy-wide"><span className="tcx-kicker">{t.compatibilityKicker}</span><h2>{t.compatibilityTitle}</h2></div>
        <div className="tcx-compat-grid">
          <article className="tcx-compat-card tcx-tested"><span>{t.tested}</span><ul>{t.testedItems.map((item) => <li key={item}>✓ {item}</li>)}</ul></article>
          <article className="tcx-compat-card"><span>{t.planned}</span><ul>{t.plannedItems.map((item) => <li key={item}>○ {item}</li>)}</ul></article>
        </div>
      </section>

      <section className="tcx-price">
        <div className="tcx-price-card">
          <span className="tcx-kicker">{t.priceKicker}</span>
          <h2>{t.priceTitle}</h2>
          <p>{t.priceText}</p>
          <ul>{t.priceBullets.map((item) => <li key={item}>✓ {item}</li>)}</ul>
          <p className="tcx-beta-status">{t.locked}</p>
        </div>
        <div className="tcx-demo-card"><h3>{t.start}</h3><p>{t.heroText}</p><TrialLauncher label={t.start} loadingLabel={t.starting} errorLabel={t.trialError} className="tcx-secondary tcx-demo-button" /></div>
      </section>

      <section className="tcx-faq" id="faq">
        <div className="tcx-section-copy"><span className="tcx-kicker">FAQ</span><h2>{t.faqTitle}</h2></div>
        <div className="tcx-faq-list">{t.faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <footer className="tcx-footer">
        <div className="tcx-brand"><span className="tcx-brand-mark">TC</span><strong>Tacho<span>Command</span></strong></div>
        <p>{t.footer}</p>
        <small className="tcx-release">{formatTachoCommandVersionLine()}</small>
        <div><Link href={`/${locale}/privacy`}>{t.legal.privacy}</Link><Link href={`/${locale}/terms`}>{t.legal.terms}</Link><Link href={`/${locale}/impressum`}>{t.legal.impressum}</Link></div>
      </footer>
    </main>
  );
}
