import { createClient } from "@/lib/supabase/client";

/*
 * --------------------------------------------------------------------------
 * | KURZER ZWISCHENSPEICHER FÜR DATENBANK-ABFRAGEN
 * --------------------------------------------------------------------------
 *
 * Eine Profilseite ruft mehrere Statistik-Funktionen auf, die alle dieselben
 * Daten brauchen (Rangliste, Rating, Verlauf, Achievements ...). Ohne
 * Zwischenspeicher würde jede davon die Daten neu aus der Datenbank laden.
 *
 *  - Gleichzeitige Aufrufe teilen sich EINE Anfrage (es wird das laufende
 *    Promise zurückgegeben).
 *  - Das Ergebnis bleibt kurz (CACHE_TTL_MS) im Speicher des Browser-Tabs.
 *  - Schreibende Aktionen (Match speichern/löschen, Profil ändern, Statistik
 *    zurücksetzen) rufen invalidateStatsCaches() auf, danach wird neu geladen.
 *  - Der Schlüssel enthält die Nutzer-ID, damit nach Login-Wechsel nie Daten
 *    des vorherigen Nutzers auftauchen.
 *  - Schlägt eine Abfrage fehl, wird der Fehler NICHT zwischengespeichert.
 *
 * Wichtig: Zwischengespeicherte Ergebnisse dürfen nicht verändert werden
 * (kein .sort()/.push() auf den Originalen, vorher kopieren).
 * --------------------------------------------------------------------------
 */

export const CACHE_TTL_MS = 20_000;

type Entry = { expires: number; promise: Promise<unknown> };

const store = new Map<string, Entry>();

async function getCacheScope(): Promise<string> {
  try {
    const { data } = await createClient().auth.getSession();

    return data.session?.user.id ?? "anon";
  } catch {
    return "anon";
  }
}

export async function cachedQuery<T>(key: string, load: () => Promise<T>): Promise<T> {
  const fullKey = `${await getCacheScope()}:${key}`;
  const now = Date.now();
  const hit = store.get(fullKey);

  if (hit && hit.expires > now) {
    return hit.promise as Promise<T>;
  }

  const promise = load();

  store.set(fullKey, { expires: now + CACHE_TTL_MS, promise });

  promise.catch(() => {
    /* Nur eigenen Eintrag entfernen, falls inzwischen ein neuerer drinsteht. */
    if (store.get(fullKey)?.promise === promise) {
      store.delete(fullKey);
    }
  });

  return promise;
}

export function invalidateStatsCaches(): void {
  store.clear();
}
