"use client";

/*
|--------------------------------------------------------------------------
| MATCH LOGIC
|--------------------------------------------------------------------------
|
| Diese Datei enthält ausschließlich die Spiellogik.
|
| Regeln:
|
| - Keine feste Reihenfolge innerhalb eines Teams
| - Der Werfer wird manuell ausgewählt
| - Daneben = Aktion beendet
| - Getroffen = Trefferart auswählen
| - Danach gegnerische Becher auswählen
| - Letzte Aktion kann rückgängig gemacht werden
| - Gäste werden wie normale Spieler behandelt
| - Alle Aktionen werden gespeichert
|
|--------------------------------------------------------------------------
*/

export type Team = "A" | "B";

export type HitType = "single" | "bounce" | "trickshot";

export type ActionType = "miss" | "hit";

export type Player = {
  id: string;
  name: string;
  team: Team;

  /**
   * true = Gastspieler
   * false = Spieler mit Profil
   */
  isGuest?: boolean;

  /**
   * Optionales Profil-Referenzfeld.
   * Für Gäste normalerweise nicht vorhanden.
   */
  profileId?: string;
};

export type Cup = {
  id: number;
  hit: boolean;
};

export type MatchAction = {
  id: string;

  /**
   * Spieler, der geworfen hat.
   */
  playerId: string;

  /**
   * Team des Werfers.
   */
  team: Team;

  /**
   * Daneben oder Getroffen.
   */
  type: ActionType;

  /**
   * Nur bei "hit".
   */
  hitType?: HitType;

  /**
   * Getroffene gegnerische Becher.
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
   * Spieler, der aktuell ausgewählt wurde.
   *
   * Wichtig:
   * Das ist KEINE Reihenfolge.
   *
   * Der Wert wird ausschließlich durch
   * die UI/Spielerauswahl gesetzt.
   */
  currentPlayerId: string | null;

  /**
   * Aktuell laufende Aktion.
   */
  pendingAction: {
    playerId: string;

    team: Team;

    type: ActionType | null;

    hitType: HitType | null;

    cupIds: number[];
  } | null;

  /**
   * Alle abgeschlossenen Aktionen.
   */
  actions: MatchAction[];

  /**
   * Zustand vor der letzten abgeschlossenen Aktion.
   *
   * Wird für Undo verwendet.
   */
  previousState: MatchState | null;

  /**
   * Gewinner des Matches.
   *
   * null = Match läuft noch.
   */
  winner: Team | null;

  /**
   * true = Match ist beendet.
   */
  isFinished: boolean;
};

/*
|--------------------------------------------------------------------------
| INITIAL BECHER
|--------------------------------------------------------------------------
*/

export function createInitialCups(): Cup[] {
  return Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    hit: false,
  }));
}

/*
|--------------------------------------------------------------------------
| INITIAL MATCH
|--------------------------------------------------------------------------
*/

export function createInitialMatch(players: Player[] = []): MatchState {
  return {
    players,

    teamACups: createInitialCups(),

    teamBCups: createInitialCups(),

    currentPlayerId: null,

    pendingAction: null,

    actions: [],

    previousState: null,

    winner: null,

    isFinished: false,
  };
}

export function selectPlayer(state: MatchState, playerId: string): MatchState {
  if (state.isFinished) {
    return state;
  }

  const player = state.players.find((item) => item.id === playerId);

  if (!player) {
    return state;
  }

  /*
   * Während einer laufenden Aktion darf der Spieler
   * nicht gewechselt werden.
   */

  if (state.pendingAction) {
    return state;
  }

  return {
    ...state,

    currentPlayerId: playerId,
  };
}

/*
|--------------------------------------------------------------------------
| AKTION STARTEN
|--------------------------------------------------------------------------
|
| Wird aufgerufen, wenn der aktuell ausgewählte
| Spieler "Daneben" oder "Getroffen" klickt.
|--------------------------------------------------------------------------
*/

export function startAction(state: MatchState, type: ActionType, playerId?: string): MatchState {
  if (state.isFinished) {
    return state;
  }

  /*
   * Wenn eine playerId direkt übergeben wurde,
   * wird dieser Spieler für die Aktion verwendet.
   *
   * Dadurch kann die UI Daneben/Getroffen direkt
   * am jeweiligen Spieler auslösen, ohne dass der
   * Spieler vorher separat ausgewählt werden muss.
   */
  const resolvedPlayerId = playerId ?? state.currentPlayerId;

  if (!resolvedPlayerId) {
    return state;
  }

  const player = state.players.find((item) => item.id === resolvedPlayerId);

  if (!player) {
    return state;
  }

  /*
   * Keine zweite Aktion beginnen,
   * solange eine Aktion offen ist.
   */

  if (state.pendingAction) {
    return state;
  }

  const actionState: MatchState = {
    ...state,
    currentPlayerId: player.id,
  };

  /*
   * Daneben kann sofort abgeschlossen werden.
   */

  if (type === "miss") {
    return finishAction(actionState, {
      playerId: player.id,

      team: player.team,

      type: "miss",

      hitType: undefined,

      cupIds: [],
    });
  }

  /*
   * Getroffen öffnet zunächst
   * die weitere Auswahl.
   */

  return {
    ...actionState,

    pendingAction: {
      playerId: player.id,

      team: player.team,

      type: "hit",

      hitType: null,

      cupIds: [],
    },
  };
}

/*
|--------------------------------------------------------------------------
| TREFFERART AUSWÄHLEN
|--------------------------------------------------------------------------
*/

export function setPendingHitType(state: MatchState, hitType: HitType): MatchState {
  if (!state.pendingAction) {
    return state;
  }

  if (state.pendingAction.type !== "hit") {
    return state;
  }

  return {
    ...state,

    pendingAction: {
      ...state.pendingAction,

      hitType,
    },
  };
}

/*
|--------------------------------------------------------------------------
| BECHER AUSWÄHLEN / ABWÄHLEN
|--------------------------------------------------------------------------
|
| Es können mehrere Becher ausgewählt werden.
|--------------------------------------------------------------------------
*/

export function togglePendingCup(state: MatchState, cupId: number): MatchState {
  if (!state.pendingAction) {
    return state;
  }

  if (state.pendingAction.type !== "hit") {
    return state;
  }

  /*
   * Trefferart muss zuerst ausgewählt sein.
   */

  if (!state.pendingAction.hitType) {
    return state;
  }

  /*
   * FIX: Becher-IDs sind pro Team von 1–10 vergeben
   * und daher NICHT global eindeutig (Team A hat auch
   * einen Becher mit id=3, Team B ebenfalls).
   *
   * Es muss deshalb im Becher-Array des GEGNERISCHEN
   * Teams nachgeschaut werden – und ausgewählt werden
   * darf nur ein Becher, der dort existiert und noch
   * nicht getroffen wurde. Vorher konnte hier jede
   * beliebige Zahl (auch bereits getroffene oder gar
   * nicht existierende Becher) übergeben werden, was
   * zu doppelt gezählten Treffern in der Statistik
   * führen konnte.
   */

  const opponentCups = state.pendingAction.team === "A" ? state.teamBCups : state.teamACups;

  const targetCup = opponentCups.find((cup) => cup.id === cupId);

  if (!targetCup || targetCup.hit) {
    return state;
  }

  const existing = state.pendingAction.cupIds.includes(cupId);

  const cupIds = existing
    ? state.pendingAction.cupIds.filter((id) => id !== cupId)
    : [...state.pendingAction.cupIds, cupId];

  return {
    ...state,

    pendingAction: {
      ...state.pendingAction,

      cupIds,
    },
  };
}

/*
|--------------------------------------------------------------------------
| TREFFER BESTÄTIGEN
|--------------------------------------------------------------------------
*/

export function confirmHit(state: MatchState): MatchState {
  if (!state.pendingAction) {
    return state;
  }

  if (state.pendingAction.type !== "hit") {
    return state;
  }

  if (!state.pendingAction.hitType) {
    return state;
  }

  if (state.pendingAction.cupIds.length === 0) {
    return state;
  }

  return finishAction(state, {
    playerId: state.pendingAction.playerId,

    team: state.pendingAction.team,

    type: "hit",

    hitType: state.pendingAction.hitType,

    cupIds: state.pendingAction.cupIds,
  });
}

/*
|--------------------------------------------------------------------------
| AKTION ABBRECHEN
|--------------------------------------------------------------------------
|
| Falls der Spieler im Overlay doch nichts
| bestätigen möchte.
|--------------------------------------------------------------------------
*/

export function cancelPendingAction(state: MatchState): MatchState {
  return {
    ...state,

    pendingAction: null,
  };
}

/*
|--------------------------------------------------------------------------
| AKTION ABSCHLIESSEN
|--------------------------------------------------------------------------
*/

function finishAction(
  state: MatchState,
  actionData: {
    playerId: string;

    team: Team;

    type: ActionType;

    hitType?: HitType;

    cupIds: number[];
  },
): MatchState {
  /*
   * Zustand vor der Aktion speichern.
   *
   * Dieser wird für Undo verwendet.
   */

  const stateBeforeAction: MatchState = {
    ...state,

    pendingAction: null,

    previousState: null,

    teamACups: state.teamACups.map((cup) => ({ ...cup })),

    teamBCups: state.teamBCups.map((cup) => ({ ...cup })),

    actions: [...state.actions],
  };

  let teamACups = state.teamACups;

  let teamBCups = state.teamBCups;

  /*
   * Nur bei einem Treffer werden
   * Becher entfernt.
   *
   * Und zwar immer die gegnerischen
   * Becher.
   */

  if (actionData.type === "hit") {
    if (actionData.team === "A") {
      teamBCups = removeCups(teamBCups, actionData.cupIds);
    } else {
      teamACups = removeCups(teamACups, actionData.cupIds);
    }
  }

  const action: MatchAction = {
    id: createActionId(),

    playerId: actionData.playerId,

    team: actionData.team,

    type: actionData.type,

    hitType: actionData.hitType,

    cupIds: actionData.cupIds,

    timestamp: Date.now(),
  };

  /*
   * Match-Ende prüfen.
   *
   * Team A gewinnt, sobald Team B keinen
   * verbleibenden Becher mehr hat.
   *
   * Team B gewinnt, sobald Team A keinen
   * verbleibenden Becher mehr hat.
   */
  let winner: Team | null = null;

  const teamACupsRemaining = teamACups.some((cup) => !cup.hit);
  const teamBCupsRemaining = teamBCups.some((cup) => !cup.hit);

  if (!teamBCupsRemaining) {
    winner = "A";
  } else if (!teamACupsRemaining) {
    winner = "B";
  }

  return {
    ...state,

    teamACups,

    teamBCups,

    pendingAction: null,

    actions: [...state.actions, action],

    previousState: stateBeforeAction,

    winner,

    isFinished: winner !== null,
  };
}

/*
|--------------------------------------------------------------------------
| BECHER ENTFERNEN
|--------------------------------------------------------------------------
*/

function removeCups(cups: Cup[], cupIds: number[]): Cup[] {
  return cups.map((cup) => {
    if (cupIds.includes(cup.id)) {
      return {
        ...cup,
        hit: true,
      };
    }

    return cup;
  });
}

/*
|--------------------------------------------------------------------------
| LETZTE AKTION RÜCKGÄNGIG
|--------------------------------------------------------------------------
*/

export function undoLastAction(state: MatchState): MatchState {
  if (state.actions.length === 0) {
    return state;
  }

  /*
   * Wir holen den Zustand vor
   * der letzten Aktion zurück.
   */

  const previous = state.previousState;

  if (!previous) {
    return state;
  }

  /*
   * FIX: `previous` enthält bereits den korrekten
   * actions-Verlauf UND ein previousState von `null`
   * (siehe stateBeforeAction in finishAction). Es reicht
   * also, direkt dorthin zurückzukehren.
   *
   * Der alte Code hat previousState hier fälschlich
   * wieder auf `state.previousState` gesetzt – und das
   * ist exakt `previous` selbst. Dadurch zeigte der
   * wiederhergestellte Zustand nach dem Undo wieder auf
   * sich selbst, statt auf null. Ein zweiter Undo-Klick
   * (ohne neue Aktion dazwischen) hat dann eine weitere
   * Aktion aus dem Verlauf entfernt, ohne dass sich der
   * Becherstatus entsprechend zurückgedreht hat –
   * Aktionsverlauf und Becherstatus liefen auseinander.
   */

  return {
    ...previous,

    pendingAction: null,
  };
}

/*
|--------------------------------------------------------------------------
| AKTION ID
|--------------------------------------------------------------------------
*/

function createActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/*
|--------------------------------------------------------------------------
| HILFSFUNKTIONEN FÜR STATISTIK
|--------------------------------------------------------------------------
*/

/**
 * Anzahl aller Würfe eines Spielers.
 */
export function getPlayerAttempts(state: MatchState, playerId: string): number {
  return state.actions.filter((action) => action.playerId === playerId).length;
}

/**
 * Anzahl der Treffer eines Spielers.
 */
export function getPlayerHits(state: MatchState, playerId: string): number {
  return state.actions.filter((action) => action.playerId === playerId && action.type === "hit")
    .length;
}

/**
 * Anzahl der Fehlwürfe eines Spielers.
 */
export function getPlayerMisses(state: MatchState, playerId: string): number {
  return state.actions.filter((action) => action.playerId === playerId && action.type === "miss")
    .length;
}

/**
 * Anzahl Einzeltreffer.
 */
export function getSingleHits(state: MatchState, playerId: string): number {
  return state.actions.filter(
    (action) => action.playerId === playerId && action.hitType === "single",
  ).length;
}

/**
 * Anzahl Aufhüpfer.
 */
export function getBounceHits(state: MatchState, playerId: string): number {
  return state.actions.filter(
    (action) => action.playerId === playerId && action.hitType === "bounce",
  ).length;
}

/**
 * Anzahl Trickshots.
 */
export function getTrickshotHits(state: MatchState, playerId: string): number {
  return state.actions.filter(
    (action) => action.playerId === playerId && action.hitType === "trickshot",
  ).length;
}

/**
 * Gesamtzahl getroffener Becher.
 */
export function getCupsHit(state: MatchState, playerId: string): number {
  return state.actions
    .filter((action) => action.playerId === playerId)
    .reduce((total, action) => total + action.cupIds.length, 0);
}

/*
 * --------------------------------------------------------------------------
 * | MATCH-STATUS
 * --------------------------------------------------------------------------
 */

/**
 * Gibt zurück, ob das Match beendet ist.
 */
export function isMatchFinished(state: MatchState): boolean {
  return state.isFinished;
}

/**
 * Gibt den Gewinner zurück.
 *
 * null = Match läuft noch.
 */
export function getMatchWinner(state: MatchState): Team | null {
  return state.winner;
}

/**
 * Gibt die Anzahl der noch vorhandenen Becher eines Teams zurück.
 */
export function getRemainingCups(state: MatchState, team: Team): number {
  const cups = team === "A" ? state.teamACups : state.teamBCups;

  return cups.filter((cup) => !cup.hit).length;
}
