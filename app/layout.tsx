import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Shippori_Mincho_B1 } from "next/font/google";
import "./globals.css";
import { SyncBootstrap } from "@/components/SyncBootstrap";

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
  title: "Origin — Coffee Library",
  description: "Vivino for single-origin beans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ibmPlexMono.variable} ${shippori.variable}`}>
      <body>
        <SyncBootstrap />
        {children}
      </body>
    </html>
  );
}
