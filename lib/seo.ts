import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/*
|--------------------------------------------------------------------------
| SEO-HILFEN FÜR MEHRERE SPRACHEN
|--------------------------------------------------------------------------
|
| Datei: lib/seo.ts
|
| Liefert pro Seite die kanonische Adresse und die hreflang-Verweise auf
| alle Sprachfassungen. Google erkennt daran, dass /regeln und /en/rules
| dieselbe Seite in zwei Sprachen sind (statt doppelter Inhalte).
|
| x-default zeigt auf die deutsche Fassung.
|
| Verwendung in einer Seite:
|
|   export async function generateMetadata({ params }) {
|     const { locale } = await params;
|     return { alternates: pageAlternates(locale as Locale, "/regeln") };
|   }
|
| Wichtig: hreflang nur für Seiten angeben, die es wirklich in beiden
| Sprachen gibt. Eine Seite, die auf /en noch deutschen Text zeigt, bekommt
| KEINEN Verweis.
|
*/

/* Kanonische Adresse. Muss der Domain in der Search Console entsprechen (mit www). */
export const SITE_URL = "https://www.beerpongsportstec.de";

type PathKey = Parameters<typeof getPathname>[0]["href"];

/* Interner Schlüssel -> sichtbarer Pfad, z. B. ("en", "/regeln") -> "/en/rules". */
export function localizedPath(locale: Locale, href: PathKey): string {
  return getPathname({ locale, href });
}

export function absoluteUrl(locale: Locale, href: PathKey): string {
  const path = localizedPath(locale, href);

  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/* Alle Sprachfassungen einer Seite (für <link rel="alternate" hreflang> und die Sitemap). */
export function languageUrls(href: PathKey): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(locale, href);
  }

  languages["x-default"] = absoluteUrl(routing.defaultLocale, href);

  return languages;
}

export function pageAlternates(locale: Locale, href: PathKey) {
  return {
    canonical: absoluteUrl(locale, href),
    languages: languageUrls(href),
  };
}

/* OpenGraph-Sprachkürzel */
export const OG_LOCALE: Record<Locale, string> = {
  de: "de_DE",
  en: "en_US",
};
