"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { getOwnProfile } from "@/app/[locale]/spieler/match/playerProfiles";
import {
  PROGRESS_RULES,
  TIER_XP,
  XP_PER_LEVEL,
  loadProfileProgress,
  type ProfileProgress,
  type ProgressItem,
  type ProgressKey,
  type ProgressTier,
} from "@/app/[locale]/spieler/match/profileProgress";

/*
 * --------------------------------------------------------------------------
 * | PROFILFORTSCHRITT
 * --------------------------------------------------------------------------
 *
 * Aufbau (von oben nach unten):
 *   - Kopf: Titel mit Untertitel und einer kleinen Legende (Bronze, Silber, Gold)
 *   - Leiste: Profillevel mit XP-Balken und Gesamtfortschritt (unterteilter
 *     Balken, ein Abschnitt pro Kategorie)
 *   - Raster: eine Kachel pro Kategorie (Symbol, Stufe, Wert, Balken bis zur
 *     nächsten Stufe und die drei Schwellen als Sterne bzw. Haken)
 *   - Fußzeile: Hinweis, welche Spiele zählen
 *
 * Die Berechnung (Schwellen, XP, Level) steht in
 * app/[locale]/spieler/match/profileProgress.ts. Die Texte stehen in den
 * Messages unter "Stats.ProfileProgress".
 *
 * Klassen stehen bewusst als vollständige Strings (TIER_STYLE), damit
 * Tailwind sie beim Build zuverlässig findet.
 * --------------------------------------------------------------------------
 */

const TIER_STYLE: Record<
  ProgressTier,
  {
    /** Pille "BRONZE" usw. */
    pill: string;
    /** Rahmen und Schein einer Kachel mit erreichter Stufe. */
    card: string;
    /** Schwellen-Knopf, wenn die Stufe erreicht ist. */
    reached: string;
    /** Stern auf dem Knopf, solange die Stufe noch offen ist. */
    star: string;
    /** Farben des Abzeichens in der Legende. */
    badgeStroke: string;
    badgeFill: string;
  }
> = {
  0: {
    pill: "border-white/15 bg-transparent text-white/40",
    card: "border-cyan-400/15",
    reached: "",
    star: "",
    badgeStroke: "",
    badgeFill: "",
  },
  1: {
    pill: "border-orange-400/50 bg-orange-700/25 text-orange-200",
    card: "border-orange-400/50 shadow-[0_0_24px_rgba(251,146,60,0.12)]",
    reached: "border-orange-400/60 bg-orange-700/30 text-orange-100",
    star: "text-orange-400",
    badgeStroke: "stroke-orange-400",
    badgeFill: "fill-orange-500/20",
  },
  2: {
    pill: "border-slate-300/45 bg-slate-500/25 text-slate-100",
    card: "border-slate-300/45 shadow-[0_0_24px_rgba(203,213,225,0.10)]",
    reached: "border-slate-300/50 bg-slate-500/30 text-slate-50",
    star: "text-slate-300",
    badgeStroke: "stroke-slate-300",
    badgeFill: "fill-slate-400/20",
  },
  3: {
    pill: "border-yellow-400/55 bg-yellow-600/25 text-yellow-200",
    card: "border-yellow-400/55 shadow-[0_0_24px_rgba(250,204,21,0.14)]",
    reached: "border-yellow-400/60 bg-yellow-600/30 text-yellow-100",
    star: "text-yellow-400",
    badgeStroke: "stroke-yellow-400",
    badgeFill: "fill-yellow-500/20",
  },
};

const ICON_PATHS: Record<ProgressKey, ReactNode> = {
  hits: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  bounce: (
    <>
      <path d="M3 18h18" />
      <path d="M4 6c2 0 3 12 4 12s2-8 4-8 2 8 4 8 2-6 4-6" />
      <circle cx="4" cy="5" r="1.5" />
    </>
  ),
  goodMatches: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4-6" />
    </>
  ),
  series: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  comebacks: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  wins: (
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </>
  ),
  trickshots: <path d="M12 3l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.4l6-.9L12 3z" />,
  finisher: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  tournaments: <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" />,
  dominance: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
};

const STAR_PATH = "M12 3l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.4l6-.9L12 3z";

export function CategoryIcon({ name, className }: { name: ProgressKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function StarIcon({ className, filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

const HEX_POINTS = "32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5";

/* Sechseck-Abzeichen für die Legende (Bronze, Silber, Gold). */
function TierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  const style = TIER_STYLE[tier];

  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <polygon
          points={HEX_POINTS}
          strokeWidth="3"
          strokeLinejoin="round"
          className={`${style.badgeStroke} ${style.badgeFill}`}
        />
      </svg>

      <StarIcon filled className={`relative h-4 w-4 ${style.star}`} />
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Kachel pro Kategorie                                                      */
/* ------------------------------------------------------------------------ */

function ProgressCard({ item }: { item: ProgressItem }) {
  const t = useTranslations("Stats.ProfileProgress");
  const format = useFormatter();

  const style = TIER_STYLE[item.tier];
  const maxed = item.tier === 3;

  const span = item.next !== null ? item.next - item.previous : 1;
  const percent = maxed
    ? 100
    : Math.max(0, Math.min(100, Math.round(((item.value - item.previous) / span) * 100)));

  const remaining = item.next !== null ? Math.max(item.next - item.value, 0) : 0;

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-[#08121a]/80 p-4 transition-colors ${style.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300">
          <CategoryIcon name={item.key} className="h-5 w-5" />
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${style.pill}`}
        >
          {t(`tier_${item.tier}`)}
        </span>
      </div>

      <h3 className="mt-3 text-base font-black tracking-tight text-white">
        {t(`cat_${item.key}_title`)}
      </h3>

      <p className="mt-1 min-h-[2.1rem] text-[11px] font-semibold leading-snug text-white/45">
        {t(`cat_${item.key}_desc`, {
          rate: PROGRESS_RULES.goodMatchMinRate,
          throws: PROGRESS_RULES.goodMatchMinThrows,
          wins: PROGRESS_RULES.seriesWins,
          deficit: PROGRESS_RULES.comebackDeficit,
          margin: PROGRESS_RULES.dominanceMargin,
        })}
      </p>

      <div className="mt-4 text-3xl font-black tracking-tight text-white">
        {format.number(item.value)}
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t(`cat_${item.key}_title`)}
      >
        <div
          className="h-full rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-2 min-h-[1rem] text-[10px] font-bold uppercase tracking-wider text-white/45">
        {maxed
          ? t("maxed")
          : t("nextHint", { count: format.number(remaining), tier: t(`tier_${item.tier + 1}`) })}
      </div>

      {/* Die drei Schwellen: erreicht = Haken, offen = Stern in der Stufenfarbe. */}
      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-4">
        {item.thresholds.map((threshold, index) => {
          const tier = (index + 1) as 1 | 2 | 3;
          const reached = item.tier >= tier;
          const tierStyle = TIER_STYLE[tier];

          return (
            <div
              key={threshold}
              title={t(`tier_${tier}`)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-1 py-2 text-[11px] font-black ${
                reached ? tierStyle.reached : "border-white/[0.1] bg-white/[0.03] text-white/80"
              }`}
            >
              {reached ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <StarIcon className={`h-3.5 w-3.5 ${tierStyle.star}`} />
              )}

              <span>{format.number(threshold)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Profillevel + Gesamtfortschritt                                           */
/* ------------------------------------------------------------------------ */

export function LevelBadge({ level, small = false }: { level: number; small?: boolean }) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center ${
        small ? "h-14 w-14" : "h-16 w-16 sm:h-[72px] sm:w-[72px]"
      }`}
    >
      <svg
        viewBox="0 0 64 64"
        className="absolute inset-0 h-full w-full drop-shadow-[0_0_10px_rgba(34,211,238,0.55)]"
        aria-hidden="true"
      >
        <polygon
          points={HEX_POINTS}
          strokeWidth="3"
          strokeLinejoin="round"
          className="fill-cyan-400/10 stroke-cyan-400"
        />
      </svg>

      <span className={`relative font-black text-white ${small ? "text-xl" : "text-2xl sm:text-3xl"}`}>{level}</span>
    </span>
  );
}

function SummaryBar({ progress }: { progress: ProfileProgress }) {
  const t = useTranslations("Stats.ProfileProgress");
  const format = useFormatter();
  const [infoOpen, setInfoOpen] = useState(false);

  const levelMaxed = progress.xp >= progress.maxXp;
  const levelSpan = progress.nextLevelXp - progress.levelStartXp;
  const levelPercent = levelMaxed
    ? 100
    : Math.round(((progress.xp - progress.levelStartXp) / levelSpan) * 100);

  const overallPercent = Math.round((progress.earnedTiers / progress.totalTiers) * 100);

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-[#08121a]/80 p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:gap-0 lg:divide-x lg:divide-white/[0.08]">
        {/* Profillevel */}
        <div className="flex items-center gap-4 lg:pr-6">
          <LevelBadge level={progress.level} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/70">
                {t("levelTitle")}
              </span>

              <button
                type="button"
                onClick={() => setInfoOpen((open) => !open)}
                aria-expanded={infoOpen}
                aria-label={t("xpInfoLabel")}
                className="flex h-4 w-4 items-center justify-center rounded-full border border-white/30 text-[9px] font-black text-white/60 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                i
              </button>
            </div>

            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-base font-black text-white">
                {t("levelValue", { level: progress.level })}
              </span>

              <span className="text-[11px] font-bold text-white/50">
                {levelMaxed
                  ? t("levelMax")
                  : t("xpValue", {
                      xp: format.number(progress.xp),
                      next: format.number(progress.nextLevelXp),
                    })}
              </span>
            </div>

            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={levelPercent}
              aria-label={t("levelTitle")}
            >
              <div
                className="h-full rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-all duration-500"
                style={{ width: `${levelPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Gesamtfortschritt */}
        <div className="lg:pl-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/70">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-cyan-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 20v-7M12 20V5M18 20v-10" />
            </svg>

            {t("overallTitle")}
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-3">
            <span className="text-base font-black text-white">
              {t("summary", { earned: progress.earnedTiers, total: progress.totalTiers })}
            </span>

            <span className="text-sm font-black text-cyan-400">{overallPercent} %</span>
          </div>

          {/* Ein Abschnitt pro Kategorie, gefüllt nach erreichten Stufen (0 bis 3). */}
          <div
            className="mt-2 flex gap-1.5"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallPercent}
            aria-label={t("overallTitle")}
          >
            {progress.items.map((item) => (
              <div key={item.key} className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-all duration-500"
                  style={{ width: `${Math.round((item.tier / 3) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {infoOpen && (
        <p className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold leading-relaxed text-white/50">
          {t("xpInfo", {
            bronze: TIER_XP[0],
            silver: TIER_XP[1],
            gold: TIER_XP[2],
            perLevel: format.number(XP_PER_LEVEL),
          })}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Gesamte Karte                                                             */
/* ------------------------------------------------------------------------ */

/* Reine Anzeige (ohne Datenabfrage). */
export function ProfileProgressView({
  progress,
  inModal = false,
}: {
  progress: ProfileProgress;
  /** Im Overlay ist weniger Platz: dort höchstens drei Spalten. */
  inModal?: boolean;
}) {
  const t = useTranslations("Stats.ProfileProgress");

  return (
    <>
      <SummaryBar progress={progress} />

      <div
        className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${inModal ? "" : "xl:grid-cols-5"}`}
      >
        {progress.items.map((item) => (
          <ProgressCard key={item.key} item={item} />
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/30 text-[9px] font-black text-white/50">
          i
        </span>

        <p className="text-[11px] font-semibold leading-relaxed text-white/45">{t("footnote")}</p>
      </div>
    </>
  );
}

function Header() {
  const t = useTranslations("Stats.ProfileProgress");

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300 sm:h-14 sm:w-14">
          <CategoryIcon name="wins" className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{t("title")}</h2>
          <p className="mt-0.5 text-xs font-semibold text-white/45 sm:text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Legende */}
      <ul className="grid grid-cols-3 gap-2 rounded-2xl border border-cyan-400/20 bg-[#08121a]/80 p-3 sm:gap-4 sm:px-5">
        {([1, 2, 3] as const).map((tier) => (
          <li key={tier} className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
            <TierBadge tier={tier} />

            <div className="min-w-0">
              <div className="text-xs font-black text-white">{t(`tier_${tier}`)}</div>
              <div className="text-[10px] font-semibold leading-tight text-white/45">
                {t(`legend_${tier}`)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Lädt den Profilfortschritt des eingeloggten Spielers (für die große und die kompakte Karte). */
export function useProfileProgress() {
  const t = useTranslations("Stats.ProfileProgress");

  const [progress, setProgress] = useState<ProfileProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const result = await loadProfileProgress(profile.id);

        if (!cancelled) {
          setProgress(result);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Profilfortschritts:", err);

        if (!cancelled) {
          setError(t("loadError"));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { progress, loading, loggedIn, error };
}

/* Große Ansicht (Header, Level, alle Kategorien). */
export function ProfileProgressSection() {
  const t = useTranslations("Stats.ProfileProgress");
  const { progress, loading, loggedIn, error } = useProfileProgress();

  let body: ReactNode;

  if (loading) {
    body = <div className="py-8 text-center text-sm font-bold text-white/40">{t("loading")}</div>;
  } else if (!loggedIn) {
    body = <div className="py-8 text-center text-sm font-bold text-white/50">{t("loginHint")}</div>;
  } else if (error || !progress) {
    body = (
      <div className="py-8 text-center text-sm font-bold text-red-400/80">
        {error ?? t("loadError")}
      </div>
    );
  } else {
    body = <ProfileProgressView progress={progress} />;
  }

  return (
    <section className="rounded-3xl border border-cyan-400/15 bg-[#060d14] p-5 shadow-[0_0_60px_rgba(34,211,238,0.05)] sm:p-7">
      <Header />

      <div className="mt-6">{body}</div>
    </section>
  );
}
