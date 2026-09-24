"use client";

import { useEffect, useState } from "react";

type BrowserInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type RelatedWebApp = { platform: string; url?: string; id?: string };

/**
 * Landing owns its one visible installation button. Browser evidence (standalone,
 * appinstalled, or a verified related web app) drives the installed guidance.
 */
export default function PwaInstallCta({
  label,
  instructions,
  unavailableLabel,
  installedLabel,
  installedHelp,
  noPromptHelp,
  closeLabel,
}: Readonly<{
  label: string;
  instructions: string;
  unavailableLabel: string;
  installedLabel: string;
  installedHelp: string;
  noPromptHelp: string;
  closeLabel: string;
}>) {
  const [promptEvent, setPromptEvent] = useState<BrowserInstallPrompt | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BrowserInstallPrompt);
      setMessage(null);
      setShowGuide(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowGuide(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const browser = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<RelatedWebApp[]> };
    let cancelled = false;
    if (window.matchMedia("(display-mode: standalone)").matches) queueMicrotask(() => { if (!cancelled) onInstalled(); });
    if (browser.getInstalledRelatedApps) {
      void browser.getInstalledRelatedApps().then((apps) => {
        if (!cancelled && apps.some((app) => app.platform === "webapp" && app.url?.includes("/manifest.webmanifest"))) onInstalled();
      }).catch(() => undefined);
    }
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onInstallClick = () => {
    if (installed) {
      setMessage(installedHelp);
      setShowGuide(true);
      return;
    }
    if (!promptEvent) {
      setMessage(noPromptHelp);
      setShowGuide(true);
      return;
    }

    const prompt = promptEvent;
    setPromptEvent(null); // Browser prompt events may be used only once.
    setMessage(null);
    setShowGuide(false);
    // Invoke the native prompt directly from this user gesture.
    void prompt.prompt().then(
      () => prompt.userChoice.then((choice) => {
        if (choice.outcome !== "accepted") {
          setMessage(unavailableLabel);
          setShowGuide(true);
        }
      }),
      (error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        setMessage(unavailableLabel + " " + detail.slice(0, 110));
        setShowGuide(true);
      },
    ).catch(() => {
      setMessage(unavailableLabel);
      setShowGuide(true);
    });
  };

  return (
    <span className="tcx-install-cta">
      <button type="button" className="tcx-secondary" onClick={onInstallClick}>
        {installed ? installedLabel : label}
      </button>
      {showGuide ? (
        <div className="tcx-install-backdrop" role="presentation" onClick={() => setShowGuide(false)}>
          <section className="tcx-install-dialog" role="dialog" aria-modal="true" aria-label={installed ? installedLabel : label} onClick={(event) => event.stopPropagation()}>
            <strong>{installed ? installedLabel : label}</strong>
            {message ? <p role="status">{message}</p> : null}
            {!installed && promptEvent ? <p>{instructions}</p> : null}
            <button type="button" className="tcx-primary" onClick={() => setShowGuide(false)}>{closeLabel}</button>
          </section>
        </div>
      ) : null}
    </span>
  );
}
