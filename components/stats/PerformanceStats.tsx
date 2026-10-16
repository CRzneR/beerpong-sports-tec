"use client";

import { useEffect, useState } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import { getPlayerOverallStats } from "@/app/spieler/match/playerStats";

type Summary = {
  matches: number;
  winrate: number;
  cupsRemoved: number;
  wins: number;
  losses: number;
  hitRate: number;
  throws: number;
  hits: number;
  misses: number;
  singleHits: number;
  bounceHits: number;
  trickshotHits: number;
};

/*
 * --------------------------------------------------------------------------
 * | ICONS
 * --------------------------------------------------------------------------
 *
 * Schlichte Linien-Icons (24x24, 1.5px Strich), alle im selben Stil.
 * Sie erben die Farbe über currentColor - dezent in der Ruhe, cyan beim
 * Hover der Karte (group-hover an der Karte unten).
 * --------------------------------------------------------------------------
 */

type IconName =
  | "matches"
  | "winrate"
  | "hitRate"
  | "cups"
  | "wins"
  | "losses"
  | "throws"
  | "hits"
  | "misses"
  | "single"
  | "bounce"
  | "trickshot";

function StatIcon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "matches" /* Flagge: gespieltes Match */:
      return (
        <svg {...common}>
          <path d="M5 21V4" />
          <path d="M5 4h12l-2.5 4L17 12H5" />
        </svg>
      );

    case "winrate" /* Trend nach oben */:
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      );

    case "hitRate" /* Zielscheibe */:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );

    case "cups" /* Becher */:
      return (
        <svg {...common}>
          <path d="M6 4h12l-1.4 14.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8L6 4z" />
          <path d="M6.6 9.5h10.8" />
        </svg>
      );

    case "wins" /* Pokal */:
      return (
        <svg {...common}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
          <path d="M8 6H5.5a2.5 2.5 0 0 0 2.8 3.8" />
          <path d="M16 6h2.5a2.5 2.5 0 0 1-2.8 3.8" />
          <path d="M12 13v4" />
          <path d="M8.5 20h7" />
          <path d="M10 17h4" />
        </svg>
      );

    case "throws" /* Ball in Bewegung: Würfe gesamt */:
      return (
        <svg {...common}>
          <circle cx="15.5" cy="12" r="5" />
          <path d="M3 9h4" />
          <path d="M2 12h3.5" />
          <path d="M3 15h4" />
        </svg>
      );

    case "hits" /* Haken im Kreis: Treffer */:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l2.7 2.7L16 9.5" />
        </svg>
      );

    case "misses" /* Kreuz im Kreis: Fehlwürfe */:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6" />
          <path d="M15 9l-6 6" />
        </svg>
      );

    case "single" /* Fadenkreuz: direkter Einzeltreffer */:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
        </svg>
      );

    case "bounce" /* Ball springt vom Boden nach oben: Aufhüpfer */:
      return (
        <svg {...common}>
          <circle cx="12" cy="15.5" r="3" />
          <path d="M12 10.5V3.5" />
          <path d="M9 6.5l3-3 3 3" />
          <path d="M4 21h16" />
        </svg>
      );

    case "trickshot" /* Funkeln: Trickshot */:
      return (
        <svg {...common}>
          <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" />
        </svg>
      );

    case "losses" /* Trend nach unten */:
      return (
        <svg {...common}>
          <path d="M3 7l6 6 4-4 8 8" />
          <path d="M15 17h6v-6" />
        </svg>
      );
  }
}

export function PerformanceStats() {
  const [summary, setSummary] = useState<Summary | null>(null);
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

        const overall = await getPlayerOverallStats(profile.id);

        if (!cancelled) {
          const matches = overall?.matches ?? 0;
          const wins = overall?.wins ?? 0;

          setSummary({
            matches,
            winrate: matches > 0 ? Math.round((wins / matches) * 1000) / 10 : 0,
            cupsRemoved: overall?.cupsRemoved ?? 0,
            wins,
            losses: overall?.losses ?? 0,
            hitRate: overall?.hitRate ?? 0,
            throws: overall?.throws ?? 0,
            hits: overall?.hits ?? 0,
            misses: overall?.misses ?? 0,
            singleHits: overall?.singleHits ?? 0,
            bounceHits: overall?.bounceHits ?? 0,
            trickshotHits: overall?.trickshotHits ?? 0,
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

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center text-sm font-bold text-white/40">
        Lade Statistiken …
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center text-sm font-bold text-white/50">
        Melde dich an, um deine Performance-Übersicht zu sehen.
      </div>
    );
  }

  const stats: { value: string; label: string; icon: IconName }[] = [
    { value: String(summary?.matches ?? 0), label: "Matches", icon: "matches" },
    { value: `${summary?.winrate ?? 0}%`, label: "Winrate", icon: "winrate" },
    { value: `${summary?.hitRate ?? 0}%`, label: "Trefferquote", icon: "hitRate" },
    { value: String(summary?.cupsRemoved ?? 0), label: "Becher", icon: "cups" },
    { value: String(summary?.wins ?? 0), label: "Siege", icon: "wins" },
    { value: String(summary?.losses ?? 0), label: "Niederlagen", icon: "losses" },
  ];

  /*
   * ZWEITE REIHE: WÜRFE
   *
   * Reine Zählwerte aus den gespeicherten Würfen. Einzeltreffer,
   * Aufhüpfer und Trickshots ergeben zusammen die Treffer-Zahl - bis
   * auf ältere Matches, in denen die Wurfart nicht mitgespeichert wurde.
   */

  const throwStats: { value: string; label: string; icon: IconName }[] = [
    { value: String(summary?.throws ?? 0), label: "Würfe gesamt", icon: "throws" },
    { value: String(summary?.hits ?? 0), label: "Treffer", icon: "hits" },
    { value: String(summary?.misses ?? 0), label: "Fehlwürfe", icon: "misses" },
    { value: String(summary?.singleHits ?? 0), label: "Einzeltreffer", icon: "single" },
    { value: String(summary?.bounceHits ?? 0), label: "Aufhüpfer", icon: "bounce" },
    { value: String(summary?.trickshotHits ?? 0), label: "Trickshots", icon: "trickshot" },
  ];

  const allStats = [...stats, ...throwStats];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {allStats.map((stat) => (
        <div
          key={stat.label}
          className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:border-cyan-400/20 hover:bg-cyan-400/[0.025]"
        >
          <div className="absolute right-4 top-4 text-white/20 transition-colors duration-300 group-hover:text-cyan-400/70">
            <StatIcon name={stat.icon} />
          </div>

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
