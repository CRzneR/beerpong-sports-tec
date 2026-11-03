import { defineRouting } from "next-intl/routing";

/*
|--------------------------------------------------------------------------
| SPRACHEN UND ADRESSEN
|--------------------------------------------------------------------------
|
| Datei: i18n/routing.ts
|
| Deutsch ist die Standardsprache und bleibt OHNE Präfix (/spieler, /regeln),
| damit alle bestehenden Links, QR-Codes und Google-Einträge weiter gelten.
| Englisch liegt unter /en mit englischen Adressen (/en/pong-stats,
| /en/rules) - das ist wichtig, damit Google die Seite für englische
| Suchanfragen versteht.
|
| Die SCHLÜSSEL unten ("/spieler", "/turniere/[tournamentId]") sind zugleich
| die Ordnernamen unter app/[locale]/. Die Ordner behalten also ihre
| deutschen Namen, nur die sichtbare Adresse wird pro Sprache übersetzt.
|
| Neue Seite? Ordner anlegen und hier einen Eintrag ergänzen.
|
| localeDetection: false -> es wird NICHT anhand der Browsersprache
| umgeleitet. Eine Seite, deren Inhalt je nach Browser wechselt, ist für
| Google schwer zu erfassen (der Crawler kommt meist mit englischer
| Einstellung). Die Sprache ergibt sich allein aus der Adresse; wer will,
| wechselt mit dem Umschalter.
|
*/

export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  /* hreflang setzen wir selbst pro Seite (lib/seo.ts); der automatische Link-Header wäre doppelt. */
  alternateLinks: false,
  pathnames: {
    "/": "/",
    "/about": "/about",
    "/community": "/community",
    "/faq": "/faq",
    "/login": "/login",
    "/kontakt": { de: "/kontakt", en: "/contact" },
    "/regeln": { de: "/regeln", en: "/rules" },
    "/impressum": { de: "/impressum", en: "/legal-notice" },
    "/datenschutz": { de: "/datenschutz", en: "/privacy" },
    "/agb": { de: "/agb", en: "/terms" },

    /* Pong Stats */
    "/spieler": { de: "/spieler", en: "/pong-stats" },
    "/spieler/match": { de: "/spieler/match", en: "/pong-stats/match" },
    "/spieler/match/[matchId]": {
      de: "/spieler/match/[matchId]",
      en: "/pong-stats/match/[matchId]",
    },

    /* Pong League */
    "/turniere": { de: "/turniere", en: "/pong-league" },
    "/turniere/neu": { de: "/turniere/neu", en: "/pong-league/new" },
    "/turniere/[tournamentId]": {
      de: "/turniere/[tournamentId]",
      en: "/pong-league/[tournamentId]",
    },
    "/turniere/beitreten/[code]": {
      de: "/turniere/beitreten/[code]",
      en: "/pong-league/join/[code]",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
