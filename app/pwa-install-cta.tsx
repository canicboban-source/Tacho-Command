"use client";

/**
 * One installation flow for the entire page: the existing InstallGuide
 * owns the browser's one-use installation event. The landing button opens
 * its instructions instead of trying to invoke another browser prompt.
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
