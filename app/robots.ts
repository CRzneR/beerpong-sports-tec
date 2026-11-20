import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { SITE_URL, localizedPath } from "@/lib/seo";

/*
 * --------------------------------------------------------------------------
 * | ROBOTS  (wird automatisch unter /robots.txt ausgeliefert)
 * --------------------------------------------------------------------------
 *
 * Datei: app/robots.ts
 *
 * - Suchmaschinen und KI-Crawler dürfen alle öffentlichen Seiten lesen
 *   (wichtig für GEO: Nur was gecrawlt werden darf, kann in ChatGPT,
 *   Perplexity, Gemini, Claude usw. zitiert werden).
 * - Gesperrt sind Bereiche ohne Suchwert: API, Login, Turnier-Anlegen,
 *   Einladungslinks (Turnier beitreten) und die Live-Match-Seiten - in jeder Sprache (die englischen Adressen
 *   werden aus routing.ts berechnet).
 * - Die Apps selbst (/spieler, /turniere) sind NICHT gesperrt, sondern per
 *   noindex-Metadaten aus dem Index genommen: Google muss die Seite lesen
 *   dürfen, um das noindex zu sehen. Gefunden werden sollen die Produktseiten
 *   (/produkte/pong-stats, /produkte/pong-league).
 * - Wichtig: Ein eigener Block für einen Bot ersetzt den "*"-Block komplett,
 *   deshalb gelten die Sperren unten in JEDEM Block.
 * - Möchtest du einen KI-Bot aussperren, nimm seinen Namen aus AI_BOTS
 *   heraus und trage ihn in BLOCKED_BOTS ein.
 * --------------------------------------------------------------------------
 */

const PRIVATE_AREAS = ["/login", "/turniere/neu", "/spieler/match"] as const;

/* Einladungslinks (/turniere/beitreten/CODE bzw. /en/pong-league/join/CODE): nur der Ordner, nicht der Code. */
const joinFolder = (locale: (typeof routing.locales)[number]) =>
  getPathname({
    locale,
    href: { pathname: "/turniere/beitreten/[code]", params: { code: "CODE" } },
  }).replace("CODE", "");

const DISALLOW = [
  "/api/",
  "/auth/",
  ...routing.locales.map(joinFolder),
  ...routing.locales.flatMap((locale) =>
    PRIVATE_AREAS.map((path) => {
      const localized = localizedPath(locale, path);

      /* Ordner-Pfade mit "/" am Ende, damit auch alle Unterseiten (Match-IDs) gesperrt sind. */
      return path === "/spieler/match" ? `${localized}/` : localized;
    }),
  ),
];

/* Suche und Antworten von KI-Systemen (Zitate mit Quelle) */
const AI_SEARCH_BOTS = [
  "OAI-SearchBot", // ChatGPT Search
  "ChatGPT-User", // ChatGPT ruft eine Seite auf Nutzerwunsch ab
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
];

/* Training / Wissensbasis der Modelle */
const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended", // Gemini-Training und "Grounding"
  "Applebot-Extended",
];

/* Hier eintragen, was ausgesperrt werden soll (aktuell nichts). */
const BLOCKED_BOTS: string[] = [];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...[...AI_SEARCH_BOTS, ...AI_TRAINING_BOTS].map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
      ...BLOCKED_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
