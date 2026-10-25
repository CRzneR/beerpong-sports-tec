"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { getOwnProfile, type PlayerProfile } from "@/app/spieler/match/playerProfiles";
import { getPlayerRank } from "@/app/spieler/match/playerStats";

/*
 * --------------------------------------------------------------------------
 * | KOPF DER SEITE: SPIELERPROFIL + "MATCH STARTEN"
 * --------------------------------------------------------------------------
 *
 * Eine äußere Karte mit einer inneren, umrandeten Karte. Links das Profil
 * (Name, Weltrang), rechts die Kachel "Match starten". Die
 * Kachel steht bewusst in jedem Zustand da (auch ohne Login) - spielen
 * soll immer gehen.
 * --------------------------------------------------------------------------
 */

export function PlayerHero() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
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
          /*
           * Rang separat und ohne await: Er braucht die gesamte
           * Rangliste und soll das Profil nicht ausbremsen. Schlägt er
           * fehl, fehlt nur die Rang-Zeile.
           */
          getPlayerRank(ownProfile.id)
            .then((result) => {
              if (!cancelled) {
                setRank(result);
              }
            })
            .catch((err) => console.error("Fehler beim Laden des Rangs:", err));
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

  /* Linke Seite der inneren Karte je nach Zustand. */

  let left: ReactNode;

  if (loading) {
    left = (
      <div>
        <ProfileLabel />
        <div className="mt-2 text-sm font-bold text-white/40">Lade Profil …</div>
      </div>
    );
  } else if (error) {
    left = (
      <div>
        <ProfileLabel />
        <div className="mt-2 text-sm font-bold text-red-400/80">{error}</div>
      </div>
    );
  } else if (!profile) {
    left = (
      <div>
        <ProfileLabel />
        <div className="mt-2 text-sm font-bold text-white/50">
          Melde dich an, um dein Profil und deine Statistiken zu sehen.
        </div>
      </div>
    );
  } else {
    left = (
      <div className="min-w-0">
        <ProfileLabel />

        <h1 className="mt-1 break-words text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          {profile.name}
        </h1>

        {rank && (
          <div
            title={`Platz ${rank.rank} von ${rank.total} registrierten Spielern`}
            className="mt-1 text-sm font-medium uppercase tracking-wide text-cyan-400"
          >
            #{rank.rank} Weltweit
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-[2rem] bg-white/[0.04] p-3 sm:p-4">
      <div className="flex flex-col gap-5 rounded-3xl border border-white/[0.1] bg-[#08090b] p-5 sm:p-6 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0">{left}</div>

        <StartMatchTile />
      </div>
    </section>
  );
}

function ProfileLabel() {
  return (
    <div className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 sm:text-[13px]">
      Spielerprofil
    </div>
  );
}

/*
 * KACHEL "MATCH STARTEN"
 *
 * Unabhängig von Login und Pro-Status. Am Handy volle Breite unter dem
 * Profil, ab md rechts neben dem Profil.
 */

function StartMatchTile() {
  return (
    <Link
      href="/spieler/match"
      className="group flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.08] px-8 py-5 text-cyan-300 transition duration-200 hover:border-cyan-400/45 hover:bg-cyan-400/[0.14] md:min-w-[220px] md:py-7"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17L17 7" />
        <path d="M8 7h9v9" />
      </svg>

      <span className="text-sm font-medium uppercase tracking-wide sm:text-base">
        Match starten
      </span>
    </Link>
  );
}
