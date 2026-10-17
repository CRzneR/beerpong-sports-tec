"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import {
  syncAchievements,
  type AchievementKey,
  type AchievementView,
} from "@/app/spieler/match/achievements";

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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {unlocked.map((item) => {
          const tier = TIER_BY_KEY[item.key];

          return (
            <div
              key={item.key}
              className="relative flex flex-col items-center rounded-2xl border border-white/[0.08] bg-[#0b0f14] px-5 pb-5 pt-4 text-center"
            >
              {item.isNew && (
                <span className="absolute right-3 top-3 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-yellow-400">
                  Neu
                </span>
              )}

              <div className="relative h-44 w-full">
                <Image
                  src={badgeSrc(item.key)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw"
                  className="object-contain"
                />
              </div>

              <h3 className="mt-2 text-lg font-black tracking-tight text-white">{item.title}</h3>

              <p className="mt-1 max-w-[18rem] text-xs font-semibold leading-relaxed text-white/50">
                {item.description}
              </p>

              <span
                className={`mt-3 rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${TIER_STYLE[tier]}`}
              >
                {tier}
              </span>

              {item.unlockedAt && (
                <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                  Freigeschaltet am {formatDate(item.unlockedAt)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AchievementsSection() {
  const [achievements, setAchievements] = useState<AchievementView[] | null>(null);
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

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center text-sm font-bold text-white/40">
        Lade Achievements …
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center text-sm font-bold text-white/50">
        Melde dich an, um deine Achievements zu sehen.
      </div>
    );
  }

  if (error || !achievements) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-center text-sm font-bold text-red-400/80">
        {error ?? "Achievements konnten nicht geladen werden."}
      </div>
    );
  }

  return <AchievementsView achievements={achievements} />;
}
