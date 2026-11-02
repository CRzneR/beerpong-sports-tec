/*
|--------------------------------------------------------------------------
| PONG LEAGUE - FACHLOGIK
|--------------------------------------------------------------------------
|
| Reine Funktionen ohne Datenbankzugriff - vergleichbar mit matchLogic.ts
| auf der Pong-Stats-Seite. Datenbankzugriffe liegen in
| tournamentStorage.ts.
|
*/

export type TournamentStatus = "setup" | "active" | "finished";

/*
 * K.-o.-Modi:
 *  - reseed:  "Bester gegen Schlechtesten" - vor jeder Runde wird neu gesetzt (bester
 *             gegen schlechtesten, zweitbester gegen zweitschlechtesten, ...). Ohne
 *             Freilose, die Teamzahl muss also 2, 4, 8, 16 oder 32 sein.
 *  - bracket: "Mit Freilos" - fester Turnierbaum mit gerader Teamzahl (links und rechts
 *             gleich viele Teams); passt sie nicht auf eine Zweierpotenz (z. B. 6), haben
 *             die besten Teams in Runde 1 frei (bei 6 Teams die beiden besten).
 */
export type KoMode = "reseed" | "bracket";

/*
 * Wer kommt in die K.-o.-Phase?
 *  - group:   die Besten jeder Gruppe (z. B. die zwei Ersten jeder Gruppe)
 *  - overall: die besten Teams über alle Gruppen, egal aus welcher Gruppe
 */
export type KoSelect = "group" | "overall";

export type Tournament = {
  id: string;
  userId: string;
  name: string;
  teamCount: number;
  groupCount: number;
  status: TournamentStatus;
  createdAt: string;
  /* Code für den Beitritts-Link (/turniere/beitreten/<code>). */
  joinCode: string;
  /* K.-o.-Phase: null, solange sie nicht gestartet wurde. */
  koMode: KoMode | null;
  /*
   * Wie viele Teams in die K.-o.-Phase gekommen sind: bei koSelect "group" pro Gruppe,
   * bei "overall" insgesamt.
   */
  koPerGroup: number | null;
  koSelect: KoSelect | null;
};

export type TournamentTeam = {
  id: string;
  tournamentId: string;
  name: string;
  groupLabel: string;
  /* Setzplatz in der K.-o.-Phase (1 = beste Setzung), null = nicht qualifiziert. */
  koSeed: number | null;
};

export type MatchStatus = "pending" | "finished";

export type TournamentMatch = {
  id: string;
  tournamentId: string;
  groupLabel: string;
  teamAId: string;
  teamBId: string;
  teamAScore: number | null;
  teamBScore: number | null;
  status: MatchStatus;
  finishedAt: string | null;
};

/*
|--------------------------------------------------------------------------
| GRUPPEN-LABEL AUS INDEX
|--------------------------------------------------------------------------
|
| 0 -> "A", 1 -> "B", 2 -> "C", ...
|
*/

export function groupLabelForIndex(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

/*
|--------------------------------------------------------------------------
| TEAMS AUF GRUPPEN VERTEILEN
|--------------------------------------------------------------------------
|
| Einfache, gleichmäßige Blockverteilung: bei 8 Teams / 2 Gruppen
| landen Team 1-4 in Gruppe A, Team 5-8 in Gruppe B. Keine manuelle
| Zuordnung - die Reihenfolge der eingegebenen Namen entscheidet.
|
*/

export function distributeTeamsToGroups(
  teamNames: string[],
  groupCount: number,
): { name: string; groupLabel: string }[] {
  const safeGroupCount = Math.max(1, Math.min(groupCount, teamNames.length));
  const perGroup = Math.ceil(teamNames.length / safeGroupCount);

  return teamNames.map((name, index) => {
    const groupIndex = Math.min(Math.floor(index / perGroup), safeGroupCount - 1);

    return { name, groupLabel: groupLabelForIndex(groupIndex) };
  });
}

/*
|--------------------------------------------------------------------------
| JEDER-GEGEN-JEDEN-PAARUNGEN EINER GRUPPE
|--------------------------------------------------------------------------
|
| Erzeugt alle eindeutigen Paare einer Gruppe, jedes Team spielt genau
| einmal gegen jedes andere Team derselben Gruppe.
|
*/

/*
|--------------------------------------------------------------------------
| ARRAY MISCHEN (Fisher-Yates)
|--------------------------------------------------------------------------
|
| Für den "Mischen"-Button beim Erfassen der Team-Namen - da die
| Gruppenverteilung sequenziell nach Reihenfolge passiert, entspricht
| das Mischen der Namen praktisch einer zufälligen Gruppenauslosung.
|
*/

export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function generateRoundRobinPairs<T>(teams: T[]): [T, T][] {
  const pairs: [T, T][] = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push([teams[i], teams[j]]);
    }
  }

  return pairs;
}

/*
|--------------------------------------------------------------------------
| GRUPPENTABELLE BERECHNEN
|--------------------------------------------------------------------------
|
| 3 Punkte für einen Sieg, 0 für eine Niederlage - üblicher Standard
| für Gruppentabellen. Unentschieden (1 Punkt je Team) wird zur
| Sicherheit mitgerechnet, auch wenn das bei Beer Pong praktisch nie
| vorkommt, da eine Seite ihre Becher zuerst verliert.
|
*/

export type MatchResultLetter = "S" | "N" | "U";

export type GroupStanding = {
  team: TournamentTeam;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  /*
   * Trefferverhältnis: Summe aller erzielten bzw. kassierten Treffer
   * über alle Spiele der Gruppe hinweg (z. B. "45:32").
   */
  scoredTotal: number;
  concededTotal: number;
  /*
   * Formguide: die letzten (max.) 3 gespielten Partien dieses Teams,
   * ältestes zuerst - links das älteste, rechts das aktuellste.
   */
  form: MatchResultLetter[];
};

export function computeGroupStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
): GroupStanding[] {
  const standings = new Map<string, GroupStanding>();

  for (const team of teams) {
    standings.set(team.id, {
      team,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      scoredTotal: 0,
      concededTotal: 0,
      form: [],
    });
  }

  /*
   * Nach finishedAt sortieren (ältestes zuerst) - erst dadurch ergibt
   * "die letzten 3 Spiele" überhaupt einen Sinn. Ohne finishedAt
   * (ältere Datensätze von vor dieser Änderung) landen ganz vorne,
   * also praktisch am unwichtigsten Ende der Formguide-Berechnung.
   */

  const finishedMatches = matches
    .filter(
      (match) =>
        match.status === "finished" && match.teamAScore !== null && match.teamBScore !== null,
    )
    .sort((a, b) => {
      const aTime = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const bTime = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;

      return aTime - bTime;
    });

  for (const match of finishedMatches) {
    const statsA = standings.get(match.teamAId);
    const statsB = standings.get(match.teamBId);

    if (!statsA || !statsB) {
      continue;
    }

    statsA.played += 1;
    statsB.played += 1;

    statsA.scoredTotal += match.teamAScore!;
    statsA.concededTotal += match.teamBScore!;
    statsB.scoredTotal += match.teamBScore!;
    statsB.concededTotal += match.teamAScore!;

    let resultA: MatchResultLetter;
    let resultB: MatchResultLetter;

    if (match.teamAScore! > match.teamBScore!) {
      statsA.wins += 1;
      statsA.points += 3;
      statsB.losses += 1;
      resultA = "S";
      resultB = "N";
    } else if (match.teamBScore! > match.teamAScore!) {
      statsB.wins += 1;
      statsB.points += 3;
      statsA.losses += 1;
      resultA = "N";
      resultB = "S";
    } else {
      statsA.draws += 1;
      statsB.draws += 1;
      statsA.points += 1;
      statsB.points += 1;
      resultA = "U";
      resultB = "U";
    }

    statsA.form.push(resultA);
    statsB.form.push(resultB);
  }

  for (const standing of standings.values()) {
    standing.form = standing.form.slice(-3);
  }

  return Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const diffA = a.scoredTotal - a.concededTotal;
    const diffB = b.scoredTotal - b.concededTotal;

    if (diffB !== diffA) return diffB - diffA;
    if (b.wins !== a.wins) return b.wins - a.wins;

    return a.team.name.localeCompare(b.team.name);
  });
}

/*
|--------------------------------------------------------------------------
| PROFIL-VERKNÜPFUNG (PONG LEAGUE <-> PONG STATS)
|--------------------------------------------------------------------------
|
| Jeder Spieler verknüpft sein EIGENES Profil über den Beitritts-Link mit
| einem Team. Teams dürfen höchstens MAX_TEAM_SIZE Spieler haben (gleiche
| Grenze wie in der Datenbankfunktion join_tournament_team).
|
*/

export const MAX_TEAM_SIZE = 4;

export type TournamentMember = {
  playerId: string;
  teamId: string;
  name: string;
};

export type JoinPreviewTeam = {
  id: string;
  name: string;
  groupLabel: string;
  members: string[];
};

export type JoinPreview = {
  id: string;
  name: string;
  status: TournamentStatus;
  teamCount: number;
  groupCount: number;
  myTeamId: string | null;
  teams: JoinPreviewTeam[];
};

export type JoinResult = "joined" | "login" | "no_profile" | "invalid" | "finished" | "full";

export function buildInviteUrl(origin: string, joinCode: string): string {
  return `${origin.replace(/\/$/, "")}/turniere/beitreten/${joinCode}`;
}

/*
|--------------------------------------------------------------------------
| ZUSAMMENFASSUNG FÜR DIE CARD IN PONG STATS
|--------------------------------------------------------------------------
|
| Aus Turnier, Teams und Spielen wird alles berechnet, was die Card zeigt:
| Platz in der eigenen Gruppe, Bilanz, letztes und nächstes Spiel.
|
*/

export type SummaryMatch = {
  match: TournamentMatch;
  opponent: TournamentTeam;
  /* Aus Sicht des eigenen Teams. null, solange nicht gespielt. */
  ownScore: number | null;
  opponentScore: number | null;
};

export type MyTournamentSummary = {
  tournament: Tournament;
  team: TournamentTeam;
  groupLabel: string;
  groupStandings: GroupStanding[];
  /* 1-basiert; null, falls das Team nicht in der Tabelle auftaucht. */
  rank: number | null;
  standing: GroupStanding | null;
  nextMatch: SummaryMatch | null;
  lastMatch: (SummaryMatch & { result: MatchResultLetter }) | null;
  openMatches: number;
  totalMatches: number;
  /* K.-o.-Phase aus Sicht des Teams; null, solange sie nicht gestartet ist. */
  ko: MyKoStatus | null;
};

function toSummaryMatch(
  match: TournamentMatch,
  myTeamId: string,
  teamsById: Map<string, TournamentTeam>,
): SummaryMatch | null {
  const isA = match.teamAId === myTeamId;
  const opponent = teamsById.get(isA ? match.teamBId : match.teamAId);

  if (!opponent) {
    return null;
  }

  return {
    match,
    opponent,
    ownScore: isA ? match.teamAScore : match.teamBScore,
    opponentScore: isA ? match.teamBScore : match.teamAScore,
  };
}

export function buildTournamentSummary(
  tournament: Tournament,
  teams: TournamentTeam[],
  matches: TournamentMatch[],
  myTeamId: string,
  koMatches: KoMatch[] = [],
): MyTournamentSummary | null {
  const team = teams.find((entry) => entry.id === myTeamId);

  if (!team) {
    return null;
  }

  const teamsById = new Map(teams.map((entry) => [entry.id, entry]));
  const groupTeams = teams.filter((entry) => entry.groupLabel === team.groupLabel);
  const groupMatches = matches.filter((match) => match.groupLabel === team.groupLabel);
  const groupStandings = computeGroupStandings(groupTeams, groupMatches);

  const index = groupStandings.findIndex((row) => row.team.id === team.id);

  const ownMatches = groupMatches.filter(
    (match) => match.teamAId === team.id || match.teamBId === team.id,
  );

  const isFinished = (match: TournamentMatch) =>
    match.status === "finished" && match.teamAScore !== null && match.teamBScore !== null;

  const pending = ownMatches.filter((match) => !isFinished(match));
  const finished = ownMatches.filter(isFinished).sort((a, b) => {
    const aTime = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
    const bTime = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;

    return bTime - aTime;
  });

  const nextMatch = pending.length > 0 ? toSummaryMatch(pending[0], team.id, teamsById) : null;

  let lastMatch: MyTournamentSummary["lastMatch"] = null;

  if (finished.length > 0) {
    const base = toSummaryMatch(finished[0], team.id, teamsById);

    if (base && base.ownScore !== null && base.opponentScore !== null) {
      lastMatch = {
        ...base,
        result:
          base.ownScore > base.opponentScore ? "S" : base.ownScore < base.opponentScore ? "N" : "U",
      };
    }
  }

  return {
    tournament,
    team,
    groupLabel: team.groupLabel,
    groupStandings,
    rank: index >= 0 ? index + 1 : null,
    standing: index >= 0 ? groupStandings[index] : null,
    nextMatch,
    lastMatch,
    openMatches: pending.length,
    totalMatches: ownMatches.length,
    ko: buildMyKoStatus(tournament, team, teams, koMatches),
  };
}

/*
|--------------------------------------------------------------------------
| K.-O.-PHASE
|--------------------------------------------------------------------------
|
| Ablauf: Nach der Gruppenphase kommen pro Gruppe die besten N Teams weiter.
| Sie werden gesetzt (Seed 1 = beste Setzung), danach wird ein
| Einfach-K.-o.-Baum gespielt, ein Spiel pro Paarung, kein Unentschieden.
|
| Modus "bracket": Passt die Teamzahl nicht auf eine Zweierpotenz (z. B. 6),
| bekommen die besten Gesetzten in Runde 1 ein Freilos ("bye") und steigen
| erst in Runde 2 ein. Bei 6 Teams: Seed 1 und 2 haben frei, 3 spielt gegen
| 6 und 4 gegen 5.
| Modus "reseed": keine Freilose, jedes Team spielt in jeder Runde. Deshalb
| nur mit 2, 4, 8, 16 oder 32 Teams.
|
| Die Modi unterscheiden sich in den Runden danach:
|  - bracket: feste Paarungen. Die Sieger rücken im Baum nach (1 gegen 8 und
|    4 gegen 5 treffen im Halbfinale aufeinander).
|  - reseed:  vor jeder Runde wird neu gesetzt. Der beste verbliebene Seed
|    spielt gegen den schlechtesten, der zweitbeste gegen den zweitschlechtesten.
|
*/

export type KoMatchStatus = "pending" | "finished" | "bye";

export type KoMatch = {
  id: string;
  tournamentId: string;
  /* 1 = erste Runde, die höchste Runde ist das Finale. */
  round: number;
  /* Position innerhalb der Runde (0-basiert). */
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
  teamAScore: number | null;
  teamBScore: number | null;
  status: KoMatchStatus;
  finishedAt: string | null;
};

/* Ein Spiel, wie es beim Auslosen entsteht (noch ohne Ergebnis und ohne ID). */
export type KoDraftMatch = {
  round: number;
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
  status: KoMatchStatus;
};

export type KoQualifier = {
  team: TournamentTeam;
  /* 1 = beste Setzung. */
  seed: number;
  groupRank: number;
  standing: GroupStanding;
};

export const MIN_KO_TEAMS = 2;

/*
 * Wie viele Teams pro Gruppe höchstens weiterkommen können: so viele, wie die
 * kleinste Gruppe hat. Sonst gäbe es Gruppen, aus denen niemand mehr übrig ist.
 */
export function maxQualifiersPerGroup(teams: TournamentTeam[]): number {
  const sizes = new Map<string, number>();

  for (const team of teams) {
    sizes.set(team.groupLabel, (sizes.get(team.groupLabel) ?? 0) + 1);
  }

  return sizes.size === 0 ? 0 : Math.min(...sizes.values());
}

/*
 * Die Teams, die in die K.-o.-Phase kommen, in Setzreihenfolge.
 *
 * Erst zählt der Gruppenplatz (alle Gruppensieger vor allen Zweiten usw.),
 * bei gleichem Platz entscheiden Punkte, Trefferdifferenz, Siege und
 * erzielte Treffer, zuletzt der Name.
 */
export function computeKoQualifiers(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
  perGroup: number,
): KoQualifier[] {
  const labels = Array.from(new Set(teams.map((team) => team.groupLabel))).sort();
  const picked: { team: TournamentTeam; groupRank: number; standing: GroupStanding }[] = [];

  for (const label of labels) {
    const standings = computeGroupStandings(
      teams.filter((team) => team.groupLabel === label),
      matches.filter((match) => match.groupLabel === label),
    );

    standings.slice(0, perGroup).forEach((standing, index) => {
      picked.push({ team: standing.team, groupRank: index + 1, standing });
    });
  }

  picked.sort((a, b) => {
    if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;

    const diffA = a.standing.scoredTotal - a.standing.concededTotal;
    const diffB = b.standing.scoredTotal - b.standing.concededTotal;

    if (diffB !== diffA) return diffB - diffA;
    if (b.standing.wins !== a.standing.wins) return b.standing.wins - a.standing.wins;
    if (b.standing.scoredTotal !== a.standing.scoredTotal) {
      return b.standing.scoredTotal - a.standing.scoredTotal;
    }

    return a.team.name.localeCompare(b.team.name);
  });

  return picked.map((entry, index) => ({ ...entry, seed: index + 1 }));
}

/*
 * Die besten Teams über alle Gruppen, egal aus welcher Gruppe. Gruppen können
 * unterschiedlich groß sein, deshalb zählen Durchschnittswerte pro Spiel:
 * Punkte, Trefferdifferenz, Siege und erzielte Treffer (jeweils pro Spiel), danach
 * der Gruppenplatz und zuletzt der Name.
 */
export function computeKoQualifiersOverall(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
  count: number,
): KoQualifier[] {
  const labels = Array.from(new Set(teams.map((team) => team.groupLabel))).sort();
  const all: { team: TournamentTeam; groupRank: number; standing: GroupStanding }[] = [];

  for (const label of labels) {
    computeGroupStandings(
      teams.filter((team) => team.groupLabel === label),
      matches.filter((match) => match.groupLabel === label),
    ).forEach((standing, index) => {
      all.push({ team: standing.team, groupRank: index + 1, standing });
    });
  }

  const perGame = (value: number, played: number) => (played > 0 ? value / played : 0);

  all.sort((a, b) => {
    const sa = a.standing;
    const sb = b.standing;

    const checks: [number, number][] = [
      [perGame(sb.points, sb.played), perGame(sa.points, sa.played)],
      [
        perGame(sb.scoredTotal - sb.concededTotal, sb.played),
        perGame(sa.scoredTotal - sa.concededTotal, sa.played),
      ],
      [perGame(sb.wins, sb.played), perGame(sa.wins, sa.played)],
      [perGame(sb.scoredTotal, sb.played), perGame(sa.scoredTotal, sa.played)],
    ];

    for (const [first, second] of checks) {
      if (first !== second) {
        return first - second;
      }
    }

    if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;

    return a.team.name.localeCompare(b.team.name);
  });

  return all.slice(0, count).map((entry, index) => ({ ...entry, seed: index + 1 }));
}

/* Je nach Auswahl: die Besten jeder Gruppe oder die besten Teams insgesamt. */
export function computeKoQualifiersBy(
  select: KoSelect,
  teams: TournamentTeam[],
  matches: TournamentMatch[],
  amount: number,
): KoQualifier[] {
  return select === "overall"
    ? computeKoQualifiersOverall(teams, matches, amount)
    : computeKoQualifiers(teams, matches, amount);
}

/* Kleinste Zweierpotenz, die mindestens teamCount Teams aufnimmt (2, 4, 8, 16, ...). */
export function koBracketSize(teamCount: number): number {
  let size = 2;

  while (size < teamCount) {
    size *= 2;
  }

  return size;
}

/*
 * Darf der Modus mit dieser Teamzahl gestartet werden? "Bester gegen Schlechtesten"
 * kommt ohne Freilose aus und braucht deshalb eine Zweierpotenz. Der Modus mit
 * Freilos nimmt jede gerade Teamzahl (2, 4, 6, 8, 10, 12, ...).
 */
export function koTeamCountAllowed(mode: KoMode, teamCount: number): boolean {
  if (teamCount < MIN_KO_TEAMS || teamCount > MAX_KO_TEAMS) {
    return false;
  }

  /*
   * Mit Freilos: nur gerade Teamzahlen, damit im Baum links und rechts gleich viele
   * Teams stehen (bei gerader Zahl geht die Setzung immer genau auf).
   */
  if (mode === "bracket") {
    return teamCount % 2 === 0;
  }

  return koBracketSize(teamCount) === teamCount;
}

export function koRoundCount(teamCount: number): number {
  return Math.round(Math.log2(koBracketSize(teamCount)));
}

/*
 * Reihenfolge der Seeds im festen Turnierbaum. Für 8: 1, 8, 4, 5, 2, 7, 3, 6,
 * also spielen 1-8, 4-5, 2-7 und 3-6, und 1 und 2 treffen sich erst im Finale.
 */
export function bracketSeedOrder(size: number): number[] {
  let order = [1];

  while (order.length < size) {
    const total = order.length * 2;

    order = order.flatMap((seed) => [seed, total + 1 - seed]);
  }

  return order;
}

/* Wer hat das Spiel gewonnen? null, solange offen (oder ohne Teams). */
export function koWinnerId(
  match: Pick<KoMatch, "teamAId" | "teamBId" | "teamAScore" | "teamBScore" | "status">,
): string | null {
  if (match.status === "bye") {
    return match.teamAId ?? match.teamBId;
  }

  if (
    match.status !== "finished" ||
    match.teamAScore === null ||
    match.teamBScore === null ||
    match.teamAScore === match.teamBScore
  ) {
    return null;
  }

  return match.teamAScore > match.teamBScore ? match.teamAId : match.teamBId;
}

type KoSlotMatch = Pick<
  KoMatch,
  "round" | "slot" | "teamAId" | "teamBId" | "teamAScore" | "teamBScore" | "status"
>;

/*
 * Füllt die Teams der Runden ab Runde 2 anhand der Ergebnisse. Rechnet jedes
 * Mal komplett neu aus den Ergebnissen, ist also auch nach Korrekturen stimmig.
 * Runde 1 bleibt unverändert.
 */
export function resolveKoMatches<T extends KoSlotMatch>(
  mode: KoMode,
  seeds: Map<string, number>,
  matches: T[],
): T[] {
  const rounds = matches.reduce((max, match) => Math.max(max, match.round), 0);
  const result = matches.map((match) => ({ ...match }));

  const inRound = (round: number) =>
    result.filter((match) => match.round === round).sort((a, b) => a.slot - b.slot);

  for (let round = 2; round <= rounds; round += 1) {
    const previous = inRound(round - 1);
    const current = inRound(round);
    const winners = previous.map((match) => koWinnerId(match));

    if (mode === "bracket") {
      for (const match of current) {
        match.teamAId = winners[match.slot * 2] ?? null;
        match.teamBId = winners[match.slot * 2 + 1] ?? null;
      }

      continue;
    }

    /* reseed: erst wenn die ganze Vorrunde entschieden ist, wird neu gesetzt. */
    const complete = winners.length > 0 && winners.every((winner) => winner !== null);

    const ordered = complete
      ? (winners as string[]).sort((a, b) => (seeds.get(a) ?? 999) - (seeds.get(b) ?? 999))
      : [];

    for (const match of current) {
      match.teamAId = complete ? (ordered[match.slot] ?? null) : null;
      match.teamBId = complete ? (ordered[ordered.length - 1 - match.slot] ?? null) : null;
    }
  }

  return result;
}

/*
 * Der komplette Baum für die Setzliste (Index 0 = Seed 1): Runde 1 mit
 * Freilosen, dazu alle Folgerunden mit leeren Plätzen, soweit schon bekannt
 * (Freilos-Teams stehen direkt in Runde 2 bzw. sind dort schon eingesetzt).
 */
export function buildKoBracket(mode: KoMode, teamIdsBySeed: string[]): KoDraftMatch[] {
  const count = teamIdsBySeed.length;

  if (count < MIN_KO_TEAMS) {
    return [];
  }

  const size = koBracketSize(count);
  const rounds = Math.round(Math.log2(size));
  const byes = size - count;

  /* "Bester gegen Schlechtesten" kennt keine Freilose: nur 2, 4, 8, 16, 32 Teams. */
  if (mode === "reseed" && byes > 0) {
    return [];
  }

  const seeds = new Map(teamIdsBySeed.map((id, index) => [id, index + 1]));
  const draft: KoDraftMatch[] = [];

  if (mode === "bracket") {
    const order = bracketSeedOrder(size);

    for (let slot = 0; slot < size / 2; slot += 1) {
      const a = order[slot * 2];
      const b = order[slot * 2 + 1];
      const teamA = a <= count ? teamIdsBySeed[a - 1] : null;
      const teamB = b <= count ? teamIdsBySeed[b - 1] : null;
      const isBye = teamA === null || teamB === null;

      draft.push({
        round: 1,
        slot,
        teamAId: teamA ?? teamB,
        teamBId: isBye ? null : teamB,
        status: isBye ? "bye" : "pending",
      });
    }
  } else {
    /* Bester gegen Schlechtesten: ohne Freilose, jeder spielt in Runde 1. */
    for (let index = 0; index < count / 2; index += 1) {
      draft.push({
        round: 1,
        slot: index,
        teamAId: teamIdsBySeed[index],
        teamBId: teamIdsBySeed[count - 1 - index],
        status: "pending",
      });
    }
  }

  for (let round = 2; round <= rounds; round += 1) {
    for (let slot = 0; slot < size / 2 ** round; slot += 1) {
      draft.push({ round, slot, teamAId: null, teamBId: null, status: "pending" });
    }
  }

  return resolveKoMatches(
    mode,
    seeds,
    draft.map((match) => ({ ...match, teamAScore: null, teamBScore: null })),
  ).map(({ round, slot, teamAId, teamBId, status }) => ({ round, slot, teamAId, teamBId, status }));
}

/*
 * Ein Ergebnis darf nur geändert werden, solange in einer späteren Runde noch
 * nichts gespielt wurde. Sonst würden bereits gespielte Spiele plötzlich
 * andere Gegner haben.
 */
export function isKoMatchEditable(match: KoMatch, all: KoMatch[]): boolean {
  return !all.some((other) => other.round > match.round && other.status === "finished");
}

export function koRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;

  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Halbfinale";
  if (fromEnd === 2) return "Viertelfinale";
  if (fromEnd === 3) return "Achtelfinale";

  return `Runde ${round}`;
}

export function koTotalRounds(matches: KoMatch[]): number {
  return matches.reduce((max, match) => Math.max(max, match.round), 0);
}

/* Das Team, das das Finale gewonnen hat. null, solange das Turnier läuft. */
export function koChampionId(matches: KoMatch[]): string | null {
  const total = koTotalRounds(matches);

  if (total === 0) {
    return null;
  }

  const final = matches.find((match) => match.round === total && match.slot === 0);

  return final ? koWinnerId(final) : null;
}

/*
 * Maximalzahl von Teams, damit ein einzelnes Spiel pro Paarung noch sinnvoll
 * bleibt. Mehr als 32 Teams in der K.-o.-Phase erlaubt die Oberfläche nicht.
 */
export const MAX_KO_TEAMS = 32;

/*
|--------------------------------------------------------------------------
| K.-O.-STATUS EINES TEAMS (FÜR DIE CARD IN PONG STATS)
|--------------------------------------------------------------------------
*/

export type MyKoStatus = {
  stage: "not_qualified" | "waiting" | "next" | "eliminated" | "champion";
  seed: number | null;
  /* Name der aktuellen bzw. nächsten Runde, z. B. "Halbfinale". */
  roundLabel: string | null;
  opponent: TournamentTeam | null;
  /* Bei "eliminated": das verlorene Spiel aus Sicht des Teams. */
  lostScore: { own: number; opponent: number } | null;
};

export function buildMyKoStatus(
  tournament: Tournament,
  team: TournamentTeam,
  teams: TournamentTeam[],
  koMatches: KoMatch[],
): MyKoStatus | null {
  if (!tournament.koMode) {
    return null;
  }

  if (team.koSeed === null) {
    return {
      stage: "not_qualified",
      seed: null,
      roundLabel: null,
      opponent: null,
      lostScore: null,
    };
  }

  const total = koTotalRounds(koMatches);
  const own = koMatches
    .filter((match) => match.teamAId === team.id || match.teamBId === team.id)
    .sort((a, b) => a.round - b.round);

  if (koChampionId(koMatches) === team.id) {
    return {
      stage: "champion",
      seed: team.koSeed,
      roundLabel: "Finale",
      opponent: null,
      lostScore: null,
    };
  }

  const lost = own.find((match) => {
    const winner = koWinnerId(match);

    return winner !== null && winner !== team.id;
  });

  if (lost) {
    const isA = lost.teamAId === team.id;
    const opponentId = isA ? lost.teamBId : lost.teamAId;

    return {
      stage: "eliminated",
      seed: team.koSeed,
      roundLabel: koRoundLabel(lost.round, total),
      opponent: teams.find((entry) => entry.id === opponentId) ?? null,
      lostScore:
        lost.teamAScore !== null && lost.teamBScore !== null
          ? {
              own: isA ? lost.teamAScore : lost.teamBScore,
              opponent: isA ? lost.teamBScore : lost.teamAScore,
            }
          : null,
    };
  }

  const open = own.find((match) => match.status === "pending");

  if (open && open.teamAId && open.teamBId) {
    const opponentId = open.teamAId === team.id ? open.teamBId : open.teamAId;

    return {
      stage: "next",
      seed: team.koSeed,
      roundLabel: koRoundLabel(open.round, total),
      opponent: teams.find((entry) => entry.id === opponentId) ?? null,
      lostScore: null,
    };
  }

  /* Weiter, aber der Gegner steht noch nicht fest (Freilos oder andere Spiele laufen). */
  const reached = own.length > 0 ? own[own.length - 1].round : 1;
  const nextRound = Math.min(
    total,
    reached +
      (own.some((match) => match.round === reached && koWinnerId(match) === team.id) ? 1 : 0),
  );

  return {
    stage: "waiting",
    seed: team.koSeed,
    roundLabel: koRoundLabel(nextRound, total),
    opponent: null,
    lostScore: null,
  };
}

/*
|--------------------------------------------------------------------------
| TURNIER-ERGEBNIS (FÜR ACHIEVEMENTS)
|--------------------------------------------------------------------------
*/

export type TournamentOutcome = {
  championTeamId: string | null;
  /* Hat der Sieger im ganzen Turnier (Gruppe + K.-o.) kein Spiel verloren? */
  championUndefeated: boolean;
  /* Zeitpunkt des Finales. */
  decidedAt: string | null;
};

export function evaluateTournamentOutcome(
  groupMatches: TournamentMatch[],
  koMatches: KoMatch[],
): TournamentOutcome {
  const championTeamId = koChampionId(koMatches);

  if (!championTeamId) {
    return { championTeamId: null, championUndefeated: false, decidedAt: null };
  }

  let lostSomething = false;

  for (const match of groupMatches) {
    if (
      match.status === "finished" &&
      match.teamAScore !== null &&
      match.teamBScore !== null &&
      match.teamAScore !== match.teamBScore
    ) {
      const winner = match.teamAScore > match.teamBScore ? match.teamAId : match.teamBId;
      const involved = match.teamAId === championTeamId || match.teamBId === championTeamId;

      if (involved && winner !== championTeamId) {
        lostSomething = true;
      }
    }
  }

  for (const match of koMatches) {
    const involved = match.teamAId === championTeamId || match.teamBId === championTeamId;
    const winner = koWinnerId(match);

    if (involved && winner !== null && winner !== championTeamId) {
      lostSomething = true;
    }
  }

  const total = koTotalRounds(koMatches);
  const final = koMatches.find((match) => match.round === total && match.slot === 0);

  return {
    championTeamId,
    championUndefeated: !lostSomething,
    decidedAt: final?.finishedAt ?? null,
  };
}
