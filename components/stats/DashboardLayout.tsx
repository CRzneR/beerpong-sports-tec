"use client";

import { useCallback, useEffect, useState } from "react";

import { PanelModal } from "@/components/stats/PanelCard";
import { useTranslations } from "next-intl";

/*
 * --------------------------------------------------------------------------
 * | DASHBOARD ANPASSEN: KARTEN EIN- UND AUSBLENDEN
 * --------------------------------------------------------------------------
 */

export type DashboardCardId =
  | "summary"
  | "more"
  | "rating"
  | "chart"
  | "cups"
  | "detail"
  | "flow"
  | "matchup"
  | "achievements"
  | "progress"
  | "history"
  | "ranking"
  | "tournament";

export const DASHBOARD_CARDS: {
  id: DashboardCardId;
  pro?: boolean;
}[] = [
  { id: "summary" },
  { id: "more", pro: true },
  { id: "rating", pro: true },
  { id: "chart", pro: true },
  { id: "cups", pro: true },
  { id: "detail", pro: true },
  { id: "flow", pro: true },
  { id: "matchup", pro: true },
  { id: "achievements", pro: true },
  { id: "progress", pro: true },
  { id: "history", pro: true },
  { id: "ranking", pro: true },
  { id: "tournament", pro: true },
];

const STORAGE_KEY = "pongstats.dashboard.hidden.v1";
const VALID_IDS = new Set<string>(DASHBOARD_CARDS.map((card) => card.id));

function readStored(): DashboardCardId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed.filter(
          (item) => typeof item === "string" && VALID_IDS.has(item),
        ) as DashboardCardId[])
      : [];
  } catch {
    return [];
  }
}

function writeStored(hidden: DashboardCardId[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
  } catch {
    /* Speicher nicht verfügbar: Auswahl gilt nur bis zum Neuladen. */
  }
}

export function useDashboardLayout() {
  const [hidden, setHidden] = useState<DashboardCardId[]>([]);

  /*
   * ready: erst nach dem Lesen des Speichers anzeigen, sonst blitzen
   * ausgeblendete Karten kurz auf (der Server kennt die Auswahl nicht).
   */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHidden(readStored());
    setReady(true);

    /* Änderungen aus einem anderen Tab übernehmen. */
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setHidden(readStored());
      }
    };

    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback(
    (id: DashboardCardId) => {
      const next = hidden.includes(id) ? hidden.filter((item) => item !== id) : [...hidden, id];

      setHidden(next);
      writeStored(next);
    },
    [hidden],
  );

  const showAll = useCallback(() => {
    setHidden([]);
    writeStored([]);
  }, []);

  const isVisible = useCallback((id: DashboardCardId) => !hidden.includes(id), [hidden]);

  return { ready, hidden, isVisible, toggle, showAll };
}

export function DashboardCustomizeButton({
  hiddenCount,
  onClick,
}: {
  hiddenCount: number;
  onClick: () => void;
}) {
  const t = useTranslations("Stats.DashboardLayout");

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white/60 transition hover:border-cyan-400/30 hover:bg-white/[0.05] hover:text-white md:w-auto"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </svg>

      <span>{t("dashboardAnpassen")}</span>

      {hiddenCount > 0 && (
        <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[9px] text-cyan-300">{t("aus", { hiddenCount })}</span>
      )}
    </button>
  );
}

export function DashboardCustomizeModal({
  hidden,
  onToggle,
  onShowAll,
  onClose,
}: {
  hidden: DashboardCardId[];
  onToggle: (id: DashboardCardId) => void;
  onShowAll: () => void;
  onClose: () => void;
}) {

  const t = useTranslations("Stats.DashboardLayout");

  return (
    <PanelModal title={t("dashboardAnpassen")} onClose={onClose}>
      <p className="text-xs font-semibold leading-relaxed text-white/40">{t("waehleWelcheKartenAuf")}</p>

      <ul className="mt-4 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        {DASHBOARD_CARDS.map((card) => {
          const visible = !hidden.includes(card.id);

          return (
            <li key={card.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black tracking-tight text-white">{t(`card_${card.id}_label`)}</span>

                  {card.pro && (
                    <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-yellow-400">{t("pro")}</span>
                  )}
                </div>

                <div className="mt-0.5 text-[11px] font-semibold text-white/35">
                  {t(`card_${card.id}_description`)}
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={visible}
                aria-label={t(visible ? "kartAusblenden" : "kartEinblenden", { name: t(`card_${card.id}_label`) })}
                onClick={() => onToggle(card.id)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  visible ? "bg-cyan-400" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    visible ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onShowAll}
          disabled={hidden.length === 0}
          className="text-[10px] font-bold uppercase tracking-wider text-white/40 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >{t("alleAnzeigen")}</button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-cyan-400 px-6 py-3 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-cyan-300"
        >{t("fertig")}</button>
      </div>
    </PanelModal>
  );
}
