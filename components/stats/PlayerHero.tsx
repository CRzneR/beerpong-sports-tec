"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { getOwnProfile, type PlayerProfile } from "@/app/spieler/match/playerProfiles";
import { getPlayerOverallStats, type PlayerOverallStats } from "@/app/spieler/match/playerStats";

export function PlayerHero() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerOverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ownProfile = await getOwnProfile();

        if (cancelled) {
          return;
        }

        setProfile(ownProfile);

        if (ownProfile) {
          const overallStats = await getPlayerOverallStats(ownProfile.id);

          if (!cancelled) {
            setStats(overallStats);
          }
        }
      } catch (err) {
        console.error("Fehler beim Laden des Profils:", err);

        if (!cancelled) {
          setError("Profil konnte nicht geladen werden.");
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

  /*
   * LINKE KARTE (Profil bzw. der jeweilige Lade-/Fehler-/Gast-Zustand)
   *
   * Steht jetzt neben der "Match starten"-Karte statt über die volle
   * Breite - beide Karten sind in derselben Reihe gleich hoch (siehe
   * Grid unten).
   */

  let hero: ReactNode;

  if (loading) {
    hero = (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center text-sm font-bold text-white/40">
        Lade Profil …
      </section>
    );
  } else if (error) {
    hero = (
      <section className="rounded-[2rem] border border-red-400/20 bg-red-400/[0.05] p-8 text-center text-sm font-bold text-red-400/80">
        {error}
      </section>
    );
  } else if (!profile) {
    hero = (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center text-sm font-bold text-white/50">
        Melde dich an, um dein Profil und deine Statistiken zu sehen.
      </section>
    );
  } else {
    const matches = stats?.matches ?? 0;

    hero = (
      <section className="relative flex items-center overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.025] to-transparent p-6 sm:p-8">
        {/* Glow */}
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-[100px]" />

        <div className="relative z-10 flex min-w-0 items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10 text-2xl font-black text-cyan-400">
            {profile.initials}
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                {matches} {matches === 1 ? "Match" : "Matches"}
              </span>
            </div>

            <h1 className="break-words text-3xl font-black uppercase tracking-[-0.05em] text-white sm:text-4xl">
              {profile.name}
            </h1>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {hero}

      <StartMatchCard />
    </div>
  );
}

/*
 * "MATCH STARTEN" NEBEN DEM PROFIL
 *
 * Zusätzlich zur großen Karte ganz unten auf der Seite - bewusst
 * unabhängig von Login und Pro-Status, spielen soll immer gehen.
 */

function StartMatchCard() {
  return (
    <Link
      href="/spieler/match"
      className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-cyan-400/[0.05] p-6 transition duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/[0.08] sm:p-8"
    >
      <div className="absolute -right-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[70px]" />

      <div className="relative">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">
          Ready?
        </div>

        <div className="mt-2 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
          Match starten
        </div>

        <div className="mt-1 text-xs text-white/35">Spieler hinzufügen und loslegen.</div>
      </div>

      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xl font-bold text-black transition-transform duration-300 group-hover:translate-x-1">
        →
      </div>
    </Link>
  );
}
