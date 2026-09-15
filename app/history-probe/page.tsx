import HistoryProbeClient from "./history-probe-client";

export const metadata = {
  title: "TachoCommand — 0.32a Download Path Probe",
  description: "Bounded Smart Tacho V2 Download BLE/DDP feasibility probe without driver-card download",
};

export default function HistoryProbePage() {
  return <HistoryProbeClient />;
}
