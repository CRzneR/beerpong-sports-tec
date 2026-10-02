"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PlayerHero } from "@/components/stats/PlayerHero";
import { PerformanceStats } from "@/components/stats/PerformanceStats";
import { PerformanceChart } from "@/components/stats/PerformanceChart";
import { PerformanceDetail } from "@/components/stats/PerformanceDetail";
import MatchHistory from "@/components/stats/MatchHistory";
import MatchHistoryDetail from "@/components/stats/match/MatchHistoryDetail";
import PlayerRanking from "@/components/stats/match/PlayerRanking";
import PlayerDetail from "@/components/stats/match/PlayerDetail";

import { createClient } from "@/lib/supabase/client";
import { getOwnProStatus } from "@/app/spieler/match/playerProfiles";

import type { SavedMatch } from "@/app/spieler/match/matchStorage";
import type { PlayerOverallStats } from "@/app/spieler/match/playerStats";

/*
 * useSearchParams() braucht in Next.js einen Suspense-Wrapper auf der
 * Seite selbst (siehe auch LoginPage) - deshalb liegt die eigentliche
 * Seite in einer inneren Komponente, SpielerPage darunter ist nur der
 * Wrapper dafür.
 */

function SpielerPageInner() {
  const searchParams = useSearchParams();
  const proRedirectStatus = searchParams.get("pro");

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
   * PRO-STATUS (PAYWALL)
   *
   * Läuft neu, sobald sich userEmail ändert (Login/Logout) - damit der
   * Status nach dem Einloggen korrekt nachgeladen wird, statt auf dem
   * "nicht eingeloggt"-Stand von vorhin hängen zu bleiben.
   */

  const [isPro, setIsPro] = useState(false);
  const [proLoading, setProLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getOwnProStatus()
      .then((pro) => {
        if (!cancelled) {
          setIsPro(pro);
        }
      })
      .catch((err) => {
        console.error("Fehler beim Laden des Pro-Status:", err);
      })
      .finally(() => {
        if (!cancelled) {
          setProLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (upgrading) {
      return;
    }

    setUpgrading(true);
    setUpgradeError(null);

    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Checkout fehlgeschlagen.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Fehler beim Starten des Checkouts:", err);
      setUpgradeError("Checkout konnte nicht gestartet werden.");
      setUpgrading(false);
    }
  };

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

            {isPro && (
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-400">
                Pro
              </span>
            )}

            <div className="ml-2 h-4 w-px bg-white/[0.08]" />

            {authLoading ? null : userEmail ? (
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
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-400/[0.15]"
              >
                Anmelden
              </Link>
            )}
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

        {proRedirectStatus === "success" && (
          <div className="mb-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] px-5 py-4 text-sm font-bold text-cyan-300">
            Danke für deinen Kauf! Pro wird in der Regel innerhalb weniger Sekunden freigeschaltet -
            falls es noch nicht angezeigt wird, lade die Seite kurz neu.
          </div>
        )}

        {proRedirectStatus === "cancelled" && (
          <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 text-sm font-bold text-white/40">
            Kauf abgebrochen - kein Problem, du kannst es jederzeit erneut versuchen.
          </div>
        )}

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

            {proLoading ? (
              <section className="mt-10 text-sm font-bold text-white/30">Lade …</section>
            ) : isPro ? (
              <>
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
              </>
            ) : (
              <ProPaywall
                loggedIn={Boolean(userEmail)}
                onUpgrade={handleUpgrade}
                upgrading={upgrading}
                error={upgradeError}
              />
            )}

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

export default function SpielerPage() {
  return (
    <Suspense fallback={null}>
      <SpielerPageInner />
    </Suspense>
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

/*
 * --------------------------------------------------------------------------
 * | PRO-PAYWALL
 * --------------------------------------------------------------------------
 *
 * Ersetzt die Sektionen 01-05 komplett durch eine einzige Kauf-
 * Aufforderung, statt fünfmal denselben Hinweis zu wiederholen.
 * "Neues Match starten" bleibt davon unberührt und immer sichtbar -
 * spielen soll man auch ohne Pro können, nur die Auswertung ist bezahlt.
 * --------------------------------------------------------------------------
 */

function ProPaywall({
  loggedIn,
  onUpgrade,
  upgrading,
  error,
}: {
  loggedIn: boolean;
  onUpgrade: () => void;
  upgrading: boolean;
  error: string | null;
}) {
  return (
    <section className="mt-10 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.04] p-8 text-center sm:p-12">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
        Pong Stats Pro
      </div>

      <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
        Statistiken, Match-Historie &amp; Rangliste
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm text-white/40">
        Schalte mit einer einmaligen Zahlung dauerhaft deine persönliche Performance, die komplette
        Match-Historie und die Spieler-Rangliste frei.
      </p>

      {error && <div className="mt-4 text-xs font-bold text-red-400/80">{error}</div>}

      {loggedIn ? (
        <button
          type="button"
          onClick={onUpgrade}
          disabled={upgrading}
          className="mt-6 rounded-full bg-cyan-400 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {upgrading ? "Lädt …" : "Pro freischalten"}
        </button>
      ) : (
        <Link
          href="/login?next=/spieler"
          className="mt-6 inline-block rounded-full border border-cyan-400/30 bg-cyan-400/[0.1] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-cyan-400 transition hover:bg-cyan-400/[0.18]"
        >
          Zum Freischalten anmelden
        </Link>
      )}
    </section>
  );
}
