"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { PlayerHero } from "@/components/stats/PlayerHero";
import { PerformanceStats } from "@/components/stats/PerformanceStats";
import { PerformanceChart } from "@/components/stats/PerformanceChart";
import { PerformanceDetail } from "@/components/stats/PerformanceDetail";
import MatchHistory from "@/components/stats/MatchHistory";
import MatchHistoryDetail from "@/components/stats/match/MatchHistoryDetail";
import PlayerRanking from "@/components/stats/match/PlayerRanking";
import PlayerDetail from "@/components/stats/match/PlayerDetail";

import { createClient } from "@/lib/supabase/client";

import type { SavedMatch } from "@/app/spieler/match/matchStorage";
import type { PlayerOverallStats } from "@/app/spieler/match/playerStats";

export default function SpielerPage() {
  const router = useRouter();

  const [selectedMatch, setSelectedMatch] = useState<SavedMatch | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOverallStats | null>(null);

  /*
   * LOGIN-STATUS
   */

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (cancelled) {
          return;
        }

        if (error) {
          console.error("Fehler beim Laden des Login-Status:", error);
        }

        setUserEmail(data.user?.email ?? null);
      })
      .finally(() => {
        if (!cancelled) {
          setAuthLoading(false);
        }
      });

    /*
     * Auf Login/Logout in anderen Tabs bzw. nach Rückkehr vom
     * E-Mail-Link reagieren, ohne die Seite neu laden zu müssen.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setUserEmail(session?.user?.email ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ZUGRIFFSSCHUTZ: DIE GANZE SEITE NUR FÜR EINGELOGGTE NUTZER
   *
   * Sobald der Login-Status feststeht (authLoading === false) und
   * niemand eingeloggt ist, geht's automatisch zu /login. router.replace
   * statt push, damit "Zurück" im Browser nicht wieder auf der
   * (dann sofort wieder wegleitenden) Statistik-Seite landet.
   */

  useEffect(() => {
    if (!authLoading && !userEmail) {
      router.replace("/login");
    }
  }, [authLoading, userEmail, router]);

  const handleLogout = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Fehler beim Abmelden:", error);
    }

    setUserEmail(null);
    setSigningOut(false);
  };

  /*
   * Solange der Login-Status noch nicht feststeht, oder während der
   * Weiterleitung zu /login läuft, wird bewusst nichts vom
   * eigentlichen Seiteninhalt gerendert - sonst würde die Statistik-
   * Seite kurz aufblitzen, bevor der Redirect greift.
   */

  if (authLoading || !userEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050708] text-sm font-bold text-white/40">
        Lade …
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050708] text-white">
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
              <span className="text-sm">🍺</span>
            </div>

            <div className="leading-none">
              <div className="text-xs font-black tracking-wider text-white">BEERPONG</div>

              <div className="mt-1 text-[9px] font-bold tracking-[0.25em] text-emerald-400">
                SPORTS TEC
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.25em] text-white/25 sm:block">
              Player Platform
            </span>

            <div className="h-1 w-1 rounded-full bg-cyan-400" />

            <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              Pong Stats
            </span>

            <div className="ml-2 h-4 w-px bg-white/[0.08]" />

            <div className="flex items-center gap-2">
              <span className="hidden max-w-[140px] truncate text-[10px] font-bold text-white/40 sm:block">
                {userEmail}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/50 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {signingOut ? "…" : "Abmelden"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Zurück zur Startseite
        </Link>

        {selectedMatch ? (
          <section>
            <MatchHistoryDetail match={selectedMatch} onBack={() => setSelectedMatch(null)} />
          </section>
        ) : selectedPlayer ? (
          <section>
            <PlayerDetail
              playerId={selectedPlayer.playerId}
              onBack={() => setSelectedPlayer(null)}
            />
          </section>
        ) : (
          <>
            <PlayerHero />

            <section className="mt-10">
              <SectionTitle eyebrow="01" title="Performance" />
              <PerformanceStats />
            </section>

            <section className="mt-14">
              <SectionTitle eyebrow="02" title="Performance Verlauf" />
              <PerformanceChart />
            </section>

            <section className="mt-14">
              <SectionTitle eyebrow="03" title="Statistiken im Detail" />
              <PerformanceDetail />
            </section>

            <section className="mt-14">
              <SectionTitle eyebrow="04" title="Letzte Matches" />

              <MatchHistory onSelectMatch={setSelectedMatch} />
            </section>

            <section className="mt-14">
              <SectionTitle eyebrow="05" title="Spieler Rangliste" />

              <PlayerRanking onSelectPlayer={(player) => setSelectedPlayer(player)} />
            </section>

            <section className="mt-14 pb-16">
              <Link
                href="/spieler/match"
                className="group relative flex min-h-28 items-center justify-between overflow-hidden rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] px-6 transition duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/[0.08] sm:px-8"
              >
                <div className="absolute -right-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[70px]" />

                <div className="relative">
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                    Ready?
                  </div>

                  <div className="mt-2 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
                    Neues Match starten
                  </div>

                  <div className="mt-1 text-xs text-white/35">Spieler hinzufügen und loslegen.</div>
                </div>

                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xl font-bold text-black transition-transform duration-300 group-hover:translate-x-1">
                  →
                </div>
              </Link>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5 flex items-end gap-4">
      <span className="text-[10px] font-bold tracking-[0.25em] text-cyan-400/50">{eyebrow}</span>

      <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-white sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}
