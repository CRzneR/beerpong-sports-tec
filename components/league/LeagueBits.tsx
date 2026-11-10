"use client";

import { CalendarDays, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import type { TournamentStatus } from "@/app/[locale]/turniere/tournamentLogic";

/*
 * Gemeinsame kleine Bausteine der Pong League (Turnier-Übersicht und Turnierseite).
 */

/* Status-Badge: Aktiv (gelb), Geplant (grau), Abgeschlossen (grün). */
export function StatusBadge({ status }: { status: TournamentStatus }) {
  const t = useTranslations("League.ListPage");

  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black">
        <span className="h-1.5 w-1.5 rounded-full bg-black" aria-hidden="true" />
        {t("badgeActive")}
      </span>
    );
  }

  if (status === "finished") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-300">
        <Check size={12} strokeWidth={3} aria-hidden="true" />
        {t("badgeFinished")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white/70">
      <CalendarDays size={12} strokeWidth={2.5} aria-hidden="true" />
      {t("badgePlanned")}
    </span>
  );
}
