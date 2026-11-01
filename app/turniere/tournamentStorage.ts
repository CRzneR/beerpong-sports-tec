import { createClient } from "@/lib/supabase/client";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";

import {
  buildTournamentSummary,
  distributeTeamsToGroups,
  generateRoundRobinPairs,
  type JoinPreview,
  type JoinResult,
  type MyTournamentSummary,
  type Tournament,
  type TournamentMatch,
  type TournamentMember,
  type TournamentTeam,
} from "./tournamentLogic";

/*
|--------------------------------------------------------------------------
| SUPABASE ROWS
|--------------------------------------------------------------------------
*/

type TournamentRow = {
  id: string;
  user_id: string;
  name: string;
  team_count: number;
  group_count: number;
  status: "setup" | "active" | "finished";
  created_at: string;
  join_code: string | null;
};

type TeamRow = {
  id: string;
  tournament_id: string;
  name: string;
  group_label: string;
};

type MatchRow = {
  id: string;
  tournament_id: string;
  group_label: string;
  team_a_id: string;
  team_b_id: string;
  team_a_score: number | null;
  team_b_score: number | null;
  status: "pending" | "finished";
  finished_at: string | null;
};

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    teamCount: row.team_count,
    groupCount: row.group_count,
    status: row.status,
    createdAt: row.created_at,
    joinCode: row.join_code ?? "",
  };
}

function mapTeam(row: TeamRow): TournamentTeam {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    groupLabel: row.group_label,
  };
}

function mapMatch(row: MatchRow): TournamentMatch {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    groupLabel: row.group_label,
    teamAId: row.team_a_id,
    teamBId: row.team_b_id,
    teamAScore: row.team_a_score,
    teamBScore: row.team_b_score,
    status: row.status,
    finishedAt: row.finished_at,
  };
}

const TOURNAMENT_COLUMNS =
  "id, user_id, name, team_count, group_count, status, created_at, join_code";
const TEAM_COLUMNS = "id, tournament_id, name, group_label";
const MATCH_COLUMNS =
  "id, tournament_id, group_label, team_a_id, team_b_id, team_a_score, team_b_score, status, finished_at";

/*
|--------------------------------------------------------------------------
| NEUES TURNIER ANLEGEN
|--------------------------------------------------------------------------
|
| Legt Turnier, Teams (verteilt auf die Gruppen) und den kompletten
| Spielplan (Jeder-gegen-Jeden pro Gruppe) in einem Rutsch an.
|
*/

export async function createTournament(
  name: string,
  teamNames: string[],
  groupCount: number,
): Promise<Tournament> {
  const supabase = createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error("Nicht eingeloggt.");
  }

  const { data: tournamentData, error: tournamentError } = await supabase
    .from("tournaments")
    .insert({
      user_id: userData.user.id,
      name,
      team_count: teamNames.length,
      group_count: groupCount,
      status: "active",
    })
    .select(TOURNAMENT_COLUMNS)
    .single();

  if (tournamentError) {
    throw tournamentError;
  }

  const tournament = mapTournament(tournamentData as TournamentRow);

  const distributed = distributeTeamsToGroups(teamNames, groupCount);

  const { data: teamsData, error: teamsError } = await supabase
    .from("tournament_teams")
    .insert(
      distributed.map((team) => ({
        tournament_id: tournament.id,
        name: team.name,
        group_label: team.groupLabel,
      })),
    )
    .select(TEAM_COLUMNS);

  if (teamsError) {
    throw teamsError;
  }

  const teams = (teamsData as TeamRow[]).map(mapTeam);

  const matchRows: {
    tournament_id: string;
    group_label: string;
    team_a_id: string;
    team_b_id: string;
  }[] = [];

  const groupLabels = Array.from(new Set(teams.map((team) => team.groupLabel)));

  for (const groupLabel of groupLabels) {
    const groupTeams = teams.filter((team) => team.groupLabel === groupLabel);
    const pairs = generateRoundRobinPairs(groupTeams);

    for (const [teamA, teamB] of pairs) {
      matchRows.push({
        tournament_id: tournament.id,
        group_label: groupLabel,
        team_a_id: teamA.id,
        team_b_id: teamB.id,
      });
    }
  }

  if (matchRows.length > 0) {
    const { error: matchesError } = await supabase.from("tournament_matches").insert(matchRows);

    if (matchesError) {
      throw matchesError;
    }
  }

  return tournament;
}

/*
|--------------------------------------------------------------------------
| ALLE TURNIERE LADEN
|--------------------------------------------------------------------------
*/

export async function getTournaments(): Promise<Tournament[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTournament(row as TournamentRow));
}

/*
|--------------------------------------------------------------------------
| EIN TURNIER MIT TEAMS + SPIELPLAN LADEN
|--------------------------------------------------------------------------
*/

export async function getTournamentDetail(tournamentId: string): Promise<{
  tournament: Tournament;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
} | null> {
  const supabase = createClient();

  const { data: tournamentData, error: tournamentError } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_COLUMNS)
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    throw tournamentError;
  }

  if (!tournamentData) {
    return null;
  }

  const [{ data: teamsData, error: teamsError }, { data: matchesData, error: matchesError }] =
    await Promise.all([
      supabase
        .from("tournament_teams")
        .select(TEAM_COLUMNS)
        .eq("tournament_id", tournamentId)
        .order("name", { ascending: true }),
      supabase.from("tournament_matches").select(MATCH_COLUMNS).eq("tournament_id", tournamentId),
    ]);

  if (teamsError) {
    throw teamsError;
  }

  if (matchesError) {
    throw matchesError;
  }

  return {
    tournament: mapTournament(tournamentData as TournamentRow),
    teams: (teamsData ?? []).map((row) => mapTeam(row as TeamRow)),
    matches: (matchesData ?? []).map((row) => mapMatch(row as MatchRow)),
  };
}

/*
|--------------------------------------------------------------------------
| TURNIER LÖSCHEN
|--------------------------------------------------------------------------
|
| tournament_teams und tournament_matches hängen per "on delete cascade"
| an tournaments - verschwinden beim Löschen des Turniers automatisch
| mit, ohne eigene delete-Aufrufe.
|
*/

export async function deleteTournament(tournamentId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);

  if (error) {
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| ERGEBNIS EINES SPIELS EINTRAGEN
|--------------------------------------------------------------------------
*/

/*
 * previousFinishedAt: der bisherige finished_at-Wert des Spiels (null,
 * falls noch nie gespeichert). Wird beim ERSTEN Speichern neu gesetzt,
 * bei einer späteren Korrektur über "Bearbeiten" aber unverändert
 * übernommen - sonst würde eine nachträgliche Korrektur so aussehen,
 * als wäre das Spiel gerade eben gespielt worden, und die
 * "letzte 3 Spiele"-Formguide würde die Reihenfolge verfälschen.
 */

export async function updateMatchResult(
  matchId: string,
  teamAScore: number,
  teamBScore: number,
  previousFinishedAt: string | null,
): Promise<TournamentMatch> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tournament_matches")
    .update({
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      status: "finished",
      finished_at: previousFinishedAt ?? new Date().toISOString(),
    })
    .eq("id", matchId)
    .select(MATCH_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapMatch(data as MatchRow);
}

/*
|--------------------------------------------------------------------------
| PROFIL-VERKNÜPFUNG: MITGLIEDER EINES TURNIERS
|--------------------------------------------------------------------------
|
| Welche Spielerprofile sind mit welchem Team verknüpft? Sehen dürfen das
| der Veranstalter und die verknüpften Spieler selbst (RLS in league-link.sql).
| Schlägt die Abfrage fehl (z. B. SQL noch nicht ausgeführt), bleibt das
| Turnier trotzdem benutzbar - dann eben ohne Namen unter den Teams.
|
*/

type MemberRow = {
  team_id: string;
  player_id: string;
  players: { name: string } | { name: string }[] | null;
};

export async function getTournamentMembers(tournamentId: string): Promise<TournamentMember[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tournament_team_players")
    .select("team_id, player_id, created_at, players(name)")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Team-Mitglieder:", error);
    return [];
  }

  return ((data ?? []) as unknown as MemberRow[]).map((row) => {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;

    return {
      playerId: row.player_id,
      teamId: row.team_id,
      name: player?.name ?? "Spieler",
    };
  });
}

/*
|--------------------------------------------------------------------------
| BEITRITT PER LINK
|--------------------------------------------------------------------------
*/

export async function getTournamentByJoinCode(code: string): Promise<JoinPreview | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_tournament_by_join_code", { p_code: code });

  if (error) {
    throw error;
  }

  return (data as JoinPreview | null) ?? null;
}

export async function joinTournamentTeam(code: string, teamId: string): Promise<JoinResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("join_tournament_team", {
    p_code: code,
    p_team_id: teamId,
  });

  if (error) {
    throw error;
  }

  return data as JoinResult;
}

export async function leaveTournament(tournamentId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("leave_tournament_team", {
    p_tournament_id: tournamentId,
  });

  if (error) {
    throw error;
  }
}

export async function removeTournamentMember(
  tournamentId: string,
  playerId: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("remove_tournament_member", {
    p_tournament_id: tournamentId,
    p_player_id: playerId,
  });

  if (error) {
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| MEINE TURNIERE FÜR PONG STATS
|--------------------------------------------------------------------------
|
| Alle Turniere, in denen das eigene Profil mit einem Team verknüpft ist,
| samt Platz in der Gruppe sowie letztem und nächstem Spiel. Laufende
| Turniere zuerst, beendete danach.
|
*/

export async function getMyTournamentSummaries(): Promise<MyTournamentSummary[]> {
  const supabase = createClient();

  const profile = await getOwnProfile();

  if (!profile) {
    return [];
  }

  const { data: links, error: linksError } = await supabase
    .from("tournament_team_players")
    .select("tournament_id, team_id")
    .eq("player_id", profile.id);

  if (linksError) {
    throw linksError;
  }

  if (!links || links.length === 0) {
    return [];
  }

  const tournamentIds = links.map((link) => link.tournament_id as string);

  const [tournamentsResult, teamsResult, matchesResult] = await Promise.all([
    supabase.from("tournaments").select(TOURNAMENT_COLUMNS).in("id", tournamentIds),
    supabase.from("tournament_teams").select(TEAM_COLUMNS).in("tournament_id", tournamentIds),
    supabase.from("tournament_matches").select(MATCH_COLUMNS).in("tournament_id", tournamentIds),
  ]);

  if (tournamentsResult.error) throw tournamentsResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const tournaments = (tournamentsResult.data ?? []).map((row) =>
    mapTournament(row as TournamentRow),
  );
  const teams = (teamsResult.data ?? []).map((row) => mapTeam(row as TeamRow));
  const matches = (matchesResult.data ?? []).map((row) => mapMatch(row as MatchRow));

  const summaries: MyTournamentSummary[] = [];

  for (const link of links) {
    const tournament = tournaments.find((entry) => entry.id === link.tournament_id);

    if (!tournament) {
      continue;
    }

    const summary = buildTournamentSummary(
      tournament,
      teams.filter((team) => team.tournamentId === tournament.id),
      matches.filter((match) => match.tournamentId === tournament.id),
      link.team_id as string,
    );

    if (summary) {
      summaries.push(summary);
    }
  }

  const statusOrder = (status: Tournament["status"]) => (status === "finished" ? 1 : 0);

  return summaries.sort((a, b) => {
    const byStatus = statusOrder(a.tournament.status) - statusOrder(b.tournament.status);

    if (byStatus !== 0) {
      return byStatus;
    }

    return b.tournament.createdAt.localeCompare(a.tournament.createdAt);
  });
}
