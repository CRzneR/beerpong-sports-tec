"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import {
  syncAchievements,
  type AchievementKey,
  type AchievementView,
} from "@/app/spieler/match/achievements";
import { PanelModal, PanelTitle } from "./PanelCard";

/*
 * --------------------------------------------------------------------------
 * | ACHIEVEMENTS IM PROFIL
 * --------------------------------------------------------------------------
 *
 * AchievementsSection lädt die Daten (und speichert dabei neu erreichte
 * Achievements), AchievementsView zeigt sie nur an.
 *
 * Bewusst ohne Animation im Spiel: Achievements erscheinen ausschließlich
 * hier im Profil, neu erreichte mit einer "Neu"-Markierung. Gesperrte
 * Achievements werden gar nicht angezeigt.
 *
 * Bilder: public/achievements/<key>.webp (siehe badgeSrc).
 * --------------------------------------------------------------------------
 */

/*
 * Rang-Stufe pro Achievement (die Pille unter der Beschreibung).
 * Reine Darstellung - die Stufe wird hier festgelegt, nicht berechnet.
 * Klassen stehen bewusst als vollständige Strings da, damit Tailwind sie
 * beim Build nicht wegoptimiert.
 */

type Tier = "ROOKIE" | "CONTENDER" | "ELITE" | "MASTER" | "LEGEND";

const TIER_BY_KEY: Record<AchievementKey, Tier> = {
  marathon: "ROOKIE",
  perfectionist: "CONTENDER",
  onFire: "ELITE",
  unstoppable: "MASTER",
  deadeye: "ROOKIE",
  lastShot: "MASTER",
  chosenOne: "LEGEND",
  undefeatedChampion: "LEGEND",
  anomaly: "LEGEND",
};

const TIER_STYLE: Record<Tier, string> = {
  ROOKIE: "border-orange-400/40 bg-orange-700/30 text-orange-200",
  CONTENDER: "border-slate-300/35 bg-slate-500/25 text-slate-100",
  ELITE: "border-yellow-500/45 bg-yellow-700/30 text-yellow-200",
  MASTER: "border-violet-400/45 bg-violet-600/30 text-violet-200",
  LEGEND: "border-red-400/45 bg-red-700/30 text-red-200",
};

/*
 * Badge-Bilder liegen in public/achievements/<key>.webp
 * (Dateiname = AchievementKey, z. B. marathon.webp).
 */

function badgeSrc(key: AchievementKey): string {
  return `/achievements/${key}.webp`;
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("de-DE");
}

export function AchievementsView({ achievements }: { achievements: AchievementView[] }) {
  /*
   * Nur FREIGESCHALTETE Achievements werden gezeigt. Gesperrte tauchen
   * nirgends auf - weder als Karte noch als Fortschritt oder Zähler
   * ("x von 9"), damit man sie erst beim Freischalten entdeckt.
   * Neueste zuerst.
   */

  const unlocked = achievements
    .filter((item) => item.unlocked)
    .sort((a, b) => {
      const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;

      return timeB - timeA;
    });

  if (unlocked.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center">
        <div className="text-sm font-bold text-white/50">
          Noch keine Achievements freigeschaltet.
        </div>
        <div className="mt-1 text-xs font-semibold text-white/30">
          Spiele Matches, um Achievements zu entdecken.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-xs font-black uppercase tracking-wider text-white/60">
        {unlocked.length} {unlocked.length === 1 ? "Achievement" : "Achievements"} freigeschaltet
      </div>

      {/* Mobil 2 Karten nebeneinander, darüber 3 bzw. 4 - bewusst kompakt. */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
        {unlocked.map((item) => {
          const tier = TIER_BY_KEY[item.key];

          return (
            <div
              key={item.key}
              className="relative flex flex-col items-center rounded-xl border border-white/[0.08] bg-[#0b0f14] px-3 pb-3 pt-2.5 text-center md:rounded-2xl md:px-4 md:pb-4 md:pt-3"
            >
              {item.isNew && (
                <span className="absolute right-2 top-2 z-10 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-yellow-400">
                  Neu
                </span>
              )}

              <div className="relative h-24 w-full md:h-32">
                <Image
                  src={badgeSrc(item.key)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 30vw, 45vw"
                  className="object-contain"
                />
              </div>

              <h3 className="mt-1.5 text-sm font-black tracking-tight text-white md:text-base">
                {item.title}
              </h3>

              <p className="mt-0.5 text-[10px] font-semibold leading-snug text-white/50 md:text-[11px]">
                {item.description}
              </p>

              <span
                className={`mt-2 rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] md:px-3 md:text-[9px] ${TIER_STYLE[tier]}`}
              >
                {tier}
              </span>

              {item.unlockedAt && (
                <div className="mt-2 text-[8px] font-bold uppercase tracking-[0.1em] text-white/25 md:text-[9px]">
                  {formatDate(item.unlockedAt)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/*
 * KARTE IM PROFIL
 *
 * Zeigt die drei zuletzt freigeschalteten Achievements als kleine Vorschau.
 * "Alle Achievements" öffnet die komplette Übersicht in einem Overlay.
 */

const PREVIEW_COUNT = 3;

export function AchievementsSection() {
  const [achievements, setAchievements] = useState<AchievementView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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

        const result = await syncAchievements(profile.id);

        if (!cancelled) {
          setAchievements(result);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Achievements:", err);

        if (!cancelled) {
          setError("Achievements konnten nicht geladen werden.");
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
  }, []);

  const unlocked = (achievements ?? [])
    .filter((item) => item.unlocked)
    .sort((a, b) => {
      const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;

      return timeB - timeA;
    });

  let body: ReactNode;

  if (loading) {
    body = (
      <div className="py-8 text-center text-sm font-bold text-white/40">Lade Achievements …</div>
    );
  } else if (!loggedIn) {
    body = (
      <div className="py-8 text-center text-sm font-bold text-white/50">
        Melde dich an, um deine Achievements zu sehen.
      </div>
    );
  } else if (error || !achievements) {
    body = (
      <div className="py-8 text-center text-sm font-bold text-red-400/80">
        {error ?? "Achievements konnten nicht geladen werden."}
      </div>
    );
  } else if (unlocked.length === 0) {
    body = (
      <div className="flex items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 sm:gap-5 sm:p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white/25 sm:h-16 sm:w-16">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 21h8M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
            <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
          </svg>
        </div>

        <div>
          <div className="text-sm font-bold text-white/70">
            Noch keine Achievements freigeschaltet.
          </div>
          <div className="mt-1 text-xs font-semibold text-white/35">
            Spiele Matches, um Achievements zu entdecken.
          </div>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="grid grid-cols-3 gap-2.5">
        {unlocked.slice(0, PREVIEW_COUNT).map((item) => (
          <div
            key={item.key}
            className="relative flex flex-col items-center rounded-xl border border-white/[0.06] bg-[#0b0f14] px-2 pb-2.5 pt-2 text-center"
          >
            {item.isNew && (
              <span className="absolute right-1.5 top-1.5 z-10 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-yellow-400">
                Neu
              </span>
            )}

            <div className="relative h-16 w-full sm:h-20">
              <Image
                src={badgeSrc(item.key)}
                alt=""
                fill
                sizes="(min-width: 768px) 12vw, 28vw"
                className="object-contain"
              />
            </div>

            <div className="mt-1 text-[10px] font-black leading-tight text-white sm:text-[11px]">
              {item.title}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <section className="flex h-full flex-col rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
        <PanelTitle
          action={
            unlocked.length > 0 ? (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {unlocked.length} freigeschaltet
              </span>
            ) : null
          }
        >
          Achievements
        </PanelTitle>

        <div className="mt-5">{body}</div>

        {loggedIn && !loading && !error && achievements && (
          <div className="mt-auto flex justify-end pt-5">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/[0.06] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-400/[0.14]"
            >
              Alle Achievements
            </button>
          </div>
        )}
      </section>

      {showAll && achievements && (
        <PanelModal title="Achievements" onClose={() => setShowAll(false)}>
          <AchievementsView achievements={achievements} />
        </PanelModal>
      )}
    </>
  );
}
