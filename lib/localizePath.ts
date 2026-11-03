import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/*
 * Wandelt eine interne (deutsche) App-Adresse in die Adresse der gewünschten
 * Sprache um:
 *
 *   localizePath("/spieler", "en")              -> "/en/pong-stats"
 *   localizePath("/turniere/abc123", "en")      -> "/en/pong-league/abc123"
 *   localizePath("/spieler/match/xyz", "de")    -> "/spieler/match/xyz"
 *
 * Gebraucht für Adressen, die NICHT über <Link> laufen: Login-Rückkehr
 * (auth/callback?next=...), QR-Codes und Stripe-Rückkehr. Unbekannte Pfade
 * kommen unverändert zurück (Sicherheitsnetz, nichts geht kaputt).
 * Query-Strings (?a=b) bleiben erhalten.
 */

type Href = Parameters<typeof getPathname>[0]["href"];

const STATIC_PATHS = new Set([
  "/",
  "/login",
  "/spieler",
  "/spieler/match",
  "/turniere",
  "/turniere/neu",
  "/kontakt",
  "/regeln",
  "/about",
  "/impressum",
  "/datenschutz",
]);

export function localizePath(path: string, locale: Locale): string {
  const [pathOnly, ...queryParts] = path.split("?");
  const query = queryParts.length ? `?${queryParts.join("?")}` : "";

  let href: Href | null = null;
  let match: RegExpMatchArray | null;

  if (STATIC_PATHS.has(pathOnly)) {
    href = pathOnly as Href;
  } else if ((match = pathOnly.match(/^\/spieler\/match\/([^/]+)$/))) {
    href = { pathname: "/spieler/match/[matchId]", params: { matchId: match[1] } };
  } else if ((match = pathOnly.match(/^\/turniere\/beitreten\/([^/]+)$/))) {
    href = { pathname: "/turniere/beitreten/[code]", params: { code: match[1] } };
  } else if ((match = pathOnly.match(/^\/turniere\/([^/]+)$/))) {
    href = { pathname: "/turniere/[tournamentId]", params: { tournamentId: match[1] } };
  }

  if (!href) {
    return path;
  }

  return `${getPathname({ locale, href })}${query}`;
}
