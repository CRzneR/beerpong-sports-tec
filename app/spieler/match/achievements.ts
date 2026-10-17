import { createClient } from "@/lib/supabase/client";

import { getSavedMatches, type SavedMatch } from "./matchStorage";
import { getRegisteredPlayerIds } from "./playerProfiles";

/*
 * --------------------------------------------------------------------------
 * | ACHIEVEMENTS
 * --------------------------------------------------------------------------
 *
 * Wie es funktioniert:
 *
 * 1. evaluateAchievements() ist eine reine Rechenfunktion: Sie geht alle
 *    Matches eines Spielers in zeitlicher Reihenfolge durch und sagt pro
 *    Achievement, ob und wann (in welchem Match) es erreicht wurde, plus
 *    den Fortschritt. Dieselbe Funktion vergibt auch rückwirkend alles,
 *    was schon in alten Matches steckt.
 *
 * 2. syncAchievements() läuft beim Öffnen des Profils: Sie wertet aus,
 *    speichert neu erreichte Achievements in der Tabelle `achievements`
 *    und liefert die Anzeige-Daten. Freigeschaltet bleibt freigeschaltet,
 *    auch wenn sich die Statistik später verschlechtert oder
 *    zurückgesetzt wird.
 *
 * "GEWERTET": Ein Spiel ist gewertet, wenn ALLE Spieler darin
 * registriert sind (kein Gast). Das passt zur Rangliste, die ebenfalls
 * nur registrierte Spieler zeigt.
 *
 * Alle Schwellenwerte stehen unten in THRESHOLDS und lassen sich dort
 * ändern - die Beschreibungstexte werden daraus erzeugt.
 * --------------------------------------------------------------------------
 */

export const THRESHOLDS = {
  marathonMatches: 100,

  /* Mindestanzahl Würfe, damit "100 % Trefferquote" etwas bedeutet. */
  perfectionistMinThrows: 8,

  onFireStreak: 5,

  unstoppableWins: 10,

  deadeyeThrows: 20,
  deadeyeMinHits: 12, // 60 % von 20

  lastShotMatches: 5,
  /* Dein Team hatte beim entscheidenden Treffer höchstens so viele Becher. */
  lastShotMaxOwnCups: 3,

  chosenOneWins: 10,
  chosenOneHits: 50,

  anomalyThrows: 30,
  anomalyMinHits: 24, // 80 % von 30
};

export type AchievementKey =
  | "marathon"
  | "perfectionist"
  | "onFire"
  | "unstoppable"
  | "deadeye"
  | "lastShot"
  | "chosenOne"
  | "undefeatedChampion"
  | "anomaly";

export type AchievementDefinition = {
  key: AchievementKey;
  title: string;
  description: string;
  /**
   * false = lässt sich aktuell nicht auswerten (hängt an einer Funktion,
   * die es noch nicht gibt). Wird als "kommt später" angezeigt.
   */
  available: boolean;
  unavailableHint?: string;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: "marathon",
    title: "Marathon-Spieler",
    description: `Absolviere ${THRESHOLDS.marathonMatches} Spiele insgesamt.`,
    available: true,
  },
  {
    key: "perfectionist",
    title: "Perfektionist",
    description: `Beende ein Spiel mit 100 % Trefferquote (mindestens ${THRESHOLDS.perfectionistMinThrows} Würfe).`,
    available: true,
  },
  {
    key: "onFire",
    title: "On Fire",
    description: `Erziele ${THRESHOLDS.onFireStreak} Treffer in Folge.`,
    available: true,
  },
  {
    key: "unstoppable",
    title: "Unaufhaltsam",
    description: `Gewinne ${THRESHOLDS.unstoppableWins} gewertete Spiele in Folge. Spiele mit Gästen zählen nicht.`,
    available: true,
  },
  {
    key: "deadeye",
    title: "Deadeye",
    description: `Erreiche mindestens 60 % Trefferquote in ${THRESHOLDS.deadeyeThrows} Würfen.`,
    available: true,
  },
  {
    key: "lastShot",
    title: "Last Shot Standing",
    description: `Gewinne ${THRESHOLDS.lastShotMatches} gewertete Spiele mit dem entscheidenden letzten Treffer, während dein Team nur noch höchstens ${THRESHOLDS.lastShotMaxOwnCups} Becher hatte.`,
    available: true,
  },
  {
    key: "chosenOne",
    title: "The Chosen One",
    description: `Gewinne ${THRESHOLDS.chosenOneWins} gewertete Spiele in Folge, mit mindestens ${THRESHOLDS.chosenOneHits} Treffern über diese Spiele.`,
    available: true,
  },
  {
    key: "undefeatedChampion",
    title: "Undefeated Champion",
    description: "Gewinne ein Turnier mit mindestens 16 Teilnehmern oder 8 Teams ohne Niederlage.",
    available: false,
    unavailableHint: "Kommt mit der K.-o.-Phase von Pong League",
  },
  {
    key: "anomaly",
    title: "Statistical Anomaly",
    description: `Erreiche 80 % Trefferquote über ${THRESHOLDS.anomalyThrows} Würfe in gewerteten Spielen.`,
    available: true,
  },
];

/*
 * --------------------------------------------------------------------------
 * | AUSWERTUNG (reine Funktion)
 * --------------------------------------------------------------------------
 */

export type AchievementProgress = {
  current: number;
  target: number;
  label: string;
};

export type AchievementEvaluation = {
  key: AchievementKey;
  unlocked: boolean;
  /** Zeitpunkt (savedAt) des Matches, in dem es erreicht wurde. */
  unlockedAt: string | null;
  matchId: string | null;
  progress: AchievementProgress | null;
};

type EvalMatch = Pick<SavedMatch, "id" | "savedAt"> & {
  state: Pick<SavedMatch["state"], "players" | "actions" | "winner">;
};

/** Läuft über eine Folge von Würfen (1 = Treffer, 0 = Fehlwurf) mit festem Fenster. */
class ThrowWindow {
  private values: number[] = [];
  private sum = 0;
  best = 0;

  constructor(
    private readonly size: number,
    private readonly minHits: number,
  ) {}

  get length(): number {
    return this.values.length;
  }

  /** true, sobald das Fenster zum ersten Mal die Schwelle erreicht. */
  push(value: number): boolean {
    const hadReached = this.best >= this.minHits;

    this.values.push(value);
    this.sum += value;

    if (this.values.length > this.size) {
      this.sum -= this.values[this.values.length - 1 - this.size];
    }

    if (this.values.length >= this.size) {
      this.best = Math.max(this.best, this.sum);
    }

    return !hadReached && this.best >= this.minHits;
  }
}

export function evaluateAchievements(
  matches: EvalMatch[],
  playerId: string,
  registeredIds: Set<string>,
): AchievementEvaluation[] {
  const chronological = matches
    .filter((match) => match.state.players.some((player) => player.id === playerId))
    .sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());

  const unlocks = new Map<AchievementKey, { at: string; matchId: string }>();

  const unlock = (key: AchievementKey, match: EvalMatch) => {
    if (!unlocks.has(key)) {
      unlocks.set(key, { at: match.savedAt, matchId: match.id });
    }
  };

  /* Zustand über alle Matches hinweg */

  let matchCount = 0;

  const deadeyeWindow = new ThrowWindow(THRESHOLDS.deadeyeThrows, THRESHOLDS.deadeyeMinHits);
  const anomalyWindow = new ThrowWindow(THRESHOLDS.anomalyThrows, THRESHOLDS.anomalyMinHits);

  let bestOnFireStreak = 0;
  let bestPerfectionRate = -1; // beste Trefferquote in einem Match mit genug Würfen

  let winStreak = 0;
  let bestWinStreak = 0;
  let streakHits: number[] = [];

  let lastShotCount = 0;

  for (const match of chronological) {
    const { players, actions, winner } = match.state;

    const me = players.find((player) => player.id === playerId);

    if (!me) {
      continue;
    }

    const rated = players.every((player) => registeredIds.has(player.id));
    const won = winner === me.team;
    const lost = Boolean(winner) && winner !== me.team;

    matchCount += 1;

    if (matchCount >= THRESHOLDS.marathonMatches) {
      unlock("marathon", match);
    }

    /* Eigene Würfe in Reihenfolge */

    let throws = 0;
    let hits = 0;
    let currentStreak = 0;
    let bestStreakInMatch = 0;

    for (const action of actions) {
      if (action.playerId !== playerId) {
        continue;
      }

      const isHit = action.type === "hit" ? 1 : 0;

      throws += 1;
      hits += isHit;

      currentStreak = isHit ? currentStreak + 1 : 0;
      bestStreakInMatch = Math.max(bestStreakInMatch, currentStreak);

      if (bestOnFireStreak < bestStreakInMatch) {
        bestOnFireStreak = bestStreakInMatch;
      }

      if (currentStreak >= THRESHOLDS.onFireStreak) {
        unlock("onFire", match);
      }

      if (deadeyeWindow.push(isHit)) {
        unlock("deadeye", match);
      }

      if (rated && anomalyWindow.push(isHit)) {
        unlock("anomaly", match);
      }
    }

    /* Perfektionist */

    if (throws >= THRESHOLDS.perfectionistMinThrows) {
      const rate = Math.round((hits / throws) * 100);

      bestPerfectionRate = Math.max(bestPerfectionRate, rate);

      if (hits === throws) {
        unlock("perfectionist", match);
      }
    }

    /* Siegesserien (nur gewertete Spiele; Spiele mit Gästen werden übersprungen) */

    if (rated) {
      if (won) {
        winStreak += 1;
        streakHits.push(hits);
        bestWinStreak = Math.max(bestWinStreak, winStreak);

        if (winStreak >= THRESHOLDS.unstoppableWins) {
          unlock("unstoppable", match);
        }

        if (winStreak >= THRESHOLDS.chosenOneWins) {
          const lastWindow = streakHits.slice(-THRESHOLDS.chosenOneWins);
          const total = lastWindow.reduce((sum, value) => sum + value, 0);

          if (total >= THRESHOLDS.chosenOneHits) {
            unlock("chosenOne", match);
          }
        }
      } else if (lost) {
        winStreak = 0;
        streakHits = [];
      }
    }

    /*
     * LAST SHOT STANDING
     *
     * Der letzte Treffer des Gewinnerteams im Match stammt von dir, und
     * dein Team hatte in dem Moment nur noch höchstens
     * lastShotMaxOwnCups Becher (also: ein Fehlwurf hätte das Match
     * kippen können). Die eigenen Becher ergeben sich aus den Treffern
     * des Gegners davor.
     */

    if (rated && won) {
      let finalIndex = -1;

      for (let index = actions.length - 1; index >= 0; index -= 1) {
        if (actions[index].type === "hit" && actions[index].team === me.team) {
          finalIndex = index;
          break;
        }
      }

      if (finalIndex !== -1 && actions[finalIndex].playerId === playerId) {
        const ownCupsHit = new Set<number>();

        for (let index = 0; index < finalIndex; index += 1) {
          const earlier = actions[index];

          if (earlier.type === "hit" && earlier.team !== me.team) {
            earlier.cupIds.filter((id) => id >= 1 && id <= 10).forEach((id) => ownCupsHit.add(id));
          }
        }

        const ownRemaining = 10 - ownCupsHit.size;

        if (ownRemaining >= 1 && ownRemaining <= THRESHOLDS.lastShotMaxOwnCups) {
          lastShotCount += 1;

          if (lastShotCount >= THRESHOLDS.lastShotMatches) {
            unlock("lastShot", match);
          }
        }
      }
    }
  }

  /* Ergebnis zusammenbauen */

  const windowLabel = (
    window: ThrowWindow,
    size: number,
    minHits: number,
  ): AchievementProgress => ({
    current: window.length >= size ? Math.min(window.best, minHits) : 0,
    target: minHits,
    label:
      window.length >= size
        ? `Bester Lauf: ${window.best} von ${size} Würfen`
        : `Noch ${size - window.length} Würfe bis zur ersten Wertung`,
  });

  const progress: Partial<Record<AchievementKey, AchievementProgress>> = {
    marathon: {
      current: Math.min(matchCount, THRESHOLDS.marathonMatches),
      target: THRESHOLDS.marathonMatches,
      label: `${matchCount} von ${THRESHOLDS.marathonMatches} Spielen`,
    },
    perfectionist: {
      current: Math.max(bestPerfectionRate, 0),
      target: 100,
      label:
        bestPerfectionRate >= 0
          ? `Beste Trefferquote: ${bestPerfectionRate} %`
          : `Noch kein Spiel mit mindestens ${THRESHOLDS.perfectionistMinThrows} Würfen`,
    },
    onFire: {
      current: Math.min(bestOnFireStreak, THRESHOLDS.onFireStreak),
      target: THRESHOLDS.onFireStreak,
      label: `Längste Serie: ${bestOnFireStreak} Treffer`,
    },
    unstoppable: {
      current: Math.min(bestWinStreak, THRESHOLDS.unstoppableWins),
      target: THRESHOLDS.unstoppableWins,
      label: `Längste Serie: ${bestWinStreak} Siege`,
    },
    chosenOne: {
      current: Math.min(bestWinStreak, THRESHOLDS.chosenOneWins),
      target: THRESHOLDS.chosenOneWins,
      label: `Längste Serie: ${bestWinStreak} Siege`,
    },
    deadeye: windowLabel(deadeyeWindow, THRESHOLDS.deadeyeThrows, THRESHOLDS.deadeyeMinHits),
    anomaly: windowLabel(anomalyWindow, THRESHOLDS.anomalyThrows, THRESHOLDS.anomalyMinHits),
    lastShot: {
      current: Math.min(lastShotCount, THRESHOLDS.lastShotMatches),
      target: THRESHOLDS.lastShotMatches,
      label: `${lastShotCount} von ${THRESHOLDS.lastShotMatches} Spielen`,
    },
  };

  return ACHIEVEMENTS.map((definition) => {
    const hit = unlocks.get(definition.key);

    return {
      key: definition.key,
      unlocked: Boolean(hit),
      unlockedAt: hit?.at ?? null,
      matchId: hit?.matchId ?? null,
      progress: progress[definition.key] ?? null,
    };
  });
}

/*
 * --------------------------------------------------------------------------
 * | SPEICHERN UND LADEN (Tabelle `achievements`)
 * --------------------------------------------------------------------------
 */

export type AchievementView = AchievementDefinition & {
  unlocked: boolean;
  unlockedAt: string | null;
  /** Noch nicht angesehen: wird als "Neu" markiert. */
  isNew: boolean;
  progress: AchievementProgress | null;
};

type StoredAchievement = {
  key: string;
  unlocked_at: string;
  seen_at: string | null;
};

export async function syncAchievements(playerId: string): Promise<AchievementView[]> {
  const supabase = createClient();

  const [matches, registeredIds] = await Promise.all([getSavedMatches(), getRegisteredPlayerIds()]);

  /*
   * Bewusst ALLE Matches, auch vor einem Statistik-Reset: Achievements
   * sind eine Errungenschaft und hängen nicht an der Reset-Funktion.
   */
  const evaluation = evaluateAchievements(matches, playerId, registeredIds);

  const { data: storedRows, error: loadError } = await supabase
    .from("achievements")
    .select("key, unlocked_at, seen_at")
    .eq("player_id", playerId);

  if (loadError) {
    /* Tabelle fehlt (SQL nicht ausgeführt) o. ä.: Anzeige läuft trotzdem, nur ohne Speichern. */
    console.error("Achievements konnten nicht geladen werden:", loadError);
  }

  const stored = new Map<string, StoredAchievement>(
    ((storedRows ?? []) as StoredAchievement[]).map((row) => [row.key, row]),
  );

  const toInsert = evaluation
    .filter((item) => item.unlocked && !stored.has(item.key))
    .map((item) => ({
      player_id: playerId,
      key: item.key,
      unlocked_at: item.unlockedAt,
      match_id: item.matchId,
    }));

  if (!loadError && toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("achievements")
      .upsert(toInsert, { onConflict: "player_id,key", ignoreDuplicates: true });

    if (insertError) {
      console.error("Achievements konnten nicht gespeichert werden:", insertError);
    }
  }

  const evaluationByKey = new Map(evaluation.map((item) => [item.key, item]));

  const views = ACHIEVEMENTS.map((definition) => {
    const evaluated = evaluationByKey.get(definition.key);
    const storedRow = stored.get(definition.key);

    const unlocked = Boolean(storedRow) || Boolean(evaluated?.unlocked);

    return {
      ...definition,
      unlocked,
      unlockedAt: storedRow?.unlocked_at ?? evaluated?.unlockedAt ?? null,
      /* Gerade erst gespeichert oder noch nie angesehen -> neu. */
      isNew: unlocked && (!storedRow || storedRow.seen_at === null),
      progress: evaluated?.progress ?? null,
    };
  });

  /* Neue direkt als gesehen markieren - die Anzeige oben behält "Neu" für diesen Besuch. */

  if (!loadError && views.some((view) => view.isNew)) {
    const { error: seenError } = await supabase
      .from("achievements")
      .update({ seen_at: new Date().toISOString() })
      .eq("player_id", playerId)
      .is("seen_at", null);

    if (seenError) {
      console.error("Achievements konnten nicht als gesehen markiert werden:", seenError);
    }
  }

  return views;
}
