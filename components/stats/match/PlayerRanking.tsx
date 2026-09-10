"use client";

import { useEffect, useState } from "react";
import { getAllPlayerOverallStats, type PlayerOverallStats } from "@/app/spieler/match/playerStats";

interface PlayerRankingProps {
  onSelectPlayer?: (player: PlayerOverallStats) => void;
}

const VISIBLE_LIMIT = 8;

export default function PlayerRanking({ onSelectPlayer }: PlayerRankingProps) {
  const [players, setPlayers] = useState<PlayerOverallStats[]>([]);

  /*
   * ALLE ANZEIGEN
   *
   * Die Hauptansicht zeigt nur die ersten VISIBLE_LIMIT Spieler
   * (die Liste ist bereits nach Rang sortiert, siehe
   * getAllPlayerOverallStats()). Bei mehr Spielern gibt's darunter
   * einen Button, der die komplette Liste in einem Overlay öffnet.
   */

  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      const playerStats = await getAllPlayerOverallStats();

      if (!cancelled) {
        setPlayers(playerStats);
      }
    }

    void loadPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  const visiblePlayers = players.slice(0, VISIBLE_LIMIT);
  const hasMore = players.length > VISIBLE_LIMIT;

  const handleSelect = (player: PlayerOverallStats) => {
    onSelectPlayer?.(player);
    setShowAll(false);
  };

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-[#111419] p-5">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
          Spieler-Rangliste
        </div>

        {players.length === 0 ? (
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
                  rank={index + 1}
                  onClick={() => handleSelect(player)}
                />
              ))}
            </div>

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
                Spieler-Rangliste · Alle {players.length}
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

            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {players.map((player, index) => (
                <PlayerRow
                  key={player.playerId}
                  player={player}
                  rank={index + 1}
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
| Gemeinsam genutzt von der Hauptliste (max. 8) und dem
| "Alle anzeigen"-Overlay, damit die Darstellung nicht doppelt
| gepflegt werden muss.
|
*/

function PlayerRow({
  player,
  rank,
  onClick,
}: {
  player: PlayerOverallStats;
  rank: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-left transition hover:bg-white/[0.05]"
    >
      <span className="w-6 text-sm font-black text-white/25">{rank}</span>

      <span
        className={`h-2 w-2 rounded-full ${player.team === "A" ? "bg-blue-400" : "bg-red-400"}`}
      />

      <span className="flex-1">
        <span className="block text-xs font-black text-white">{player.name}</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-white/25">
          {player.wins} Siege · {player.hitRate}% Trefferquote
        </span>
      </span>

      <span className="text-sm font-black text-white/60">{player.hits}</span>
    </button>
  );
}
