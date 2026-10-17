"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import BeerPongTable, {
  Cup,
  getFormationTier,
  useCupSlotAssignment,
} from "@/components/stats/match/BeerPongTable";

import PlayerCard, { MatchPlayer } from "@/components/stats/match/PlayerCard";

import PlayerSetup from "@/components/stats/match/PlayerSetup";

import HitOverlay, { ShotType } from "@/components/stats/match/HitOverlay";

import { getShooterViewSlot } from "../matchLogic";
import type { MatchAction, MatchState, RecordedFormation } from "../matchLogic";
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

      /*
       * Formation und Platz des getroffenen Bechers im Moment des
       * Wurfs (aus Sicht des Werfers) - für die Positions-Statistik,
       * siehe matchLogic.ts (RecordedFormation). Extra-Treffer haben
       * das nicht (kein echter Wurf).
       */
      formation?: RecordedFormation;

      hitSlots?: number[];

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
 * --------------------------------------------------------------------------
 * | ENDPHASE ("LETZTE CHANCE") UND VERLÄNGERUNG
 * --------------------------------------------------------------------------
 *
 * Fällt der letzte Becher eines Teams, endet das Match NICHT sofort:
 * - Das Team ohne Becher wirft noch auf die restlichen Becher des
 *   anderen Teams (Endphase / "redemption").
 * - Hat das Gewinnerteam noch REDEMPTION_FULL_ROUND_MIN_CUPS oder mehr
 *   Becher, werfen alle Spieler, sonst nur ein Spieler (frei wählbar).
 * - Treffen alle Werfer der Runde, wird noch einmal geworfen (Anzahl
 *   Werfer dann neu nach den dann noch stehenden Bechern). Sonst ist
 *   das Match vorbei, das Gewinnerteam gewinnt - die Treffer der
 *   Endphase haben dessen Becher aber schon reduziert.
 * - Trifft das Verliererteam ALLE restlichen Becher: Verlängerung
 *   mit je OVERTIME_CUP_COUNT neuen Bechern pro Team.
 * --------------------------------------------------------------------------
 */

const OVERTIME_CUP_COUNT = 3;
const REDEMPTION_FULL_ROUND_MIN_CUPS = 3;

/*
 * --------------------------------------------------------------------------
 * | 1 GEGEN 1: ZWEI WÜRFE PRO RUNDE
 * --------------------------------------------------------------------------
 *
 * Eine Runde heißt "2 Bälle, 2 Würfe pro Team". Ein Team aus zwei
 * Spielern wirft also zweimal - ein einzelner Spieler (1 gegen 1) bekommt
 * deshalb beide Bälle und damit 2 Würfe pro Runde.
 *
 * Alles andere bleibt wie gehabt: Treffen alle Würfe der Runde, ist
 * dasselbe Team noch einmal dran; sonst wechselt das Team. Die Endphase
 * gilt entsprechend (ab REDEMPTION_FULL_ROUND_MIN_CUPS Bechern die volle
 * Runde, darunter nur ein Wurf).
 * --------------------------------------------------------------------------
 */

const SOLO_THROWS_PER_ROUND = 2;

type MatchPhase = { kind: "regular" } | { kind: "redemption"; winnerTeam: "A" | "B" };

type RedemptionThrow = { playerId: string; type: "hit" | "miss" };

type RoundCompletion = {
  activeTeam: "A" | "B";
  complete: boolean;
  /** Nur in der Endphase gesetzt: alle Würfe dieser Runde inkl. des aktuellen. */
  redemptionThrown: RedemptionThrow[] | null;
  allHit: boolean;
};

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
  const router = useRouter();

  /*
   * MATCH ABBRECHEN
   *
   * Beendet das Match ohne irgendetwas zu speichern: gespeichert wird
   * ausschließlich beim regulären Spielende (siehe useEffect mit
   * saveMatch weiter unten) - hier wird deshalb nichts in die
   * Statistik geschrieben, es geht einfach zurück ins Hauptmenü.
   *
   * Die Lobby wird trotzdem als beendet markiert: andere Geräte, die
   * über den QR-Code beigetreten sind, zeigen sonst dauerhaft "Match
   * läuft" an und kämen nie mehr raus.
   */

  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [aborting, setAborting] = useState(false);

  const handleAbort = async () => {
    if (aborting) {
      return;
    }

    setAborting(true);

    try {
      await finishMatchLobby(lobbyId);
    } catch (err) {
      console.error("Lobby konnte beim Abbrechen nicht beendet werden:", err);
    }

    router.push("/spieler");
  };

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
   * SPIELPHASE (siehe Kommentar zu ENDPHASE oben)
   *
   * - phase: normales Spiel oder Endphase
   * - finalWinner: erst gesetzt, wenn das Match WIRKLICH vorbei ist
   *   (nicht schon, wenn ein Team keine Becher mehr hat)
   * - redemptionRound / pendingRedemptionOutcome: wer in der laufenden
   *   Endphasen-Runde schon geworfen hat bzw. wie sie ausging, solange
   *   die Becher dazu noch abgerechnet werden
   * - turnEpochStart: ab welchem Ereignis die Rundenlogik zählt (nach
   *   einer Verlängerung beginnt sie bei null)
   * - undoFloor: davor gibt es kein "Rückgängig" mehr
   * - overtimeCount: wie viele Verlängerungen es schon gab (für
   *   eindeutige Becher-IDs)
   */

  const [phase, setPhase] = useState<MatchPhase>({ kind: "regular" });
  const [finalWinner, setFinalWinner] = useState<"A" | "B" | null>(null);
  const [redemptionRound, setRedemptionRound] = useState<RedemptionThrow[]>([]);
  const [pendingRedemptionOutcome, setPendingRedemptionOutcome] = useState<{
    allHit: boolean;
  } | null>(null);
  const [turnEpochStart, setTurnEpochStart] = useState(0);
  const [undoFloor, setUndoFloor] = useState(0);
  const [overtimeCount, setOvertimeCount] = useState(0);

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

  /*
   * Würfe pro Spieler und Runde: normal 1, bei 1 gegen 1 sind es 2
   * (siehe SOLO_THROWS_PER_ROUND).
   */

  const throwsPerPlayer =
    players.filter((player) => player.team === "A").length === 1 &&
    players.filter((player) => player.team === "B").length === 1
      ? SOLO_THROWS_PER_ROUND
      : 1;

  const turnState = useMemo(() => {
    const teamAPlayers = players.filter((player) => player.team === "A");
    const teamBPlayers = players.filter((player) => player.team === "B");

    let activeTeam: "A" | "B" = startingTeam ?? (teamAPlayers.length > 0 ? "A" : "B");

    /* Pro Spieler: die Würfe der laufenden Runde in Reihenfolge. */
    let roundActions = new Map<string, ("hit" | "miss")[]>();

    for (const event of events.slice(turnEpochStart)) {
      roundActions.set(event.playerId, [...(roundActions.get(event.playerId) ?? []), event.type]);

      const activeTeamPlayers = activeTeam === "A" ? teamAPlayers : teamBPlayers;

      const roundComplete =
        activeTeamPlayers.length > 0 &&
        activeTeamPlayers.every(
          (player) => (roundActions.get(player.id)?.length ?? 0) >= throwsPerPlayer,
        );

      if (roundComplete) {
        const allHits = activeTeamPlayers.every((player) =>
          (roundActions.get(player.id) ?? []).every((type) => type === "hit"),
        );

        if (!allHits) {
          const otherTeam = activeTeam === "A" ? "B" : "A";
          const otherTeamPlayers = otherTeam === "A" ? teamAPlayers : teamBPlayers;

          activeTeam = otherTeamPlayers.length > 0 ? otherTeam : activeTeam;
        }

        roundActions = new Map();
      }
    }

    /* Wie oft jeder Spieler in der laufenden Runde schon geworfen hat. */
    const throwCounts = new Map<string, number>(
      Array.from(roundActions.entries()).map(([playerId, types]) => [playerId, types.length]),
    );

    /* "Fertig" = sein Wurf-Kontingent in dieser Runde ist aufgebraucht. */
    const actedPlayerIds = new Set(
      Array.from(throwCounts.entries())
        .filter(([, count]) => count >= throwsPerPlayer)
        .map(([playerId]) => playerId),
    );

    return { activeTeam, actedPlayerIds, throwCounts };
  }, [events, players, startingTeam, turnEpochStart, throwsPerPlayer]);

  /*
   * ENDPHASE: wer wirft auf wen, und wie viele Spieler dürfen werfen?
   */

  const redemptionWinnerTeam = phase.kind === "redemption" ? phase.winnerTeam : null;
  const redemptionTeam: "A" | "B" | null =
    redemptionWinnerTeam === null ? null : redemptionWinnerTeam === "A" ? "B" : "A";

  const redemptionTargetRemaining = (redemptionWinnerTeam === "A" ? teamACups : teamBCups).filter(
    (cup) => !cup.hit,
  ).length;

  const redemptionPlayers = redemptionTeam
    ? players.filter((player) => player.team === redemptionTeam)
    : [];

  /*
   * Anzahl WÜRFE in der Endphasen-Runde (nicht Spieler): volle Runde =
   * jeder Spieler wirft sein Kontingent (bei 1 gegen 1 also 2 Würfe),
   * sonst genau ein Wurf eines frei gewählten Spielers.
   */
  const redemptionThrowsNeeded =
    redemptionTargetRemaining >= REDEMPTION_FULL_ROUND_MIN_CUPS
      ? redemptionPlayers.length * throwsPerPlayer
      : Math.min(1, redemptionPlayers.length);

  /*
   * Welches Team gerade "am Zug" ist (für die Anzeige): in der
   * Endphase das Team ohne Becher, sonst wie gehabt aus turnState.
   */
  const activeTeamForDisplay = redemptionTeam ?? turnState.activeTeam;

  /*
   * Hinweis "Wurf 1/2" neben "Am Zug" - nur, wenn die Runde mehrere
   * Würfe hat (1 gegen 1 bzw. volle Endphasen-Runde bei 1 gegen 1).
   */

  const getRoundThrowLabel = (team: "A" | "B"): string | null => {
    if (activeTeamForDisplay !== team) {
      return null;
    }

    if (phase.kind === "redemption") {
      return redemptionThrowsNeeded > 1
        ? `Wurf ${Math.min(redemptionRound.length + 1, redemptionThrowsNeeded)}/${redemptionThrowsNeeded}`
        : null;
    }

    if (throwsPerPlayer === 1) {
      return null;
    }

    const teamPlayers = players.filter((player) => player.team === team);
    const done = teamPlayers.reduce(
      (sum, player) => sum + (turnState.throwCounts.get(player.id) ?? 0),
      0,
    );
    const total = teamPlayers.length * throwsPerPlayer;

    return `Wurf ${Math.min(done + 1, total)}/${total}`;
  };

  const canPlayerAct = (player: MatchPlayer) => {
    if (startingTeam === null || extraOwed !== 0 || finalWinner !== null) {
      return false;
    }

    if (phase.kind === "redemption") {
      return (
        pendingRedemptionOutcome === null &&
        player.team === redemptionTeam &&
        redemptionRound.length < redemptionThrowsNeeded &&
        redemptionRound.filter((thrown) => thrown.playerId === player.id).length <
          (redemptionThrowsNeeded === 1 ? 1 : throwsPerPlayer)
      );
    }

    return player.team === turnState.activeTeam && !turnState.actedPlayerIds.has(player.id);
  };

  /*
   * RÜCKGÄNGIG: nur innerhalb der aktuellen Phase und nur, solange
   * nichts mehr abgerechnet wird. Eine bereits abgeschlossene
   * Endphasen-Runde bzw. ein Phasenwechsel lässt sich nicht mehr
   * zurückdrehen (die Abrechnung entfernt ggf. mehrere Becher, siehe
   * planRoundResolution - das wieder aufzudröseln ist nicht möglich).
   */

  const canUndo =
    lastEvent !== null &&
    finalWinner === null &&
    events.length > undoFloor &&
    extraOwed === 0 &&
    pendingRedemptionOutcome === null &&
    (phase.kind === "regular" || redemptionRound.length > 0);

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
          formation: event.formation,
          hitSlots: event.hitSlots,
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

    return {
      players,
      teamACups,
      teamBCups,
      currentPlayerId: selectedPlayer?.id ?? null,
      pendingAction: null,
      actions,
      previousState: null,
      winner: finalWinner,
      isFinished: finalWinner !== null,
    };
  }, [
    events,
    players,
    selectedPlayer,
    teamACups,
    teamBCups,
    pendingCupIdsForTeamA,
    pendingCupIdsForTeamB,
    finalWinner,
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
   * haben (siehe describeRoundAfter in handleMiss/handleSaveHit). Bis
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

  /*
   * PHASENWECHSEL
   */

  const enterRedemption = (winnerTeam: "A" | "B") => {
    setPhase({ kind: "redemption", winnerTeam });
    setRedemptionRound([]);
    setPendingRedemptionOutcome(null);
    setUndoFloor(events.length);
  };

  /*
   * Verlängerung: beide Teams bekommen neue Becher. Die alten bleiben
   * als "getroffen" im Array (ihre IDs stehen in den gespeicherten
   * Aktionen), die neuen bekommen fortlaufende, eindeutige IDs - sonst
   * ließen sich Treffer der Verlängerung später nicht mehr von denen
   * des regulären Spiels unterscheiden. Wer beginnt, wird wie zu
   * Spielbeginn über das "Wer beginnt?"-Overlay gewählt.
   */

  const startOvertime = () => {
    const firstId = 10 + overtimeCount * OVERTIME_CUP_COUNT;

    const createOvertimeCups = (): Cup[] =>
      Array.from({ length: OVERTIME_CUP_COUNT }, (_, index) => ({
        id: firstId + index + 1,
        hit: false,
      }));

    setTeamACups((current) => [...current, ...createOvertimeCups()]);
    setTeamBCups((current) => [...current, ...createOvertimeCups()]);

    setOvertimeCount((current) => current + 1);
    setPhase({ kind: "regular" });
    setRedemptionRound([]);
    setPendingRedemptionOutcome(null);
    setTurnEpochStart(events.length);
    setUndoFloor(events.length);
    setStartingTeam(null);
  };

  /*
   * SPIELENDE PRÜFEN
   *
   * Läuft erst, wenn nichts mehr abgerechnet wird (keine offene Runde,
   * keine offenen Bonus-Becher) und entscheidet dann, wie es
   * weitergeht:
   * - normales Spiel: hat ein Team keine Becher mehr -> Endphase
   * - Endphase: Runde zu Ende -> Verlängerung (alle Becher getroffen),
   *   nochmal werfen (alle Werfer trafen) oder Match vorbei
   */

  useEffect(() => {
    if (!setupDone || finalWinner !== null) {
      return;
    }

    if (extraOwed > 0 || roundHits.length > 0) {
      return;
    }

    const teamARemaining = teamACups.filter((cup) => !cup.hit).length;
    const teamBRemaining = teamBCups.filter((cup) => !cup.hit).length;

    if (phase.kind === "regular") {
      if (teamBRemaining === 0 && teamARemaining > 0) {
        enterRedemption("A");
      } else if (teamARemaining === 0 && teamBRemaining > 0) {
        enterRedemption("B");
      }

      return;
    }

    if (!pendingRedemptionOutcome) {
      return;
    }

    const winnerRemaining = phase.winnerTeam === "A" ? teamARemaining : teamBRemaining;

    if (winnerRemaining === 0) {
      startOvertime();
      return;
    }

    if (pendingRedemptionOutcome.allHit) {
      setRedemptionRound([]);
      setPendingRedemptionOutcome(null);
      return;
    }

    setFinalWinner(phase.winnerTeam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    setupDone,
    finalWinner,
    extraOwed,
    roundHits,
    teamACups,
    teamBCups,
    phase,
    pendingRedemptionOutcome,
  ]);

  /*
   * Ist die Runde mit diesem Wurf komplett? Normales Spiel: alle
   * Spieler des aktiven Teams haben geworfen. Endphase: so viele
   * Würfe wie erlaubt (siehe redemptionThrowsNeeded) geworfen wurden.
   */

  const describeRoundAfter = (player: MatchPlayer, type: "hit" | "miss"): RoundCompletion => {
    if (phase.kind === "redemption" && redemptionTeam) {
      const thrown = [...redemptionRound, { playerId: player.id, type }];

      return {
        activeTeam: redemptionTeam,
        complete: thrown.length >= redemptionThrowsNeeded,
        redemptionThrown: thrown,
        allHit: thrown.every((item) => item.type === "hit"),
      };
    }

    const activeTeamPlayers = players.filter((item) => item.team === turnState.activeTeam);

    /* Würfe der laufenden Runde INKL. des Wurfs, der gerade passiert. */
    const throwsAfter = (item: MatchPlayer) =>
      (turnState.throwCounts.get(item.id) ?? 0) + (item.id === player.id ? 1 : 0);

    return {
      activeTeam: turnState.activeTeam,
      complete: activeTeamPlayers.every((item) => throwsAfter(item) >= throwsPerPlayer),
      redemptionThrown: null,
      allHit: false,
    };
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
     * Prüfen, ob DIESE Aktion die Runde komplett macht - BEVOR das
     * Event hinzugefügt wird (turnState bzw. redemptionRound spiegeln
     * den Stand VOR dieser Aktion wider).
     */
    const round = describeRoundAfter(player, "miss");

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

    if (round.redemptionThrown) {
      setRedemptionRound(round.redemptionThrown);
    }

    if (round.complete) {
      if (round.redemptionThrown) {
        setPendingRedemptionOutcome({ allHit: round.allHit });
      }

      resolveRound(roundHits, round.activeTeam);
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

    /*
     * BECHERPOSITION FESTHALTEN
     *
     * Jetzt, im Moment des Wurfs, ist die Formation noch die, auf die
     * geworfen wurde (getroffene Becher werden erst am Rundenende
     * abgerechnet). Später ließe sich das nicht mehr sauber
     * rekonstruieren, weil nach einem Re-Rack neu angeordnet wird.
     */

    const targetCups = selectedPlayer.team === "A" ? teamBCups : teamACups;
    const targetSlots = selectedPlayer.team === "A" ? teamBCupSlots : teamACupSlots;
    const targetTier = getFormationTier(targetCups.filter((cup) => !cup.hit).length);

    const recordedFormation: RecordedFormation | undefined =
      targetTier === "ten" || targetTier === "six" || targetTier === "three"
        ? targetTier
        : undefined;

    const recordedSlots = recordedFormation
      ? cupIds
          .map((cupId) => targetSlots[cupId])
          .filter((slot): slot is number => slot !== undefined)
          .map((slot) => getShooterViewSlot(slot, recordedFormation, selectedPlayer.team))
      : [];

    const event: MatchEvent = {
      id: crypto.randomUUID(),

      playerId: selectedPlayer.id,

      playerName: selectedPlayer.name,

      type: "hit",

      shooterTeam: selectedPlayer.team,

      shotType,

      cupIds,

      formation: recordedFormation,

      hitSlots: recordedSlots.length > 0 ? recordedSlots : undefined,

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

    const round = describeRoundAfter(selectedPlayer, "hit");

    const newRoundHit: RoundHit = {
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      shooterTeam: selectedPlayer.team,
      cupIds,
      shotType,
    };

    if (round.redemptionThrown) {
      setRedemptionRound(round.redemptionThrown);
    }

    if (round.complete) {
      if (round.redemptionThrown) {
        setPendingRedemptionOutcome({ allHit: round.allHit });
      }

      /*
       * Direkt mit der vollständigen Liste auflösen, statt erst über
       * setRoundHits zu gehen und auf den nächsten Render zu warten -
       * roundHits (State) hätte an dieser Stelle im selben Tick noch
       * nicht den neuen Eintrag.
       */
      resolveRound([...roundHits, newRoundHit], round.activeTeam);
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
    if (!lastEvent || !canUndo) {
      return;
    }

    const stillPending = roundHits.some(
      (hit) =>
        hit.playerId === lastEvent.playerId &&
        hit.cupIds.join(",") === (lastEvent.type === "hit" ? lastEvent.cupIds.join(",") : ""),
    );

    setEvents((current) => current.slice(0, -1));

    if (phase.kind === "redemption") {
      setRedemptionRound((current) => current.slice(0, -1));
    }

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
      setRoundHits((current) => {
        /*
         * Nur EINEN Eintrag entfernen (den letzten passenden): Bei 1 gegen
         * 1 kann derselbe Spieler in einer Runde zweimal denselben Becher
         * treffen - ein filter() würde dann beide vormerken-Einträge
         * löschen, obwohl nur ein Wurf zurückgenommen wird.
         */
        let removeIndex = -1;

        current.forEach((hit, index) => {
          if (
            hit.playerId === lastEvent.playerId &&
            hit.cupIds.join(",") === lastEvent.cupIds.join(",")
          ) {
            removeIndex = index;
          }
        });

        return removeIndex === -1 ? current : current.filter((_, index) => index !== removeIndex);
      });

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

          <div className="flex items-center gap-4">
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

            <button
              type="button"
              onClick={() => setShowAbortConfirm(true)}
              className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-300 transition hover:bg-red-400/20"
            >
              Abbruch
            </button>
          </div>
        </div>
      </header>

      {/* ENDPHASE-HINWEIS */}

      {phase.kind === "redemption" && redemptionTeam && finalWinner === null && (
        <div className="shrink-0 border-b border-yellow-400/20 bg-yellow-400/[0.07] px-5 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-yellow-300 lg:text-xs">
          Endphase · Team {redemptionTeam} wirft auf die letzten {redemptionTargetRemaining} Becher
          von Team {redemptionWinnerTeam} · {redemptionRound.length}/{redemptionThrowsNeeded}{" "}
          geworfen
        </div>
      )}

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

              {startingTeam && activeTeamForDisplay === team && extraOwed === 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.15em] ${
                    team === "A"
                      ? "bg-cyan-400/10 text-cyan-300"
                      : "bg-fuchsia-400/10 text-fuchsia-300"
                  }`}
                >
                  Am Zug
                  {getRoundThrowLabel(team) ? ` · ${getRoundThrowLabel(team)}` : ""}
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

        <div className="flex shrink-0 justify-center">
          <button
            type="button"
            disabled={!canUndo}
            onClick={handleUndo}
            className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-yellow-300 transition hover:bg-yellow-400/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-white/20"
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

            {startingTeam && activeTeamForDisplay === "A" && extraOwed === 0 && (
              <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300">
                Am Zug
                {getRoundThrowLabel("A") ? ` · ${getRoundThrowLabel("A")}` : ""}
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

            {startingTeam && activeTeamForDisplay === "B" && extraOwed === 0 && (
              <span className="rounded-full bg-fuchsia-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-fuchsia-300">
                Am Zug
                {getRoundThrowLabel("B") ? ` · ${getRoundThrowLabel("B")}` : ""}
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
              disabled={!canUndo}
              onClick={handleUndo}
              className="
                w-full
                rounded-xl
                border
                border-yellow-400/40
                bg-yellow-400/10
                px-6
                py-3.5
                text-xs
                font-black
                uppercase
                tracking-[0.15em]
                text-yellow-300
                transition
                hover:bg-yellow-400/20
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:border-white/[0.06]
                disabled:bg-white/[0.02]
                disabled:text-white/20
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
              {overtimeCount > 0 ? "Verlängerung" : "Vor dem Anwurf"}
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

            <button
              type="button"
              onClick={() => setShowAbortConfirm(true)}
              className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-white/25 transition hover:text-red-300"
            >
              Match abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ABBRUCH BESTÄTIGEN - liegt über allem anderen, auch über dem Start-Overlay */}

      {showAbortConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0c0f16] p-6 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
              Achtung
            </div>

            <h2 className="mt-1 text-lg font-black uppercase text-white">Match abbrechen?</h2>

            <p className="mt-2 text-xs text-white/40">
              Das Match wird beendet und es werden keine Statistiken gespeichert. Du kommst zurück
              ins Hauptmenü.
            </p>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={aborting}
                onClick={handleAbort}
                className="w-full rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {aborting ? "Wird abgebrochen …" : "Ja, abbrechen"}
              </button>

              <button
                type="button"
                disabled={aborting}
                onClick={() => setShowAbortConfirm(false)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Weiterspielen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
