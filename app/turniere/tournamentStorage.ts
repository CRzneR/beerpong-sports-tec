import { createClient } from "@/lib/supabase/client";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";

import {
  buildKoBracket,
  buildTournamentSummary,
  computeKoQualifiers,
  distributeTeamsToGroups,
  evaluateTournamentOutcome,
  generateRoundRobinPairs,
  koChampionId,
  koTeamCountAllowed,
  resolveKoMatches,
  type JoinPreview,
  type JoinResult,
  type KoMatch,
  type KoMatchStatus,
  type KoMode,
  type MyTournamentSummary,
  type Tournament,
  type TournamentMatch,
  type TournamentMember,
  type TournamentOutcome,
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
  ko_mode: KoMode | null;
  ko_per_group: number | null;
};

type TeamRow = {
  id: string;
  tournament_id: string;
  name: string;
  group_label: string;
  ko_seed: number | null;
};

type KoMatchRow = {
  id: string;
  tournament_id: string;
  round: number;
  slot: number;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  status: KoMatchStatus;
  finished_at: string | null;
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
    koMode: row.ko_mode ?? null,
    koPerGroup: row.ko_per_group ?? null,
  };
}

function mapTeam(row: TeamRow): TournamentTeam {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    groupLabel: row.group_label,
    koSeed: row.ko_seed ?? null,
  };
}

function mapKoMatch(row: KoMatchRow): KoMatch {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    round: row.round,
    slot: row.slot,
    teamAId: row.team_a_id,
    teamBId: row.team_b_id,
    teamAScore: row.team_a_score,
    teamBScore: row.team_b_score,
    status: row.status,
    finishedAt: row.finished_at,
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
  "id, user_id, name, team_count, group_count, status, created_at, join_code, ko_mode, ko_per_group";
const TEAM_COLUMNS = "id, tournament_id, name, group_label, ko_seed";
const KO_COLUMNS =
  "id, tournament_id, round, slot, team_a_id, team_b_id, team_a_score, team_b_score, status, finished_at";
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
  koMatches: KoMatch[];
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

  const [
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
    { data: koData, error: koError },
  ] = await Promise.all([
    supabase
      .from("tournament_teams")
      .select(TEAM_COLUMNS)
      .eq("tournament_id", tournamentId)
      .order("name", { ascending: true }),
    supabase.from("tournament_matches").select(MATCH_COLUMNS).eq("tournament_id", tournamentId),
    supabase
      .from("tournament_ko_matches")
      .select(KO_COLUMNS)
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: true })
      .order("slot", { ascending: true }),
  ]);

  if (teamsError) {
    throw teamsError;
  }

  if (matchesError) {
    throw matchesError;
  }

  if (koError) {
    throw koError;
  }

  return {
    tournament: mapTournament(tournamentData as TournamentRow),
    teams: (teamsData ?? []).map((row) => mapTeam(row as TeamRow)),
    matches: (matchesData ?? []).map((row) => mapMatch(row as MatchRow)),
    koMatches: (koData ?? []).map((row) => mapKoMatch(row as KoMatchRow)),
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

  const [tournamentsResult, teamsResult, matchesResult, koResult] = await Promise.all([
    supabase.from("tournaments").select(TOURNAMENT_COLUMNS).in("id", tournamentIds),
    supabase.from("tournament_teams").select(TEAM_COLUMNS).in("tournament_id", tournamentIds),
    supabase.from("tournament_matches").select(MATCH_COLUMNS).in("tournament_id", tournamentIds),
    supabase.from("tournament_ko_matches").select(KO_COLUMNS).in("tournament_id", tournamentIds),
  ]);

  if (tournamentsResult.error) throw tournamentsResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (koResult.error) throw koResult.error;

  const tournaments = (tournamentsResult.data ?? []).map((row) =>
    mapTournament(row as TournamentRow),
  );
  const teams = (teamsResult.data ?? []).map((row) => mapTeam(row as TeamRow));
  const matches = (matchesResult.data ?? []).map((row) => mapMatch(row as MatchRow));
  const koMatches = (koResult.data ?? []).map((row) => mapKoMatch(row as KoMatchRow));

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
      koMatches.filter((match) => match.tournamentId === tournament.id),
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

/*
|--------------------------------------------------------------------------
| K.-O.-PHASE STARTEN UND ZURÜCKSETZEN
|--------------------------------------------------------------------------
|
| Setzliste und Baum werden hier berechnet und in EINEM Schritt gespeichert
| (Datenbankfunktion start_tournament_ko, alles oder nichts).
|
*/

export type StartKoResult =
  | "started"
  | "not_allowed"
  | "pro_required"
  | "already_started"
  | "group_open"
  | "invalid";

export async function startKoPhase(
  tournament: Tournament,
  teams: TournamentTeam[],
  groupMatches: TournamentMatch[],
  mode: KoMode,
  perGroup: number,
): Promise<StartKoResult> {
  const supabase = createClient();

  const qualifiers = computeKoQualifiers(teams, groupMatches, perGroup);

  if (!koTeamCountAllowed(mode, qualifiers.length)) {
    return "invalid";
  }

  const bracket = buildKoBracket(
    mode,
    qualifiers.map((entry) => entry.team.id),
  );

  const { data, error } = await supabase.rpc("start_tournament_ko", {
    p_tournament_id: tournament.id,
    p_mode: mode,
    p_per_group: perGroup,
    p_seeds: qualifiers.map((entry) => ({ teamId: entry.team.id, seed: entry.seed })),
    p_matches: bracket,
  });

  if (error) {
    throw error;
  }

  return data as StartKoResult;
}

export async function resetKoPhase(tournamentId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("reset_tournament_ko", { p_tournament_id: tournamentId });

  if (error) {
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| K.-O.-ERGEBNIS EINTRAGEN
|--------------------------------------------------------------------------
|
| Speichert das Ergebnis und trägt die Sieger in die nächste Runde ein
| (gemeinsam in einer einzigen Anfrage). Ein Unentschieden gibt es im K.-o.
| nicht. Steht der Finalsieger fest, wird das Turnier als beendet markiert,
| bei einer späteren Korrektur wieder als aktiv.
|
*/

export async function saveKoResult(
  tournament: Tournament,
  teams: TournamentTeam[],
  koMatches: KoMatch[],
  matchId: string,
  teamAScore: number,
  teamBScore: number,
): Promise<KoMatch[]> {
  const supabase = createClient();

  if (!tournament.koMode) {
    throw new Error("K.-o.-Phase nicht gestartet.");
  }

  if (
    !Number.isInteger(teamAScore) ||
    !Number.isInteger(teamBScore) ||
    teamAScore < 0 ||
    teamBScore < 0
  ) {
    throw new Error("Ungültiges Ergebnis.");
  }

  if (teamAScore === teamBScore) {
    throw new Error("draw");
  }

  const seeds = new Map<string, number>();

  for (const team of teams) {
    if (team.koSeed !== null) {
      seeds.set(team.id, team.koSeed);
    }
  }

  const edited = koMatches.map((match) =>
    match.id === matchId
      ? {
          ...match,
          teamAScore,
          teamBScore,
          status: "finished" as const,
          finishedAt: match.finishedAt ?? new Date().toISOString(),
        }
      : match,
  );

  const resolved = resolveKoMatches(tournament.koMode, seeds, edited);

  const changed = resolved.filter((match, index) => {
    const before = koMatches[index];

    return (
      match.id === matchId || match.teamAId !== before.teamAId || match.teamBId !== before.teamBId
    );
  });

  const { error } = await supabase.from("tournament_ko_matches").upsert(
    changed.map((match) => ({
      tournament_id: match.tournamentId,
      round: match.round,
      slot: match.slot,
      team_a_id: match.teamAId,
      team_b_id: match.teamBId,
      team_a_score: match.teamAScore,
      team_b_score: match.teamBScore,
      status: match.status,
      finished_at: match.finishedAt,
    })),
    { onConflict: "tournament_id,round,slot" },
  );

  if (error) {
    throw error;
  }

  const finished = koChampionId(resolved) !== null;
  const nextStatus = finished ? "finished" : "active";

  if (tournament.status !== nextStatus) {
    const { error: statusError } = await supabase
      .from("tournaments")
      .update({ status: nextStatus })
      .eq("id", tournament.id);

    if (statusError) {
      console.error("Turnierstatus konnte nicht aktualisiert werden:", statusError);
    }
  }

  return resolved;
}

/*
|--------------------------------------------------------------------------
| TURNIER-ERGEBNISSE FÜR ACHIEVEMENTS
|--------------------------------------------------------------------------
|
| Pro Turnier, in dem das eigene Profil mit einem Team verknüpft ist: ist
| das eigene Team Turniersieger, und war es dabei ohne Niederlage?
|
*/

export type MyTournamentOutcome = {
  tournamentId: string;
  tournamentName: string;
  teamCount: number;
  /* Anzahl der mit Teams verknüpften Spieler im Turnier. */
  linkedPlayers: number;
  wonTournament: boolean;
  wonUndefeated: boolean;
  decidedAt: string | null;
};

export async function getMyTournamentOutcomes(playerId: string): Promise<MyTournamentOutcome[]> {
  const supabase = createClient();

  const { data: links, error: linksError } = await supabase
    .from("tournament_team_players")
    .select("tournament_id, team_id")
    .eq("player_id", playerId);

  if (linksError) {
    throw linksError;
  }

  if (!links || links.length === 0) {
    return [];
  }

  const tournamentIds = links.map((link) => link.tournament_id as string);

  const [tournamentsResult, matchesResult, koResult, membersResult] = await Promise.all([
    supabase.from("tournaments").select(TOURNAMENT_COLUMNS).in("id", tournamentIds),
    supabase.from("tournament_matches").select(MATCH_COLUMNS).in("tournament_id", tournamentIds),
    supabase.from("tournament_ko_matches").select(KO_COLUMNS).in("tournament_id", tournamentIds),
    supabase
      .from("tournament_team_players")
      .select("tournament_id")
      .in("tournament_id", tournamentIds),
  ]);

  if (tournamentsResult.error) throw tournamentsResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (koResult.error) throw koResult.error;
  if (membersResult.error) throw membersResult.error;

  const tournaments = (tournamentsResult.data ?? []).map((row) =>
    mapTournament(row as TournamentRow),
  );
  const matches = (matchesResult.data ?? []).map((row) => mapMatch(row as MatchRow));
  const koMatches = (koResult.data ?? []).map((row) => mapKoMatch(row as KoMatchRow));
  const memberRows = (membersResult.data ?? []) as { tournament_id: string }[];

  const outcomes: MyTournamentOutcome[] = [];

  for (const link of links) {
    const tournament = tournaments.find((entry) => entry.id === link.tournament_id);

    if (!tournament) {
      continue;
    }

    const outcome: TournamentOutcome = evaluateTournamentOutcome(
      matches.filter((match) => match.tournamentId === tournament.id),
      koMatches.filter((match) => match.tournamentId === tournament.id),
    );

    const won = outcome.championTeamId !== null && outcome.championTeamId === link.team_id;

    outcomes.push({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      teamCount: tournament.teamCount,
      linkedPlayers: memberRows.filter((row) => row.tournament_id === tournament.id).length,
      wonTournament: won,
      wonUndefeated: won && outcome.championUndefeated,
      decidedAt: outcome.decidedAt,
    });
  }

  return outcomes;
}
