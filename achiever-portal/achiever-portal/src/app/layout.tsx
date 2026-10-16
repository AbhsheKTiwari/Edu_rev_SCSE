import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { portalName } from "@/lib/env";

const display = Source_Serif_4({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const body = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${portalName} — Celebrating Student Excellence`, template: `%s · ${portalName}` },
  description: "Daily and weekly recognition of student research, projects, placements and ventures.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#231f20",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
