import type { Metadata } from "next";

import { AppNavbar } from "@/components/nav/AppNavbar";

/*
 * Pong League (die App) ist ein Login-Bereich und soll nicht in Google
 * erscheinen. Öffentlich und indexierbar ist die Produktseite
 * (/produkte/pong-league, siehe app/[locale]/produkte/pong-league/page.tsx).
 *
 * "follow: true": Links auf der Seite (z. B. zur Produktseite) dürfen
 * weiterhin verfolgt werden.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

/*
 * Gemeinsame Hülle für alle Seiten unter /turniere (Pong League):
 * oben die Navigationsleiste mit Konto-Verwaltung.
 */
export default function TurniereLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNavbar app="league" />
      {children}
    </>
  );
}
