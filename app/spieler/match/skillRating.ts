/*
 * --------------------------------------------------------------------------
 * | SKILL-RATING (0 – 1000)
 * --------------------------------------------------------------------------
 *
 * Reine Rechenlogik ohne Datenbank: bekommt alle Matches in zeitlicher
 * Reihenfolge (älteste zuerst) und liefert pro Spieler Rating, Verlauf,
 * Bestwert und die Veränderung pro Match.
 *
 * Grundidee (Elo-Verfahren, angepasst):
 *
 *  1. Jeder startet bei START_RATING (500).
 *  2. Pro Match wird aus den Ratings beider Teams (bei mehreren Spielern
 *     pro Team der Durchschnitt) eine ERWARTUNG berechnet, wie wahrscheinlich
 *     ein Sieg ist. Ein Sieg gegen einen deutlich stärkeren Gegner bringt
 *     viele Punkte, ein Sieg gegen einen deutlich schwächeren kaum welche.
 *  3. Das ERGEBNIS ist nicht nur Sieg/Niederlage: RESULT_WEIGHT zählt der
 *     Ausgang, MARGIN_WEIGHT der Becheranteil. Ein 10:9 ist also weniger
 *     wert als ein 10:2 - und eine knappe Niederlage kostet weniger als
 *     eine klare.
 *  4. Veränderung = K * (Ergebnis - Erwartung). K ist bei neuen Spielern
 *     groß (das Rating soll schnell zur wahren Stärke finden) und sinkt mit
 *     jedem Match auf BASE_K (stabiler Wert).
 *
 * Warum das nicht die Trefferquote nutzt: Wer in drei Matches 90 % trifft,
 * kann trotzdem nur wenig Punkte verdienen - das Rating bewegt sich nur
 * durch Matches, und es startet in der Mitte. Dadurch landen Spieler mit
 * wenigen Matches nie ganz oben:
 *   - Rating steigt je Match höchstens um MAX_DELTA.
 *   - Für die Platzierung braucht es mindestens MIN_RANKED_MATCHES Matches.
 *   - Bis PROVISIONAL_MATCHES Matches gilt das Rating als "vorläufig".
 * --------------------------------------------------------------------------
 */

export type RatingTeam = "A" | "B";

export const START_RATING = 500;
export const MIN_RATING = 0;
export const MAX_RATING = 1000;

/** 250 Punkte Unterschied entsprechen einer Siegchance von etwa 91 %. */
const RATING_SCALE = 250;

const RESULT_WEIGHT = 0.7;
const MARGIN_WEIGHT = 0.3;

const BASE_K = 24;
const EXTRA_K = 40;
const K_DECAY_MATCHES = 8;

/** Höchste Veränderung in einem einzigen Match (Schutz vor Ausreißern). */
export const MAX_DELTA = 40;

/** Ab so vielen Matches gilt das Rating als verlässlich (nicht mehr "vorläufig"). */
export const PROVISIONAL_MATCHES = 10;

/** Ab so vielen Matches erscheint ein Spieler in der Rating-Rangliste. */
export const MIN_RANKED_MATCHES = 5;

export type RatingMatchInput = {
  matchId: string;
  savedAt: string;
  winner: RatingTeam | null;
  /** Becher, die Team A bzw. Team B dem Gegner entfernt hat (Endstand). */
  cups: Record<RatingTeam, number>;
  players: {
    id: string;
    name: string;
    team: RatingTeam;
    /**
     * false = das Match zählt für diesen Spieler nicht (z. B. Gegner ist ein
     * Gast oder das Match liegt vor seinem Statistik-Reset). Sein Rating
     * bleibt dann unverändert, er fließt aber weiter als Mitspieler/Gegner
     * in den Team-Durchschnitt der anderen ein.
     */
    counts: boolean;
  }[];
};

export type RatingStep = {
  matchId: string;
  savedAt: string;
  /** Gerundetes Rating vor / nach dem Match. */
  before: number;
  after: number;
  /** after - before, z. B. +24 oder -11. */
  delta: number;
  /** true = Sieg, false = Niederlage, null = Unentschieden. */
  won: boolean | null;
  /** Ø-Rating des gegnerischen Teams vor dem Match (gerundet). */
  opponentRating: number;
  opponentNames: string[];
};

export type PlayerRating = {
  playerId: string;
  /** Aktuelles Rating, gerundet 0–1000. */
  rating: number;
  matches: number;
  /** true, solange weniger als PROVISIONAL_MATCHES Matches gespielt wurden. */
  provisional: boolean;
  /** Höchstes je erreichtes Rating und das Match, in dem es erreicht wurde. */
  best: number;
  bestMatchId: string | null;
  bestSavedAt: string | null;
  /** Alle Schritte, älteste zuerst. */
  history: RatingStep[];
};

type Internal = {
  value: number;
  matches: number;
  best: number;
  bestMatchId: string | null;
  bestSavedAt: string | null;
  history: RatingStep[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Siegerwartung (0–1) von Team mit Rating `own` gegen Team mit Rating `opp`. */
export function expectedScore(own: number, opp: number): number {
  return 1 / (1 + Math.pow(10, (opp - own) / RATING_SCALE));
}

/** K-Faktor: groß bei neuen Spielern, sinkt mit der Anzahl der Matches. */
export function kFactor(matchesPlayed: number): number {
  return BASE_K + EXTRA_K * Math.exp(-matchesPlayed / K_DECAY_MATCHES);
}

/**
 * Ergebnis eines Matches aus Sicht eines Teams (0–1): Sieg/Niederlage plus
 * Becheranteil. 10:0 -> 1,0 | 10:9 -> 0,86 | 9:10 -> 0,14 | 0:10 -> 0,0.
 */
export function resultScore(
  winner: RatingTeam | null,
  team: RatingTeam,
  ownCups: number,
  oppCups: number,
): number {
  const outcome = winner === null ? 0.5 : winner === team ? 1 : 0;
  const total = ownCups + oppCups;
  const share = total > 0 ? ownCups / total : 0.5;

  return RESULT_WEIGHT * outcome + MARGIN_WEIGHT * share;
}

function average(values: number[]): number {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : START_RATING;
}

/*
 * Rechnet alle Matches durch. `matches` muss ÄLTESTE ZUERST sortiert sein.
 */
export function computeRatings(matches: RatingMatchInput[]): Map<string, PlayerRating> {
  const state = new Map<string, Internal>();

  const get = (id: string): Internal => {
    let entry = state.get(id);

    if (!entry) {
      entry = {
        value: START_RATING,
        matches: 0,
        best: START_RATING,
        bestMatchId: null,
        bestSavedAt: null,
        history: [],
      };
      state.set(id, entry);
    }

    return entry;
  };

  for (const match of matches) {
    const teamA = match.players.filter((player) => player.team === "A");
    const teamB = match.players.filter((player) => player.team === "B");

    /* Ohne Gegner oder ohne jedes Ergebnis (nichts gespielt) gibt es nichts zu werten. */
    if (teamA.length === 0 || teamB.length === 0) {
      continue;
    }

    if (match.winner === null && match.cups.A + match.cups.B === 0) {
      continue;
    }

    /* Ratings VOR dem Match festhalten, damit die Reihenfolge der Spieler keine Rolle spielt. */
    const teamValue: Record<RatingTeam, number> = {
      A: average(teamA.map((player) => get(player.id).value)),
      B: average(teamB.map((player) => get(player.id).value)),
    };

    const updates: { id: string; entry: Internal; next: number; step: RatingStep }[] = [];

    for (const player of match.players) {
      if (!player.counts) {
        continue;
      }

      const entry = get(player.id);
      const opponentTeam: RatingTeam = player.team === "A" ? "B" : "A";
      const expected = expectedScore(teamValue[player.team], teamValue[opponentTeam]);
      const score = resultScore(
        match.winner,
        player.team,
        match.cups[player.team],
        match.cups[opponentTeam],
      );

      const rawDelta = kFactor(entry.matches) * (score - expected);
      const delta = clamp(rawDelta, -MAX_DELTA, MAX_DELTA);
      const next = clamp(entry.value + delta, MIN_RATING, MAX_RATING);

      const before = Math.round(entry.value);
      const after = Math.round(next);

      updates.push({
        id: player.id,
        entry,
        next,
        step: {
          matchId: match.matchId,
          savedAt: match.savedAt,
          before,
          after,
          delta: after - before,
          won: match.winner === null ? null : match.winner === player.team,
          opponentRating: Math.round(teamValue[opponentTeam]),
          opponentNames: match.players
            .filter((item) => item.team === opponentTeam)
            .map((item) => item.name),
        },
      });
    }

    for (const update of updates) {
      update.entry.value = update.next;
      update.entry.matches += 1;
      update.entry.history.push(update.step);

      if (update.step.after >= update.entry.best) {
        update.entry.best = update.step.after;
        update.entry.bestMatchId = update.step.matchId;
        update.entry.bestSavedAt = update.step.savedAt;
      }
    }
  }

  const result = new Map<string, PlayerRating>();

  for (const [playerId, entry] of state) {
    if (entry.matches === 0) {
      continue;
    }

    result.set(playerId, {
      playerId,
      rating: Math.round(entry.value),
      matches: entry.matches,
      provisional: entry.matches < PROVISIONAL_MATCHES,
      best: entry.best,
      bestMatchId: entry.bestMatchId,
      bestSavedAt: entry.bestSavedAt,
      history: entry.history,
    });
  }

  return result;
}

/*
 * Rating-Rangliste: nur die übergebenen Spieler (z. B. registrierte) mit
 * mindestens MIN_RANKED_MATCHES Matches, bestes Rating zuerst. Bei Gleichstand
 * steht vorn, wer mehr Matches hat (das Rating ist dann belastbarer).
 */
export function rankPlayers(
  ratings: Map<string, PlayerRating>,
  includeIds: Set<string>,
): PlayerRating[] {
  return Array.from(ratings.values())
    .filter((item) => includeIds.has(item.playerId) && item.matches >= MIN_RANKED_MATCHES)
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.matches !== a.matches) return b.matches - a.matches;
      return a.playerId < b.playerId ? -1 : 1;
    });
}
