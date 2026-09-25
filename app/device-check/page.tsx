import type { Metadata } from "next";
import DeviceCheckClient from "./device-check-client";

export const metadata: Metadata = {
  title: "TachoCommand · Kontrola tahografa",
  description: "Lokalna Bluetooth provera identiteta uređaja i odziva veze",
  robots: { index: false, follow: false, nocache: true },
};

export default function DeviceCheckPage() {
  return <DeviceCheckClient />;
}
