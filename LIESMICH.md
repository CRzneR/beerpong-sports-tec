# Englisch, Schritt 1: Grundgerüst

Stand: Deutsch bleibt unverändert unter den bisherigen Adressen, Englisch liegt unter `/en` mit
englischen Adressen. Übersetzt sind in diesem Schritt Startseite, Regeln und Über uns.
Alles Weitere (Pong Stats, Pong League, Kontakt, Rechtliches) folgt in den nächsten Schritten.

## Einbauen (in dieser Reihenfolge)

1. Alles committen (damit du zurück kannst).
2. `npm install next-intl`
3. Aus dem Paket ins Projekt kopieren (gleiche Ordnerstruktur, vorhandene Dateien überschreiben):
   `proxy.ts`, `next.config.ts`, `i18n/`, `messages/`, `lib/seo.ts`, `components/` (inkl.
   `LanguageSwitcher.tsx`), `app/[locale]/`, `app/sitemap.ts`, `app/robots.ts`, `public/llms.txt`.
4. Im Projektstamm: `bash schritt1-umzug.sh`. Das Skript verschiebt die übrigen Seiten-Ordner
   nach `app/[locale]/`, löscht die alte `middleware.ts`, `app/layout.tsx` und `app/page.tsx` und
   passt Importpfade (`@/app/spieler/...` -> `@/app/[locale]/spieler/...`) an.
   `app/api/` und `app/auth/` bleiben, wo sie sind. Auch `app/globals.css` bleibt.
5. `npm run build`. Fehlermeldungen schick mir einfach her.

## Was im Test geprüft wurde (Next 16.3.4, next-intl 4.14, deine echte `updateSession`)

- `/` Deutsch, `/en` Englisch, `/regeln` und `/en/rules`, `/about` und `/en/about`
- `/de/regeln` leitet auf `/regeln`, `/en/regeln` auf `/en/rules` weiter
- Turnier-Adressen mit ID: `/turniere/abc` und `/en/pong-league/abc`, Beitritts-Links bleiben gültig
- Supabase-Cookies, die `updateSession` neu setzt, kommen in der Antwort an und sind schon im selben
  Request für die Seite sichtbar. `/api/*` und `/auth/callback` laufen weiter durch die Session-Auffrischung,
  bekommen aber keine Sprache.
- `<html lang>`, `canonical`, `hreflang` (de, en, x-default), Sitemap mit Sprachverweisen,
  robots.txt (sperrt die privaten Bereiche in beiden Sprachen), Umschalter DE/EN führt auf dieselbe Seite
- Im Browser (Playwright): keine Konsolenfehler, kein Hydration-Fehler

Nicht getestet: deine echten Daten und Anmeldung, die Seiten Pong Stats / Pong League im Zusammenspiel
(dort stehen im Test nur Platzhalter) und der Build mit den echten Google-Fonts.

## Was ich unterwegs in deinem Code gefunden habe

- Das globale `canonical` in `app/layout.tsx` zeigte auf JEDER Seite auf die Startseite. Das ist weg;
  jede Seite setzt ihr eigenes.
- `/community`, `/agb`, `/faq` und `/registrieren` werden verlinkt, die Seiten gibt es aber nicht (404).
  Die Sitemap hatte `/community` und `/agb` drin. Ich habe sie dort entfernt; der Button "Profil erstellen"
  führt jetzt auf `/login`. Die Links in Navbar und Footer lasse ich, bis du entscheidest, ob die Seiten kommen.
- Im Footer stand das Logo mit `src="images/icons/LogoBST.png"` (ohne `/`). Unter `/en/...` hätte es nicht
  geladen. Behoben.
- `app/kontakt/page.tsx`: `SITE_URL` ohne `www`, Bild `"/images/landing/.jpg"` (Dateiname fehlt),
  Hero-Bild `.png` statt `.jpg`. Kommt bei der Kontaktseite in Schritt 2 dran.

## Noch englische Adressen mit deutschem Text

`/en/pong-stats`, `/en/pong-league`, `/en/contact`, `/en/legal-notice`, `/en/privacy`, `/en/login`
senden vorerst `X-Robots-Tag: noindex` (siehe `next.config.ts`), stehen nicht in der Sitemap und haben
kein `hreflang`. Sobald eine Seite übersetzt ist, wird ihr Eintrag in `next.config.ts` gelöscht und in
`app/sitemap.ts` von `GERMAN_ONLY` nach `BILINGUAL` verschoben.

Bis dahin verlinken die noch nicht übersetzten Seiten mit `next/link` auf die deutschen Adressen.
Das ist gewollt: Erst in Schritt 2/3 stelle ich ihre Links auf `@/i18n/navigation` um, weil die dortigen
Links (`/turniere/${id}`, `?next=...`) in der streng typisierten Form umgeschrieben werden müssen.

## Nach dem Livegang

- Search Console: Sitemap `https://www.beerpongsportstec.de/sitemap.xml` neu einreichen.
- Dein Domain-Eintrag deckt `/en` mit ab, eine zweite Property ist nicht nötig.
- Den Auth-Callback und die Stripe-Rückkehr-Adressen habe ich noch nicht angefasst (Schritt 3).
