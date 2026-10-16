import { FORMATION_CUP_COUNT, getShooterViewSlot } from "./matchLogic";
import type { MatchState, Team, HitType, RecordedFormation } from "./matchLogic";
import { getSavedMatches } from "./matchStorage";
import { getRegisteredPlayerIds, getStatsResetTimestamps } from "./playerProfiles";

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
  };
}

function addAction(stats: PlayerMatchStats, action: MatchState["actions"][number]) {
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

export async function getPlayerMatchHistory(playerId: string): Promise<PlayerMatchHistoryEntry[]> {
  const [matches, resetTimestamps] = await Promise.all([
    getSavedMatches(),
    getStatsResetTimestamps(),
  ]);

  const resetAt = resetTimestamps.get(playerId) ?? null;

  const result: PlayerMatchHistoryEntry[] = [];

  for (const savedMatch of matches) {
    if (!isAfterReset(savedMatch.savedAt, resetAt)) {
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
    });
  }

  return result;
}

export async function getPlayerOverallStats(playerId: string): Promise<PlayerOverallStats | null> {
  const history = await getPlayerMatchHistory(playerId);

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
  }

  if (!result) return null;

  result.hitRate = result.throws > 0 ? Math.round((result.hits / result.throws) * 100) : 0;

  return result;
}

export async function getAllPlayerOverallStats(): Promise<PlayerOverallStats[]> {
  const [matches, resetTimestamps, registeredIds] = await Promise.all([
    getSavedMatches(),
    getStatsResetTimestamps(),
    getRegisteredPlayerIds(),
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

export async function getPlayerCupPositionStats(playerId: string): Promise<CupPositionStats> {
  const history = await getPlayerMatchHistory(playerId);

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

      if (action.playerId !== playerId) {
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
    if (action.playerId !== playerId) {
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
 * | DETAIL-STATISTIKEN (Win Rate, Ø Becher/Spiel, beste Trefferquote,
 * | längste Siegesserie, längste Trefferserie, Form der letzten 5
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
};

export async function getPlayerDetailStats(playerId: string): Promise<PlayerDetailStats | null> {
  const history = await getPlayerMatchHistory(playerId);

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

  const formResults: ("S" | "N")[] = [];

  for (const entry of chronological) {
    totalMatches += 1;
    totalWins += entry.stats.wins;
    totalCups += entry.stats.cupsRemoved;
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
    winRate: Math.round((totalWins / totalMatches) * 1000) / 10,
    avgCupsPerMatch: Math.round((totalCups / totalMatches) * 10) / 10,
    bestHitRate,
    longestWinStreak,
    longestHitStreak,
    recentForm: formResults.slice(-5),
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
