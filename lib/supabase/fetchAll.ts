/*
 * --------------------------------------------------------------------------
 * | SUPABASE: MEHR ALS 1000 ZEILEN LADEN
 * --------------------------------------------------------------------------
 *
 * Supabase (PostgREST) liefert pro Anfrage höchstens 1000 Zeilen
 * (Einstellung "Max Rows", Standard 1000). Alles darüber wird STILL
 * abgeschnitten - es gibt weder Fehler noch Warnung.
 *
 * Zwei Hilfsfunktionen lösen das:
 *
 *  - fetchAllPages: holt eine Abfrage seitenweise (.range) und fügt die
 *    Seiten zusammen.
 *  - fetchAllByIds: teilt eine lange ID-Liste für .in(...) in Stücke
 *    (sehr viele IDs machen die URL zu lang und die Anfrage schlägt fehl)
 *    und lädt jedes Stück mit fetchAllPages.
 *
 * WICHTIG: Die Abfrage braucht eine EINDEUTIGE Sortierung (z. B. am Ende
 * .order("id")). Sonst können Zeilen zwischen den Seiten doppelt oder gar
 * nicht auftauchen.
 * --------------------------------------------------------------------------
 */

/* Entspricht dem Standard von "Max Rows" in Supabase. Nicht größer wählen. */
export const SUPABASE_PAGE_SIZE = 1000;

/* 100 UUIDs sind etwa 4 KB URL und damit sicher unter den üblichen Grenzen. */
export const SUPABASE_ID_CHUNK_SIZE = 100;

type PageResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

/**
 * loadPage bekommt von/bis (inklusive) und gibt die Supabase-Abfrage zurück:
 *
 *   fetchAllPages<Row>((from, to) =>
 *     supabase.from("tabelle").select("a, b").order("id").range(from, to),
 *   )
 */
export async function fetchAllPages<T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResponse>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await loadPage(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as T[];

    rows.push(...page);

    /* Weniger als eine volle Seite = das war die letzte. */
    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

/**
 * Wie fetchAllPages, aber für Abfragen mit .in("spalte", ids):
 *
 *   fetchAllByIds<Row>(matchIds, (ids, from, to) =>
 *     supabase.from("actions").select("...").in("match_id", ids).order("id").range(from, to),
 *   )
 */
export async function fetchAllByIds<T>(
  ids: string[],
  loadPage: (idChunk: string[], from: number, to: number) => PromiseLike<PageResponse>,
): Promise<T[]> {
  const chunks: string[][] = [];

  for (let index = 0; index < ids.length; index += SUPABASE_ID_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + SUPABASE_ID_CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk) => fetchAllPages<T>((from, to) => loadPage(chunk, from, to))),
  );

  return results.flat();
}
