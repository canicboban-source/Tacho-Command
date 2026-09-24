import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing-oled.css";
import ServiceWorkerRegister from "./service-worker-register";
import ProductAnalyticsObserver from "./product-analytics-observer";
import { TACHOCOMMAND_VERSIONS } from "../lib/product-version.js";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tachocommand.com"),
  title: {
    default: "TachoCommand — očitaj karticu i pregledaj 56 dana",
    template: "%s | TachoCommand",
  },
  description:
    "TachoCommand na podržanom VDO DTCO 4.1a očitava vozačku karticu preko Android telefona i prikazuje poslednjih 56 dana aktivnosti. Tahograf i kartica ostaju merodavni.",
  applicationName: "TachoCommand",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TachoCommand",
  },
  formatDetection: { telephone: false },
  other: { "application-status": "beta", "application-version": TACHOCOMMAND_VERSIONS.product },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#020304",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr">
      <head><link rel="manifest" href="/manifest.webmanifest" /></head>
      <body>
        <ServiceWorkerRegister />
        <ProductAnalyticsObserver />
        {children}
      </body>
    </html>
  );
}
