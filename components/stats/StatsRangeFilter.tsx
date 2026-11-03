"use client";

import { STATS_RANGES, type StatsRange } from "@/app/[locale]/spieler/match/playerStats";
import { useTranslations } from "next-intl";

/*
 * --------------------------------------------------------------------------
 * | ZEITRAUM-FILTER FÜR DIE STATISTIKEN
 * --------------------------------------------------------------------------
 *
 * Vier Schalter (Heute / Letzte 10 / Letzte 30 / Alle). Der gewählte
 * Zeitraum liegt in SpielerPage und wird an Performance, Verlauf,
 * Detail und Becherpositionen weitergereicht. Bewusst nur ein
 * kontrolliertes Bauteil ohne eigenen Zustand.
 * --------------------------------------------------------------------------
 */

export function StatsRangeFilter({
  value,
  onChange,
}: {
  value: StatsRange;
  onChange: (range: StatsRange) => void;
}) {
  const t = useTranslations("Stats.StatsRangeFilter");

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">{t("zeitraum")}</div>

        {value !== "all" && (
          <div className="text-right text-[10px] font-semibold text-white/30">{t("ranglisteUndAchievementsZeigen")}</div>
        )}
      </div>

      <div
        role="group"
        aria-label={t("zeitraumDerStatistiken")}
        className="mt-3 grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1 md:inline-grid md:w-auto"
      >
        {STATS_RANGES.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`whitespace-nowrap rounded-xl px-1 py-2.5 text-[10px] font-black uppercase tracking-wide transition md:px-5 md:tracking-wider ${
                active
                  ? "bg-cyan-400 text-black"
                  : "text-white/45 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {t(`range_${option.value}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
