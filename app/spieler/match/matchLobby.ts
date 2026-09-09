import { createClient } from "@/lib/supabase/client";

/*
 * --------------------------------------------------------------------------
 * | MATCH-LOBBY
 * --------------------------------------------------------------------------
 *
 * Geteilter Zustand für die Phase VOR dem eigentlichen Match: Ein Spieler
 * eröffnet ein Match (createMatchLobby), andere treten über den Link
 * /spieler/match/<id> mit ihrem Profil bei (joinMatchLobby). Änderungen
 * werden per Supabase Realtime an alle verbundenen Geräte verteilt.
 * --------------------------------------------------------------------------
 */

export type LobbyStatus = "lobby" | "live" | "finished";

export type MatchLobby = {
  id: string;
  status: LobbyStatus;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
};

type LobbyRow = {
  id: string;
  status: LobbyStatus;
  team_a_player_ids: string[] | null;
  team_b_player_ids: string[] | null;
};

function mapRow(row: LobbyRow): MatchLobby {
  return {
    id: row.id,
    status: row.status,
    teamAPlayerIds: row.team_a_player_ids ?? [],
    teamBPlayerIds: row.team_b_player_ids ?? [],
  };
}

const LOBBY_COLUMNS = "id, status, team_a_player_ids, team_b_player_ids";

/*
 * --------------------------------------------------------------------------
 * | LOBBY ERSTELLEN
 * --------------------------------------------------------------------------
 */

export async function createMatchLobby(): Promise<MatchLobby> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("match_lobbies")
    .insert({})
    .select(LOBBY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRow(data as LobbyRow);
}

/*
 * --------------------------------------------------------------------------
 * | LOBBY LADEN
 * --------------------------------------------------------------------------
 */

export async function getMatchLobby(id: string): Promise<MatchLobby | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("match_lobbies")
    .select(LOBBY_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRow(data as LobbyRow);
}

/*
 * --------------------------------------------------------------------------
 * | LOBBY BEITRETEN
 * --------------------------------------------------------------------------
 *
 * HINWEIS: Liest den aktuellen Stand und schreibt ihn zurück. Bei zwei
 * Spielern, die im exakt gleichen Sekundenbruchteil beitreten, kann das
 * theoretisch einen Beitritt überschreiben (kein atomares DB-Update).
 * Für ein Beerpong-Turnier unter Freunden ist das ein akzeptables Risiko;
 * für echte Robustheit bräuchte es eine Postgres-Funktion (RPC).
 * --------------------------------------------------------------------------
 */

export async function joinMatchLobby(
  lobbyId: string,
  playerId: string,
  team: "A" | "B",
): Promise<MatchLobby> {
  const current = await getMatchLobby(lobbyId);

  if (!current) {
    throw new Error("Lobby nicht gefunden.");
  }

  const teamAPlayerIds = current.teamAPlayerIds.filter((id) => id !== playerId);
  const teamBPlayerIds = current.teamBPlayerIds.filter((id) => id !== playerId);

  if (team === "A") {
    teamAPlayerIds.push(playerId);
  } else {
    teamBPlayerIds.push(playerId);
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("match_lobbies")
    .update({
      team_a_player_ids: teamAPlayerIds,
      team_b_player_ids: teamBPlayerIds,
    })
    .eq("id", lobbyId)
    .select(LOBBY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRow(data as LobbyRow);
}

/*
 * --------------------------------------------------------------------------
 * | LOBBY VERLASSEN
 * --------------------------------------------------------------------------
 */

export async function leaveMatchLobby(lobbyId: string, playerId: string): Promise<MatchLobby> {
  const current = await getMatchLobby(lobbyId);

  if (!current) {
    throw new Error("Lobby nicht gefunden.");
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("match_lobbies")
    .update({
      team_a_player_ids: current.teamAPlayerIds.filter((id) => id !== playerId),
      team_b_player_ids: current.teamBPlayerIds.filter((id) => id !== playerId),
    })
    .eq("id", lobbyId)
    .select(LOBBY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRow(data as LobbyRow);
}

/*
 * --------------------------------------------------------------------------
 * | MATCH AUS DER LOBBY STARTEN
 * --------------------------------------------------------------------------
 */

export async function startMatchLobby(lobbyId: string): Promise<MatchLobby> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("match_lobbies")
    .update({ status: "live" })
    .eq("id", lobbyId)
    .select(LOBBY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRow(data as LobbyRow);
}

/*
 * --------------------------------------------------------------------------
 * | LIVE-UPDATES ABONNIEREN
 * --------------------------------------------------------------------------
 *
 * Gibt eine Unsubscribe-Funktion zurück (in useEffect als Cleanup nutzen).
 * --------------------------------------------------------------------------
 */

export function subscribeMatchLobby(
  lobbyId: string,
  onChange: (lobby: MatchLobby) => void,
): () => void {
  const supabase = createClient();

  const channel = supabase
    .channel(`match_lobby_${lobbyId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "match_lobbies",
        filter: `id=eq.${lobbyId}`,
      },
      (payload) => {
        onChange(mapRow(payload.new as LobbyRow));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
