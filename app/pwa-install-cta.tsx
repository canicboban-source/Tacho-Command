"use client";

/**
 * One installation flow for the entire page: the existing InstallGuide
 * owns beforeinstallprompt and its one-use browser event. A second listener
 * would offer the same consumed event to two different "install" buttons.
 */
export default function PwaInstallCta({ label }: Readonly<{
  label: string;
  instructions: string;
  installedLabel: string;
  unavailableLabel: string;
}>) {
  return (
    <span className="tcx-install-cta">
      <button
        type="button"
        className="tcx-secondary"
        onClick={() => window.dispatchEvent(new Event("tachocommand-open-install-guide"))}
      >
        {label}
      </button>
    </span>
  );
}
