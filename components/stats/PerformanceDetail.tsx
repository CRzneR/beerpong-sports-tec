"use client";

import { useEffect, useState } from "react";

import { getOwnProfile, resetPlayerStats } from "@/app/spieler/match/playerProfiles";
import { getPlayerDetailStats, type PlayerDetailStats } from "@/app/spieler/match/playerStats";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PerformanceDetail() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [stats, setStats] = useState<PlayerDetailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  /*
   * ZURÜCKSETZEN
   *
   * Bewusst hier statt am Avatar/Profilbild platziert - inhaltlich
   * gehört "Statistiken zurücksetzen" direkt zu den Zahlen, die diese
   * Karte anzeigt.
   */
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await getOwnProfile();

        if (!profile) {
          if (!cancelled) {
            setLoggedIn(false);
            setLoading(false);
          }

          return;
        }

        setProfileId(profile.id);

        const detail = await getPlayerDetailStats(profile.id);

        if (!cancelled) {
          setStats(detail);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Detail-Statistiken:", err);
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

  const handleConfirmReset = async () => {
    if (!profileId || resetting) {
      return;
    }

    setResetting(true);
    setResetError(null);

    try {
      await resetPlayerStats(profileId);

      /*
       * Statistiken werden an mehreren, unabhängig voneinander
       * ladenden Stellen dieser Seite angezeigt (PerformanceStats,
       * PerformanceChart, PlayerHero, PlayerRanking). Statt das über
       * mehrere Komponenten hinweg zu synchronisieren, wird nach
       * erfolgreichem Reset einmal neu geladen.
       */
      window.location.reload();
    } catch (err) {
      console.error("Fehler beim Zurücksetzen der Statistiken:", err);

      setResetError("Zurücksetzen fehlgeschlagen. Bitte versuch es erneut.");
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 text-center text-sm font-bold text-white/40 sm:p-8">
        Lade Statistiken …
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 text-center text-sm font-bold text-white/50 sm:p-8">
        Melde dich an, um deine Detail-Statistiken zu sehen.
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 text-center text-sm font-bold text-white/40 sm:p-8">
        Noch keine abgeschlossenen Matches für Detail-Statistiken.
      </div>
    );
  }

  const offset = CIRCUMFERENCE * (1 - stats.winRate / 100);

  const rows = [
    { label: "Ø Becher pro Spiel", value: stats.avgCupsPerMatch.toFixed(1).replace(".", ",") },
    { label: "Höchste Trefferquote", value: `${stats.bestHitRate}%` },
    { label: "Längste Siegesserie", value: String(stats.longestWinStreak) },
  ];

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
      <div className="text-sm font-black uppercase tracking-wide text-white">
        Statistiken im Detail
      </div>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
        {/* WIN RATE DONUT */}
        <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
          <svg viewBox="0 0 140 140" className="h-32 w-32 -rotate-90">
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="12"
            />
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-black text-white">
              {stats.winRate.toFixed(1).replace(".", ",")}%
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/30">
              Win Rate
            </span>
          </div>
        </div>

        {/* METRIKEN */}
        <div className="w-full divide-y divide-white/[0.06]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="text-xs font-bold text-white/50">{row.label}</span>
              <span className="text-base font-black text-white">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ZURÜCKSETZEN */}
      <div className="mt-6 flex justify-end border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="text-[10px] font-bold uppercase tracking-wider text-red-400/60 transition hover:text-red-400"
        >
          Statistiken zurücksetzen
        </button>
      </div>

      {/* BESTÄTIGUNGS-OVERLAY */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0c0f16] p-6 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
              Achtung
            </div>

            <h2 className="mt-1 text-lg font-black uppercase text-white">
              Statistiken wirklich zurücksetzen?
            </h2>

            <p className="mt-2 text-xs text-white/40">
              Deine bisherigen Matches, Trefferquote und Serien werden aus deiner Statistik
              entfernt. Das kann nicht rückgängig gemacht werden.
            </p>

            {resetError && (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-3 py-2 text-xs font-bold text-red-400/80">
                {resetError}
              </div>
            )}

            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={resetting}
                onClick={handleConfirmReset}
                className="w-full rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {resetting ? "Wird zurückgesetzt …" : "Ja, zurücksetzen"}
              </button>

              <button
                type="button"
                disabled={resetting}
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetError(null);
                }}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
