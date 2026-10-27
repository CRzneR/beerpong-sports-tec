import type { MetadataRoute } from "next";

import { SITE_URL } from "./sitemap";

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
 * - Gesperrt sind Bereiche ohne Suchwert: API, Login, Registrierung,
 *   Turnier-Anlegen und die Live-Match-Seiten.
 * - Wichtig: Ein eigener Block für einen Bot ersetzt den "*"-Block komplett,
 *   deshalb gelten die Sperren unten in JEDEM Block.
 * - Möchtest du einen KI-Bot aussperren, nimm seinen Namen aus AI_BOTS
 *   heraus und trage ihn in BLOCKED_BOTS ein.
 * --------------------------------------------------------------------------
 */

const DISALLOW = ["/api/", "/login", "/registrieren", "/turniere/neu", "/spieler/match/"];

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
