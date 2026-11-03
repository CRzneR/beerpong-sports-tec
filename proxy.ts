import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

/*
|--------------------------------------------------------------------------
| PROXY (früher middleware.ts)
|--------------------------------------------------------------------------
|
| Datei: proxy.ts im Projektstamm (neben package.json). Die alte
| middleware.ts wird gelöscht - Next 16 nennt die Datei "proxy".
|
| Reihenfolge:
|   1. Supabase-Sitzung auffrischen (wie bisher, für ALLE Pfade inkl. /api
|      und /auth/callback).
|   2. Für normale Seiten zusätzlich die Sprache auflösen: "/spieler" wird
|      intern zu "/de/spieler", "/en/pong-stats" zu "/en/spieler".
|   3. Cookies, die Supabase gerade neu gesetzt hat, werden an die
|      Antwort der Sprachlogik übernommen - sonst gingen sie verloren.
|
*/

const handleI18nRouting = createIntlMiddleware(routing);

/* /api und /auth haben keine Sprache. */
const WITHOUT_LOCALE = /^\/(api|auth)(\/|$)/;

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);

  if (WITHOUT_LOCALE.test(request.nextUrl.pathname)) {
    return sessionResponse;
  }

  const response = handleI18nRouting(request);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

export const config = {
  /*
   * Alles außer Next-Interna, Stripe-Webhook und Dateien mit Endung
   * (Bilder, robots.txt, sitemap.xml, llms.txt ...).
   */
  matcher: ["/((?!_next|_vercel|api/stripe/webhook|.*\\..*).*)"],
};
