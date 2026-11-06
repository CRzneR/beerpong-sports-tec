"use client";

import { useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { PanelModal, PanelTitle } from "@/components/stats/PanelCard";
import {
  CategoryIcon,
  LevelBadge,
  ProfileProgressView,
  useProfileProgress,
} from "@/components/stats/ProfileProgressSection";
import type {
  ProfileProgress,
  ProgressItem,
} from "@/app/[locale]/spieler/match/profileProgress";

/*
 * --------------------------------------------------------------------------
 * | PROFILFORTSCHRITT (kompakt, fürs Dashboard)
 * --------------------------------------------------------------------------
 *
 * Gleiche Bauart wie die Achievements-Karte, damit beide im Raster
 * nebeneinander stehen können: Profillevel mit XP-Balken, Gesamtfortschritt
 * und die nächsten Ziele (die drei Kategorien, die der nächsten Stufe am
 * nächsten sind). "Alle Stufen" öffnet die komplette Ansicht in einem
 * Overlay.
 * --------------------------------------------------------------------------
 */

const GOAL_COUNT = 3;

function percentToNext(item: ProgressItem): number {
  if (item.next === null) {
    return 100;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((item.value - item.previous) / (item.next - item.previous)) * 100,
      ),
    ),
  );
}

/* Die Kategorien, die der nächsten Stufe prozentual am nächsten sind (Gold ausgenommen). */
function nextGoals(progress: ProfileProgress): ProgressItem[] {
  return progress.items
    .filter((item) => item.next !== null)
    .map((item) => ({ item, percent: percentToNext(item) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, GOAL_COUNT)
    .map((entry) => entry.item);
}

function Goal({ item }: { item: ProgressItem }) {
  const t = useTranslations("Stats.ProfileProgress");
  const format = useFormatter();

  const percent = percentToNext(item);

  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0b0f14] px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300">
        <CategoryIcon name={item.key} className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-black text-white">
            {t(`cat_${item.key}_title`)}
          </span>

          <span className="shrink-0 text-[10px] font-bold text-white/50">
            {t("goalValue", {
              value: format.number(item.value),
              next: format.number(item.next ?? 0),
            })}
          </span>
        </div>

        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={t(`cat_${item.key}_title`)}
        >
          <div
            className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/35">
          {t("nextHint", {
            count: format.number(Math.max((item.next ?? 0) - item.value, 0)),
            tier: t(`tier_${item.tier + 1}`),
          })}
        </div>
      </div>
    </li>
  );
}

function Shell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTranslations("Stats.ProfileProgress");

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
      <PanelTitle>{t("title")}</PanelTitle>

      <div className="mt-5">{children}</div>

      {footer}
    </section>
  );
}

/* Reine Anzeige (ohne Datenabfrage). */
export function ProfileProgressCompactView({
  progress,
}: {
  progress: ProfileProgress;
}) {
  const t = useTranslations("Stats.ProfileProgress");
  const format = useFormatter();

  const [showAll, setShowAll] = useState(false);

  const levelMaxed = progress.xp >= progress.maxXp;
  const levelSpan = progress.nextLevelXp - progress.levelStartXp;
  const levelPercent = levelMaxed
    ? 100
    : Math.round(((progress.xp - progress.levelStartXp) / levelSpan) * 100);
  const overallPercent = Math.round(
    (progress.earnedTiers / progress.totalTiers) * 100,
  );
  const goals = nextGoals(progress);

  return (
    <>
      <Shell
        footer={
          <div className="mt-auto flex justify-end pt-5">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/[0.06] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-400/[0.14]"
            >
              {t("showAll")}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Oben: Level und Gesamtfortschritt (ab md nebeneinander) */}
          <div className="grid gap-5 md:grid-cols-2 md:items-center md:gap-8">
            {/* Level */}
            <div className="flex items-center gap-4">
              <LevelBadge level={progress.level} small />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-black text-white">
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

            {/* Gesamtfortschritt: ein Abschnitt pro Kategorie */}
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/60">
                  {t("summary", {
                    earned: progress.earnedTiers,
                    total: progress.totalTiers,
                  })}
                </span>

                <span className="text-xs font-black text-cyan-400">
                  {overallPercent} %
                </span>
              </div>

              <div
                className="mt-2 flex gap-1"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overallPercent}
                aria-label={t("overallTitle")}
              >
                {progress.items.map((item) => (
                  <div
                    key={item.key}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]"
                  >
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${Math.round((item.tier / 3) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Nächste Ziele */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-white/35">
              {t("nextGoals")}
            </div>

            {goals.length > 0 ? (
              <ul className="mt-2.5 grid gap-2 md:grid-cols-3">
                {goals.map((item) => (
                  <Goal key={item.key} item={item} />
                ))}
              </ul>
            ) : (
              <div className="mt-2.5 rounded-xl border border-yellow-400/25 bg-yellow-400/[0.05] px-4 py-3 text-xs font-bold text-yellow-300">
                {t("allDone")}
              </div>
            )}
          </div>
        </div>
      </Shell>

      {showAll && (
        <PanelModal wide title={t("title")} onClose={() => setShowAll(false)}>
          <ProfileProgressView progress={progress} inModal />
        </PanelModal>
      )}
    </>
  );
}

export function ProfileProgressCompact() {
  const t = useTranslations("Stats.ProfileProgress");
  const { progress, loading, loggedIn, error } = useProfileProgress();

  if (loading) {
    return (
      <Shell>
        <div className="py-8 text-center text-sm font-bold text-white/40">
          {t("loading")}
        </div>
      </Shell>
    );
  }

  if (!loggedIn) {
    return (
      <Shell>
        <div className="py-8 text-center text-sm font-bold text-white/50">
          {t("loginHint")}
        </div>
      </Shell>
    );
  }

  if (error || !progress) {
    return (
      <Shell>
        <div className="py-8 text-center text-sm font-bold text-red-400/80">
          {error ?? t("loadError")}
        </div>
      </Shell>
    );
  }

  return <ProfileProgressCompactView progress={progress} />;
}
