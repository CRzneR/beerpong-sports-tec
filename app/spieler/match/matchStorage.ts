import type { MatchState, Cup } from "./matchLogic";
import { createClient } from "@/lib/supabase/client";

/*
 * --------------------------------------------------------------------------
 * | GESPEICHERTES MATCH
 * --------------------------------------------------------------------------
 */

export type SavedMatch = {
  id: string;
  savedAt: string;
  state: MatchState;
};

/*
 * --------------------------------------------------------------------------
 * | SUPABASE ROWS
 * --------------------------------------------------------------------------
 */

type MatchRow = {
  id: string;
  created_at: string;
  winner: "A" | "B" | null;
  is_finished: boolean;
  started_at: string | null;
  finished_at: string | null;
};

type MatchPlayerRow = {
  match_id: string;
  player_id: string;
  team: "A" | "B";
};

type PlayerRow = {
  id: string;
  name: string;
};

type ActionRow = {
  id: string;
  match_id: string;
  player_id: string;
  team: "A" | "B";
  action_type: "hit" | "miss";
  hit_type: "single" | "bounce" | "trickshot" | null;
  cup_ids: unknown;
  action_index: number;
};

/*
 * --------------------------------------------------------------------------
 * | HINWEIS
 * --------------------------------------------------------------------------
 *
 * Diese Version verwendet die Browser-Supabase-API und ist deshalb
 * asynchron. Die aufrufenden Stellen müssen saveMatch/getSavedMatches
 * entsprechend mit await verwenden.
 *
 * Die vollständige MatchState-Struktur wird für das Backend aus den
 * relationalen Tabellen rekonstruiert.
 * --------------------------------------------------------------------------
 */

function normalizeCupIds(value: unknown): number[] {
  /*
   * FIX: Becher-IDs sind Zahlen (1-10), keine Strings. Der alte Filter
   * (`typeof item === "string"`) hat dadurch bei JEDER rekonstruierten
   * Aktion die komplette cupIds-Liste rausgefiltert, wodurch
   * cupsRemoved in den aus getSavedMatches() aggregierten
   * Profil-Statistiken immer 0 war - obwohl die Live-Anzeige direkt
   * nach dem Match (die nicht über diesen Pfad läuft) korrekte Zahlen
   * zeigte.
   */
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is number => typeof item === "number");
}

/*
 * --------------------------------------------------------------------------
 * | BECHER AUS DEN AKTIONEN REKONSTRUIEREN
 * --------------------------------------------------------------------------
 *
 * FIX: teamACups/teamBCups wurden hier bisher immer als leere Arrays
 * aufgebaut ([]) - der Kommentar weiter unten behauptete zwar, sie
 * würden "aus den gespeicherten cup_ids aufgebaut", das ist aber nie
 * passiert. Dadurch zeigte z. B. die Match-Historie (MatchHistory.tsx)
 * für JEDES gespeicherte Match "0 Becher" bei beiden Teams an.
 *
 * Jetzt: 10 frische Becher pro Team, und für jede "hit"-Aktion werden
 * die getroffenen Becher beim GEGNERISCHEN Team des Werfers markiert -
 * exakt dieselbe Zuordnung wie in der Live-Logik (page.tsx).
 * --------------------------------------------------------------------------
 */

function createFreshCups(): Cup[] {
  return Array.from({ length: 10 }, (_, index) => ({ id: index + 1, hit: false }));
}

function reconstructCups(actions: ActionRow[]): { teamACups: Cup[]; teamBCups: Cup[] } {
  const teamACups = createFreshCups();
  const teamBCups = createFreshCups();

  const sorted = [...actions].sort((a, b) => a.action_index - b.action_index);

  for (const action of sorted) {
    if (action.action_type !== "hit") {
      continue;
    }

    const cupIds = normalizeCupIds(action.cup_ids);
    const opponentCups = action.team === "A" ? teamBCups : teamACups;

    for (const cupId of cupIds) {
      const cup = opponentCups.find((item) => item.id === cupId);

      if (cup) {
        cup.hit = true;
      }
    }
  }

  return { teamACups, teamBCups };
}

function reconstructState(
  match: MatchRow,
  matchPlayers: MatchPlayerRow[],
  players: PlayerRow[],
  actions: ActionRow[],
): MatchState {
  const playerMap = new Map(players.map((player) => [player.id, player]));

  const statePlayers = matchPlayers.map((relation) => {
    const player = playerMap.get(relation.player_id);

    return {
      id: relation.player_id,
      name: player?.name ?? "Unbekannter Spieler",
      team: relation.team,
    };
  });

  const stateActions = [...actions]
    .sort((a, b) => a.action_index - b.action_index)
    .map((action) => ({
      type: action.action_type,
      playerId: action.player_id,
      team: action.team,
      hitType: action.hit_type ?? undefined,
      cupIds: normalizeCupIds(action.cup_ids),
    }));

  const { teamACups, teamBCups } = reconstructCups(actions);

  /*
   * Diese Felder entsprechen der bestehenden MatchState-Struktur.
   */
  return {
    players: statePlayers,
    teamACups,
    teamBCups,
    currentTeam: "A",
    currentPlayerIndex: 0,
    actions: stateActions,
    winner: match.winner,
    isFinished: match.is_finished,
  } as unknown as MatchState;
}

/*
 * --------------------------------------------------------------------------
 * | ALLE GESPEICHERTEN MATCHES LADEN
 * --------------------------------------------------------------------------
 */

export async function getSavedMatches(): Promise<SavedMatch[]> {
  const supabase = createClient();

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, created_at, winner, is_finished, started_at, finished_at")
    .order("created_at", { ascending: false });

  if (matchesError) {
    throw matchesError;
  }

  if (!matches || matches.length === 0) {
    return [];
  }

  const matchIds = matches.map((match) => match.id);

  const [{ data: matchPlayers, error: matchPlayersError }, { data: actions, error: actionsError }] =
    await Promise.all([
      supabase.from("match_players").select("match_id, player_id, team").in("match_id", matchIds),

      supabase
        .from("actions")
        .select("id, match_id, player_id, team, action_type, hit_type, cup_ids, action_index")
        .in("match_id", matchIds)
        .order("action_index", { ascending: true }),
    ]);

  if (matchPlayersError) {
    throw matchPlayersError;
  }

  if (actionsError) {
    throw actionsError;
  }

  const playerIds = Array.from(
    new Set([
      ...(matchPlayers ?? []).map((item) => item.player_id),
      ...(actions ?? []).map((item) => item.player_id),
    ]),
  );

  const { data: players, error: playersError } = playerIds.length
    ? await supabase.from("players").select("id, name").in("id", playerIds)
    : { data: [], error: null };

  if (playersError) {
    throw playersError;
  }

  const result: SavedMatch[] = [];

  for (const match of matches) {
    const state = reconstructState(
      match,
      (matchPlayers ?? []).filter((item) => item.match_id === match.id),
      (players ?? []) as PlayerRow[],
      (actions ?? []).filter((item) => item.match_id === match.id),
    );

    result.push({
      id: match.id,
      savedAt: match.created_at,
      state,
    });
  }

  return result;
}

/*
 * --------------------------------------------------------------------------
 * | MATCH SPEICHERN
 * --------------------------------------------------------------------------
 */

export async function saveMatch(state: MatchState): Promise<SavedMatch> {
  const supabase = createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      winner: state.winner,
      is_finished: state.isFinished,
    })
    .select("id, created_at, winner, is_finished, started_at, finished_at")
    .single();

  if (matchError) {
    throw matchError;
  }

  const uniquePlayers = new Map<string, { id: string; name: string; team: "A" | "B" }>();

  for (const player of state.players) {
    uniquePlayers.set(player.id, {
      id: player.id,
      name: player.name,
      team: player.team,
    });
  }

  for (const player of uniquePlayers.values()) {
    const { error } = await supabase.from("players").upsert(
      {
        id: player.id,
        name: player.name,
      },
      { onConflict: "id" },
    );

    if (error) {
      throw error;
    }
  }

  const matchPlayerRows = Array.from(uniquePlayers.values()).map((player) => ({
    match_id: match.id,
    player_id: player.id,
    team: player.team,
  }));

  if (matchPlayerRows.length > 0) {
    const { error } = await supabase.from("match_players").insert(matchPlayerRows);

    if (error) {
      throw error;
    }
  }

  const actionRows = state.actions.map((action, index) => ({
    match_id: match.id,
    player_id: action.playerId,
    team: action.team,
    action_type: action.type,
    hit_type: action.type === "hit" ? (action.hitType ?? null) : null,
    cup_ids: action.cupIds,
    action_index: index,
  }));

  if (actionRows.length > 0) {
    const { error } = await supabase.from("actions").insert(actionRows);

    if (error) {
      throw error;
    }
  }

  return {
    id: match.id,
    savedAt: match.created_at,
    state,
  };
}

/*
 * --------------------------------------------------------------------------
 * | EIN MATCH LADEN
 * --------------------------------------------------------------------------
 */

export async function getSavedMatch(matchId: string): Promise<SavedMatch | null> {
  const matches = await getSavedMatches();

  return matches.find((match) => match.id === matchId) ?? null;
}

/*
 * --------------------------------------------------------------------------
 * | MATCH LÖSCHEN
 * --------------------------------------------------------------------------
 */

export async function deleteSavedMatch(matchId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("matches").delete().eq("id", matchId);

  if (error) {
    throw error;
  }

  return true;
}

/*
 * --------------------------------------------------------------------------
 * | ALLE MATCHES LÖSCHEN
 * --------------------------------------------------------------------------
 */

export async function clearSavedMatches(): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("matches").delete().not("id", "is", null);

  if (error) {
    throw error;
  }
}
