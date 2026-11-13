import { createClient } from "@/lib/supabase/client";
import { fetchAllPages } from "@/lib/supabase/fetchAll";
import { cachedQuery } from "@/lib/supabase/queryCache";
import { isNonThrowAction } from "./matchLogic";
import type { Team } from "./matchLogic";
import { getSavedMatches, type SavedMatch } from "./matchStorage";

/*
 * --------------------------------------------------------------------------
 * | MATCH-ZUSAMMENFASSUNG ("DIGEST")
 * --------------------------------------------------------------------------
 *
 * Rangliste, Skill-Rating und die Liste "Letzte Matches" brauchen nicht jeden
 * einzelnen Wurf, sondern nur Summen pro Match und Spieler. Die berechnet
 * die Datenbank (sql/stats-aggregation.sql, Funktion get_match_digests) und
 * liefert eine kurze Zeile pro Match statt rund 40 Zeilen pro Match.
 *
 * Fallback: Fehlt die SQL-Funktion noch (SQL nicht ausgeführt) oder schlägt der
 * Aufruf fehl, rechnet getMatchDigests() mit den vollständig geladenen
 * Matches dasselbe im Browser aus (langsam, aber das Ergebnis ist gleich).
 * Die App läuft also auch vor dem Ausführen des SQL weiter.
 * --------------------------------------------------------------------------
 */

export type DigestPlayer = {
  id: string;
  name: string;
  team: Team;
  throws: number;
  hits: number;
  misses: number;
  cupsRemoved: number;
  singleHits: number;
  bounceHits: number;
  trickshotHits: number;
  penaltyCups: number;
  knockedOverCups: number;
};

export type MatchDigest = {
  id: string;
  savedAt: string;
  winner: Team | null;
  /** Becher-IDs, die Team A bzw. Team B dem Gegner entfernt hat (ohne Doppelte, sortiert). */
  cupsA: number[];
  cupsB: number[];
  players: DigestPlayer[];
};

type DigestRow = {
  id: string;
  created_at: string;
  winner: string | null;
  cups_a: unknown;
  cups_b: unknown;
  players: unknown;
};

function toTeam(value: unknown): Team | null {
  return value === "A" || value === "B" ? value : null;
}

function toNumbers(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parsePlayers(value: unknown): DigestPlayer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: DigestPlayer[] = [];

  for (const item of value as Record<string, unknown>[]) {
    const team = toTeam(item?.team);

    if (!item || typeof item.id !== "string" || !team) {
      continue;
    }

    result.push({
      id: item.id,
      name: typeof item.name === "string" ? item.name : "Unbekannter Spieler",
      team,
      throws: toCount(item.throws),
      hits: toCount(item.hits),
      misses: toCount(item.misses),
      cupsRemoved: toCount(item.cupsRemoved),
      singleHits: toCount(item.singleHits),
      bounceHits: toCount(item.bounceHits),
      trickshotHits: toCount(item.trickshotHits),
      penaltyCups: toCount(item.penaltyCups),
      knockedOverCups: toCount(item.knockedOverCups),
    });
  }

  return result;
}

export function parseDigestRow(row: DigestRow): MatchDigest {
  return {
    id: row.id,
    savedAt: row.created_at,
    winner: toTeam(row.winner),
    cupsA: toNumbers(row.cups_a),
    cupsB: toNumbers(row.cups_b),
    players: parsePlayers(row.players),
  };
}

/*
 * Dieselbe Zusammenfassung aus einem vollständig geladenen Match (Fallback).
 * Zählregeln wie in der SQL-Funktion und in addAction (playerStats.ts).
 */
export function digestFromSavedMatch(savedMatch: SavedMatch): MatchDigest {
  const { state } = savedMatch;
  const cups: Record<Team, Set<number>> = { A: new Set(), B: new Set() };

  const players: DigestPlayer[] = state.players.map((player) => ({
    id: player.id,
    name: player.name,
    team: player.team,
    throws: 0,
    hits: 0,
    misses: 0,
    cupsRemoved: 0,
    singleHits: 0,
    bounceHits: 0,
    trickshotHits: 0,
    penaltyCups: 0,
    knockedOverCups: 0,
  }));

  const byId = new Map(players.map((player) => [player.id, player]));

  for (const action of state.actions) {
    if (action.type === "hit") {
      action.cupIds.forEach((cupId) => cups[action.team].add(cupId));
    }

    const player = byId.get(action.playerId);

    if (!player) {
      continue;
    }

    if (isNonThrowAction(action)) {
      player.cupsRemoved += action.cupIds.length;

      if (action.hitType === "penalty") {
        player.penaltyCups += action.cupIds.length;
      } else {
        player.knockedOverCups += action.cupIds.length;
      }

      continue;
    }

    player.throws += 1;

    if (action.type === "miss") {
      player.misses += 1;
      continue;
    }

    player.hits += 1;
    player.cupsRemoved += action.cupIds.length;

    if (action.hitType === "single") player.singleHits += 1;
    if (action.hitType === "bounce") player.bounceHits += 1;
    if (action.hitType === "trickshot") player.trickshotHits += 1;
  }

  const sortIds = (set: Set<number>) => Array.from(set).sort((a, b) => a - b);

  return {
    id: savedMatch.id,
    savedAt: savedMatch.savedAt,
    winner: state.winner ?? null,
    cupsA: sortIds(cups.A),
    cupsB: sortIds(cups.B),
    players: [...players].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

async function loadDigestsViaSql(): Promise<MatchDigest[]> {
  const supabase = createClient();

  /* Die Ergebnis-Zeilen sind klein, aber auch hier gilt das Limit von 1000 pro Anfrage. */
  const rows = await fetchAllPages<DigestRow>((from, to) =>
    supabase
      .rpc("get_match_digests")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );

  return rows.map(parseDigestRow);
}

async function loadDigests(): Promise<MatchDigest[]> {
  try {
    return await loadDigestsViaSql();
  } catch (error) {
    console.error(
      "get_match_digests nicht verfügbar - rechne im Browser (langsam). " +
        "Bitte sql/stats-aggregation.sql im Supabase SQL-Editor ausführen:",
      error,
    );

    const matches = await getSavedMatches();

    return matches.map(digestFromSavedMatch);
  }
}

/*
 * Alle Matches als Zusammenfassung, NEUESTE ZUERST. Kurz zwischengespeichert,
 * damit Rangliste, Rang, Rating und Match-Liste auf einer Seite nur einmal laden.
 * Das zurückgegebene Array nicht verändern (vorher kopieren).
 */
export function getMatchDigests(): Promise<MatchDigest[]> {
  return cachedQuery("match-digests", loadDigests);
}
