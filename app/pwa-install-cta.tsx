"use client";

import { useEffect, useState } from "react";

/**
 * The existing InstallGuide owns the ONE browser install prompt. This visible
 * landing button delegates to it and stays actionable when already installed:
 * pressing it opens the installed-app explanation instead of silently failing.
 */
export default function PwaInstallCta({
  label,
  installedLabel,
}: Readonly<{
  label: string;
  instructions: string;
  installedLabel: string;
  unavailableLabel: string;
}>) {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return (
    <span className="tcx-install-cta">
      <button
        type="button"
        className="tcx-secondary"
        onClick={() => window.dispatchEvent(new Event("tachocommand-open-install-guide"))}
      >
        {installed ? installedLabel + " · ℹ" : label}
      </button>
    </span>
  );
}
