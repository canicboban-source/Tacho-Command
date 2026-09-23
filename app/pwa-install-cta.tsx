"use client";

import { useEffect, useState } from "react";

type BrowserInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Landing owns its one visible installation button and one browser prompt
 * listener. A standalone display mode is not proof of a successful install:
 * never show a fabricated "app installed" badge or block the button.
 */
export default function PwaInstallCta({
  label,
  instructions,
  unavailableLabel,
}: Readonly<{
  label: string;
  instructions: string;
  unavailableLabel: string;
}>) {
  const [promptEvent, setPromptEvent] = useState<BrowserInstallPrompt | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BrowserInstallPrompt);
      setMessage(null);
      setShowGuide(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const onInstallClick = () => {
    // Never label anything as installed. Let Chrome handle the actual action.
    if (!promptEvent) {
      setMessage(unavailableLabel);
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
        {label}
      </button>
      {message ? <small role="status">{message}</small> : null}
      {showGuide ? <small>{instructions}</small> : null}
    </span>
  );
}
