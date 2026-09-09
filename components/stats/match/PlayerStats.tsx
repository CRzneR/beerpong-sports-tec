"use client";

import { useEffect, useState } from "react";
import { getAllPlayerOverallStats, type PlayerOverallStats } from "@/app/spieler/match/playerStats";

interface PlayerStatsProps {
  playerId?: string;
}

export default function PlayerStats({ playerId }: PlayerStatsProps) {
  const [stats, setStats] = useState<PlayerOverallStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      const all = await getAllPlayerOverallStats();
      const playerStats = playerId
        ? (all.find((item) => item.playerId === playerId) ?? null)
        : null;

      if (!cancelled) {
        setStats(playerStats);
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (!stats) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111419] p-6 text-center">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
          Spielerstatistik
        </div>
        <div className="mt-3 text-sm font-bold text-white/50">Keine Statistik vorhanden</div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-[#111419] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div
              className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                stats.team === "A" ? "text-blue-400/70" : "text-red-400/70"
              }`}
            >
              Team {stats.team}
            </div>
            <h2 className="mt-1 text-xl font-black text-white">{stats.name}</h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">{stats.hitRate}%</div>
            <div className="text-[8px] font-bold uppercase tracking-wider text-white/25">
              Trefferquote
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Matches" value={stats.matches} />
        <Stat label="Siege" value={stats.wins} />
        <Stat label="Würfe" value={stats.throws} />
        <Stat label="Treffer" value={stats.hits} />
        <Stat label="Daneben" value={stats.misses} />
        <Stat label="Becher" value={stats.cupsRemoved} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111419] p-5">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
          Trefferarten
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Einzeltreffer" value={stats.singleHits} />
          <Stat label="Aufhüpfen" value={stats.bounceHits} />
          <Stat label="Trickshot" value={stats.trickshotHits} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
      <div className="text-lg font-black text-white">{value}</div>
      <div className="mt-1 text-[8px] font-black uppercase tracking-wider text-white/25">
        {label}
      </div>
    </div>
  );
}
