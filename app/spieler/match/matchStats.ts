import type { HitType, MatchAction, MatchState, Player, Team } from "./matchLogic";

/*
 * --------------------------------------------------------------------------
 * | SPIELER-STATISTIK
 * --------------------------------------------------------------------------
 */

export type PlayerStats = {
  playerId: string;
  playerName: string;
  team: Team;

  throws: number;
  hits: number;
  misses: number;
  accuracy: number;

  singleHits: number;
  bounceHits: number;
  trickshotHits: number;

  cupsHit: number;
};

/*
 * --------------------------------------------------------------------------
 * | TEAM-STATISTIK
 * --------------------------------------------------------------------------
 */

export type TeamStats = {
  team: Team;

  throws: number;
  hits: number;
  misses: number;
  accuracy: number;

  singleHits: number;
  bounceHits: number;
  trickshotHits: number;

  cupsHit: number;
  cupsRemaining: number;
};

/*
 * --------------------------------------------------------------------------
 * | MATCH-STATISTIK
 * --------------------------------------------------------------------------
 */

export type MatchStats = {
  winner: Team | null;
  isFinished: boolean;

  players: PlayerStats[];

  teamA: TeamStats;
  teamB: TeamStats;
};

/*
 * --------------------------------------------------------------------------
 * | HILFSFUNKTIONEN
 * --------------------------------------------------------------------------
 */

function getAccuracy(hits: number, throws: number): number {
  if (throws === 0) {
    return 0;
  }

  return Math.round((hits / throws) * 100);
}

function getHitTypeCount(actions: MatchAction[], hitType: HitType): number {
  return actions.filter((action) => action.type === "hit" && action.hitType === hitType).length;
}

function getCupsHit(actions: MatchAction[]): number {
  return actions.reduce((total, action) => total + action.cupIds.length, 0);
}

function getPlayerActions(state: MatchState, playerId: string): MatchAction[] {
  return state.actions.filter((action) => action.playerId === playerId);
}

/*
 * --------------------------------------------------------------------------
 * | SPIELER AUSWERTEN
 * --------------------------------------------------------------------------
 */

export function getPlayerStats(state: MatchState, player: Player): PlayerStats {
  const actions = getPlayerActions(state, player.id);

  const throws = actions.length;

  const hits = actions.filter((action) => action.type === "hit").length;

  const misses = actions.filter((action) => action.type === "miss").length;

  return {
    playerId: player.id,
    playerName: player.name,
    team: player.team,

    throws,
    hits,
    misses,

    accuracy: getAccuracy(hits, throws),

    singleHits: getHitTypeCount(actions, "single"),

    bounceHits: getHitTypeCount(actions, "bounce"),

    trickshotHits: getHitTypeCount(actions, "trickshot"),

    cupsHit: getCupsHit(actions),
  };
}

/*
 * --------------------------------------------------------------------------
 * | TEAM AUSWERTEN
 * --------------------------------------------------------------------------
 */

export function getTeamStats(state: MatchState, team: Team): TeamStats {
  const actions = state.actions.filter((action) => action.team === team);

  const throws = actions.length;

  const hits = actions.filter((action) => action.type === "hit").length;

  const misses = actions.filter((action) => action.type === "miss").length;

  const cups = team === "A" ? state.teamACups : state.teamBCups;

  return {
    team,

    throws,
    hits,
    misses,

    accuracy: getAccuracy(hits, throws),

    singleHits: getHitTypeCount(actions, "single"),

    bounceHits: getHitTypeCount(actions, "bounce"),

    trickshotHits: getHitTypeCount(actions, "trickshot"),

    cupsHit: getCupsHit(actions),

    cupsRemaining: cups.filter((cup) => !cup.hit).length,
  };
}

/*
 * --------------------------------------------------------------------------
 * | GESAMTE MATCH-AUSWERTUNG
 * --------------------------------------------------------------------------
 */

export function getMatchStats(state: MatchState): MatchStats {
  const players = state.players.map((player) => getPlayerStats(state, player));

  return {
    winner: state.winner,
    isFinished: state.isFinished,

    players,

    teamA: getTeamStats(state, "A"),

    teamB: getTeamStats(state, "B"),
  };
}

/*
 * --------------------------------------------------------------------------
 * | EINZELNE SPIELER SUCHEN
 * --------------------------------------------------------------------------
 */

export function getPlayerStatsById(state: MatchState, playerId: string): PlayerStats | null {
  const player = state.players.find((item) => item.id === playerId);

  if (!player) {
    return null;
  }

  return getPlayerStats(state, player);
}

/*
 * --------------------------------------------------------------------------
 * | TEAM-STATISTIKEN
 * --------------------------------------------------------------------------
 */

export function getAllTeamStats(state: MatchState): TeamStats[] {
  return [getTeamStats(state, "A"), getTeamStats(state, "B")];
}
