"use client";

import { useEffect, useState } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import { getPlayerMatchHistory, type StatsRange } from "@/app/spieler/match/playerStats";

type MatchPoint = {
  matchId: string;
  hitRate: number;
};

const MAX_MATCHES = 16;

/* Beschriftung der Y-Achse, von oben nach unten (5 Gitterlinien). */
const AXIS_LABELS = [100, 75, 50, 25, 0];

export function PerformanceChart({ range = "all" }: { range?: StatsRange }) {
  const [points, setPoints] = useState<MatchPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await getOwnProfile();

        if (!profile) {
          if (!cancelled) {
            setLoggedIn(false);
            setLoading(false);
          }

          return;
        }

        /*
         * getPlayerMatchHistory() berücksichtigt automatisch einen
         * eigenen Stats-Reset (siehe playerStats.ts) - dieser Chart
         * muss das nicht mehr selbst wissen.
         */
        const history = await getPlayerMatchHistory(profile.id, range);

        /*
         * history liefert (wie getSavedMatches()) neueste zuerst -
         * für die Verlaufsanzeige (links = älter, rechts = neuer)
         * werden hier die letzten MAX_MATCHES genommen und gedreht.
         */
        const recent = history
          .slice(0, MAX_MATCHES)
          .reverse()
          .map((entry) => ({ matchId: entry.matchId, hitRate: entry.stats.hitRate }));

        if (!cancelled) {
          setPoints(recent);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Performance-Verlaufs:", err);

        if (!cancelled) {
          setPoints([]);
        }
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
  }, [range]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 text-center text-sm font-bold text-white/40 sm:p-7">
        Lade Verlauf …
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 text-center text-sm font-bold text-white/50 sm:p-7">
        Melde dich an, um deinen Trefferquote-Verlauf zu sehen.
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 text-center text-sm font-bold text-white/40 sm:p-7">
        Noch keine Matches für einen Verlauf.
      </div>
    );
  }

  const trend = points.length >= 2 ? points[points.length - 1].hitRate - points[0].hitRate : 0;

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-white">Trefferquote-Verlauf</div>

          <div className="mt-1 text-[10px] text-white/25">Letzte {points.length} Matches</div>
        </div>

        {points.length >= 2 && (
          <div className="text-right">
            <div className={`text-sm font-black ${trend >= 0 ? "text-cyan-400" : "text-red-400"}`}>
              {trend >= 0 ? "+" : ""}
              {trend} %
            </div>

            <div className="text-[9px] uppercase tracking-wider text-white/20">Trend</div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative mt-8 h-56">
        {/* Skala links: gleiche Abstände wie die Gitterlinien (oben 100 %, unten 0 %) */}
        <div className="absolute inset-y-0 left-0 flex w-9 flex-col justify-between">
          {AXIS_LABELS.map((label) => (
            <div key={label} className="relative h-px">
              <span className="absolute left-0 top-0 -translate-y-1/2 text-[9px] font-bold leading-none text-white/30">
                {label}%
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="absolute inset-y-0 left-10 right-0 flex flex-col justify-between">
          {AXIS_LABELS.map((label) => (
            <div key={label} className="h-px w-full bg-white/[0.05]" />
          ))}
        </div>

        {/* Bars */}
        <div className="absolute inset-y-0 left-10 right-0 flex items-end gap-1 sm:gap-2">
          {points.map((point) => (
            <div key={point.matchId} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-cyan-400/30 transition duration-300 group-hover:bg-cyan-400/60"
                style={{ height: `${Math.max(point.hitRate, 2)}%` }}
                title={`${point.hitRate}%`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-4 flex justify-between pl-10 text-[9px] uppercase tracking-wider text-white/20">
        <span>Match 01</span>
        <span>Match {String(points.length).padStart(2, "0")}</span>
      </div>
    </div>
  );
}
