"use client";

import { useEffect, useRef, useState } from "react";
import { PanelTitle } from "@/components/stats/PanelCard";
import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import { getAllPlayerOverallStats, type PlayerOverallStats } from "@/app/spieler/match/playerStats";

interface PlayerRankingProps {
  onSelectPlayer?: (player: PlayerOverallStats) => void;
}

const VISIBLE_LIMIT = 5;
const NEIGHBORS = 2;

function windowAround(index: number, total: number): [number, number] {
  const start = Math.max(0, index - NEIGHBORS);
  const end = Math.min(total, start + VISIBLE_LIMIT);

  return [Math.max(0, end - VISIBLE_LIMIT), end];
}

export default function PlayerRanking({ onSelectPlayer }: PlayerRankingProps) {
  const [players, setPlayers] = useState<PlayerOverallStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /*
   * ALLE ANZEIGEN
   *
   * Die Hauptansicht zeigt nur die ersten VISIBLE_LIMIT Spieler
   * (die Liste ist bereits nach Rang sortiert, siehe
   * getAllPlayerOverallStats()). Bei mehr Spielern gibt's darunter
   * einen Button, der die komplette Liste in einem Overlay öffnet.
   */

  const [showAll, setShowAll] = useState(false);

  /*
   * EIGENER PLATZ
   *
   * ownId = players-ID des angemeldeten Spielers (null: nicht angemeldet).
   * Er wird in der Liste markiert, und die Karte zeigt die Plätze um ihn herum.
   */

  const [ownId, setOwnId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    getOwnProfile()
      .then((profile) => {
        if (!cancelled) {
          setOwnId(profile?.id ?? null);
        }
      })
      .catch(() => {
        /* Ohne Profil bleibt es bei der normalen Top-Liste. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getAllPlayerOverallStats()
      .then((playerStats) => {
        if (!cancelled) {
          setPlayers(playerStats);
        }
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Spieler-Rangliste:", err);

        if (!cancelled) {
          setError("Rangliste konnte nicht geladen werden.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ownIndex = ownId ? players.findIndex((player) => player.playerId === ownId) : -1;
  const [windowStart, windowEnd] =
    ownIndex >= 0 ? windowAround(ownIndex, players.length) : [0, VISIBLE_LIMIT];

  const visiblePlayers = players.slice(windowStart, windowEnd);
  const hasMore = players.length > VISIBLE_LIMIT;

  /* Im Overlay direkt zum eigenen Platz scrollen. */
  useEffect(() => {
    if (!showAll) {
      return;
    }

    listRef.current?.querySelector('[data-own="true"]')?.scrollIntoView({ block: "center" });
  }, [showAll]);

  const handleSelect = (player: PlayerOverallStats) => {
    onSelectPlayer?.(player);
    setShowAll(false);
  };

  return (
    <>
      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
        <PanelTitle
          action={
            ownIndex >= 0 ? (
              <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-300">
                Dein Platz #{ownIndex + 1}
              </span>
            ) : undefined
          }
        >
          Weltrangliste
        </PanelTitle>

        {loading ? (
          <div className="mt-4 text-sm font-bold text-white/40">Lade Rangliste …</div>
        ) : error ? (
          <div className="mt-4 text-sm font-bold text-red-400/70">{error}</div>
        ) : players.length === 0 ? (
          <div className="mt-4 text-sm font-bold text-white/40">
            Noch keine Spielerstatistiken vorhanden
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              {visiblePlayers.map((player, index) => (
                <PlayerRow
                  key={player.playerId}
                  player={player}
                  rank={windowStart + index + 1}
                  isOwn={player.playerId === ownId}
                  onClick={() => handleSelect(player)}
                />
              ))}
            </div>

            {ownId && ownIndex === -1 && (
              <div className="mt-3 text-[11px] font-semibold text-white/35">
                Du bist noch nicht platziert: Spiele ein Match gegen registrierte Gegner.
              </div>
            )}

            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-3 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 text-[10px] font-black uppercase tracking-wider text-white/40 transition hover:bg-white/[0.05] hover:text-white"
              >
                Alle {players.length} anzeigen
              </button>
            )}
          </>
        )}
      </section>

      {/* OVERLAY: KOMPLETTE RANGLISTE */}

      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-[#111419] p-5">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                Weltrangliste · Alle {players.length}
              </div>

              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-lg text-white/40 transition hover:bg-white/[0.1] hover:text-white"
                aria-label="Schließen"
              >
                ×
              </button>
            </div>

            <div ref={listRef} className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {players.map((player, index) => (
                <PlayerRow
                  key={player.playerId}
                  player={player}
                  rank={index + 1}
                  isOwn={player.playerId === ownId}
                  onClick={() => handleSelect(player)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| SPIELER-ZEILE
|--------------------------------------------------------------------------

|
*/

function PlayerRow({
  player,
  rank,
  isOwn,
  onClick,
}: {
  player: PlayerOverallStats;
  rank: number;
  isOwn: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-own={isOwn ? "true" : undefined}
      aria-current={isOwn ? "true" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
        isOwn
          ? "border-cyan-400/40 bg-cyan-400/[0.08] hover:bg-cyan-400/[0.13]"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <span className={`min-w-6 text-sm font-black ${isOwn ? "text-cyan-300" : "text-white/25"}`}>
        {rank}
      </span>

      <span
        className={`h-2 w-2 rounded-full ${player.team === "A" ? "bg-blue-400" : "bg-red-400"}`}
      />

      <span className="flex-1">
        <span className="flex items-center gap-2 text-xs font-black text-white">
          {player.name}

          {isOwn && (
            <span className="rounded-full bg-cyan-400 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-black">
              Du
            </span>
          )}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-white/25">
          {player.wins} Siege · {player.hitRate}% Trefferquote
        </span>
      </span>

      <span className="text-sm font-black text-white/60">{player.hits}</span>
    </button>
  );
}
