import type { Metadata } from "next";

import { AppNavbar } from "@/components/nav/AppNavbar";

export const metadata: Metadata = {
  title: "Meine Statistiken",
  description:
    "Dein persönliches Dashboard bei Pong Stats: Spielstatistiken, Matchverlauf und Ranglisten.",
  robots: {
    index: false,
    follow: false,
  },
};

/*
 * Gemeinsame Hülle für alle Seiten unter /spieler: oben die Navigationsleiste
 * (im Live-Match blendet sie sich selbst aus, siehe AppNavbar).
 */
export default function SpielerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNavbar app="stats" />
      {children}
    </>
  );
}
