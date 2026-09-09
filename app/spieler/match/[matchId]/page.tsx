"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

import BeerPongTable, { Cup } from "@/components/stats/match/BeerPongTable";

import PlayerCard, { MatchPlayer } from "@/components/stats/match/PlayerCard";

import PlayerSetup from "@/components/stats/match/PlayerSetup";

import HitOverlay, { ShotType } from "@/components/stats/match/HitOverlay";

import type { MatchAction, MatchState } from "../matchLogic";
import { getMatchStats } from "../matchStats";
import MatchResult from "@/components/stats/match/MatchResult";
import { saveMatch } from "../matchStorage";
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
   * AKTIONEN
   */

  const [events, setEvents] = useState<MatchEvent[]>([]);

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
   *
   * null = noch nicht gewählt -> das Start-Overlay wird angezeigt
   * und blockiert alle Spieler-Aktionen, bis eine Wahl getroffen wurde.
   */

  const [startingTeam, setStartingTeam] = useState<"A" | "B" | null>(null);

  /*
   * SPEICHERFEHLER
   *
   * null = kein Fehler. Wird gesetzt, wenn saveMatch beim Matchende
   * fehlschlägt, damit das nicht stillschweigend im Hintergrund
   * verschwindet (siehe useEffect unten).
   */

  const [saveError, setSaveError] = useState<string | null>(null);

  /*
   * LETZTE AKTION
   */

  const lastEvent = events[events.length - 1] ?? null;

  /*
   * TEAM A SCORE
   *
   * Zählt jeden getroffenen Becher (cupIds.length), nicht nur die
   * Anzahl der Treffer-Aktionen – ein Bounce/Trickshot, der 2 Becher
   * auf einmal trifft, zählt also auch 2 Punkte statt 1.
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
   *
   * Gleiche Logik wie teamAScore: zählt Becher, nicht Aktionen.
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
   *
   * Wird bewusst NICHT als eigener useState geführt, sondern rein aus
   * den vorhandenen `events` berechnet – genau wie teamAScore/teamBScore
   * oben. Vorteil: "Rückgängig" muss diese Logik nicht extra zurückdrehen,
   * sie ergibt sich nach dem Entfernen des letzten Events automatisch neu.
   *
   * Regel: Ein Team ist "fertig", sobald jeder seiner Spieler in der
   * aktuellen Runde eine Aktion (Treffer oder Daneben) abgeschlossen hat.
   * Danach ist grundsätzlich das andere Team dran – AUSSER das ganze
   * Team hat in dieser Runde nur Treffer erzielt (keinen einzigen Wurf
   * daneben): dann bleibt dasselbe Team am Zug und bekommt eine neue
   * Runde. Innerhalb eines Teams gibt es weiterhin keine feste
   * Reihenfolge.
   */

  const turnState = useMemo(() => {
    const teamAPlayers = players.filter((player) => player.team === "A");
    const teamBPlayers = players.filter((player) => player.team === "B");

    let activeTeam: "A" | "B" = startingTeam ?? (teamAPlayers.length > 0 ? "A" : "B");

    /*
     * Map statt Set: wir müssen am Rundenende nicht nur wissen, WER
     * schon gehandelt hat, sondern auch OB es ein Treffer oder ein
     * Daneben war.
     */
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

          /*
           * Falls das andere Team (noch) keine Spieler hat, bleibt das
           * aktuelle Team am Zug, statt in eine Sackgasse zu laufen.
           */
          activeTeam = otherTeamPlayers.length > 0 ? otherTeam : activeTeam;
        }

        /*
         * Bei allHits === true bleibt activeTeam unverändert – das
         * Team bekommt die Bälle zurück und ist gleich nochmal dran.
         */

        roundActions = new Map();
      }
    }

    const actedPlayerIds = new Set(roundActions.keys());

    return { activeTeam, actedPlayerIds };
  }, [events, players, startingTeam]);

  /*
   * DARF DIESER SPIELER GERADE HANDELN?
   *
   * false, wenn sein Team nicht am Zug ist ODER er in der aktuellen
   * Runde schon eine Aktion abgeschlossen hat.
   */
  const canPlayerAct = (player: MatchPlayer) =>
    startingTeam !== null &&
    player.team === turnState.activeTeam &&
    !turnState.actedPlayerIds.has(player.id);

  /*
   * MATCH STATISTIK PRO TEAM
   *
   * Würfe/Treffer beziehen sich auf das jeweilige Team selbst,
   * "Becher" zeigt die verbleibenden GEGNERISCHEN Becher – also
   * das, was dieses Team noch treffen muss, um zu gewinnen.
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

    saveMatch(matchState).catch((error) => {
      console.error("Match konnte nicht gespeichert werden:", error);

      /*
       * Ref zurücksetzen, damit ein Retry-Klick (siehe handleRetrySave)
       * tatsächlich einen neuen Speicherversuch auslösen kann, statt
       * durch den "schon versucht"-Guard blockiert zu werden.
       */
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

  const handleHit = (player: MatchPlayer) => {
    /*
     * Nicht am Zug oder in dieser Runde schon aktiv gewesen –
     * kein Overlay öffnen.
     */
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
    /*
     * Nicht am Zug oder in dieser Runde schon aktiv gewesen –
     * Klick ignorieren.
     */
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

    setEvents((current) => [...current, event]);

    /*
     * Wurfzähler erhöhen
     */

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

    /*
     * Event erzeugen
     */

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

    /*
     * Event speichern
     */

    setEvents((current) => [...current, event]);

    /*
     * Spielerstatistik
     */

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

    /*
     * Welches Team verliert
     * seine Becher?
     */

    const opponentTeam = selectedPlayer.team === "A" ? "B" : "A";

    /*
     * Team A Becher entfernen
     */

    if (opponentTeam === "A") {
      setTeamACups((current) =>
        current.map((cup) =>
          cupIds.includes(cup.id)
            ? {
                ...cup,

                hit: true,
              }
            : cup,
        ),
      );
    }

    /*
     * Team B Becher entfernen
     */

    if (opponentTeam === "B") {
      setTeamBCups((current) =>
        current.map((cup) =>
          cupIds.includes(cup.id)
            ? {
                ...cup,

                hit: true,
              }
            : cup,
        ),
      );
    }

    /*
     * Overlay schließen
     */

    setShowHitOverlay(false);

    setSelectedPlayer(null);
  };

  /*
   * LETZTE AKTION RÜCKGÄNGIG
   */

  const handleUndo = () => {
    if (!lastEvent) {
      return;
    }

    /*
     * Event entfernen
     */

    setEvents((current) => current.slice(0, -1));

    /*
     * Spielerstatistik
     * zurücksetzen
     */

    setPlayers((current) =>
      current.map((player) => {
        if (player.id !== lastEvent.playerId) {
          return player;
        }

        /*
         * Daneben
         */

        if (lastEvent.type === "miss") {
          return {
            ...player,

            throws: Math.max(0, player.throws - 1),
          };
        }

        /*
         * Treffer
         */

        return {
          ...player,

          throws: Math.max(0, player.throws - 1),

          hits: Math.max(0, player.hits - 1),
        };
      }),
    );

    /*
     * Getroffene Becher
     * wieder herstellen
     */

    if (lastEvent.type === "hit") {
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

    /*
     * Wer am Zug ist, muss hier NICHT manuell zurückgedreht werden –
     * turnState wird oben direkt aus `events` neu berechnet, sobald
     * das Event entfernt ist.
     */
  };

  /*
   * SPIELER-LOBBY
   *
   * Solange die Lobby nicht auf "live" steht, zeigen wir die
   * Beitritts-Ansicht statt des Matches selbst.
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

  /*
   * LAYOUT-HINWEIS
   *
   * Feste Bildschirmhöhe (h-dvh), kein Seiten-Scroll. Drei Spalten:
   * Team A links (Spieler + eigene Match Statistik + Letzte Aktionen,
   * füllt Restplatz), Spielfeld mittig, Team B rechts (Spieler +
   * eigene Match Statistik + Score + Undo unten). Einzelne Boxen
   * scrollen bei Bedarf intern, der Rahmen bleibt fix.
   */

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

      {/* CONTENT - 3 Spalten, füllt die restliche Bildschirmhöhe */}

      <div
        className="
          mx-auto
          grid
          w-full
          max-w-7xl
          flex-1
          min-h-0
          grid-cols-1
          gap-4
          px-5
          py-4
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

            {startingTeam && turnState.activeTeam === "A" && (
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

          {/* LETZTE AKTIONEN - füllt den Rest der Spalte */}

          <div
            className="
              flex
              min-h-0
              flex-1
              flex-col
              rounded-2xl
              border
              border-white/[0.06]
              bg-white/[0.02]
              p-4
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

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
                                : "Trickshot"}
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
          <BeerPongTable teamACups={teamACups} teamBCups={teamBCups} selectable={false} />
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

            {startingTeam && turnState.activeTeam === "B" && (
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

          {/* Füllt den Rest der Spalte, damit Score + Undo unten sitzen */}

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

      {/* HIT OVERLAY */}

      {showHitOverlay && selectedPlayer && (
        <HitOverlay
          playerName={selectedPlayer.name}
          playerTeam={selectedPlayer.team}
          teamACups={teamACups}
          teamBCups={teamBCups}
          onClose={() => {
            setShowHitOverlay(false);

            setSelectedPlayer(null);
          }}
          onSave={handleSaveHit}
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
