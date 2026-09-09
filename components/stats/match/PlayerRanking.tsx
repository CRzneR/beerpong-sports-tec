"use client";

import { useEffect, useState } from "react";
import { getAllPlayerOverallStats, type PlayerOverallStats } from "@/app/spieler/match/playerStats";

interface PlayerRankingProps {
  onSelectPlayer?: (player: PlayerOverallStats) => void;
}

export default function PlayerRanking({ onSelectPlayer }: PlayerRankingProps) {
  const [players, setPlayers] = useState<PlayerOverallStats[]>([]);

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

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111419] p-5">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
        Spieler-Rangliste
      </div>

      {players.length === 0 ? (
        <div className="mt-4 text-sm font-bold text-white/40">
          Noch keine Spielerstatistiken vorhanden
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {players.map((player, index) => (
            <button
              key={player.playerId}
              type="button"
              onClick={() => onSelectPlayer?.(player)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-left transition hover:bg-white/[0.05]"
            >
              <span className="w-6 text-sm font-black text-white/25">{index + 1}</span>

              <span
                className={`h-2 w-2 rounded-full ${
                  player.team === "A" ? "bg-blue-400" : "bg-red-400"
                }`}
              />

              <span className="flex-1">
                <span className="block text-xs font-black text-white">{player.name}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/25">
                  {player.wins} Siege · {player.hitRate}% Trefferquote
                </span>
              </span>

              <span className="text-sm font-black text-white/60">{player.hits}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
