"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

import BeerPongTable, { Cup, useCupSlotAssignment } from "@/components/stats/match/BeerPongTable";

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
 * Becher treffen (siehe detectExtraEntitlements unten).
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
 * | EXTRA-TREFFER-ANSPRÜCHE ERMITTELN
 * --------------------------------------------------------------------------
 *
 * Zwei Quellen für einen Bonus-Becher:
 * 1. Jeder Aufhüpfer-Treffer bringt automatisch +1 Extra-Anspruch
 *    (ein Aufhüpfer zählt also effektiv 2 Becher: den direkt
 *    ausgewählten + einen frei wählbaren extra).
 * 2. Treffen zwei verschiedene Spieler in derselben Runde denselben,
 *    noch stehenden Becher, gibt es ebenfalls +1 Extra-Anspruch.
 *
 * BEKANNTE VEREINFACHUNG: Für die Team-Punktzahl (teamAScore/
 * teamBScore weiter unten) wird weiterhin cupIds.length je Aktion
 * aufsummiert - trifft Fall 2 ein, zählt der doppelt getroffene
 * Becher dadurch kurzzeitig doppelt in der Punkteanzeige, obwohl nur
 * EIN physischer Becher davon betroffen ist. Für die tatsächliche
 * Becher-Entfernung vom Tisch (removeRoundCups weiter unten) wird
 * dagegen korrekt dedupliziert - der Fehler betrifft also nur die
 * Live-Punkteanzeige, nicht das Spielergebnis selbst.
 * --------------------------------------------------------------------------
 */

function detectExtraEntitlements(hits: RoundHit[]): number {
  let entitlements = 0;

  /*
   * Jeder Aufhüpfer-Treffer bringt automatisch +1 Extra-Anspruch -
   * der Tisch steht während der laufenden Runde noch unverändert,
   * der zweite Becher wird deshalb bewusst NICHT direkt im Overlay,
   * sondern erst hier, nach Rundenauflösung, frei gewählt (siehe
   * auch den Hinweis dazu in HitOverlay.tsx).
   */

  entitlements += hits.filter((hit) => hit.shotType === "bounce").length;

  const cupHitCount = new Map<number, number>();

  for (const hit of hits) {
    for (const cupId of hit.cupIds) {
      cupHitCount.set(cupId, (cupHitCount.get(cupId) ?? 0) + 1);
    }
  }

  for (const count of cupHitCount.values()) {
    if (count > 1) {
      entitlements += 1;
    }
  }

  return entitlements;
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
   * TEAM A SCORE
   */

  const teamAScore = useMemo(
    () =>
      events.reduce((total, event) => {
        if (event.type !== "hit") {
          return total;
        }

        const player = players.find((item) => item.id === event.playerId);

        if (player?.team !== "A") {
          return total;
        }

        return total + event.cupIds.length;
      }, 0),

    [events, players],
  );

  /*
   * TEAM B SCORE
   */

  const teamBScore = useMemo(
    () =>
      events.reduce((total, event) => {
        if (event.type !== "hit") {
          return total;
        }

        const player = players.find((item) => item.id === event.playerId);

        if (player?.team !== "B") {
          return total;
        }

        return total + event.cupIds.length;
      }, 0),

    [events, players],
  );

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

  const state = useMemo<MatchState>(() => {
    const actions: MatchAction[] = events.map((event) => {
      const player = players.find((item) => item.id === event.playerId);

      return {
        id: event.id,
        playerId: event.playerId,
        team: player?.team ?? "A",
        type: event.type,
        hitType: event.type === "hit" ? event.shotType : undefined,
        cupIds: event.type === "hit" ? event.cupIds : [],
        timestamp: event.timestampMs,
      };
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
  }, [events, players, selectedPlayer, teamACups, teamBCups]);

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
   * haben (siehe willCompleteRound in handleMiss/handleSaveHit). Erst
   * JETZT werden die in dieser Runde getroffenen Becher tatsächlich
   * vom Tisch entfernt (dedupliziert - ein zweimal "getroffener"
   * Becher verschwindet trotzdem nur einmal) - ein eventueller
   * Re-Rack passiert dadurch automatisch über den schon bestehenden
   * useCupSlotAssignment-Mechanismus, sobald sich die Becherzahl
   * tier-übergreifend ändert.
   *
   * Werden dabei Extra-Treffer-Ansprüche fällig (Aufhüpfer und/oder
   * zwei Spieler trafen denselben Becher), öffnet sich danach
   * automatisch das Treffer-Overlay im "Extra Treffer"-Modus, damit
   * die passende Anzahl Bonus-Becher ausgewählt werden kann - aus der
   * dann schon aktuellen (ggf. neu aufgestellten) Formation.
   */

  const resolveRound = (hitsThisRound: RoundHit[], activeTeamThisRound: "A" | "B") => {
    if (hitsThisRound.length === 0) {
      return;
    }

    const cupIdsForTeamA = Array.from(
      new Set(hitsThisRound.filter((hit) => hit.shooterTeam === "B").flatMap((hit) => hit.cupIds)),
    );

    const cupIdsForTeamB = Array.from(
      new Set(hitsThisRound.filter((hit) => hit.shooterTeam === "A").flatMap((hit) => hit.cupIds)),
    );

    if (cupIdsForTeamA.length > 0) {
      setTeamACups((current) =>
        current.map((cup) => (cupIdsForTeamA.includes(cup.id) ? { ...cup, hit: true } : cup)),
      );
    }

    if (cupIdsForTeamB.length > 0) {
      setTeamBCups((current) =>
        current.map((cup) => (cupIdsForTeamB.includes(cup.id) ? { ...cup, hit: true } : cup)),
      );
    }

    setRoundHits([]);

    const entitlements = detectExtraEntitlements(hitsThisRound);

    if (entitlements > 0) {
      setExtraOwed(entitlements);
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

    console.log("DEBUG handleSaveHit:", {
      selectedPlayerId: selectedPlayer.id,
      selectedPlayerName: selectedPlayer.name,
      activeTeam: turnState.activeTeam,
      activeTeamPlayerIds: activeTeamPlayers.map((item) => item.id),
      actedPlayerIds: Array.from(turnState.actedPlayerIds),
      willCompleteRound,
    });

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

    setExtraOwed((current) => Math.max(0, current - 1));
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
       * Bereits aufgelöst - Becher wie bisher direkt zurückholen.
       */
      const player = players.find((item) => item.id === lastEvent.playerId);

      if (player?.team === "A") {
        setTeamBCups((current) =>
          current.map((cup) =>
            lastEvent.cupIds.includes(cup.id)
              ? {
                  ...cup,

                  hit: false,
                }
              : cup,
          ),
        );
      }

      if (player?.team === "B") {
        setTeamACups((current) =>
          current.map((cup) =>
            lastEvent.cupIds.includes(cup.id)
              ? {
                  ...cup,

                  hit: false,
                }
              : cup,
          ),
        );
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
