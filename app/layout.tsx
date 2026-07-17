import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono, Shippori_Mincho_B1 } from "next/font/google";
import "./globals.css";
import { SyncBootstrap } from "@/components/SyncBootstrap";
import { PWARegister } from "@/components/PWARegister";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const shippori = Shippori_Mincho_B1({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Origin",
  title: "Origin — Coffee Library",
  description: "Vivino for single-origin beans.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Origin",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0C1017",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ibmPlexMono.variable} ${shippori.variable}`}>
      <body>
        <PWARegister />
        <SyncBootstrap />
        {children}
      </body>
    </html>
  );
}
