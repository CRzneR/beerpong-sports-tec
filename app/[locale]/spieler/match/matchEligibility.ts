import type { MatchState, Team } from "./matchLogic";

/*
 * --------------------------------------------------------------------------
 * | WELCHE MATCHES ZÄHLEN
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
 * Becherpositionen, Profil-Kopf, Rangliste, Ranglistenplatz und Skill-Rating.
 *
 * matchCountsForAnyone nutzt saveMatch (matchStorage.ts): Ein Match, das für
 * KEINEN registrierten Spieler zählt (z. B. nur Gäste, oder registriert gegen
 * Gast), wird gar nicht erst in der Datenbank gespeichert. Die Ergebnisanzeige
 * nach dem Match arbeitet mit dem Spielstand im Speicher und braucht das nicht.
 * --------------------------------------------------------------------------
 */

/* Nur Spieler und Teams werden gebraucht: Das passt auf ein MatchState ebenso wie auf eine Match-Zusammenfassung. */
type MatchPlayers = { players: { id: string; team: Team }[] };

export function isAgainstRegisteredOpponents(
  state: MatchPlayers,
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
 * true, wenn mindestens ein REGISTRIERTER Spieler dieses Matches es für seine
 * Statistik gezählt bekommt. registeredIds = Spieler mit Account,
 * ratedIds = registrierte plus gelöschte Konten (siehe getRatedOpponentIds).
 */
export function matchCountsForAnyone(
  state: MatchState,
  registeredIds: Set<string>,
  ratedIds: Set<string>,
): boolean {
  return state.players.some(
    (player) =>
      registeredIds.has(player.id) && isAgainstRegisteredOpponents(state, player.id, ratedIds),
  );
}
