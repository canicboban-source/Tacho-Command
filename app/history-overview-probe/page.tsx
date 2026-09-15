import HistoryOverviewProbeClient from "./history-overview-probe-client";

export const metadata = {
  title: "TachoCommand — 0.32b Gen2v2 Overview Probe",
  description: "Bounded credit-safe Smart Tacho V2 Download BLE/DDP Overview probe without driver-card download",
};

export default function HistoryOverviewProbePage() {
  return <HistoryOverviewProbeClient />;
}
