"use client";

import { useEffect, useState } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import { getPlayerOverallStats } from "@/app/spieler/match/playerStats";

type Summary = {
  matches: number;
  winrate: number;
  cupsRemoved: number;
  wins: number;
};

export function PerformanceStats() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await getOwnProfile();

        if (!profile) {
          if (!cancelled) {
            setLoading(false);
          }

          return;
        }

        const overall = await getPlayerOverallStats(profile.id);

        if (!cancelled) {
          const matches = overall?.matches ?? 0;
          const wins = overall?.wins ?? 0;

          setSummary({
            matches,
            winrate: matches > 0 ? Math.round((wins / matches) * 1000) / 10 : 0,
            cupsRemoved: overall?.cupsRemoved ?? 0,
            wins,
          });
        }
      } catch (err) {
        console.error("Fehler beim Laden der Performance-Stats:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { value: loading ? "…" : String(summary?.matches ?? 0), label: "Matches" },
    { value: loading ? "…" : `${summary?.winrate ?? 0}%`, label: "Winrate" },
    { value: loading ? "…" : String(summary?.cupsRemoved ?? 0), label: "Becher" },
    { value: loading ? "…" : String(summary?.wins ?? 0), label: "Siege" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:border-cyan-400/20 hover:bg-cyan-400/[0.025]"
        >
          <div className="text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
            {stat.value}
          </div>

          <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
