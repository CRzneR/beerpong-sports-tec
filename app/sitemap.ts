import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { absoluteUrl, languageUrls } from "@/lib/seo";

/*
 * --------------------------------------------------------------------------
 * | SITEMAP  (wird automatisch unter /sitemap.xml ausgeliefert)
 * --------------------------------------------------------------------------
 *
 * Datei: app/sitemap.ts  (bleibt direkt unter app/, NICHT in [locale])
 *
 * Nur öffentliche Seiten, die in Google (und KI-Suchen wie ChatGPT, Perplexity,
 * Gemini, Claude) auftauchen sollen. NICHT enthalten, weil ohne Suchwert oder
 * hinter Login: /login, /turniere/neu, /spieler/match/..., /api/...
 *
 * Zwei Listen:
 *
 *  - BILINGUAL: Seiten, die es auf Deutsch UND Englisch gibt. Jede Sprache
 *    bekommt einen Eintrag, beide verweisen per hreflang aufeinander.
 *  - GERMAN_ONLY: Seiten, die noch nicht übersetzt sind. Sobald eine Seite
 *    englischen Text hat, wandert ihr Eintrag von GERMAN_ONLY nach BILINGUAL
 *    (und die Seite setzt pageAlternates(...) in ihren Metadaten).
 *
 * Bewusst ohne lastModified, priority und changeFrequency: Google ignoriert
 * priority/changeFrequency, und ein lastModified, das bei jedem Build auf
 * "jetzt" steht, wird als unzuverlässig eingestuft.
 *
 * Nicht eingetragen, weil es die Seiten (noch) nicht gibt und sie 404
 * liefern würden: /community, /agb, /faq. Sobald angelegt, hier ergänzen.
 * --------------------------------------------------------------------------
 */

type BilingualPath = Parameters<typeof languageUrls>[0];

const BILINGUAL: BilingualPath[] = ["/", "/regeln", "/about", "/kontakt"];

const GERMAN_ONLY: BilingualPath[] = [
  "/spieler", // Pong Stats
  "/turniere", // Pong League
  "/impressum",
  "/datenschutz",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const bilingual = BILINGUAL.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      alternates: { languages: languageUrls(path) },
    })),
  );

  const germanOnly = GERMAN_ONLY.map((path) => ({
    url: absoluteUrl(routing.defaultLocale, path),
  }));

  return [...bilingual, ...germanOnly];
}
