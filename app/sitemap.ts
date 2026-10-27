import type { MetadataRoute } from "next";

/*
 * --------------------------------------------------------------------------
 * | SITEMAP  (wird automatisch unter /sitemap.xml ausgeliefert)
 * --------------------------------------------------------------------------
 *
 * Datei: app/sitemap.ts
 *
 * Nur öffentliche Seiten, die in Google (und KI-Suchen wie ChatGPT, Perplexity,
 * Gemini, Claude) auftauchen sollen. NICHT enthalten, weil ohne Suchwert oder
 * hinter Login: /login, /registrieren, /turniere/neu, /spieler/match/..., /api/...
 *
 * Bewusst ohne lastModified, priority und changeFrequency: Google ignoriert
 * priority/changeFrequency, und ein lastModified, das bei jedem Build auf
 * "jetzt" steht, wird als unzuverlässig eingestuft. Wenn du ein echtes
 * Änderungsdatum pro Seite pflegen willst, ergänze lastModified: "2026-10-27".
 *
 * Neue öffentliche Seite? Einfach in PAGES eintragen.
 * --------------------------------------------------------------------------
 */

/* Kanonische Adresse. Muss exakt der Domain entsprechen, die Google als
 * "Property" in der Search Console führt (hier mit www). */
export const SITE_URL = "https://www.beerpongsportstec.de";

const PAGES = [
  "/",
  "/spieler", // Pong Stats
  "/turniere", // Pong League
  "/community",
  "/about",
  "/kontakt",
  "/regeln",
  "/impressum",
  "/datenschutz",
  "/agb",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
  }));
}
