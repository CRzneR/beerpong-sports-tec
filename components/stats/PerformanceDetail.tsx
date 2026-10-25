"use client";

import { useEffect, useState, type ReactNode } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import {
  getPlayerDetailStats,
  type PlayerDetailStats,
  type StatsRange,
} from "@/app/spieler/match/playerStats";

/*
 * --------------------------------------------------------------------------
 * | STATISTIKEN IM DETAIL
 * --------------------------------------------------------------------------
 *
 * Eine Karte mit drei Bereichen:
 *   - links: Win-Rate-Ring mit der Wurf-Bilanz
 *   - rechts: Trefferarten und Endphase-Quote
 *   - unten: Leiste mit Form, Serien und Bestwert
 *
 * "Statistiken zurücksetzen" liegt nicht mehr hier, sondern unten im
 * Bereich "Konto" (DeleteAccountSection).
 * --------------------------------------------------------------------------
 */

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CARD = "rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7";
const PANEL = "rounded-2xl border border-white/[0.08] bg-white/[0.02]";

/* ------------------------------------------------------------------------ */
/* Icons                                                                     */
/* ------------------------------------------------------------------------ */

type IconName = "target" | "trophy" | "cross" | "cup" | "clock" | "bars" | "flame";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M8 21h8M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
          <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
        </svg>
      );
    case "cross":
      return (
        <svg {...common}>
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      );
    case "cup":
      return (
        <svg {...common}>
          <path d="M6 4h12l-1.4 14.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8z" />
          <path d="M6.6 9.5h10.8" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "bars":
      return (
        <svg {...common}>
          <path d="M5 20v-9M12 20V4M19 20v-6" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 3c1 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2 0 2 1 3 2 3 0-3-1-5 1-8.8z" />
        </svg>
      );
  }
}

function IconTile({ name }: { name: IconName }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
      <Icon name={name} />
    </div>
  );
}

/* Balken mit leichtem Leuchten. */
function Bar({ label, value, color }: { label: string; value: number; color: "cyan" | "gray" }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs font-bold text-white/60 sm:w-28 sm:text-sm">
        {label}
      </span>

      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full ${
            color === "cyan"
              ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.45)]"
              : "bg-slate-400/60"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>

      <span className="w-11 shrink-0 text-right text-xs font-black text-white sm:text-sm">
        {value} %
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Karte                                                                     */
/* ------------------------------------------------------------------------ */

export function PerformanceDetail({ range = "all" }: { range?: StatsRange }) {
  const [stats, setStats] = useState<PlayerDetailStats | null>(null);
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

        const detail = await getPlayerDetailStats(profile.id, range);

        if (!cancelled) {
          setStats(detail);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Detail-Statistiken:", err);
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
      <div className={`${CARD} text-center text-sm font-bold text-white/40`}>
        Lade Statistiken …
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className={`${CARD} text-center text-sm font-bold text-white/50`}>
        Melde dich an, um deine Detail-Statistiken zu sehen.
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`${CARD} text-center text-sm font-bold text-white/40`}>
        Noch keine abgeschlossenen Matches für Detail-Statistiken.
      </div>
    );
  }

  const offset = CIRCUMFERENCE * (1 - stats.winRate / 100);

  /* Linkes Feld: Wurf-Bilanz neben dem Ring. */
  const rows: { icon: IconName; label: string; value: string }[] = [
    { icon: "target", label: "Würfe gesamt", value: String(stats.throws) },
    { icon: "trophy", label: "Treffer", value: String(stats.hits) },
    { icon: "cross", label: "Fehlwürfe", value: String(stats.misses) },
    {
      icon: "cup",
      label: "Ø Becher pro Spiel",
      value: stats.avgCupsPerMatch.toFixed(1).replace(".", ","),
    },
  ];

  /* Untere Leiste: Bestwerte neben der Form. */
  const highlights: { icon: IconName; label: string; value: string }[] = [
    { icon: "trophy", label: "Längste Siegesserie", value: String(stats.longestWinStreak) },
    { icon: "flame", label: "Längste Trefferserie", value: String(stats.longestHitStreak) },
    { icon: "target", label: "Höchste Trefferquote", value: `${stats.bestHitRate} %` },
  ];

  const hitTypeRows = [
    { label: "Einzeltreffer", value: stats.hitTypeDistribution.single },
    { label: "Aufhüpfen", value: stats.hitTypeDistribution.bounce },
    { label: "Trickshot", value: stats.hitTypeDistribution.trickshot },
  ];

  const hasHitTypeData =
    stats.hitTypeDistribution.single +
      stats.hitTypeDistribution.bounce +
      stats.hitTypeDistribution.trickshot >
    0;

  let endphaseBody: ReactNode;

  if (stats.endphase) {
    endphaseBody = (
      <>
        <div className="mt-5 space-y-4">
          <Bar label="Endphase" value={stats.endphase.hitRate} color="cyan" />
          <Bar label="Sonstige Würfe" value={stats.endphase.otherHitRate} color="gray" />
        </div>

        <p className="mt-4 text-xs font-semibold text-white/35">
          Würfe, bei denen der Gegner nur noch 3 oder weniger Becher hatte.
        </p>
      </>
    );
  } else {
    endphaseBody = (
      <div className="mt-5 text-xs font-bold text-white/30">Noch keine Würfe in der Endphase.</div>
    );
  }

  return (
    <div className={CARD}>
      <div className="grid gap-8 md:grid-cols-2 md:gap-0">
        {/* LINKS: TITEL, WIN-RATE-RING, WURF-BILANZ */}
        <div className="min-w-0 md:pr-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-6 w-1 shrink-0 rounded-full bg-cyan-400" />

            <div>
              <div className="text-lg font-black tracking-tight text-white">
                Statistiken im Detail
              </div>
              <div className="mt-0.5 text-xs font-semibold text-white/40">
                Detaillierte Auswertung deiner bisherigen Matches.
              </div>
            </div>
          </div>

          <div
            className={`${PANEL} mt-5 flex flex-col items-center gap-5 p-4 sm:flex-row sm:gap-6 sm:p-5`}
          >
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center sm:h-40 sm:w-40">
              <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="11"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={RADIUS}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={offset}
                  style={{ filter: "drop-shadow(0 0 5px rgba(34,211,238,0.5))" }}
                />
              </svg>

              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-white sm:text-[1.65rem]">
                  {stats.winRate.toFixed(1).replace(".", ",")} %
                </span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  Win Rate
                </span>
              </div>
            </div>

            <div className="w-full min-w-0 divide-y divide-white/[0.06]">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon name={row.icon} className="h-5 w-5 shrink-0 text-white/45" />
                    <span className="text-sm font-bold text-white/65">{row.label}</span>
                  </div>

                  <span className="whitespace-nowrap text-lg font-black text-white">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RECHTS: TREFFERARTEN UND ENDPHASE-QUOTE */}
        <div className="min-w-0 border-t border-white/[0.06] pt-8 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div className="flex items-center gap-3.5">
            <IconTile name="target" />
            <div className="text-lg font-black tracking-tight text-white">Trefferarten</div>
          </div>

          {hasHitTypeData ? (
            <div className="mt-5 space-y-4">
              {hitTypeRows.map((item) => (
                <Bar key={item.label} label={item.label} value={item.value} color="cyan" />
              ))}
            </div>
          ) : (
            <div className="mt-5 text-xs font-bold text-white/30">
              Noch keine Trefferarten erfasst.
            </div>
          )}

          <div className="mt-6 border-t border-white/[0.06] pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <IconTile name="clock" />
                <div className="text-sm font-black uppercase tracking-wide text-white/80">
                  Endphase-Quote
                </div>
              </div>

              {stats.endphase && (
                <div className="text-xs font-semibold text-white/40">
                  {stats.endphase.throws} {stats.endphase.throws === 1 ? "Wurf" : "Würfe"}
                </div>
              )}
            </div>

            {endphaseBody}
          </div>
        </div>
      </div>

      {/* UNTEN: FORM, SERIEN, BESTWERT, ZURÜCKSETZEN */}
      <div
        className={`${PANEL} mt-6 grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.7fr_1fr_1fr_1fr] lg:items-center lg:gap-0`}
      >
        <div className="lg:pr-6">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wide text-white/50">
            <Icon name="bars" className="h-4 w-4 text-cyan-400" />
            <span>
              Form (letzte {stats.recentForm.length}{" "}
              {stats.recentForm.length === 1 ? "Spiel" : "Spiele"})
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {stats.recentForm.map((result, index) => (
              <span
                key={index}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-black ${
                  result === "S"
                    ? "border-cyan-400/20 bg-cyan-400/20 text-cyan-200"
                    : "border-red-400/20 bg-red-500/20 text-red-300"
                }`}
              >
                {result}
              </span>
            ))}
          </div>
        </div>

        {highlights.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3.5 border-t border-white/[0.06] pt-4 lg:border-l lg:border-t-0 lg:px-6 lg:pt-0"
          >
            <Icon name={item.icon} className="h-6 w-6 shrink-0 text-white/45" />

            <div className="min-w-0">
              <div className="text-xs font-bold text-white/50">{item.label}</div>
              <div className="mt-0.5 whitespace-nowrap text-xl font-black text-white">
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
