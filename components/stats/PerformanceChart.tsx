"use client";

import { useEffect, useState, type ReactNode } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import { PanelTitle } from "@/components/stats/PanelCard";
import { getPlayerMatchHistory, type StatsRange } from "@/app/spieler/match/playerStats";

type MatchPoint = {
  matchId: string;
  hitRate: number;
  /** Siegquote über alle Matches bis einschließlich diesem (innerhalb des Zeitraums). */
  winRate: number;
  savedAt: string;
};

type Metric = "hitRate" | "winRate";

const METRICS: { key: Metric; label: string }[] = [
  { key: "hitRate", label: "Trefferquote" },
  { key: "winRate", label: "Siegquote" },
];

/* Reicht für "Letzte 30"; ältere Matches würden die Linie unleserlich machen. */
const MAX_MATCHES = 30;

/* So viele Datums-Beschriftungen stehen höchstens unter der Linie. */
const MAX_DATE_LABELS = 5;

/* Beschriftung der Y-Achse, von oben nach unten (5 Gitterlinien). */
const AXIS_LABELS = [100, 75, 50, 25, 0];

export function PerformanceChart({ range = "all" }: { range?: StatsRange }) {
  const [points, setPoints] = useState<MatchPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [metric, setMetric] = useState<Metric>("hitRate");

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
        const recent = history.slice(0, MAX_MATCHES).reverse();

        let wins = 0;

        const mapped: MatchPoint[] = recent.map((entry, index) => {
          wins += entry.stats.wins;

          return {
            matchId: entry.matchId,
            hitRate: entry.stats.hitRate,
            winRate: Math.round((wins / (index + 1)) * 100),
            savedAt: entry.savedAt,
          };
        });

        if (!cancelled) {
          setPoints(mapped);
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

  const trend =
    points && points.length >= 2 ? points[points.length - 1][metric] - points[0][metric] : 0;

  const hasLine = Boolean(points && points.length >= 2);

  let content: ReactNode;

  if (loading) {
    content = (
      <div className="py-16 text-center text-sm font-bold text-white/40">Lade Verlauf …</div>
    );
  } else if (!loggedIn) {
    content = (
      <div className="py-16 text-center text-sm font-bold text-white/50">
        Melde dich an, um deinen Trefferquote-Verlauf zu sehen.
      </div>
    );
  } else if (!points || points.length === 0) {
    content = (
      <div className="py-16 text-center text-sm font-bold text-white/40">
        Noch keine Matches für einen Verlauf.
      </div>
    );
  } else {
    content = <LineChart points={points} metric={metric} />;
  }

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <PanelTitle>Performance Verlauf</PanelTitle>

          <div className="relative">
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as Metric)}
              aria-label="Kennzahl des Verlaufs"
              className="cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] py-1.5 pl-3 pr-8 text-[11px] font-bold text-white/70 transition hover:border-white/20 focus:border-cyan-400/40 focus:outline-none"
            >
              {METRICS.map((item) => (
                <option key={item.key} value={item.key} className="bg-[#0c0f16] text-white">
                  {item.label}
                </option>
              ))}
            </select>

            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {hasLine && (
          <div className="text-right">
            <div
              className={`flex items-center justify-end gap-1.5 text-sm font-black ${
                trend >= 0 ? "text-cyan-400" : "text-red-400"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 ${trend >= 0 ? "" : "-scale-y-100"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M15 7h6v6" />
              </svg>
              {trend >= 0 ? "+" : ""}
              {trend} %
            </div>

            <div className="mt-0.5 text-[10px] font-semibold text-white/30">Tendenz</div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-1 flex-col">{content}</div>
    </section>
  );
}

/*
 * LINIENDIAGRAMM
 *
 * Die Fläche und die Linie liegen in einem gestreckten SVG (viewBox
 * 0-100, preserveAspectRatio="none", Strichstärke bleibt dank
 * non-scaling-stroke gleich). Punkte und Beschriftungen sind normale
 * HTML-Elemente, die per Prozentwert darüber liegen - so werden die
 * Punkte beim Strecken nicht zu Ellipsen.
 */

function LineChart({ points, metric }: { points: MatchPoint[]; metric: Metric }) {
  const count = points.length;

  const xOf = (index: number) => (count === 1 ? 50 : (index / (count - 1)) * 100);
  const yOf = (hitRate: number) => 100 - Math.min(Math.max(hitRate, 0), 100);

  const linePoints = points.map((point, index) => `${xOf(index)},${yOf(point[metric])}`).join(" ");
  const areaPoints = `0,100 ${linePoints} 100,100`;

  const dateIndexes = Array.from(
    new Set(
      count <= MAX_DATE_LABELS
        ? points.map((_, index) => index)
        : Array.from({ length: MAX_DATE_LABELS }, (_, k) =>
            Math.round((k * (count - 1)) / (MAX_DATE_LABELS - 1)),
          ),
    ),
  );

  const formatDate = (iso: string) => {
    const date = new Date(iso);

    return Number.isNaN(date.getTime())
      ? ""
      : `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`;
  };

  /* Die Zeichenfläche füllt die Kartenhöhe, damit sie neben der höheren Nachbarkarte nicht leer bleibt. */
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative min-h-[13rem] flex-1 sm:min-h-[15rem]">
        {/* Skala links: oben 100 %, unten 0 % */}
        <div className="absolute inset-y-0 left-0 flex w-10 flex-col justify-between">
          {AXIS_LABELS.map((label) => (
            <div key={label} className="relative h-px">
              <span className="absolute left-0 top-0 -translate-y-1/2 text-[10px] font-semibold leading-none text-white/35">
                {label} %
              </span>
            </div>
          ))}
        </div>

        {/* Zeichenfläche */}
        <div className="absolute inset-y-0 left-11 right-3">
          {/* Gitterlinien */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {AXIS_LABELS.map((label) => (
              <div key={label} className="h-px w-full bg-white/[0.06]" />
            ))}
          </div>

          {count >= 2 && (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="performance-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
              </defs>

              <polygon points={areaPoints} fill="url(#performance-area)" />

              <polyline
                points={linePoints}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {/* Punkte */}
          {points.map((point, index) => (
            <span
              key={point.matchId}
              title={`${formatDate(point.savedAt)} · ${point[metric]} %`}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-cyan-400 bg-[#0b0f14]"
              style={{ left: `${xOf(index)}%`, bottom: `${100 - yOf(point[metric])}%` }}
            />
          ))}
        </div>
      </div>

      {/* Datum unter der Linie */}
      <div className="relative mt-3 h-4">
        <div className="absolute inset-y-0 left-11 right-3">
          {dateIndexes.map((index) => (
            <span
              key={index}
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-white/35"
              style={{ left: `${xOf(index)}%` }}
            >
              {formatDate(points[index].savedAt)}
            </span>
          ))}
        </div>
      </div>

      {metric === "winRate" && (
        <p className="mt-4 text-[11px] font-semibold text-white/30">
          Siegquote über alle Matches im gewählten Zeitraum bis zu diesem Punkt.
        </p>
      )}
    </div>
  );
}
