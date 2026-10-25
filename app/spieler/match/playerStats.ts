import { FORMATION_CUP_COUNT, getShooterViewSlot, isNonThrowAction } from "./matchLogic";
import type { MatchState, Team, HitType, RecordedFormation } from "./matchLogic";
import { getSavedMatches } from "./matchStorage";
import {
  getRatedOpponentIds,
  getRegisteredPlayerIds,
  getStatsResetTimestamps,
} from "./playerProfiles";

export type PlayerMatchStats = {
  playerId: string;
  name: string;
  team: Team;
  isGuest?: boolean;
  matches: number;
  wins: number;
  losses: number;
  throws: number;
  hits: number;
  misses: number;
  hitRate: number;
  cupsRemoved: number;
  singleHits: number;
  bounceHits: number;
  trickshotHits: number;
  /* Strafbecher und umgeworfene Becher: gutgeschrieben, aber keine Würfe. */
  penaltyCups: number;
  knockedOverCups: number;
};

export type PlayerOverallStats = PlayerMatchStats;

function emptyStats(player: MatchState["players"][number]): PlayerMatchStats {
  return {
    playerId: player.id,
    name: player.name,
    team: player.team,
    isGuest: player.isGuest,
    matches: 0,
    wins: 0,
    losses: 0,
    throws: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    cupsRemoved: 0,
    singleHits: 0,
    bounceHits: 0,
    trickshotHits: 0,
    penaltyCups: 0,
    knockedOverCups: 0,
  };
}

function addAction(stats: PlayerMatchStats, action: MatchState["actions"][number]) {
  /*
   * Strafbecher und umgeworfene Becher zählen zu den entfernten Bechern,
   * aber nicht als Wurf: weder Würfe noch Treffer noch Trefferquote ändern
   * sich dadurch.
   */
  if (isNonThrowAction(action)) {
    stats.cupsRemoved += action.cupIds.length;

    if (action.hitType === "penalty") {
      stats.penaltyCups += action.cupIds.length;
    } else {
      stats.knockedOverCups += action.cupIds.length;
    }

    return;
  }

  stats.throws += 1;

  if (action.type === "miss") {
    stats.misses += 1;
    return;
  }

  stats.hits += 1;
  stats.cupsRemoved += action.cupIds.length;

  switch (action.hitType as HitType | undefined) {
    case "single":
      stats.singleHits += 1;
      break;
    case "bounce":
      stats.bounceHits += 1;
      break;
    case "trickshot":
      stats.trickshotHits += 1;
      break;
  }
}

export function getPlayerMatchStats(state: MatchState, playerId: string): PlayerMatchStats | null {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return null;

  const stats = emptyStats(player);
  stats.matches = 1;

  for (const action of state.actions) {
    if (action.playerId === playerId) {
      addAction(stats, action);
    }
  }

  if (state.winner === player.team) {
    stats.wins = 1;
  } else if (state.winner) {
    stats.losses = 1;
  }

  stats.hitRate = stats.throws > 0 ? Math.round((stats.hits / stats.throws) * 100) : 0;

  return stats;
}

/*
 * --------------------------------------------------------------------------
 * | STATS-RESET BERÜCKSICHTIGEN
 * --------------------------------------------------------------------------
 *
 * resetAt = null/undefined -> nie zurückgesetzt, alles zählt.
 * Sonst zählt nur, was NACH dem Reset-Zeitpunkt gespeichert wurde.
 * --------------------------------------------------------------------------
 */

function isAfterReset(savedAt: string, resetAt: string | null | undefined): boolean {
  if (!resetAt) {
    return true;
  }

  return new Date(savedAt).getTime() > new Date(resetAt).getTime();
}

/*
 * --------------------------------------------------------------------------
 * | NUR MATCHES GEGEN REGISTRIERTE GEGNER ZÄHLEN
 * --------------------------------------------------------------------------
 *
 * Ein Match geht in die Statistiken eines Spielers nur ein, wenn ALLE
 * Gegner (das andere Team) registriert sind. Mitspieler im eigenen Team
 * spielen keine Rolle - mit einem Gast als Partner gegen echte Gegner
 * zählt das Match also weiterhin. Ohne Gegner (z. B. unvollständiges
 * Match) zählt es nicht.
 *
 * Gilt zentral für alles, was auf getPlayerMatchHistory und
 * getAllPlayerOverallStats aufbaut: Performance, Verlauf, Detail,
 * Becherpositionen, Profil-Kopf, Rangliste und Ranglistenplatz.
 * --------------------------------------------------------------------------
 */

function isAgainstRegisteredOpponents(
  state: MatchState,
  playerId: string,
  ratedIds: Set<string>,
): boolean {
  const player = state.players.find((item) => item.id === playerId);

  if (!player) {
    return false;
  }

  const opponents = state.players.filter((item) => item.team !== player.team);

  return opponents.length > 0 && opponents.every((opponent) => ratedIds.has(opponent.id));
}

/*
 * --------------------------------------------------------------------------
 * | ZEITRAUM-FILTER
 * --------------------------------------------------------------------------
 *
 * "today"  = Matches von heute (ab 0 Uhr, lokale Zeit des Geräts)
 * "last10" = die letzten 10 Matches
 * "last30" = die letzten 30 Matches
 * "all"    = alles (Standard)
 *
 * Greift zentral in getPlayerMatchHistory und damit automatisch bei
 * Performance, Verlauf, Detail und Becherpositionen. Rangliste und
 * Ranglistenplatz sind bewusst NICHT betroffen (immer Gesamtstand).
 * --------------------------------------------------------------------------
 */

export type StatsRange = "today" | "last10" | "last30" | "all";

export const STATS_RANGES: { value: StatsRange; label: string }[] = [
  { value: "today", label: "Heute" },
  { value: "last10", label: "Letzte 10" },
  { value: "last30", label: "Letzte 30" },
  { value: "all", label: "Alle" },
];

/* entries muss neueste zuerst sortiert sein (so liefert es getSavedMatches). */
function applyRange<T extends { savedAt: string }>(entries: T[], range: StatsRange): T[] {
  switch (range) {
    case "today": {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      return entries.filter((entry) => new Date(entry.savedAt).getTime() >= startOfToday.getTime());
    }
    case "last10":
      return entries.slice(0, 10);
    case "last30":
      return entries.slice(0, 30);
    default:
      return entries;
  }
}

export type PlayerMatchHistoryEntry = {
  matchId: string;
  savedAt: string;
  stats: PlayerMatchStats;
  /*
   * NEU: die rohen Einzel-Aktionen dieses Matches (ungefiltert, alle
   * Spieler) - wird für Berechnungen gebraucht, die mehr als die
   * aggregierten Zahlen in `stats` brauchen, z. B. die längste
   * Trefferserie INNERHALB eines Matches (siehe getPlayerDetailStats).
   * Bestehende Nutzer dieser Funktion (z. B. PerformanceChart) können
   * das Feld einfach ignorieren, nichts Bestehendes bricht dadurch.
   */
  actions: MatchState["actions"];
  /*
   * NEU: Teilnehmer und Sieger dieses Matches - für die Bilanz gegen
   * einzelne Gegner und die Partner-Bilanz (getPlayerMatchupStats).
   */
  players: { id: string; name: string; team: Team }[];
  winner: Team | null;
};

/*
 * --------------------------------------------------------------------------
 * | MATCH-VERLAUF EINES SPIELERS (nach eigenem Reset gefiltert)
 * --------------------------------------------------------------------------
 *
 * Zentrale Stelle für "alle Matches EINES Spielers nach seinem letzten
 * Reset". Wird sowohl von den Aggregations-Funktionen unten als auch
 * vom Verlaufs-Chart (PerformanceChart.tsx) genutzt - damit ein Reset
 * überall konsistent greift, statt an einer Stelle vergessen zu werden.
 * --------------------------------------------------------------------------
 */

export async function getPlayerMatchHistory(
  playerId: string,
  range: StatsRange = "all",
): Promise<PlayerMatchHistoryEntry[]> {
  const [matches, resetTimestamps, ratedIds] = await Promise.all([
    getSavedMatches(),
    getStatsResetTimestamps(),
    getRatedOpponentIds(),
  ]);

  const resetAt = resetTimestamps.get(playerId) ?? null;

  const result: PlayerMatchHistoryEntry[] = [];

  for (const savedMatch of matches) {
    if (!isAfterReset(savedMatch.savedAt, resetAt)) {
      continue;
    }

    if (!isAgainstRegisteredOpponents(savedMatch.state, playerId, ratedIds)) {
      continue;
    }

    const stats = getPlayerMatchStats(savedMatch.state, playerId);

    if (!stats) {
      continue;
    }

    result.push({
      matchId: savedMatch.id,
      savedAt: savedMatch.savedAt,
      stats,
      actions: savedMatch.state.actions,
      players: savedMatch.state.players.map((item) => ({
        id: item.id,
        name: item.name,
        team: item.team,
      })),
      winner: savedMatch.state.winner ?? null,
    });
  }

  return applyRange(result, range);
}

export async function getPlayerOverallStats(
  playerId: string,
  range: StatsRange = "all",
): Promise<PlayerOverallStats | null> {
  const history = await getPlayerMatchHistory(playerId, range);

  let result: PlayerOverallStats | null = null;

  for (const entry of history) {
    if (!result) {
      result = { ...entry.stats };
      continue;
    }

    result.matches += entry.stats.matches;
    result.wins += entry.stats.wins;
    result.losses += entry.stats.losses;
    result.throws += entry.stats.throws;
    result.hits += entry.stats.hits;
    result.misses += entry.stats.misses;
    result.cupsRemoved += entry.stats.cupsRemoved;
    result.singleHits += entry.stats.singleHits;
    result.bounceHits += entry.stats.bounceHits;
    result.trickshotHits += entry.stats.trickshotHits;
    result.penaltyCups += entry.stats.penaltyCups;
    result.knockedOverCups += entry.stats.knockedOverCups;
  }

  if (!result) return null;

  result.hitRate = result.throws > 0 ? Math.round((result.hits / result.throws) * 100) : 0;

  return result;
}

export async function getAllPlayerOverallStats(): Promise<PlayerOverallStats[]> {
  const [matches, resetTimestamps, registeredIds, ratedIds] = await Promise.all([
    getSavedMatches(),
    getStatsResetTimestamps(),
    getRegisteredPlayerIds(),
    getRatedOpponentIds(),
  ]);

  const byPlayer = new Map<string, PlayerOverallStats>();

  for (const savedMatch of matches) {
    for (const player of savedMatch.state.players) {
      /*
       * Gäste (kein verknüpfter Account) tauchen in der öffentlichen
       * Rangliste nicht auf - nur registrierte Spieler.
       */
      if (!registeredIds.has(player.id)) {
        continue;
      }

      const resetAt = resetTimestamps.get(player.id) ?? null;

      if (!isAfterReset(savedMatch.savedAt, resetAt)) {
        continue;
      }

      /* Wie im Profil: nur Matches gegen registrierte Gegner zählen. */
      if (!isAgainstRegisteredOpponents(savedMatch.state, player.id, ratedIds)) {
        continue;
      }

      const matchStats = getPlayerMatchStats(savedMatch.state, player.id);
      if (!matchStats) continue;

      const existing = byPlayer.get(player.id);

      if (!existing) {
        byPlayer.set(player.id, { ...matchStats });
        continue;
      }

      existing.matches += matchStats.matches;
      existing.wins += matchStats.wins;
      existing.losses += matchStats.losses;
      existing.throws += matchStats.throws;
      existing.hits += matchStats.hits;
      existing.misses += matchStats.misses;
      existing.cupsRemoved += matchStats.cupsRemoved;
      existing.singleHits += matchStats.singleHits;
      existing.bounceHits += matchStats.bounceHits;
      existing.trickshotHits += matchStats.trickshotHits;
      existing.penaltyCups += matchStats.penaltyCups;
      existing.knockedOverCups += matchStats.knockedOverCups;
    }
  }

  const result = Array.from(byPlayer.values());

  for (const stats of result) {
    stats.hitRate = stats.throws > 0 ? Math.round((stats.hits / stats.throws) * 100) : 0;
  }

  return result.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.hitRate !== a.hitRate) return b.hitRate - a.hitRate;
    return b.hits - a.hits;
  });
}

/*
 * --------------------------------------------------------------------------
 * | TREFFER NACH BECHERPOSITION (pro Formation)
 * --------------------------------------------------------------------------
 *
 * Wie oft wurde welcher Becherplatz getroffen - getrennt nach der
 * Formation, in der er stand (10er: 7-10 Becher stehen, 6er: 4-6,
 * 3er: 2-3). counts[i] = Treffer auf Platz i (aus Sicht des Werfers,
 * siehe getShooterViewSlot in matchLogic.ts: Reihe für Reihe von der
 * hintersten Reihe zur Spitze, jeweils links nach rechts).
 *
 * Zwei Datenquellen:
 * 1. Neue Matches speichern Formation und Platz direkt beim Wurf
 *    (action.formation / action.hitSlots) - exakt.
 * 2. Ältere Matches haben das nicht. Für die 10er-Formation lässt es
 *    sich trotzdem herleiten: Dort entspricht der Platz der Becher-ID
 *    (Platz = ID - 1), und die Formation ist sicher die 10er, solange
 *    höchstens 3 Becher vorher entfernt wurden. Nur der erste Becher
 *    einer Aktion zählt (der direkt getroffene, der Rest sind
 *    Bonus-Becher). 6er und 3er lassen sich bei alten Matches nicht
 *    zuverlässig herleiten, sie fließen nur aus neuen Matches ein.
 *    legacyHits zählt, wie viele Treffer aus dieser Herleitung stammen.
 * --------------------------------------------------------------------------
 */

export type CupPositionFormationStats = {
  total: number;
  counts: number[];
  legacyHits: number;
};

export type CupPositionStats = Record<RecordedFormation, CupPositionFormationStats>;

export async function getPlayerCupPositionStats(
  playerId: string,
  range: StatsRange = "all",
): Promise<CupPositionStats> {
  const history = await getPlayerMatchHistory(playerId, range);

  const result: CupPositionStats = {
    ten: { total: 0, counts: Array(FORMATION_CUP_COUNT.ten).fill(0), legacyHits: 0 },
    six: { total: 0, counts: Array(FORMATION_CUP_COUNT.six).fill(0), legacyHits: 0 },
    three: { total: 0, counts: Array(FORMATION_CUP_COUNT.three).fill(0), legacyHits: 0 },
  };

  for (const entry of history) {
    /* Pro Team: Becher, die in früheren Aktionen schon vorkamen (nur für Altdaten). */
    const removedBefore: Record<Team, Set<number>> = { A: new Set(), B: new Set() };

    for (const action of entry.actions) {
      if (action.type !== "hit") {
        continue;
      }

      const removedCount = removedBefore[action.team].size;

      action.cupIds.forEach((cupId) => removedBefore[action.team].add(cupId));

      /* Strafbecher/Umgeworfen sind keine geworfenen Treffer, also auch keine Becherposition. */
      if (action.playerId !== playerId || isNonThrowAction(action)) {
        continue;
      }

      if (action.formation && action.hitSlots && action.hitSlots.length > 0) {
        const target = result[action.formation];

        for (const slot of action.hitSlots) {
          if (slot >= 0 && slot < target.counts.length) {
            target.counts[slot] += 1;
            target.total += 1;
          }
        }

        continue;
      }

      /* Altdaten: nur die 10er-Formation, nur der direkt getroffene Becher. */
      const directCupId = action.cupIds[0];

      if (directCupId === undefined || directCupId < 1 || directCupId > 10 || removedCount > 3) {
        continue;
      }

      const slot = getShooterViewSlot(directCupId - 1, "ten", action.team);

      result.ten.counts[slot] += 1;
      result.ten.total += 1;
      result.ten.legacyHits += 1;
    }
  }

  return result;
}

/*
 * --------------------------------------------------------------------------
 * | RANGLISTENPLATZ EINES SPIELERS
 * --------------------------------------------------------------------------
 *
 * Platz in derselben Reihenfolge wie die Spieler-Rangliste (siehe
 * getAllPlayerOverallStats), also identisch zur Nummer dort. null, wenn
 * der Spieler (noch) nicht in der Rangliste steht, z. B. ohne Match
 * oder nach einem Zurücksetzen der Statistiken.
 * --------------------------------------------------------------------------
 */

export async function getPlayerRank(
  playerId: string,
): Promise<{ rank: number; total: number } | null> {
  const all = await getAllPlayerOverallStats();
  const index = all.findIndex((player) => player.playerId === playerId);

  if (index === -1) {
    return null;
  }

  return { rank: index + 1, total: all.length };
}

/*
 * --------------------------------------------------------------------------
 * | BILANZ GEGEN GEGNER UND MIT PARTNERN
 * --------------------------------------------------------------------------
 *
 * Pro Mitspieler: wie viele gemeinsame Matches, Siege und Niederlagen.
 *  - opponents: Spieler im ANDEREN Team (bei 2 gegen 2 zählt jedes Match
 *    gegen beide Gegner).
 *  - partners: Mitspieler im EIGENEN Team - gibt es nur in Matches mit
 *    mindestens 2 Spielern pro Team.
 * Unentschieden zählen als Match, aber weder als Sieg noch als Niederlage.
 * Sortiert nach Anzahl der Matches, bei Gleichstand nach Siegen.
 * --------------------------------------------------------------------------
 */

export type MatchupRecord = {
  playerId: string;
  name: string;
  matches: number;
  wins: number;
  losses: number;
  /** Siegquote in ganzen Prozent (Siege / Matches). */
  winRate: number;
};

export type PlayerMatchupStats = {
  opponents: MatchupRecord[];
  partners: MatchupRecord[];
};

export async function getPlayerMatchupStats(
  playerId: string,
  range: StatsRange = "all",
): Promise<PlayerMatchupStats> {
  const history = await getPlayerMatchHistory(playerId, range);

  const opponents = new Map<string, MatchupRecord>();
  const partners = new Map<string, MatchupRecord>();

  const add = (
    map: Map<string, MatchupRecord>,
    other: { id: string; name: string },
    result: "win" | "loss" | "draw",
  ) => {
    const record = map.get(other.id) ?? {
      playerId: other.id,
      name: other.name,
      matches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };

    record.matches += 1;

    if (result === "win") record.wins += 1;
    if (result === "loss") record.losses += 1;

    map.set(other.id, record);
  };

  for (const entry of history) {
    const own = entry.players.find((item) => item.id === playerId);

    if (!own) {
      continue;
    }

    const result: "win" | "loss" | "draw" = !entry.winner
      ? "draw"
      : entry.winner === own.team
        ? "win"
        : "loss";

    for (const other of entry.players) {
      if (other.id === playerId) {
        continue;
      }

      add(other.team === own.team ? partners : opponents, other, result);
    }
  }

  const finish = (map: Map<string, MatchupRecord>): MatchupRecord[] =>
    Array.from(map.values())
      .map((record) => ({
        ...record,
        winRate: record.matches > 0 ? Math.round((record.wins / record.matches) * 100) : 0,
      }))
      .sort(
        (a, b) => b.matches - a.matches || b.wins - a.wins || a.name.localeCompare(b.name, "de"),
      );

  return { opponents: finish(opponents), partners: finish(partners) };
}

/*
 * --------------------------------------------------------------------------
 * | ENDPHASE-QUOTE
 * --------------------------------------------------------------------------
 *
 * Endphase = der Gegner hat nur noch 1-3 Becher. Gezählt werden die Würfe
 * des Spielers in genau dieser Lage. Die Anzahl der stehenden Becher wird
 * aus den bisherigen Treffern des eigenen Teams nachgerechnet (jedes Team
 * startet mit 10 Bechern; cupIds sind die getroffenen gegnerischen Becher).
 * --------------------------------------------------------------------------
 */

const CUPS_PER_SIDE = 10;
const ENDPHASE_MAX_CUPS = 3;

function endphaseCounts(
  actions: MatchState["actions"],
  playerId: string,
): { throws: number; hits: number } {
  const removed: Record<Team, Set<number>> = { A: new Set(), B: new Set() };

  let throws = 0;
  let hits = 0;

  for (const action of actions) {
    const standing = CUPS_PER_SIDE - removed[action.team].size;

    if (
      action.playerId === playerId &&
      !isNonThrowAction(action) &&
      standing >= 1 &&
      standing <= ENDPHASE_MAX_CUPS
    ) {
      throws += 1;

      if (action.type === "hit") {
        hits += 1;
      }
    }

    if (action.type === "hit") {
      action.cupIds.forEach((cupId) => removed[action.team].add(cupId));
    }
  }

  return { throws, hits };
}

/*
 * --------------------------------------------------------------------------
 * | LÄNGSTE TREFFERSERIE INNERHALB EINES MATCHES
 * --------------------------------------------------------------------------
 *
 * Setzt bewusst an jedem Matchbeginn neu an (Serie INNERHALB eines
 * Spiels), statt über mehrere, zeitlich weit auseinanderliegende
 * Matches hinweg zusammenzuzählen - das wäre sonst willkürlich davon
 * abhängig, wann zufällig als Nächstes wieder gespielt wurde.
 * --------------------------------------------------------------------------
 */

function longestHitStreakInMatch(actions: MatchState["actions"], playerId: string): number {
  let current = 0;
  let longest = 0;

  for (const action of actions) {
    /* Strafbecher/Umgeworfen unterbrechen oder verlängern keine Serie. */
    if (action.playerId !== playerId || isNonThrowAction(action)) {
      continue;
    }

    if (action.type === "hit") {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

/*
 * --------------------------------------------------------------------------
 * | SPIELVERLAUF: RÜCKSTAND, FÜHRUNG UND ENDSTAND
 * --------------------------------------------------------------------------
 *
 * Der Becherstand wird aus den cupIds mitgezählt (wie in endphaseCounts).
 *
 * - maxDeficit[team]: größter Rückstand des Teams im Match = Becher, die der
 *   Gegner schon entfernt hat, minus Becher, die das Team selbst entfernt
 *   hat. Der Rückstand des einen ist die Führung des anderen.
 * - cups[team]: Endstand = Becher, die das Team dem Gegner insgesamt
 *   entfernt hat (inkl. Nachwerfen und Verlängerung).
 *
 * Bei einer Verlängerung bekommen beide Teams neue Becher mit eindeutigen
 * IDs, die Differenz bleibt dadurch korrekt.
 * --------------------------------------------------------------------------
 */

/** Ab so vielen Bechern Rückstand/Führung zählt ein Match als Comeback bzw. verspielte Führung. */
export const COMEBACK_DEFICIT = 3;

/** Höchstens so viele Becher Unterschied = knappes Match. */
export const CLOSE_MATCH_MARGIN = 2;

type MatchFlow = {
  maxDeficit: Record<Team, number>;
  cups: Record<Team, number>;
};

function analyzeMatchFlow(actions: MatchState["actions"]): MatchFlow {
  const removedBy: Record<Team, Set<number>> = { A: new Set(), B: new Set() };
  const maxDeficit: Record<Team, number> = { A: 0, B: 0 };

  for (const action of actions) {
    if (action.type !== "hit") {
      continue;
    }

    action.cupIds.forEach((cupId) => removedBy[action.team].add(cupId));

    maxDeficit.A = Math.max(maxDeficit.A, removedBy.B.size - removedBy.A.size);
    maxDeficit.B = Math.max(maxDeficit.B, removedBy.A.size - removedBy.B.size);
  }

  return { maxDeficit, cups: { A: removedBy.A.size, B: removedBy.B.size } };
}

/*
 * --------------------------------------------------------------------------
 * | DETAIL-STATISTIKEN (Win Rate, Ø Becher/Spiel, beste Trefferquote,
 * | längste Siegesserie, längste Trefferserie, Form der letzten 6
 * | Spiele, Verteilung der Trefferarten)
 * --------------------------------------------------------------------------
 *
 * Braucht die Matches in CHRONOLOGISCHER Reihenfolge (älteste zuerst),
 * weil Serien und "Form" nur über die zeitliche Abfolge Sinn ergeben.
 * getPlayerMatchHistory() liefert (wie getSavedMatches()) neueste
 * zuerst, deshalb wird hier gedreht.
 *
 * "Kürzeste Spielzeit" ist bewusst NICHT enthalten: weder
 * matches.started_at/finished_at werden beim Speichern gesetzt, noch
 * werden die Zeitstempel der einzelnen Würfe in die actions-Tabelle
 * übernommen - die Info ist aktuell nirgends gespeichert.
 *
 * hitTypeDistribution ist bewusst eine VERTEILUNG (Anteil an den
 * eigenen Treffern), keine echte Quote pro Wurfart: "Daneben"-Aktionen
 * speichern keinen beabsichtigten Wurftyp, es lässt sich also nicht
 * ermitteln, wie viele Trickshot-VERSUCHE danebengingen - nur, wie
 * viele Treffer welcher Art waren.
 * --------------------------------------------------------------------------
 */

export type PlayerDetailStats = {
  /* Summen über den gewählten Zeitraum (Würfe gesamt / Treffer / Fehlwürfe). */
  throws: number;
  hits: number;
  misses: number;
  winRate: number;
  avgCupsPerMatch: number;
  bestHitRate: number;
  longestWinStreak: number;
  longestHitStreak: number;
  /*
   * Älteste zuerst, neueste zuletzt - gleiche Konvention wie die
   * Formguide-Spalte bei Pong League.
   */
  recentForm: ("S" | "N")[];
  hitTypeDistribution: {
    single: number;
    bounce: number;
    trickshot: number;
  };
  /*
   * Trefferquote in der Endphase (Gegner hat nur noch 1-3 Becher) im
   * Vergleich zu allen übrigen Würfen. null, wenn es noch keinen Wurf in
   * der Endphase gab.
   */
  endphase: {
    throws: number;
    hits: number;
    hitRate: number;
    otherHitRate: number;
  } | null;
};

export async function getPlayerDetailStats(
  playerId: string,
  range: StatsRange = "all",
): Promise<PlayerDetailStats | null> {
  const history = await getPlayerMatchHistory(playerId, range);

  const chronological = [...history].reverse();

  let totalMatches = 0;
  let totalWins = 0;
  let totalCups = 0;
  let bestHitRate = 0;
  let currentWinStreak = 0;
  let longestWinStreak = 0;
  let longestHitStreak = 0;

  let totalSingle = 0;
  let totalBounce = 0;
  let totalTrickshot = 0;

  let totalThrows = 0;
  let totalHits = 0;
  let totalMisses = 0;

  let endphaseThrows = 0;
  let endphaseHits = 0;

  const formResults: ("S" | "N")[] = [];

  for (const entry of chronological) {
    totalMatches += 1;
    totalWins += entry.stats.wins;
    totalCups += entry.stats.cupsRemoved;
    totalThrows += entry.stats.throws;
    totalHits += entry.stats.hits;
    totalMisses += entry.stats.misses;

    const endphase = endphaseCounts(entry.actions, playerId);
    endphaseThrows += endphase.throws;
    endphaseHits += endphase.hits;

    bestHitRate = Math.max(bestHitRate, entry.stats.hitRate);

    totalSingle += entry.stats.singleHits;
    totalBounce += entry.stats.bounceHits;
    totalTrickshot += entry.stats.trickshotHits;

    longestHitStreak = Math.max(longestHitStreak, longestHitStreakInMatch(entry.actions, playerId));

    if (entry.stats.wins > 0) {
      currentWinStreak += 1;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      formResults.push("S");
    } else {
      currentWinStreak = 0;
      formResults.push("N");
    }
  }

  if (totalMatches === 0) {
    return null;
  }

  const totalTypedHits = totalSingle + totalBounce + totalTrickshot;

  return {
    throws: totalThrows,
    hits: totalHits,
    misses: totalMisses,
    winRate: Math.round((totalWins / totalMatches) * 1000) / 10,
    avgCupsPerMatch: Math.round((totalCups / totalMatches) * 10) / 10,
    bestHitRate,
    longestWinStreak,
    longestHitStreak,
    recentForm: formResults.slice(-6),
    endphase:
      endphaseThrows > 0
        ? {
            throws: endphaseThrows,
            hits: endphaseHits,
            hitRate: Math.round((endphaseHits / endphaseThrows) * 100),
            otherHitRate:
              totalThrows > endphaseThrows
                ? Math.round(((totalHits - endphaseHits) / (totalThrows - endphaseThrows)) * 100)
                : 0,
          }
        : null,
    hitTypeDistribution:
      totalTypedHits > 0
        ? {
            single: Math.round((totalSingle / totalTypedHits) * 100),
            bounce: Math.round((totalBounce / totalTypedHits) * 100),
            trickshot: Math.round((totalTrickshot / totalTypedHits) * 100),
          }
        : { single: 0, bounce: 0, trickshot: 0 },
  };
}

/*
 * --------------------------------------------------------------------------
 * | SPIELVERLAUF (eigene Karte: Comeback, Führung, Ergebnisse)
 * --------------------------------------------------------------------------
 *
 * Nur Matches mit Sieger. Aus Sicht des Spielers (own = sein Team):
 *
 * - Comeback: Matches mit mindestens COMEBACK_DEFICIT Bechern Rückstand
 *   (behind), davon gewonnen (won). biggest = größter Rückstand, nach dem
 *   noch gewonnen wurde (0 ohne Comeback).
 * - Führung: Matches mit mindestens COMEBACK_DEFICIT Bechern Vorsprung
 *   (ahead), davon gewonnen (held). biggestBlown = größte Führung, die
 *   trotzdem noch verloren ging (0, wenn nie).
 * - Ergebnisse: Endstand in Bechern (eigene : gegnerische). biggestWin und
 *   biggestLoss = größter Abstand in einem gewonnenen bzw. verlorenen
 *   Match. close = Matches mit höchstens CLOSE_MATCH_MARGIN Bechern
 *   Unterschied, davon gewonnen. avgDiff = Ø Becherdifferenz pro Match
 *   (positiv = mehr Becher als der Gegner).
 *
 * null, wenn es im Zeitraum noch kein Match gibt.
 * --------------------------------------------------------------------------
 */

export type MatchScore = { own: number; opp: number };

/*
 * SPIELMODUS-FILTER (Spielverlauf-Karte)
 *
 * solo = 1 gegen 1, team = alles andere (2 gegen 2 und größere Teams).
 */

export type GameMode = "all" | "solo" | "team";

export const GAME_MODES: { value: GameMode; label: string }[] = [
  { value: "all", label: "Alle Spiele" },
  { value: "solo", label: "1 gegen 1" },
  { value: "team", label: "2 gegen 2" },
];

function matchesGameMode(players: { team: Team }[], ownTeam: Team, mode: GameMode): boolean {
  if (mode === "all") {
    return true;
  }

  const ownSize = players.filter((item) => item.team === ownTeam).length;
  const oppSize = players.length - ownSize;
  const isSolo = ownSize === 1 && oppSize === 1;

  return mode === "solo" ? isSolo : !isSolo;
}

/*
 * BECHERVERLAUF EINES MATCHES
 *
 * Serie nach jedem Wurf: wie viele Becher das eigene Team bzw. der Gegner
 * dem anderen bis dahin entfernt hat. Beide Serien beginnen mit 0 und sind
 * gleich lang (Würfe + 1).
 */

function cupSeries(
  actions: MatchState["actions"],
  ownTeam: Team,
): { own: number[]; opp: number[] } {
  const removedBy: Record<Team, Set<number>> = { A: new Set(), B: new Set() };
  const oppTeam: Team = ownTeam === "A" ? "B" : "A";

  const own = [0];
  const opp = [0];

  for (const action of actions) {
    if (action.type === "hit") {
      action.cupIds.forEach((cupId) => removedBy[action.team].add(cupId));
    }

    own.push(removedBy[ownTeam].size);
    opp.push(removedBy[oppTeam].size);
  }

  return { own, opp };
}

export type MatchFlowEntry = {
  matchId: string;
  savedAt: string;
  opponents: string[];
  won: boolean;
  own: number;
  opp: number;
  ownSeries: number[];
  oppSeries: number[];
};

/** So viele der letzten Matches liefert getPlayerComebackStats höchstens als Verlauf. */
export const RECENT_FLOW_LIMIT = 12;

/*
 * STARTTREFFER
 *
 * Hat das Team des Spielers den Anwurf (erster Wurf des Matches), zählt sein
 * erster Wurf in der Eröffnungsrunde. Die Eröffnungsrunde sind die ersten
 * Würfe des Anwurf-Teams am Stück, höchstens ROUND_THROWS ("2 Bälle, 2
 * Würfe pro Team"). Hat das Gegnerteam den Anwurf oder wirft der Spieler
 * in der Eröffnungsrunde nicht, gibt es keinen Starttreffer-Wurf (null).
 */

const ROUND_THROWS = 2;

function openingThrow(allActions: MatchState["actions"], playerId: string): "hit" | "miss" | null {
  /* Strafbecher/Umgeworfen sind keine Würfe und können keinen Anwurf eröffnen. */
  const actions = allActions.filter((action) => !isNonThrowAction(action));
  const first = actions[0];

  if (!first) {
    return null;
  }

  const round: MatchState["actions"] = [];

  for (const action of actions) {
    if (action.team !== first.team || round.length >= ROUND_THROWS) {
      break;
    }

    round.push(action);
  }

  const own = round.find((action) => action.playerId === playerId);

  return own ? own.type : null;
}

export type ComebackStats = {
  matches: number;
  behind: number;
  won: number;
  rate: number;
  biggest: number;
  ahead: number;
  held: number;
  heldRate: number;
  biggestBlown: number;
  biggestWin: MatchScore | null;
  biggestLoss: MatchScore | null;
  close: { matches: number; won: number };
  avgDiff: number;
  /*
   * Starttreffer: Matches, in denen das Team den Anwurf hatte und der Spieler
   * in der Eröffnungsrunde geworfen hat (matches), davon mit Treffer
   * (hits), Quote in ganzen Prozent und Siege nach einem Starttreffer.
   * null, solange es kein solches Match gibt.
   */
  start: { matches: number; hits: number; rate: number; wonAfterHit: number } | null;
  /* Die letzten Matches mit Sieger, neueste zuerst (höchstens RECENT_FLOW_LIMIT). */
  recent: MatchFlowEntry[];
};

export async function getPlayerComebackStats(
  playerId: string,
  range: StatsRange = "all",
  mode: GameMode = "all",
): Promise<ComebackStats | null> {
  const fullHistory = await getPlayerMatchHistory(playerId, range);

  const history = fullHistory.filter((entry) => {
    const team = entry.players.find((item) => item.id === playerId)?.team;

    return team ? matchesGameMode(entry.players, team, mode) : false;
  });

  if (history.length === 0) {
    return null;
  }

  let behind = 0;
  let won = 0;
  let biggest = 0;

  let ahead = 0;
  let held = 0;
  let biggestBlown = 0;

  let biggestWin: MatchScore | null = null;
  let biggestLoss: MatchScore | null = null;

  let closeMatches = 0;
  let closeWon = 0;

  let diffSum = 0;
  let decided = 0;

  let startMatches = 0;
  let startHits = 0;
  let startWonAfterHit = 0;

  const recent: MatchFlowEntry[] = [];

  for (const entry of history) {
    const ownTeam = entry.players.find((item) => item.id === playerId)?.team;

    if (!ownTeam) {
      continue;
    }

    const opening = openingThrow(entry.actions, playerId);

    if (opening) {
      startMatches += 1;

      if (opening === "hit") {
        startHits += 1;

        if (entry.winner === ownTeam) {
          startWonAfterHit += 1;
        }
      }
    }

    if (!entry.winner) {
      continue;
    }

    const oppTeam: Team = ownTeam === "A" ? "B" : "A";
    const flow = analyzeMatchFlow(entry.actions);
    const didWin = entry.winner === ownTeam;

    const score: MatchScore = { own: flow.cups[ownTeam], opp: flow.cups[oppTeam] };
    const diff = score.own - score.opp;

    if (recent.length < RECENT_FLOW_LIMIT) {
      const series = cupSeries(entry.actions, ownTeam);

      recent.push({
        matchId: entry.matchId,
        savedAt: entry.savedAt,
        opponents: entry.players.filter((item) => item.team === oppTeam).map((item) => item.name),
        won: didWin,
        own: score.own,
        opp: score.opp,
        ownSeries: series.own,
        oppSeries: series.opp,
      });
    }

    decided += 1;
    diffSum += diff;

    if (didWin && (!biggestWin || diff > biggestWin.own - biggestWin.opp)) {
      biggestWin = score;
    }

    if (!didWin && (!biggestLoss || -diff > biggestLoss.opp - biggestLoss.own)) {
      biggestLoss = score;
    }

    if (Math.abs(diff) <= CLOSE_MATCH_MARGIN) {
      closeMatches += 1;

      if (didWin) {
        closeWon += 1;
      }
    }

    const deficit = flow.maxDeficit[ownTeam];
    const lead = flow.maxDeficit[oppTeam];

    if (deficit >= COMEBACK_DEFICIT) {
      behind += 1;

      if (didWin) {
        won += 1;
        biggest = Math.max(biggest, deficit);
      }
    }

    if (lead >= COMEBACK_DEFICIT) {
      ahead += 1;

      if (didWin) {
        held += 1;
      } else {
        biggestBlown = Math.max(biggestBlown, lead);
      }
    }
  }

  return {
    matches: decided,
    behind,
    won,
    rate: behind > 0 ? Math.round((won / behind) * 100) : 0,
    biggest,
    ahead,
    held,
    heldRate: ahead > 0 ? Math.round((held / ahead) * 100) : 0,
    biggestBlown,
    biggestWin,
    biggestLoss,
    close: { matches: closeMatches, won: closeWon },
    avgDiff: decided > 0 ? Math.round((diffSum / decided) * 10) / 10 : 0,
    start:
      startMatches > 0
        ? {
            matches: startMatches,
            hits: startHits,
            rate: Math.round((startHits / startMatches) * 100),
            wonAfterHit: startWonAfterHit,
          }
        : null,
    recent,
  };
}
