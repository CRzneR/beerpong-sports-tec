"use client";

import { useEffect, useState } from "react";

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

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center text-sm font-bold text-white/40">
        Lade Profil …
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-red-400/20 bg-red-400/[0.05] p-8 text-center text-sm font-bold text-red-400/80">
        {error}
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center text-sm font-bold text-white/50">
        Melde dich an, um dein Profil und deine Statistiken zu sehen.
      </section>
    );
  }

  const matches = stats?.matches ?? 0;
  const hitRate = stats?.hitRate ?? 0;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.025] to-transparent p-6 sm:p-8 lg:p-10">
      {/* Glow */}
      <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-[100px]" />

      <div className="relative z-10 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        {/* Player */}
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10 text-2xl font-black text-cyan-400">
            {profile.initials}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                {matches} {matches === 1 ? "Match" : "Matches"}
              </span>
            </div>

            <h1 className="text-3xl font-black uppercase tracking-[-0.05em] text-white sm:text-4xl">
              {profile.name}
            </h1>
          </div>
        </div>

        {/* Trefferquote */}
        <div className="sm:text-right">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25">
            Trefferquote
          </div>

          <div className="mt-1 text-4xl font-black tracking-[-0.05em] text-cyan-400">
            {hitRate}%
          </div>
        </div>
      </div>
    </section>
  );
}
