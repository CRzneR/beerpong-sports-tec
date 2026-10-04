"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

import BeerPongTable, {
  Cup,
  getFormationTier,
  useCupSlotAssignment,
} from "@/components/stats/match/BeerPongTable";

import PlayerCard, { MatchPlayer } from "@/components/stats/match/PlayerCard";

import PlayerSetup from "@/components/stats/match/PlayerSetup";

import HitOverlay, { ShotType } from "@/components/stats/match/HitOverlay";

import type { MatchAction, MatchState } from "../matchLogic";
import { getMatchStats } from "../matchStats";
import MatchResult from "@/components/stats/match/MatchResult";
import { saveMatch } from "../matchStorage";
import { finishMatchLobby } from "../matchLobby";
type MatchEvent =
  | {
      id: string;

      playerId: string;

      playerName: string;

      type: "miss";

      timestamp: string;

      timestampMs: number;
    }
  | {
      id: string;

      playerId: string;

      playerName: string;

      type: "hit";

      /*
       * FIX: Team des Werfers direkt am Event, statt es später über
       * players.find(playerId) nachzuschlagen. Extra-Treffer-Events
       * (siehe handleSaveExtraTreffer) haben playerId: "extra", die
       * zu keinem echten Spieler passt - ein Lookup würde dort immer
       * leer ausgehen und der Bonus-Becher in der Live-Punkteanzeige
       * (teamAScore/teamBScore) unsichtbar bleiben.
       */
      shooterTeam: "A" | "B";

      shotType: ShotType;

      cupIds: number[];

      timestamp: string;

      timestampMs: number;
    };

/*
 * --------------------------------------------------------------------------
 * | RUNDEN-TREFFER (noch nicht vom Tisch entfernt)
 * --------------------------------------------------------------------------
 *
 * NEU: Ein Treffer entfernt den Becher NICHT mehr sofort. Stattdessen
 * wird er hier vorgemerkt, bis die ganze Runde (alle Spieler des
 * aktiven Teams) geworfen hat - genau wie beim echten Spiel am Tisch,
 * wo getroffene Becher erst nach der kompletten Runde weggeräumt
 * werden. Das macht es überhaupt erst möglich, dass zwei
 * Teamkolleg:innen in derselben Runde denselben, noch stehenden
 * Becher treffen (siehe calculateTotalCups oben).
 * --------------------------------------------------------------------------
 */

type RoundHit = {
  playerId: string;
  playerName: string;
  shooterTeam: "A" | "B";
  cupIds: number[];
  shotType: ShotType;
};

/*
 * --------------------------------------------------------------------------
 * | WIE VIELE BECHER ZÄHLT EINE RUNDE? (Regeln)
 * --------------------------------------------------------------------------
 *
 * - Einzeltreffer (und Trickshot) zählt 1 Becher
 * - Aufhüpfer zählt 2 Becher
 * - Treffen zwei Spieler derselben Runde denselben, noch stehenden
 *   Becher, kommt +1 Becher obendrauf
 *
 * Beispiele (Summe der Trefferwerte + 1 bei gleichem Becher):
 *   Einzel + Einzel, verschiedene Becher      = 1 + 1     = 2
 *   Einzel + Einzel, derselbe Becher          = 1 + 1 + 1 = 3
 *   Aufhüpfer + Einzel, derselbe Becher       = 2 + 1 + 1 = 4
 *   Aufhüpfer + Aufhüpfer, derselbe Becher    = 2 + 2 + 1 = 5
 * --------------------------------------------------------------------------
 */

function getHitValue(shotType: ShotType): number {
  return shotType === "bounce" ? 2 : 1;
}

function calculateTotalCups(hits: RoundHit[]): number {
  const totalValue = hits.reduce((sum, hit) => sum + getHitValue(hit.shotType), 0);

  const cupHitCount = new Map<number, number>();

  for (const hit of hits) {
    for (const cupId of hit.cupIds) {
      cupHitCount.set(cupId, (cupHitCount.get(cupId) ?? 0) + 1);
    }
  }

  let sharedCupBonus = 0;

  for (const count of cupHitCount.values()) {
    if (count > 1) {
      sharedCupBonus += 1;
    }
  }

  return totalValue + sharedCupBonus;
}

/*
 * --------------------------------------------------------------------------
 * | RUNDE ABRECHNEN: BIS ZUM RE-RACK, UMSTELLEN, REST FREI WÄHLEN
 * --------------------------------------------------------------------------
 *
 * Die Treffer einer Runde werden gezählt und vermerkt (Gesamtzahl siehe
 * calculateTotalCups). Beim Abrechnen werden die Becher dann EINZELN
 * der Reihe nach weggenommen - und sobald die Becherzahl eine
 * Umstell-Schwelle erreicht (7 auf 6, 4 auf 3, 2 auf 1), wird neu
 * aufgestellt. Alles, was danach noch zu entfernen ist, wird erst
 * jetzt aus der NEUEN Formation frei gewählt.
 *
 * Konkret:
 * - Bis zur letzten erreichten Schwelle werden zuerst die markierten
 *   Becher (in der Reihenfolge, wie sie markiert wurden) entfernt,
 *   fehlende bis dahin automatisch: die Formation wird an dieser
 *   Schwelle ohnehin komplett neu aufgestellt, welcher konkrete Becher
 *   der alten Anordnung dafür wegkommt, ist also egal.
 * - Der Rest (freePicks) wird nach dem Umstellen frei gewählt.
 * - Wird keine Schwelle erreicht, kommen alle markierten Becher weg,
 *   der Rest wird aus der aktuellen Anordnung gewählt.
 *
 * Die Schwellen kommen direkt aus getFormationTier (BeerPongTable):
 * Eine Schwelle ist jede Becherzahl, bei der sich die Formations-Stufe
 * ändert - so bleibt die Regel an genau einer Stelle definiert.
 * --------------------------------------------------------------------------
 */

function findLastRackCount(startCount: number, endCount: number): number | null {
  let lastRack: number | null = null;

  for (let count = startCount - 1; count >= Math.max(endCount, 1); count -= 1) {
    if (getFormationTier(count) !== getFormationTier(count + 1)) {
      lastRack = count;
    }
  }

  return lastRack;
}

function planRoundResolution(
  remainingIds: number[],
  markedIds: number[],
  totalOwed: number,
): { removeNow: number[]; freePicks: number } {
  const remainingCount = remainingIds.length;
  const owed = Math.min(totalOwed, remainingCount);

  /*
   * Es müssen ohnehin alle verbleibenden Becher weg - das Match ist
   * danach vorbei, nichts mehr zu wählen.
   */
  if (owed >= remainingCount) {
    return { removeNow: [...remainingIds], freePicks: 0 };
  }

  const lastRack = findLastRackCount(remainingCount, remainingCount - owed);
  const markedStillStanding = markedIds.filter((id) => remainingIds.includes(id));

  if (lastRack === null) {
    return {
      removeNow: markedStillStanding,
      freePicks: owed - markedStillStanding.length,
    };
  }

  const removedBeforeRack = remainingCount - lastRack;
  const fromMarked = markedStillStanding.slice(0, removedBeforeRack);
  const missing = removedBeforeRack - fromMarked.length;

  const filler =
    missing > 0 ? remainingIds.filter((id) => !fromMarked.includes(id)).slice(-missing) : [];

  return {
    removeNow: [...fromMarked, ...filler],
    freePicks: owed - removedBeforeRack,
  };
}

/*
 * 10 BECHER ERSTELLEN
 */

const createCups = (): Cup[] =>
  Array.from(
    {
      length: 10,
    },
    (_, index) => ({
      id: index + 1,

      hit: false,
    }),
  );

export default function MatchPage() {
  /*
   * MATCH-ID AUS DER URL
   *
   * Diese Seite liegt unter /spieler/match/[matchId] – die id ist
   * gleichzeitig die id der zugehörigen Lobby.
   */

  const params = useParams();
  const lobbyId = params.matchId as string;

  const savedFinishedMatchRef = useRef(false);

  /*
   * SPIELER-SETUP ABGESCHLOSSEN?
   *
   * Wird true, sobald die Lobby auf status "live" wechselt
   * (siehe PlayerSetup).
   */

  const [setupDone, setSetupDone] = useState(false);

  /*
   * SPIELER
   */

  const [players, setPlayers] = useState<MatchPlayer[]>([]);

  /*
   * TEAM A BECHER
   */

  const [teamACups, setTeamACups] = useState<Cup[]>(createCups);

  /*
   * TEAM B BECHER
   */

  const [teamBCups, setTeamBCups] = useState<Cup[]>(createCups);

  /*
   * BECHER-SLOT-ZUORDNUNG (zentral, EINMAL pro Team)
   */

  const teamACupSlots = useCupSlotAssignment(teamACups);

  const teamBCupSlots = useCupSlotAssignment(teamBCups);

  /*
   * AKTIONEN
   */

  const [events, setEvents] = useState<MatchEvent[]>([]);

  /*
   * RUNDEN-TREFFER (noch nicht vom Tisch entfernt) - siehe RoundHit oben
   */

  const [roundHits, setRoundHits] = useState<RoundHit[]>([]);

  /*
   * OFFENE EXTRA-TREFFER-ANSPRÜCHE
   *
   * > 0, solange nach einer aufgelösten Runde noch Bonus-Becher
   * ausgewählt werden müssen. Das Extra-Treffer-Overlay bleibt offen,
   * bis extraOwed wieder 0 erreicht.
   */

  const [extraOwed, setExtraOwed] = useState(0);
  const [extraTeam, setExtraTeam] = useState<"A" | "B" | null>(null);
  const [extraPlayerName, setExtraPlayerName] = useState("");

  /*
   * AKTIVER SPIELER
   */

  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);

  /*
   * OVERLAY
   */

  const [showHitOverlay, setShowHitOverlay] = useState(false);

  /*
   * WER BEGINNT?
   */

  const [startingTeam, setStartingTeam] = useState<"A" | "B" | null>(null);

  /*
   * SPEICHERFEHLER
   */

  const [saveError, setSaveError] = useState<string | null>(null);

  /*
   * LETZTE AKTION
   */

  const lastEvent = events[events.length - 1] ?? null;

  /*
   * WESSEN TEAM IST AM ZUG?
   */

  const turnState = useMemo(() => {
    const teamAPlayers = players.filter((player) => player.team === "A");
    const teamBPlayers = players.filter((player) => player.team === "B");

    let activeTeam: "A" | "B" = startingTeam ?? (teamAPlayers.length > 0 ? "A" : "B");

    let roundActions = new Map<string, "hit" | "miss">();

    for (const event of events) {
      roundActions.set(event.playerId, event.type);

      const activeTeamPlayers = activeTeam === "A" ? teamAPlayers : teamBPlayers;

      const roundComplete =
        activeTeamPlayers.length > 0 &&
        activeTeamPlayers.every((player) => roundActions.has(player.id));

      if (roundComplete) {
        const allHits = activeTeamPlayers.every((player) => roundActions.get(player.id) === "hit");

        if (!allHits) {
          const otherTeam = activeTeam === "A" ? "B" : "A";
          const otherTeamPlayers = otherTeam === "A" ? teamAPlayers : teamBPlayers;

          activeTeam = otherTeamPlayers.length > 0 ? otherTeam : activeTeam;
        }

        roundActions = new Map();
      }
    }

    const actedPlayerIds = new Set(roundActions.keys());

    return { activeTeam, actedPlayerIds };
  }, [events, players, startingTeam]);

  const canPlayerAct = (player: MatchPlayer) =>
    startingTeam !== null &&
    extraOwed === 0 &&
    player.team === turnState.activeTeam &&
    !turnState.actedPlayerIds.has(player.id);

  /*
   * MATCH STATISTIK PRO TEAM
   */

  const teamStats = useMemo(() => {
    const computeStats = (team: "A" | "B") => {
      const teamPlayerIds = new Set(
        players.filter((player) => player.team === team).map((player) => player.id),
      );

      const teamEvents = events.filter((event) => teamPlayerIds.has(event.playerId));

      const throwsCount = teamEvents.length;
      const hitsCount = teamEvents.filter((event) => event.type === "hit").length;

      const opponentCups = team === "A" ? teamBCups : teamACups;
      const opponentCupsRemaining = opponentCups.filter((cup) => !cup.hit).length;

      return { throwsCount, hitsCount, opponentCupsRemaining };
    };

    return { A: computeStats("A"), B: computeStats("B") };
  }, [events, players, teamACups, teamBCups]);

  /*
   * VORGEMERKTE BECHER PRO TEAM (für die optische "steht noch, aber
   * schon getroffen"-Markierung, siehe BeerPongTable pendingCupIds)
   *
   * roundHits speichert pro Aktion, welches TEAM geworfen hat (shooterTeam)
   * und welche GEGNERISCHEN Becher getroffen wurden - die vorgemerkten
   * Becher für Team A sind also die cupIds aller roundHits, deren
   * shooterTeam "B" ist (und umgekehrt).
   */

  const pendingCupIdsForTeamA = useMemo(
    () => roundHits.filter((hit) => hit.shooterTeam === "B").flatMap((hit) => hit.cupIds),
    [roundHits],
  );

  const pendingCupIdsForTeamB = useMemo(
    () => roundHits.filter((hit) => hit.shooterTeam === "A").flatMap((hit) => hit.cupIds),
    [roundHits],
  );

  /*
   * PUNKTESTAND
   *
   * Zählt die Becher, die das Team dem Gegner tatsächlich weggenommen
   * hat (vom Tisch entfernt) plus die in dieser Runde schon
   * vorgemerkten. Bewusst aus dem Becherstand statt aus der Summe der
   * Aktionen berechnet: bei "beide treffen denselben Becher" würde
   * eine Summe über cupIds den geteilten Becher doppelt zählen,
   * obwohl er physisch nur einmal vom Tisch geht.
   */

  const teamAScore = useMemo(
    () => teamBCups.filter((cup) => cup.hit).length + new Set(pendingCupIdsForTeamB).size,
    [teamBCups, pendingCupIdsForTeamB],
  );

  const teamBScore = useMemo(
    () => teamACups.filter((cup) => cup.hit).length + new Set(pendingCupIdsForTeamA).size,
    [teamACups, pendingCupIdsForTeamA],
  );

  const state = useMemo<MatchState>(() => {
    /*
     * Zu speichernde Aktionen aus den Live-Ereignissen aufbauen.
     *
     * Extra-Treffer-Events (playerId "extra", kein echter Spieler)
     * werden hier NICHT als eigene Aktion übernommen: in der
     * Datenbank wird eine echte UUID als Spieler-ID erwartet (sonst
     * Fehler 22P02), und es hat ja auch niemand extra geworfen. Ihre
     * Becher werden stattdessen unten beim Abgleich dem letzten
     * echten Treffer des Teams zugeschlagen.
     */

    const actions: MatchAction[] = [];

    for (const event of events) {
      if (event.type === "hit" && event.shotType === "extra") {
        continue;
      }

      if (event.type === "hit") {
        actions.push({
          id: event.id,
          playerId: event.playerId,
          team: event.shooterTeam,
          type: event.type,
          hitType: event.shotType,
          cupIds: event.cupIds,
          timestamp: event.timestampMs,
        });

        continue;
      }

      const player = players.find((item) => item.id === event.playerId);

      actions.push({
        id: event.id,
        playerId: event.playerId,
        team: player?.team ?? "A",
        type: event.type,
        hitType: undefined,
        cupIds: [],
        timestamp: event.timestampMs,
      });
    }

    /*
     * ABGLEICH MIT DEM TATSÄCHLICHEN BECHERSTAND
     *
     * Welche Becher am Ende wirklich vom Tisch sind, entscheidet die
     * schwellenbasierte Abrechnung (siehe planRoundResolution) - das
     * deckt sich nicht immer mit dem, was die Spieler markiert haben:
     * - ein markierter Becher kann hinter der Umstell-Schwelle liegen
     *   und bleibt dann stehen (stattdessen wird frei gewählt)
     * - bis zur Schwelle werden ggf. Becher automatisch entfernt, und
     *   Extra-Treffer entfernen Becher, die in keiner Aktion stehen
     *
     * Damit die gespeicherten Aktionen beim späteren Laden exakt
     * denselben Endstand ergeben (Match-Historie, Statistik):
     * 1. Becher-IDs, die nie tatsächlich entfernt wurden (und auch
     *    nicht nur vorgemerkt sind), fliegen aus den Aktionen raus.
     * 2. Entfernte Becher, die in keiner Aktion des Teams stehen,
     *    werden dem letzten Treffer dieses Teams zugeschlagen.
     */

    (["A", "B"] as const).forEach((team) => {
      const opponentCups = team === "A" ? teamBCups : teamACups;
      const pendingIds = team === "A" ? pendingCupIdsForTeamB : pendingCupIdsForTeamA;

      const removedIds = opponentCups.filter((cup) => cup.hit).map((cup) => cup.id);
      const validIds = new Set([...removedIds, ...pendingIds]);
      const coveredIds = new Set<number>();

      actions.forEach((action, index) => {
        if (action.type !== "hit" || action.team !== team) {
          return;
        }

        const keptIds = action.cupIds.filter((id) => validIds.has(id));

        keptIds.forEach((id) => coveredIds.add(id));

        actions[index] = { ...action, cupIds: keptIds };
      });

      const missingIds = removedIds.filter((id) => !coveredIds.has(id));

      if (missingIds.length === 0) {
        return;
      }

      for (let index = actions.length - 1; index >= 0; index -= 1) {
        const candidate = actions[index];

        if (candidate.type === "hit" && candidate.team === team) {
          actions[index] = { ...candidate, cupIds: [...candidate.cupIds, ...missingIds] };

          break;
        }
      }
    });

    const teamAFinished = teamACups.every((cup) => cup.hit);
    const teamBFinished = teamBCups.every((cup) => cup.hit);

    return {
      players,
      teamACups,
      teamBCups,
      currentPlayerId: selectedPlayer?.id ?? null,
      pendingAction: null,
      actions,
      previousState: null,
      winner: teamAFinished ? "B" : teamBFinished ? "A" : null,
      isFinished: teamAFinished || teamBFinished,
    };
  }, [
    events,
    players,
    selectedPlayer,
    teamACups,
    teamBCups,
    pendingCupIdsForTeamA,
    pendingCupIdsForTeamB,
  ]);

  /*
   * GETROFFEN
   */

  const matchStats = getMatchStats(state);

  const handleSaveMatch = (matchState: MatchState) => {
    savedFinishedMatchRef.current = true;
    setSaveError(null);

    saveMatch(matchState)
      .then(() => {
        finishMatchLobby(lobbyId).catch((err) => {
          console.error("Lobby konnte nicht als beendet markiert werden:", err);
        });
      })
      .catch((error) => {
        console.error("Match konnte nicht gespeichert werden:", error);

        savedFinishedMatchRef.current = false;

        setSaveError(
          "Match konnte nicht gespeichert werden. Die Statistik wurde vermutlich nicht aktualisiert.",
        );
      });
  };

  const handleRetrySave = () => {
    handleSaveMatch(state);
  };

  useEffect(() => {
    if (!state.isFinished || savedFinishedMatchRef.current) {
      return;
    }

    handleSaveMatch(state);
  }, [state]);

  /*
   * RUNDE AUFLÖSEN
   *
   * Wird aufgerufen, sobald alle Spieler des aktiven Teams geworfen
   * haben (siehe willCompleteRound in handleMiss/handleSaveHit). Bis
   * dahin standen die getroffenen Becher nur markiert da.
   *
   * Jetzt wird abgerechnet (Details siehe planRoundResolution): Die
   * Treffer der Runde ergeben eine Gesamtzahl Becher. Bis zur letzten
   * erreichten Umstell-Schwelle (7 auf 6, 4 auf 3, 2 auf 1) werden
   * markierte Becher entfernt - die Neuaufstellung ergibt sich
   * danach automatisch über useCupSlotAssignment. Was dann noch zu
   * entfernen ist, wird anschließend über das Extra-Treffer-Overlay
   * frei aus der NEUEN Formation gewählt.
   */

  const resolveRound = (hitsThisRound: RoundHit[], activeTeamThisRound: "A" | "B") => {
    if (hitsThisRound.length === 0) {
      return;
    }

    const opponentCups = activeTeamThisRound === "A" ? teamBCups : teamACups;
    const setOpponentCups = activeTeamThisRound === "A" ? setTeamBCups : setTeamACups;

    const remainingIds = opponentCups.filter((cup) => !cup.hit).map((cup) => cup.id);

    const markedIds = Array.from(new Set(hitsThisRound.flatMap((hit) => hit.cupIds)));

    const plan = planRoundResolution(remainingIds, markedIds, calculateTotalCups(hitsThisRound));

    if (plan.removeNow.length > 0) {
      setOpponentCups((current) =>
        current.map((cup) => (plan.removeNow.includes(cup.id) ? { ...cup, hit: true } : cup)),
      );
    }

    setRoundHits([]);

    if (plan.freePicks > 0) {
      setExtraOwed(plan.freePicks);
      setExtraTeam(activeTeamThisRound);

      const lastShooter = hitsThisRound[hitsThisRound.length - 1];
      setExtraPlayerName(lastShooter?.playerName ?? "");
    }
  };

  const handleHit = (player: MatchPlayer) => {
    if (!canPlayerAct(player)) {
      return;
    }

    setSelectedPlayer(player);

    setShowHitOverlay(true);
  };

  /*
   * DANEBEN
   */

  const handleMiss = (player: MatchPlayer) => {
    if (!canPlayerAct(player)) {
      return;
    }

    const now = new Date();

    const event: MatchEvent = {
      id: crypto.randomUUID(),

      playerId: player.id,

      playerName: player.name,

      type: "miss",

      timestamp: now.toLocaleTimeString([], {
        hour: "2-digit",

        minute: "2-digit",
      }),

      timestampMs: now.getTime(),
    };

    /*
     * Prüfen, ob DIESE Aktion die Runde des aktiven Teams komplett
     * macht - BEVOR das Event hinzugefügt wird (turnState.actedPlayerIds
     * spiegelt den Stand VOR dieser Aktion wider).
     */
    const activeTeamPlayers = players.filter((item) => item.team === turnState.activeTeam);
    const willCompleteRound = activeTeamPlayers.every(
      (item) => item.id === player.id || turnState.actedPlayerIds.has(item.id),
    );

    setEvents((current) => [...current, event]);

    setPlayers((current) =>
      current.map((item) =>
        item.id === player.id
          ? {
              ...item,

              throws: item.throws + 1,
            }
          : item,
      ),
    );

    if (willCompleteRound) {
      resolveRound(roundHits, turnState.activeTeam);
    }
  };

  /*
   * TREFFER SPEICHERN
   */

  const handleSaveHit = ({
    shotType,
    cupIds,
  }: {
    shotType: ShotType;

    cupIds: number[];
  }) => {
    if (!selectedPlayer) {
      return;
    }

    const now = new Date();

    const event: MatchEvent = {
      id: crypto.randomUUID(),

      playerId: selectedPlayer.id,

      playerName: selectedPlayer.name,

      type: "hit",

      shooterTeam: selectedPlayer.team,

      shotType,

      cupIds,

      timestamp: now.toLocaleTimeString([], {
        hour: "2-digit",

        minute: "2-digit",
      }),

      timestampMs: now.getTime(),
    };

    setEvents((current) => [...current, event]);

    setPlayers((current) =>
      current.map((item) =>
        item.id === selectedPlayer.id
          ? {
              ...item,

              throws: item.throws + 1,

              hits: item.hits + 1,
            }
          : item,
      ),
    );

    const activeTeamPlayers = players.filter((item) => item.team === turnState.activeTeam);
    const willCompleteRound = activeTeamPlayers.every(
      (item) => item.id === selectedPlayer.id || turnState.actedPlayerIds.has(item.id),
    );

    const newRoundHit: RoundHit = {
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      shooterTeam: selectedPlayer.team,
      cupIds,
      shotType,
    };

    if (willCompleteRound) {
      /*
       * Direkt mit der vollständigen Liste auflösen, statt erst über
       * setRoundHits zu gehen und auf den nächsten Render zu warten -
       * roundHits (State) hätte an dieser Stelle im selben Tick noch
       * nicht den neuen Eintrag.
       */
      resolveRound([...roundHits, newRoundHit], turnState.activeTeam);
    } else {
      setRoundHits((current) => [...current, newRoundHit]);
    }

    setShowHitOverlay(false);

    setSelectedPlayer(null);
  };

  /*
   * EXTRA-TREFFER (BONUS-BECHER) SPEICHERN
   *
   * Läuft unabhängig vom normalen Runden-System - die Becher werden
   * hier sofort entfernt (kein weiteres Vormerken nötig, die Runde ist
   * an dieser Stelle schon aufgelöst). Ein dadurch ausgelöster
   * weiterer Re-Rack passiert wieder automatisch.
   */

  const handleSaveExtraTreffer = ({ cupIds }: { shotType: ShotType; cupIds: number[] }) => {
    if (!extraTeam || cupIds.length === 0) {
      return;
    }

    const now = new Date();

    const event: MatchEvent = {
      id: crypto.randomUUID(),

      playerId: "extra",

      playerName: extraPlayerName || "Extra Treffer",

      type: "hit",

      shooterTeam: extraTeam,

      shotType: "extra",

      cupIds,

      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),

      timestampMs: now.getTime(),
    };

    setEvents((current) => [...current, event]);

    if (extraTeam === "A") {
      setTeamBCups((current) =>
        current.map((cup) => (cupIds.includes(cup.id) ? { ...cup, hit: true } : cup)),
      );
    } else {
      setTeamACups((current) =>
        current.map((cup) => (cupIds.includes(cup.id) ? { ...cup, hit: true } : cup)),
      );
    }

    setExtraOwed(0);
  };

  /*
   * LETZTE AKTION RÜCKGÄNGIG
   *
   * FIX: Da Becher jetzt erst am Rundenende entfernt werden, kann
   * die letzte Aktion entweder noch "offen" sein (steckt noch in
   * roundHits, Becher nie entfernt - dann reicht es, sie dort wieder
   * rauszunehmen) oder bereits aufgelöst (Becher schon entfernt -
   * dann wie bisher über previousState zurückrechnen).
   *
   * BEKANNTE EINSCHRÄNKUNG: Undo über eine bereits aufgelöste Runde
   * hinweg, die zusätzlich einen Extra-Treffer ausgelöst hat, wird
   * nicht vollständig zurückgedreht (der Bonus-Becher bliebe entfernt).
   * Ein seltener Randfall, der hier bewusst nicht abgedeckt wird.
   */

  const handleUndo = () => {
    if (!lastEvent) {
      return;
    }

    const stillPending = roundHits.some(
      (hit) =>
        hit.playerId === lastEvent.playerId &&
        hit.cupIds.join(",") === (lastEvent.type === "hit" ? lastEvent.cupIds.join(",") : ""),
    );

    setEvents((current) => current.slice(0, -1));

    setPlayers((current) =>
      current.map((player) => {
        if (player.id !== lastEvent.playerId) {
          return player;
        }

        if (lastEvent.type === "miss") {
          return {
            ...player,

            throws: Math.max(0, player.throws - 1),
          };
        }

        return {
          ...player,

          throws: Math.max(0, player.throws - 1),

          hits: Math.max(0, player.hits - 1),
        };
      }),
    );

    if (lastEvent.type === "hit" && stillPending) {
      /*
       * Noch nicht aufgelöst - einfach aus den vorgemerkten Treffern
       * entfernen, die Becher standen ja noch nie als "hit" drin.
       */
      setRoundHits((current) =>
        current.filter(
          (hit) =>
            !(
              hit.playerId === lastEvent.playerId &&
              hit.cupIds.join(",") === lastEvent.cupIds.join(",")
            ),
        ),
      );

      return;
    }

    if (lastEvent.type === "hit") {
      /*
       * Bereits aufgelöst - Becher direkt zurückholen. Das Team kommt
       * jetzt vom Event selbst (shooterTeam) statt über einen
       * Spieler-Lookup - bei Extra-Treffern (playerId "extra") hätte
       * der Lookup nie einen Spieler gefunden, die Becher wären
       * beim Rückgängigmachen weg geblieben.
       */
      const restoreCups = (cups: Cup[]) =>
        cups.map((cup) => (lastEvent.cupIds.includes(cup.id) ? { ...cup, hit: false } : cup));

      if (lastEvent.shooterTeam === "A") {
        setTeamBCups(restoreCups);
      } else {
        setTeamACups(restoreCups);
      }

      /*
       * Wurde ein Extra-Treffer zurückgenommen, ist der Anspruch auf
       * diesen Bonus-Becher wieder offen - das Auswahl-Overlay öffnet
       * sich erneut, damit er (neu) gewählt werden kann.
       */
      if (lastEvent.shotType === "extra") {
        setExtraTeam(lastEvent.shooterTeam);
        setExtraPlayerName(lastEvent.playerName);
        setExtraOwed(lastEvent.cupIds.length);
      }
    }
  };

  /*
   * SPIELER-LOBBY
   */

  if (!setupDone) {
    return (
      <PlayerSetup
        lobbyId={lobbyId}
        onStart={(chosenPlayers) => {
          setPlayers(chosenPlayers);
          setSetupDone(true);
        }}
      />
    );
  }

  if (state.isFinished) {
    return (
      <>
        {saveError && (
          <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b border-red-400/20 bg-red-400/10 px-5 py-3 text-center text-xs font-bold text-red-300">
            <span>{saveError}</span>

            <button
              type="button"
              onClick={handleRetrySave}
              className="shrink-0 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-200 transition hover:bg-red-400/20"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        <MatchResult stats={matchStats} />
      </>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#07090d] text-white">
      {/* HEADER */}

      <header
        className="
          shrink-0
          border-b
          border-white/[0.06]
          px-5
          py-3
        "
      >
        <div
          className="
            mx-auto
            flex
            max-w-7xl
            items-center
            justify-between
          "
        >
          <div>
            <div
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-[0.2em]
                text-cyan-400
              "
            >
              Pong Stats
            </div>

            <h1
              className="
                mt-0.5
                text-base
                font-black
                uppercase
              "
            >
              Freitag Abend
            </h1>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              text-white/40
            "
          >
            <span
              className="
                h-2
                w-2
                rounded-full
                bg-cyan-400
                shadow-[0_0_10px_rgba(34,211,238,0.8)]
              "
            />
            Match Live
          </div>
        </div>
      </header>

      {/* MOBILE (< lg) */}

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-4 py-1.5 lg:hidden">
        <div className="flex shrink-0 gap-2">
          <div className="w-[34%] shrink-0">
            <BeerPongTable
              teamACups={teamACups}
              teamBCups={teamBCups}
              teamACupSlots={teamACupSlots}
              teamBCupSlots={teamBCupSlots}
              selectable={false}
              narrow
              pendingCupIds={[...pendingCupIdsForTeamA, ...pendingCupIdsForTeamB]}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* SCORE */}

            <div className="shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <div className="text-[7px] font-bold uppercase tracking-wider text-white/25">
                    Team A
                  </div>
                  <div className="text-lg font-black">{teamAScore}</div>
                </div>

                <div className="text-sm font-black text-white/15">:</div>

                <div className="text-center">
                  <div className="text-[7px] font-bold uppercase tracking-wider text-white/25">
                    Team B
                  </div>
                  <div className="text-lg font-black">{teamBScore}</div>
                </div>
              </div>
            </div>

            {/* LETZTE AKTIONEN */}

            <div className="shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
              <div className="mb-1 text-[7px] font-black uppercase tracking-[0.18em] text-white/30">
                Letzte Aktionen
              </div>

              <div className="space-y-1">
                {events.length === 0 ? (
                  <div className="text-[9px] text-white/20">Noch keine Aktionen.</div>
                ) : (
                  events
                    .slice()
                    .reverse()
                    .slice(0, 4)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between gap-1 rounded-md bg-white/[0.025] px-1.5 py-1"
                      >
                        <span className="truncate text-[9px] font-bold text-white">
                          {event.playerName}
                        </span>

                        <span className="shrink-0 text-[8px] text-white/20">{event.timestamp}</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TEAM-PANELS */}

        {(["A", "B"] as const).map((team) => (
          <div key={team} className="shrink-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`text-[9px] font-black uppercase tracking-[0.15em] ${
                  team === "A" ? "text-cyan-400" : "text-fuchsia-400"
                }`}
              >
                Team {team}
              </div>

              {startingTeam && turnState.activeTeam === team && extraOwed === 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.15em] ${
                    team === "A"
                      ? "bg-cyan-400/10 text-cyan-300"
                      : "bg-fuchsia-400/10 text-fuchsia-300"
                  }`}
                >
                  Am Zug
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111419] p-2.5">
              {players
                .filter((player) => player.team === team)
                .map((player, index) => {
                  const hitRate =
                    player.throws > 0 ? Math.round((player.hits / player.throws) * 100) : 0;

                  const playerDisabled = !canPlayerAct(player);

                  return (
                    <div
                      key={player.id}
                      className={`transition-opacity ${
                        playerDisabled ? "opacity-45" : "opacity-100"
                      } ${index > 0 ? "mt-2 border-t border-white/[0.06] pt-2" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-black ${
                              team === "A"
                                ? "bg-cyan-400/10 text-cyan-400"
                                : "bg-fuchsia-400/10 text-fuchsia-400"
                            }`}
                          >
                            {player.initials}
                          </div>

                          <span className="truncate text-[11px] font-black uppercase tracking-tight text-white">
                            {player.name}
                          </span>
                        </div>

                        <span className="shrink-0 text-[10px] font-black text-white">
                          {hitRate}%
                        </span>
                      </div>

                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMiss(player)}
                          disabled={playerDisabled}
                          className="min-h-7 rounded-lg border border-white/[0.08] bg-white/[0.025] text-[9px] font-black uppercase tracking-[0.1em] text-white/50 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Daneben
                        </button>

                        <button
                          type="button"
                          onClick={() => handleHit(player)}
                          disabled={playerDisabled}
                          className="min-h-7 rounded-lg bg-cyan-400 text-[9px] font-black uppercase tracking-[0.1em] text-black transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cyan-400/30"
                        >
                          Getroffen
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {/* UNDO */}

        <div className="flex shrink-0 justify-center pt-0.5">
          <button
            type="button"
            disabled={!lastEvent}
            onClick={handleUndo}
            className="rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
          >
            ↶ Rückgängig
          </button>
        </div>
      </div>

      {/* DESKTOP (ab lg) */}

      <div
        className="
          mx-auto
          hidden
          w-full
          max-w-7xl
          grid-cols-1
          gap-4
          px-5
          py-4
          lg:grid
          lg:flex-1
          lg:min-h-0
          lg:grid-cols-[1fr_minmax(0,540px)_1fr]
          lg:gap-6
        "
      >
        {/* LINKS: TEAM A */}

        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.2em]
                text-cyan-400
              "
            >
              Team A
            </div>

            {startingTeam && turnState.activeTeam === "A" && extraOwed === 0 && (
              <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300">
                Am Zug
              </span>
            )}
          </div>

          <div className="shrink-0 space-y-2">
            {players
              .filter((player) => player.team === "A")
              .map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onHit={handleHit}
                  onMiss={handleMiss}
                  disabled={!canPlayerAct(player)}
                />
              ))}
          </div>

          {/* MATCH STATISTIK TEAM A */}

          <div
            className="
              shrink-0
              rounded-2xl
              border
              border-white/[0.06]
              bg-white/[0.02]
              p-4
            "
          >
            <div
              className="
                mb-3
                text-[9px]
                font-black
                uppercase
                tracking-[0.18em]
                text-white/30
              "
            >
              Match Statistik
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-black">{teamStats.A.throwsCount}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/25">Würfe</div>
              </div>

              <div>
                <div className="text-lg font-black">{teamStats.A.hitsCount}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/25">Treffer</div>
              </div>

              <div>
                <div className="text-lg font-black">{teamStats.A.opponentCupsRemaining}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/25">Becher</div>
              </div>
            </div>
          </div>

          {/* LETZTE AKTIONEN */}

          <div
            className="
              flex
              flex-col
              rounded-2xl
              border
              border-white/[0.06]
              bg-white/[0.02]
              p-4
              lg:min-h-0
              lg:flex-1
            "
          >
            <div
              className="
                mb-2
                shrink-0
                text-[9px]
                font-black
                uppercase
                tracking-[0.18em]
                text-white/30
              "
            >
              Letzte Aktionen
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              {events.length === 0 ? (
                <div className="text-xs text-white/20">Noch keine Aktionen.</div>
              ) : (
                events
                  .slice()
                  .reverse()
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.025] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white">{event.playerName}</span>

                        <span className="ml-2 text-[10px] text-white/30">
                          {event.type === "miss"
                            ? "Daneben"
                            : event.shotType === "single"
                              ? "Einzeltreffer"
                              : event.shotType === "bounce"
                                ? "Aufhüpfen"
                                : event.shotType === "trickshot"
                                  ? "Trickshot"
                                  : "Extra Treffer"}
                        </span>
                      </div>

                      <span className="shrink-0 text-[9px] text-white/20">{event.timestamp}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* MITTE: SPIELFELD */}

        <div className="order-first flex min-h-0 items-center justify-center lg:order-none">
          <BeerPongTable
            teamACups={teamACups}
            teamBCups={teamBCups}
            teamACupSlots={teamACupSlots}
            teamBCupSlots={teamBCupSlots}
            selectable={false}
            pendingCupIds={[...pendingCupIdsForTeamA, ...pendingCupIdsForTeamB]}
          />
        </div>

        {/* RECHTS: TEAM B */}

        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.2em]
                text-fuchsia-400
              "
            >
              Team B
            </div>

            {startingTeam && turnState.activeTeam === "B" && extraOwed === 0 && (
              <span className="rounded-full bg-fuchsia-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-fuchsia-300">
                Am Zug
              </span>
            )}
          </div>

          <div className="shrink-0 space-y-2">
            {players
              .filter((player) => player.team === "B")
              .map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onHit={handleHit}
                  onMiss={handleMiss}
                  disabled={!canPlayerAct(player)}
                />
              ))}
          </div>

          {/* MATCH STATISTIK TEAM B */}

          <div
            className="
              shrink-0
              rounded-2xl
              border
              border-white/[0.06]
              bg-white/[0.02]
              p-4
            "
          >
            <div
              className="
                mb-3
                text-[9px]
                font-black
                uppercase
                tracking-[0.18em]
                text-white/30
              "
            >
              Match Statistik
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-black">{teamStats.B.throwsCount}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/25">Würfe</div>
              </div>

              <div>
                <div className="text-lg font-black">{teamStats.B.hitsCount}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/25">Treffer</div>
              </div>

              <div>
                <div className="text-lg font-black">{teamStats.B.opponentCupsRemaining}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/25">Becher</div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1" />

          {/* SCORE */}

          <div className="flex shrink-0 items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-white/25">
                Team A
              </div>
              <div className="text-3xl font-black">{teamAScore}</div>
            </div>

            <div className="text-lg font-black text-white/15">:</div>

            <div className="text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-white/25">
                Team B
              </div>
              <div className="text-3xl font-black">{teamBScore}</div>
            </div>
          </div>

          {/* UNDO */}

          <div className="flex shrink-0 justify-center">
            <button
              type="button"
              disabled={!lastEvent}
              onClick={handleUndo}
              className="
                rounded-full
                border
                border-white/[0.08]
                bg-white/[0.025]
                px-5
                py-2.5
                text-[10px]
                font-black
                uppercase
                tracking-[0.15em]
                text-white/40
                transition
                hover:bg-white/[0.06]
                hover:text-white
                disabled:cursor-not-allowed
                disabled:opacity-20
              "
            >
              ↶ Rückgängig
            </button>
          </div>
        </div>
      </div>

      {/* HIT OVERLAY (normaler Treffer) */}

      {showHitOverlay && selectedPlayer && (
        <HitOverlay
          playerName={selectedPlayer.name}
          playerTeam={selectedPlayer.team}
          teamACups={teamACups}
          teamBCups={teamBCups}
          teamACupSlots={teamACupSlots}
          teamBCupSlots={teamBCupSlots}
          onClose={() => {
            setShowHitOverlay(false);

            setSelectedPlayer(null);
          }}
          onSave={handleSaveHit}
        />
      )}

      {/* EXTRA-TREFFER-OVERLAY (Bonus-Becher nach Rundenauflösung) */}

      {extraOwed > 0 && extraTeam && (
        <HitOverlay
          playerName={extraPlayerName}
          playerTeam={extraTeam}
          teamACups={teamACups}
          teamBCups={teamBCups}
          teamACupSlots={teamACupSlots}
          teamBCupSlots={teamBCupSlots}
          defaultShotType="extra"
          requiredCupCount={extraOwed}
          onClose={() => {
            /*
             * Bewusst kein "Abbrechen" im Overlay selbst (siehe
             * HitOverlay.tsx) - über das X lässt sich der Anspruch
             * trotzdem verwerfen, falls z. B. die Hausregel im
             * Einzelfall doch nicht greifen soll.
             */
            setExtraOwed(0);
            setExtraTeam(null);
          }}
          onSave={handleSaveExtraTreffer}
        />
      )}

      {/* START-OVERLAY: WER BEGINNT? */}

      {!startingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0c0f16] p-6 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
              Vor dem Anwurf
            </div>

            <h2 className="mt-1 text-lg font-black uppercase">Wer beginnt?</h2>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setStartingTeam("A")}
                className="w-full rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-black uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-400/20"
              >
                Team A
              </button>

              <button
                type="button"
                onClick={() => setStartingTeam("B")}
                className="w-full rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-black uppercase tracking-wider text-fuchsia-300 transition hover:bg-fuchsia-400/20"
              >
                Team B
              </button>

              <button
                type="button"
                onClick={() => setStartingTeam(Math.random() < 0.5 ? "A" : "B")}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
              >
                Zufällig entscheiden
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
