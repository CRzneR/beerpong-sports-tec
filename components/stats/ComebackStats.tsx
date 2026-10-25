"use client";

import { useEffect, useState, type ReactNode } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import {
  CLOSE_MATCH_MARGIN,
  COMEBACK_DEFICIT,
  GAME_MODES,
  getPlayerComebackStats,
  type ComebackStats as ComebackData,
  type GameMode,
  type MatchFlowEntry,
  type MatchScore,
  type StatsRange,
} from "@/app/spieler/match/playerStats";

/*
 * --------------------------------------------------------------------------
 * | SPIELVERLAUF
 * --------------------------------------------------------------------------
 *
 * Eine große Karte mit vier Bereichen und dem Match-Verlauf darunter:
 *   - Comeback-Quote: Matches, die nach mindestens COMEBACK_DEFICIT Bechern
 *     Rückstand noch gewonnen wurden.
 *   - Führung gehalten: das Gegenstück (mindestens COMEBACK_DEFICIT Becher
 *     Vorsprung, trotzdem gewonnen).
 *   - Starttreffer: erster Wurf in der Eröffnungsrunde bei eigenem Anwurf.
 *   - Ergebnisse: größter Sieg, größte Niederlage, knappe Matches, Ø Differenz.
 *   - Match-Verlauf: Becherverlauf der letzten Matches als Mini-Diagramm.
 *
 * Oben rechts wählt man den Spielmodus (Alle Spiele / 1 gegen 1 / 2 gegen 2).
 * Die Berechnung steht in playerStats.ts (getPlayerComebackStats).
 * --------------------------------------------------------------------------
 */

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const OUTER = "rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7";
const INNER = "min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5";

const RECENT_OPTIONS = [6, 12] as const;

function formatScore(score: MatchScore | null): string {
  return score ? `${score.own} : ${score.opp}` : "–";
}

function formatDiff(value: number): string {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1).replace(".", ",")}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ------------------------------------------------------------------------ */
/* Icons (einfache Linien-Icons, 24er Raster)                                */
/* ------------------------------------------------------------------------ */

type IconName =
  | "refresh"
  | "crown"
  | "target"
  | "bars"
  | "trophy"
  | "skull"
  | "cross"
  | "balance"
  | "down"
  | "up"
  | "flag"
  | "check"
  | "info"
  | "trend";

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
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
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-2.6-5.9" />
          <path d="M20 4v4.5h-4.5" />
        </svg>
      );
    case "crown":
      return (
        <svg {...common}>
          <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.8 11H4.8z" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case "bars":
      return (
        <svg {...common}>
          <path d="M5 20v-9M12 20V4M19 20v-6" />
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
    case "skull":
      return (
        <svg {...common}>
          <path d="M12 3a8 8 0 0 0-8 8c0 2.5 1.2 4.4 3 5.6V20h10v-3.4c1.8-1.2 3-3.1 3-5.6a8 8 0 0 0-8-8z" />
          <circle cx="9" cy="11" r="1.4" fill="currentColor" />
          <circle cx="15" cy="11" r="1.4" fill="currentColor" />
          <path d="M10 20v-2.5M14 20v-2.5" />
        </svg>
      );
    case "cross":
      return (
        <svg {...common}>
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      );
    case "balance":
      return (
        <svg {...common}>
          <path d="M12 5v14M8 8h8M8 16h8" />
        </svg>
      );
    case "down":
      return (
        <svg {...common}>
          <path d="M3 7l6 6 4-4 8 8" />
          <path d="M15 17h6v-6" />
        </svg>
      );
    case "up":
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M5 21V4" />
          <path d="M5 4h11l-2 4 2 4H5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l3 3 5-6" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path d="M3 17l5-5 4 4 8-9" />
          <path d="M15 7h5v5" />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------------ */
/* Bausteine                                                                 */
/* ------------------------------------------------------------------------ */

function IconTile({ name }: { name: IconName }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
      <Icon name={name} className="h-5 w-5" />
    </div>
  );
}

function SectionHead({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <IconTile name={icon} />

      <div className="min-w-0">
        <div className="text-[13px] font-black uppercase tracking-wide text-white">{title}</div>
        <div className="mt-0.5 text-xs font-semibold leading-snug text-white/40">{subtitle}</div>
      </div>
    </div>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-[11px] font-semibold leading-snug text-white/45">
      <Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0 text-cyan-400/70" />
      <span>{children}</span>
    </div>
  );
}

type Row = { icon: IconName; label: string; value: string; iconClass?: string };

function RowList({ rows }: { rows: Row[] }) {
  return (
    <div className="w-full min-w-0 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02] px-4">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon
              name={row.icon}
              className={`h-4 w-4 shrink-0 ${row.iconClass ?? "text-cyan-300/70"}`}
            />
            <span className="text-xs font-bold leading-snug text-white/55">{row.label}</span>
          </div>

          <span className="whitespace-nowrap text-sm font-black text-white">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function Ring({ percent, caption }: { percent: number; caption: string }) {
  const offset = CIRCUMFERENCE * (1 - percent / 100);

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center sm:h-32 sm:w-32">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="11"
        />
        {percent > 0 && (
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
          />
        )}
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black text-white">{percent} %</span>
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-white/35">
          {caption}
        </span>
      </div>
    </div>
  );
}

/* Ring links, Zahlen rechts; mobil untereinander. */
function RingBlock({ percent, caption, rows }: { percent: number; caption: string; rows: Row[] }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
      <Ring percent={percent} caption={caption} />
      <RowList rows={rows} />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div className="relative shrink-0 self-start">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="cursor-pointer appearance-none rounded-xl border border-white/[0.1] bg-white/[0.03] py-2.5 pl-4 pr-9 text-xs font-bold text-white/75 transition hover:border-white/20 focus:border-cyan-400/40 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0c0f16] text-white">
            {option.label}
          </option>
        ))}
      </select>

      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Match-Verlauf                                                             */
/* ------------------------------------------------------------------------ */

const CHART_W = 100;
const CHART_H = 40;
const CHART_PAD_X = 3;
const CHART_PAD_TOP = 4;
const CHART_PAD_BOTTOM = 3;
const MAX_DOTS = 16;

/* Becherverlauf: eigenes Team (Cyan bzw. Rot bei Niederlage) gegen den Gegner (Grau). */
function MiniChart({ entry }: { entry: MatchFlowEntry }) {
  const count = entry.ownSeries.length;
  const maxValue = Math.max(10, ...entry.ownSeries, ...entry.oppSeries);

  const x = (index: number) =>
    CHART_PAD_X + (count > 1 ? index / (count - 1) : 0) * (CHART_W - 2 * CHART_PAD_X);

  const y = (value: number) =>
    CHART_H - CHART_PAD_BOTTOM - (value / maxValue) * (CHART_H - CHART_PAD_TOP - CHART_PAD_BOTTOM);

  const points = (series: number[]) =>
    series.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");

  const ownColor = entry.won ? "#22d3ee" : "#f87171";
  const baseline = CHART_H - CHART_PAD_BOTTOM;

  const dots = (series: number[]) => {
    const hits = series.reduce(
      (sum, value, index) => (index > 0 && value > series[index - 1] ? sum + 1 : sum),
      0,
    );

    if (hits > MAX_DOTS) {
      return [];
    }

    return series
      .map((value, index) => ({ value, index }))
      .filter(({ value, index }) => index > 0 && value > series[index - 1]);
  };

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="mt-3 block w-full"
      role="img"
      aria-label={`Becherverlauf: ${entry.own} zu ${entry.opp}`}
    >
      <line
        x1={CHART_PAD_X}
        x2={CHART_W - CHART_PAD_X}
        y1={baseline}
        y2={baseline}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.5"
      />

      <polygon
        points={`${x(0).toFixed(2)},${baseline} ${points(entry.ownSeries)} ${x(count - 1).toFixed(2)},${baseline}`}
        fill={ownColor}
        fillOpacity="0.12"
      />

      <polyline
        points={points(entry.oppSeries)}
        fill="none"
        stroke="#94a3b8"
        strokeOpacity="0.75"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {dots(entry.oppSeries).map(({ value, index }) => (
        <circle
          key={`o${index}`}
          cx={x(index)}
          cy={y(value)}
          r="1.2"
          fill="#94a3b8"
          fillOpacity="0.85"
        />
      ))}

      <polyline
        points={points(entry.ownSeries)}
        fill="none"
        stroke={ownColor}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {dots(entry.ownSeries).map(({ value, index }) => (
        <circle key={`w${index}`} cx={x(index)} cy={y(value)} r="1.5" fill={ownColor} />
      ))}
    </svg>
  );
}

function MatchTile({ entry }: { entry: MatchFlowEntry }) {
  const diff = entry.own - entry.opp;

  const diffClass = diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-white/50";
  const diffText = diff === 0 ? "±0 Becher" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} Becher`;

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-white/[0.08] bg-[#0a0d11] p-3.5">
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <span className="text-[11px] font-semibold text-white/40">{formatDate(entry.savedAt)}</span>

        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
            entry.won
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-red-400/30 bg-red-400/10 text-red-300"
          }`}
        >
          {entry.won ? "Sieg" : "Niederlage"}
        </span>
      </div>

      <div
        className="mt-2 truncate text-sm font-black text-white"
        title={entry.opponents.join(" & ")}
      >
        vs. {entry.opponents.join(" & ") || "Unbekannt"}
      </div>

      <div className="mt-0.5 text-lg font-black tracking-tight text-white">
        {entry.own} : {entry.opp}
      </div>

      <MiniChart entry={entry} />

      <div className={`mt-2 text-center text-xs font-bold ${diffClass}`}>{diffText}</div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Karte                                                                     */
/* ------------------------------------------------------------------------ */

export function ComebackStats({ range = "all" }: { range?: StatsRange }) {
  const [stats, setStats] = useState<ComebackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<GameMode>("all");
  const [recentCount, setRecentCount] = useState<number>(RECENT_OPTIONS[0]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await getOwnProfile();

        if (!profile) {
          if (!cancelled) {
            setLoggedIn(false);
          }

          return;
        }

        const result = await getPlayerComebackStats(profile.id, range, mode);

        if (!cancelled) {
          setStats(result);
          setError(false);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Spielverlaufs:", err);

        if (!cancelled) {
          setError(true);
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
  }, [range, mode]);

  if (loading) {
    return (
      <div className={`${OUTER} text-center text-sm font-bold text-white/40`}>
        Lade Spielverlauf …
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className={`${OUTER} text-center text-sm font-bold text-white/50`}>
        Melde dich an, um deinen Spielverlauf zu sehen.
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${OUTER} text-center text-sm font-bold text-red-400/80`}>
        Spielverlauf konnte nicht geladen werden.
      </div>
    );
  }

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-6 w-1 shrink-0 rounded-full bg-cyan-400" />

        <div>
          <div className="text-lg font-black tracking-tight text-white">Spielverlauf</div>
          <div className="mt-0.5 text-xs font-semibold text-white/40">
            Detaillierte Analyse deines bisherigen Spielverlaufs.
          </div>
        </div>
      </div>

      <Select
        value={mode}
        onChange={(value) => setMode(value as GameMode)}
        options={GAME_MODES}
        label="Spielmodus"
      />
    </div>
  );

  if (!stats || stats.matches === 0) {
    return (
      <div className={OUTER}>
        {header}
        <div className="mt-6 text-xs font-bold text-white/30">
          {mode === "all"
            ? "Noch keine abgeschlossenen Matches."
            : "Keine abgeschlossenen Matches in diesem Spielmodus."}
        </div>
      </div>
    );
  }

  const results: Row[] = [
    {
      icon: "trophy",
      label: "Größter Sieg",
      value: formatScore(stats.biggestWin),
      iconClass: "text-yellow-400/80",
    },
    {
      icon: "skull",
      label: "Größte Niederlage",
      value: formatScore(stats.biggestLoss),
      iconClass: "text-red-400/70",
    },
    {
      icon: "cross",
      label: "Knappe Matches",
      value:
        stats.close.matches > 0 ? `${stats.close.won} von ${stats.close.matches} gewonnen` : "–",
    },
    { icon: "balance", label: "Ø Becherdifferenz", value: formatDiff(stats.avgDiff) },
  ];

  const recent = stats.recent.slice(0, recentCount);

  return (
    <div className={OUTER}>
      {header}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* COMEBACK */}
        <div className={INNER}>
          <SectionHead
            icon="refresh"
            title="Comeback-Quote"
            subtitle="Matches, in denen du einen Rückstand aufgeholt hast."
          />

          {stats.behind > 0 ? (
            <RingBlock
              percent={stats.rate}
              caption="Comebacks"
              rows={[
                {
                  icon: "down",
                  label: "Hinten gelegen",
                  value: `${stats.behind} ${stats.behind === 1 ? "Match" : "Matches"}`,
                },
                { icon: "refresh", label: "Davon gewonnen", value: String(stats.won) },
                {
                  icon: "bars",
                  label: "Größter gedrehter Rückstand",
                  value: stats.biggest > 0 ? `${stats.biggest} Becher` : "–",
                },
              ]}
            />
          ) : (
            <div className="mt-5 text-xs font-bold text-white/30">
              Noch nie mit {COMEBACK_DEFICIT} oder mehr Bechern zurückgelegen.
            </div>
          )}

          <InfoNote>
            Matches, in denen dein Team mindestens {COMEBACK_DEFICIT} Becher zurücklag.
          </InfoNote>
        </div>

        {/* FÜHRUNG */}
        <div className={INNER}>
          <SectionHead
            icon="crown"
            title="Führung gehalten"
            subtitle="Matches, in denen du die Führung bis zum Ende gehalten hast."
          />

          {stats.ahead > 0 ? (
            <RingBlock
              percent={stats.heldRate}
              caption="Führung"
              rows={[
                {
                  icon: "up",
                  label: "Vorne gelegen",
                  value: `${stats.ahead} ${stats.ahead === 1 ? "Match" : "Matches"}`,
                },
                { icon: "crown", label: "Davon gewonnen", value: String(stats.held) },
                {
                  icon: "bars",
                  label: "Größte verspielte Führung",
                  value: stats.biggestBlown > 0 ? `${stats.biggestBlown} Becher` : "–",
                },
              ]}
            />
          ) : (
            <div className="mt-5 text-xs font-bold text-white/30">
              Noch nie mit {COMEBACK_DEFICIT} oder mehr Bechern vorn gelegen.
            </div>
          )}

          <InfoNote>
            Matches, in denen dein Team mindestens {COMEBACK_DEFICIT} Becher vorn lag.
          </InfoNote>
        </div>

        {/* STARTTREFFER */}
        <div className={INNER}>
          <SectionHead
            icon="target"
            title="Starttreffer"
            subtitle="Wie oft du den ersten Wurf getroffen hast."
          />

          {stats.start ? (
            <RingBlock
              percent={stats.start.rate}
              caption="Starttreffer"
              rows={[
                { icon: "flag", label: "Matches mit Anwurf", value: String(stats.start.matches) },
                { icon: "check", label: "Davon Starttreffer", value: String(stats.start.hits) },
                {
                  icon: "trophy",
                  label: "Siege nach Starttreffer",
                  value: String(stats.start.wonAfterHit),
                },
              ]}
            />
          ) : (
            <div className="mt-5 text-xs font-bold text-white/30">Noch kein Match mit Anwurf.</div>
          )}

          <InfoNote>
            Dein erster Wurf in der Eröffnungsrunde, wenn dein Team den Anwurf hatte.
          </InfoNote>
        </div>

        {/* ERGEBNISSE */}
        <div className={INNER}>
          <SectionHead
            icon="bars"
            title="Ergebnisse"
            subtitle="Übersicht deiner Match-Ergebnisse."
          />

          <div className="mt-4">
            <RowList rows={results} />
          </div>

          <InfoNote>
            Endstand in Bechern. Knapp heißt höchstens {CLOSE_MATCH_MARGIN} Becher Unterschied.
          </InfoNote>
        </div>
      </div>

      {/* MATCH-VERLAUF */}
      <div className={`${INNER} mt-4`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionHead
            icon="trend"
            title="Match-Verlauf"
            subtitle="Ergebnis und Becherverlauf deiner letzten Matches."
          />

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 text-[11px] font-semibold text-white/45">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Dein Team
              </span>

              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Gegner
              </span>
            </div>

            <Select
              value={String(recentCount)}
              onChange={(value) => setRecentCount(Number(value))}
              options={RECENT_OPTIONS.map((count) => ({
                value: String(count),
                label: `Letzte ${count} Matches`,
              }))}
              label="Anzahl der Matches im Verlauf"
            />
          </div>
        </div>

        {recent.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {recent.map((entry) => (
              <MatchTile key={entry.matchId} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="mt-4 text-xs font-bold text-white/30">
            Noch keine abgeschlossenen Matches.
          </div>
        )}
      </div>
    </div>
  );
}
