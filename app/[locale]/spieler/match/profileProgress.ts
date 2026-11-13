import { isNonThrowAction, type Team } from "./matchLogic";
import { getSavedMatchesForPlayer, type SavedMatch } from "./matchStorage";
import { getRegisteredPlayerIds } from "./playerProfiles";
import { COMEBACK_DEFICIT } from "./playerStats";
import {
  getMyTournamentOutcomes,
  type MyTournamentOutcome,
} from "@/app/[locale]/turniere/tournamentStorage";

/*
 * --------------------------------------------------------------------------
 * | PROFILFORTSCHRITT (Bronze / Silber / Gold)
 * --------------------------------------------------------------------------
 *
 * Zählt pro Kategorie über ALLE Matches des Spielers (kein Zeitraum-Filter,
 * auch vor einem Statistik-Reset - wie bei den Achievements) und ordnet den
 * Wert einer Stufe zu. Alles wird live berechnet, es wird nichts gespeichert.
 *
 * Welche Spiele zählen:
 *   - Wurf-Zähler (Treffer, Aufsetzer, Trickshots, Starke Spiele): alle
 *     Spiele, auch mit Gästen.
 *   - Ergebnis-Zähler (Siege, Serien, Comebacks, Finisher, Dominanz):
 *     nur GEWERTETE Spiele, also solche, in denen alle Spieler registriert
 *     sind. Das passt zu den Achievements und zur Rangliste.
 *   - Turniersiege: Pong League (Profil mit Team verknüpft).
 *
 * Strafbecher und Umgeworfen sind keine Würfe und zählen bei Treffern,
 * Aufsetzern usw. nicht mit.
 *
 * Alle Schwellen stehen unten in PROGRESS_CATEGORIES (Bronze, Silber, Gold)
 * und lassen sich dort ändern. Die Beschreibungen kommen aus den Messages
 * (Stats.ProfileProgress, cat_<key>_desc) und nutzen die Werte aus
 * PROGRESS_RULES.
 * --------------------------------------------------------------------------
 */

export const PROGRESS_RULES = {
  /* "Starkes Spiel": mindestens so viele Würfe und mindestens diese Trefferquote (in %). */
  goodMatchMinThrows: 8,
  goodMatchMinRate: 40,

  /* Serie: so viele Siege in Folge (gewertete Spiele). */
  seriesWins: 3,

  /* Comeback: so viele Becher Rückstand, danach noch gewonnen. */
  comebackDeficit: COMEBACK_DEFICIT,

  /* Dominanz: Sieg mit mindestens so vielen Bechern Vorsprung im Endstand. */
  dominanceMargin: 5,
};

export type ProgressKey =
  | "hits"
  | "bounce"
  | "goodMatches"
  | "series"
  | "comebacks"
  | "wins"
  | "trickshots"
  | "finisher"
  | "tournaments"
  | "dominance";

export type Thresholds = [bronze: number, silver: number, gold: number];

export const PROGRESS_CATEGORIES: { key: ProgressKey; thresholds: Thresholds }[] = [
  { key: "bounce", thresholds: [10, 50, 100] },
  { key: "hits", thresholds: [50, 250, 1000] },
  { key: "goodMatches", thresholds: [10, 50, 100] },
  { key: "series", thresholds: [1, 5, 10] },
  { key: "comebacks", thresholds: [1, 5, 15] },
  { key: "wins", thresholds: [10, 50, 100] },
  { key: "trickshots", thresholds: [3, 10, 25] },
  { key: "finisher", thresholds: [5, 25, 50] },
  { key: "tournaments", thresholds: [1, 3, 10] },
  { key: "dominance", thresholds: [1, 5, 15] },
];

/*
 * PROFILLEVEL
 *
 * XP gibt es pro Kategorie: erreichte Stufen zählen voll (Bronze, Silber,
 * Gold = TIER_XP), der Fortschritt bis zur nächsten Stufe zählt anteilig.
 * Alle XP_PER_LEVEL XP steigt das Profillevel um 1 (Level 1 ab 0 XP).
 */
export const TIER_XP: [bronze: number, silver: number, gold: number] = [100, 250, 500];
export const XP_PER_LEVEL = 500;

export type ProgressTier = 0 | 1 | 2 | 3; // 0 = noch keine, 1 = Bronze, 2 = Silber, 3 = Gold

export type ProgressItem = {
  key: ProgressKey;
  value: number;
  thresholds: Thresholds;
  tier: ProgressTier;
  /** Wert, ab dem die nächste Stufe erreicht ist (null bei Gold). */
  next: number | null;
  /** Wert, ab dem die aktuelle Stufe galt (0 ohne Stufe). */
  previous: number;
  /** XP aus dieser Kategorie. */
  xp: number;
};

export type ProfileProgress = {
  items: ProgressItem[];
  earnedTiers: number;
  totalTiers: number;
  /** Gesamt-XP, Profillevel und XP-Grenzen des aktuellen Levels. */
  xp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  maxXp: number;
};

type EvalMatch = Pick<SavedMatch, "id" | "savedAt"> & {
  state: Pick<SavedMatch["state"], "players" | "actions" | "winner">;
};

/* Entfernte Becher pro Team im Verlauf: wie viele Becher jedes Team dem anderen weggenommen hat. */
function analyzeFlow(actions: EvalMatch["state"]["actions"]) {
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

  return { removedBy, maxDeficit };
}

export function evaluateProfileProgress(
  matches: EvalMatch[],
  playerId: string,
  registeredIds: Set<string>,
  tournamentOutcomes: Pick<MyTournamentOutcome, "wonTournament">[],
): ProfileProgress {
  const chronological = matches
    .filter((match) => match.state.players.some((player) => player.id === playerId))
    .sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());

  const values: Record<ProgressKey, number> = {
    hits: 0,
    bounce: 0,
    goodMatches: 0,
    series: 0,
    comebacks: 0,
    wins: 0,
    trickshots: 0,
    finisher: 0,
    tournaments: tournamentOutcomes.filter((item) => item.wonTournament).length,
    dominance: 0,
  };

  let winStreak = 0;

  for (const match of chronological) {
    const { players, actions, winner } = match.state;
    const me = players.find((player) => player.id === playerId);

    if (!me) {
      continue;
    }

    const opponentTeam: Team = me.team === "A" ? "B" : "A";
    const rated = players.every((player) => registeredIds.has(player.id));
    const won = winner === me.team;
    const lost = Boolean(winner) && winner !== me.team;

    /* Wurf-Zähler (alle Spiele) */

    let throws = 0;
    let hits = 0;

    for (const action of actions) {
      if (action.playerId !== playerId || isNonThrowAction(action)) {
        continue;
      }

      throws += 1;

      if (action.type === "hit") {
        hits += 1;

        if (action.hitType === "bounce") {
          values.bounce += 1;
        }

        if (action.hitType === "trickshot") {
          values.trickshots += 1;
        }
      }
    }

    values.hits += hits;

    if (
      throws >= PROGRESS_RULES.goodMatchMinThrows &&
      (hits / throws) * 100 >= PROGRESS_RULES.goodMatchMinRate
    ) {
      values.goodMatches += 1;
    }

    /* Ergebnis-Zähler (nur gewertete Spiele) */

    if (!rated) {
      continue;
    }

    if (won) {
      values.wins += 1;
      winStreak += 1;

      /* Eine Serie pro zusammenhängender Siegesreihe: gezählt, sobald sie die Länge erreicht. */
      if (winStreak === PROGRESS_RULES.seriesWins) {
        values.series += 1;
      }

      const flow = analyzeFlow(actions);

      if (flow.maxDeficit[me.team] >= PROGRESS_RULES.comebackDeficit) {
        values.comebacks += 1;
      }

      if (flow.removedBy[me.team].size - flow.removedBy[opponentTeam].size >= PROGRESS_RULES.dominanceMargin) {
        values.dominance += 1;
      }

      /* Finisher: der letzte Treffer des Siegerteams stammt von dir. */
      for (let index = actions.length - 1; index >= 0; index -= 1) {
        const action = actions[index];

        if (action.type === "hit" && action.team === me.team && !isNonThrowAction(action)) {
          if (action.playerId === playerId) {
            values.finisher += 1;
          }

          break;
        }
      }
    } else if (lost) {
      winStreak = 0;
    }
  }

  const items: ProgressItem[] = PROGRESS_CATEGORIES.map(({ key, thresholds }) => {
    const value = values[key];
    const tier = thresholds.filter((threshold) => value >= threshold).length as ProgressTier;
    const next = tier < 3 ? (thresholds as number[])[tier] : null;
    const previous = tier > 0 ? thresholds[tier - 1] : 0;

    /* Volle XP für erreichte Stufen plus anteilig der Fortschritt zur nächsten. */
    let xp = TIER_XP.slice(0, tier).reduce((sum, amount) => sum + amount, 0);

    if (next !== null) {
      xp += Math.round(((value - previous) / (next - previous)) * (TIER_XP as number[])[tier]);
    }

    return { key, value, thresholds, tier, next, previous, xp };
  });

  const xp = items.reduce((sum, item) => sum + item.xp, 0);
  const maxXp = items.length * TIER_XP.reduce((sum, amount) => sum + amount, 0);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  return {
    items,
    earnedTiers: items.reduce((sum, item) => sum + item.tier, 0),
    totalTiers: items.length * 3,
    xp,
    level,
    levelStartXp: (level - 1) * XP_PER_LEVEL,
    nextLevelXp: level * XP_PER_LEVEL,
    maxXp,
  };
}

export async function loadProfileProgress(playerId: string): Promise<ProfileProgress> {
  const [matches, registeredIds, tournamentOutcomes] = await Promise.all([
    /* Nur die Matches dieses Spielers, nicht die ganze Datenbank. */
    getSavedMatchesForPlayer(playerId),
    getRegisteredPlayerIds(),
    /* Turnierdaten sind eine Zugabe: Fehlt z. B. noch das SQL, läuft der Rest trotzdem. */
    getMyTournamentOutcomes(playerId).catch((err) => {
      console.error("Turniersiege für den Profilfortschritt konnten nicht geladen werden:", err);
      return [] as MyTournamentOutcome[];
    }),
  ]);

  return evaluateProfileProgress(matches, playerId, registeredIds, tournamentOutcomes);
}
