export type Team = "A" | "B";

export type HitType = "single" | "bounce" | "trickshot";

export type ActionType = "miss" | "hit";

export type Player = {
  id: string;
  name: string;

  /**
   * true = echtes Profil
   * false = Gast
   */
  isGuest: boolean;

  team: Team;

  /**
   * Statistiken dieses Matches
   */
  throws: number;
  hits: number;

  singleHits: number;
  bounceHits: number;
  trickshotHits: number;
};

export type Cup = {
  id: number;
  hit: boolean;
};

export type MatchAction = {
  id: string;

  playerId: string;

  team: Team;

  type: ActionType;

  /**
   * Nur vorhanden, wenn type === "hit"
   */
  hitType?: HitType;

  /**
   * Becher, die bei diesem Wurf getroffen wurden.
   */
  cupIds: number[];

  /**
   * Zeitpunkt der Aktion.
   */
  timestamp: number;
};

export type MatchState = {
  players: Player[];

  teamACups: Cup[];
  teamBCups: Cup[];

  /**
   * Alle bisherigen Aktionen.
   *
   * Die letzte Aktion kann darüber
   * vollständig rückgängig gemacht werden.
   */
  actions: MatchAction[];

  /**
   * Spieler, der aktuell werfen darf.
   */
  currentPlayerId: string | null;

  /**
   * Ist gerade das Treffer-Overlay geöffnet?
   */
  hitOverlayOpen: boolean;

  /**
   * Spieler, dessen Treffer gerade
   * im Overlay bearbeitet wird.
   */
  pendingPlayerId: string | null;

  /**
   * Gewählte Trefferart im Overlay.
   */
  pendingHitType: HitType | null;

  /**
   * Ausgewählte Becher im Overlay.
   */
  pendingCupIds: number[];
};
