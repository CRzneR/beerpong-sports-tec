"use client";

import type { ReactNode } from "react";

import { useConsent, type CategoryId } from "@/lib/consent/consent";

/*
 * Zeigt (und lädt) Inhalte erst, wenn der Besucher der Kategorie zugestimmt hat.
 *
 * Beispiel - Analytics-Skript nur mit Einwilligung:
 *
 *   <ConsentGate category="statistics">
 *     <Script src="https://..." strategy="afterInteractive" />
 *   </ConsentGate>
 *
 * Beispiel - Video erst nach Zustimmung, sonst Hinweis:
 *
 *   <ConsentGate category="external" fallback={<p>Bitte Externe Inhalte erlauben.</p>}>
 *     <iframe src="https://www.youtube-nocookie.com/embed/..." />
 *   </ConsentGate>
 *
 * Vorher die Kategorie in lib/consent/consent.ts unter
 * ACTIVE_OPTIONAL_CATEGORIES eintragen und CONSENT_VERSION erhöhen.
 */
export function ConsentGate({
  category,
  children,
  fallback = null,
}: {
  category: CategoryId;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { ready, has } = useConsent();

  if (!ready) {
    return null;
  }

  return <>{has(category) ? children : fallback}</>;
}
