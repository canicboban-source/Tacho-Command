"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import styles from "./install-guide.module.css";

type Locale = "sr" | "en" | "de";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const copy = {
  sr: {
    button: "Instaliraj TachoCommand",
    installed: "TachoCommand je instaliran",
    installedHint: "Ova stranica se već prikazuje kao instalirana aplikacija ili je Chrome prijavio da je instalacija uspela. Ponovna instalacija iz već instalirane aplikacije nije moguća. Otvori TachoCommand ikonu na početnom ekranu. Za novu probnu instalaciju otvori preview URL u običnom Chrome tabu; postojeću aplikaciju ne moraš da brišeš radi ažuriranja.",
    kicker: "ANDROID • CHROME",
    title: "Dodaj TachoCommand na početni ekran.",
    intro: "Posle instalacije dobijaš TachoCommand ikonu i standalone prikaz bez browser trake.",
    steps: [
      ["01", "Otvori meni ⋮", "U Chrome-u dodirni tri tačke gore desno."],
      ["02", "Izaberi instalaciju", "Dodirni „Install app“ ili „Dodaj na početni ekran“ — naziv može malo da se razlikuje po verziji Chrome-a."],
      ["03", "Potvrdi", "Izaberi „Install“ / „Dodaj“. TachoCommand ikona će se pojaviti na početnom ekranu."],
      ["04", "Pokreni preko ikone", "Sledeći put otvori TachoCommand direktno sa početnog ekrana kao aplikaciju."],
    ],
    direct: "Instaliraj sada",
    directHint: "Chrome je ponudio direktnu instalaciju na ovom telefonu.",
    manualHint: "Ako gore vidiš X umesto Chrome kartica, stranica je možda otvorena u ugrađenom pregledaču. U njegovom meniju ⋮ izaberi „Otvori u Chrome-u“, pa u punom Chrome-u ⋮ → „Instaliraj aplikaciju“ ili „Dodaj na početni ekran“. Ako te opcije nema, Chrome trenutno ne nudi instalaciju za ovaj sajt.",
    close: "Zatvori",
  },
  en: {
    button: "Install TachoCommand",
    installed: "TachoCommand is installed",
    installedHint: "This page is already running as an installed app, or Chrome reported that installation completed. You cannot reinstall from inside the installed app. Open the TachoCommand icon on your home screen. To start a new test install, open the preview URL in a regular Chrome tab; you do not need to delete the existing app just to update it.",
    kicker: "ANDROID • CHROME",
    title: "Add TachoCommand to your Home screen.",
    intro: "After installation you get a TachoCommand icon and a standalone view without the browser bar.",
    steps: [
      ["01", "Open the ⋮ menu", "In Chrome, tap the three dots in the top-right corner."],
      ["02", "Choose install", "Tap “Install app” or “Add to Home screen”. The wording can vary by Chrome version."],
      ["03", "Confirm", "Tap “Install” / “Add”. The TachoCommand icon appears on your Home screen."],
      ["04", "Launch from the icon", "Next time, open TachoCommand directly from the Home screen like an app."],
    ],
    direct: "Install now",
    directHint: "Chrome offered direct installation on this phone.",
    manualHint: "If you see an X instead of the Chrome tab switcher, this may be an in-app browser. Choose ⋮ → Open in Chrome, then in full Chrome use ⋮ → Install app or Add to Home screen. If absent, Chrome is not currently offering installation for this site.",
    close: "Close",
  },
  de: {
    button: "TachoCommand installieren",
    installed: "TachoCommand ist installiert",
    installedHint: "Diese Seite läuft bereits als installierte App oder Chrome hat die Installation bestätigt. Eine erneute Installation aus der App ist nicht möglich. Öffne TachoCommand über das Symbol auf dem Startbildschirm. Für eine neue Testinstallation öffne die Vorschau in einem normalen Chrome-Tab; für Updates muss die bestehende App nicht gelöscht werden.",
    kicker: "ANDROID • CHROME",
    title: "TachoCommand zum Startbildschirm hinzufügen.",
    intro: "Nach der Installation erhältst du ein TachoCommand-Symbol und eine eigenständige Ansicht ohne Browserleiste.",
    steps: [
      ["01", "⋮ Menü öffnen", "In Chrome oben rechts auf die drei Punkte tippen."],
      ["02", "Installation wählen", "„App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen. Die Bezeichnung kann je nach Chrome-Version variieren."],
      ["03", "Bestätigen", "„Installieren“ / „Hinzufügen“ bestätigen. Das TachoCommand-Symbol erscheint auf dem Startbildschirm."],
      ["04", "Über das Symbol starten", "TachoCommand künftig direkt vom Startbildschirm wie eine App öffnen."],
    ],
    direct: "Jetzt installieren",
    directHint: "Chrome bietet auf diesem Gerät eine direkte Installation an.",
    manualHint: "Bei einem X statt Chrome-Tabs kann die Seite in einem eingebetteten Browser geöffnet sein: ⋮ → In Chrome öffnen wählen. Danach in Chrome ⋮ → App installieren oder Zum Startbildschirm hinzufügen. Fehlt die Option, bietet Chrome die Installation derzeit nicht an.",
    close: "Schließen",
  },
} as const;

function readLocale(): Locale {
  if (typeof window === "undefined") return "sr";
  const saved = window.localStorage.getItem("tachocommand-locale");
  if (saved === "sr" || saved === "en" || saved === "de") return saved;
  const language = window.navigator.language.toLowerCase();
  if (language.startsWith("de")) return "de";
  if (language.startsWith("en")) return "en";
  return "sr";
}

function subscribeLocale(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export default function InstallGuide() {
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => "sr" as Locale);
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const installNow = useCallback(async () => {
    if (!installPrompt) {
      setOpen(true);
      return;
    }
    const prompt = installPrompt;
    setInstallPrompt(null); // A browser install event can only be used once.
    setInstallError(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome !== "accepted") setOpen(true);
      // Only appinstalled (not acceptance) confirms successful installation.
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 130) : String(error).slice(0, 130);
      setInstallError("Chrome nije pokrenuo instalaciju: " + reason);
      setOpen(true);
    }
  }, [installPrompt]);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setOpen(false);
    };

    const onLandingInstall = () => {
      setInstallError(null);
      if (installed) setOpen(true); // The preview is already installed: explain why reinstallation does nothing.
      else if (installPrompt) void installNow(); // Direct native prompt from the user click.
      else setOpen(true); // Unsupported browser: show actionable Chrome menu steps.
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("tachocommand-open-install-guide", onLandingInstall);

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) queueMicrotask(() => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("tachocommand-open-install-guide", onLandingInstall);
    };
  }, [installPrompt, installed, installNow]);

  return (
    <>
      <button
        className={installed ? styles.installed : styles.fab}
        type="button"
        onClick={() => installed ? setOpen(true) : installPrompt ? void installNow() : setOpen(true)}
      >
        {installed ? "✓ " + t.installed : <><span>＋</span>{t.button}</>}
      </button>
      {open && (
        <div className={styles.backdrop} role="presentation" onClick={() => setOpen(false)}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tc-install-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.handle} />
            <span className={styles.kicker}>{t.kicker}</span>
            <h2 id="tc-install-title">{installed ? t.installed : t.title}</h2>
            {!installed ? <>
              <p className={styles.intro}>{t.intro}</p>
              <div className={styles.steps}>
                {t.steps.map(([number, title, body]) => (
                  <article key={number}>
                    <span>{number}</span>
                    <div><h3>{title}</h3><p>{body}</p></div>
                  </article>
                ))}
              </div>
            </> : null}
            {installError ? <p role="status" className={styles.hint}>{installError}</p> : null}
            {installed ? <p role="status" className={styles.hint}>{t.installedHint}</p> : installPrompt ? (
              <div className={styles.directBox}>
                <p>{t.directHint}</p>
                <button type="button" onClick={() => void installNow()}>{t.direct}</button>
              </div>
            ) : <p className={styles.hint}>{t.manualHint}</p>}
            <button className={styles.close} type="button" onClick={() => setOpen(false)}>{t.close}</button>
          </section>
        </div>
      )}
    </>
  );
}
