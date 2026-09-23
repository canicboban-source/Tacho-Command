"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Props = Readonly<{
  label: string;
  instructions: string;
  installedLabel: string;
  unavailableLabel: string;
}>;

/**
 * Android Chrome allows an install prompt only after beforeinstallprompt.
 * Never claim a PWA was installed merely because the button was tapped.
 * If the browser does not offer a prompt, give real Chrome menu instructions.
 */
export default function PwaInstallCta({
  label,
  instructions,
  installedLabel,
  unavailableLabel,
}: Props) {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    };
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
      setShowGuide(false);
      setNotice(null);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setShowGuide(false);
      setNotice(null);
    };
    checkInstalled();
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (installed || busy) return;
    if (!deferred) {
      setShowGuide(true);
      setNotice(unavailableLabel);
      return;
    }
    setBusy(true);
    setNotice(null);
    setDeferred(null);
    try {
      await deferred.prompt();
      const decision = await deferred.userChoice;
      if (decision.outcome !== "accepted") {
        setShowGuide(true);
        setNotice(unavailableLabel);
      } else {
        setNotice(null); // Wait for appinstalled; acceptance alone is not installation.
      }
    } catch {
      setShowGuide(true);
      setNotice(unavailableLabel);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="tcx-install-cta">
      <button type="button" className="tcx-secondary" onClick={install} disabled={installed || busy}>
        {installed ? installedLabel : busy ? "…" : label}
      </button>
      {notice ? <small role="status">{notice}</small> : null}
      {showGuide ? <small>{instructions}</small> : null}
    </span>
  );
}
