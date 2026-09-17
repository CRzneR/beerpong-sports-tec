import { createClient } from "@/lib/supabase/client";

import {
  distributeTeamsToGroups,
  generateRoundRobinPairs,
  type Tournament,
  type TournamentTeam,
  type TournamentMatch,
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

const TOURNAMENT_COLUMNS = "id, user_id, name, team_count, group_count, status, created_at";
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
