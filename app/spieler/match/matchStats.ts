import type { MatchState, Team } from "./matchLogic";

/*
 * --------------------------------------------------------------------------
 * | STATISTIK FÜR EIN EINZELNES, LAUFENDES/BEENDETES MATCH
 * --------------------------------------------------------------------------
 *
 * Nicht zu verwechseln mit playerStats.ts: dort werden Statistiken über
 * ALLE gespeicherten Matches eines Spielers hinweg aggregiert (für die
 * Profilseite). Hier geht es nur um EIN einzelnes MatchState-Objekt -
 * genutzt von page.tsx (Match gerade beendet) und MatchResult.tsx
 * (Ergebnis-Anzeige).
 * --------------------------------------------------------------------------
 */

export type PlayerStats = {
  playerId: string;
  playerName: string;
  team: Team;
  throws: number;
  hits: number;
  accuracy: number;
  cupsHit: number;
};

export type TeamStats = {
  team: Team;
  cupsRemaining: number;
  hits: number;
  misses: number;
  accuracy: number;
  singleHits: number;
  bounceHits: number;
  trickshotHits: number;
  cupsHit: number;
};

export type MatchStats = {
  winner: Team | null;
  teamA: TeamStats;
  teamB: TeamStats;
  players: PlayerStats[];
};

function computeTeamStats(state: MatchState, team: Team): TeamStats {
  const teamPlayerIds = new Set(
    state.players.filter((player) => player.team === team).map((player) => player.id),
  );

  const teamActions = state.actions.filter((action) => teamPlayerIds.has(action.playerId));

  const hits = teamActions.filter((action) => action.type === "hit").length;
  const misses = teamActions.filter((action) => action.type === "miss").length;
  const throws = hits + misses;

  const cupsHit = teamActions
    .filter((action) => action.type === "hit")
    .reduce((total, action) => total + action.cupIds.length, 0);

  const singleHits = teamActions.filter((action) => action.hitType === "single").length;
  const bounceHits = teamActions.filter((action) => action.hitType === "bounce").length;
  const trickshotHits = teamActions.filter((action) => action.hitType === "trickshot").length;

  /*
   * "cupsRemaining" ist bewusst das EIGENE Becherfeld des Teams (wie
   * viele der eigenen Becher noch stehen), nicht das des Gegners -
   * passend zur bisherigen Anzeige in MatchResult.tsx ("X Becher übrig").
   */
  const cups = team === "A" ? state.teamACups : state.teamBCups;
  const cupsRemaining = cups.filter((cup) => !cup.hit).length;

  return {
    team,
    cupsRemaining,
    hits,
    misses,
    accuracy: throws > 0 ? Math.round((hits / throws) * 100) : 0,
    singleHits,
    bounceHits,
    trickshotHits,
    cupsHit,
  };
}

function computePlayerStats(state: MatchState): PlayerStats[] {
  return state.players.map((player) => {
    const playerActions = state.actions.filter((action) => action.playerId === player.id);

    const hits = playerActions.filter((action) => action.type === "hit").length;
    const throws = playerActions.length;

    const cupsHit = playerActions
      .filter((action) => action.type === "hit")
      .reduce((total, action) => total + action.cupIds.length, 0);

    return {
      playerId: player.id,
      playerName: player.name,
      team: player.team,
      throws,
      hits,
      accuracy: throws > 0 ? Math.round((hits / throws) * 100) : 0,
      cupsHit,
    };
  });
}

export function getMatchStats(state: MatchState): MatchStats {
  return {
    winner: state.winner,
    teamA: computeTeamStats(state, "A"),
    teamB: computeTeamStats(state, "B"),
    players: computePlayerStats(state),
  };
}
