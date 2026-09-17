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

export type Tournament = {
  id: string;
  userId: string;
  name: string;
  teamCount: number;
  groupCount: number;
  status: TournamentStatus;
  createdAt: string;
};

export type TournamentTeam = {
  id: string;
  tournamentId: string;
  name: string;
  groupLabel: string;
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
