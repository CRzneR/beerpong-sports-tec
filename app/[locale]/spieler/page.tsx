"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

import { PlayerHero } from "@/components/stats/PlayerHero";
import { PerformanceStats } from "@/components/stats/PerformanceStats";
import { PerformanceChart } from "@/components/stats/PerformanceChart";
import { PerformanceDetail } from "@/components/stats/PerformanceDetail";
import MatchHistory from "@/components/stats/MatchHistory";
import MatchHistoryDetail from "@/components/stats/match/MatchHistoryDetail";
import PlayerRanking from "@/components/stats/match/PlayerRanking";
import PlayerDetail from "@/components/stats/match/PlayerDetail";
import { RulesLink } from "@/components/RulesLink";
import ProPreviewModal from "@/components/stats/ProPreviewModal";
import { UsernameGate } from "@/components/stats/UsernameGate";
import { AchievementsSection } from "@/components/stats/AchievementsSection";
import { CupPositionStats } from "@/components/stats/CupPositionStats";
import { MatchupStats } from "@/components/stats/MatchupStats";
import { ComebackStats } from "@/components/stats/ComebackStats";
import { ProfileProgressCompact } from "@/components/stats/ProfileProgressCompact";
import { SkillRating } from "@/components/stats/SkillRating";
import { TournamentCard } from "@/components/stats/TournamentCard";
import { DeleteAccountSection } from "@/components/stats/DeleteAccountSection";
import { StatsRangeFilter } from "@/components/stats/StatsRangeFilter";
import {
  DashboardCustomizeButton,
  DashboardCustomizeModal,
  DASHBOARD_CARDS,
  useDashboardLayout,
} from "@/components/stats/DashboardLayout";

import { createClient } from "@/lib/supabase/client";
import { getOwnProStatus } from "@/app/[locale]/spieler/match/playerProfiles";

import type { SavedMatch } from "@/app/[locale]/spieler/match/matchStorage";
import type { PlayerOverallStats, StatsRange } from "@/app/[locale]/spieler/match/playerStats";
import { useLocale, useTranslations } from "next-intl";

const DASHBOARD_CARD_COUNT = DASHBOARD_CARDS.length;

function SpielerPageInner() {
  const t = useTranslations("Stats.SpielerPage");
  const locale = useLocale();

  const searchParams = useSearchParams();
  const proRedirectStatus = searchParams.get("pro");

  const [selectedMatch, setSelectedMatch] = useState<SavedMatch | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOverallStats | null>(null);

  /* Zeitraum für Performance, Verlauf, Detail und Becherpositionen. */
  const [range, setRange] = useState<StatsRange>("all");

  /* Dashboard anpassen: welche Karten sind sichtbar (pro Gerät gespeichert). */
  const layout = useDashboardLayout();
  const [customizeOpen, setCustomizeOpen] = useState(false);

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
   * MOBILES MENÜ
   *
   * Auf dem Handy passt die volle Leiste (Plattform-Name, Regeln,
   * E-Mail, Abmelden) nicht nebeneinander und drückt die Seite breiter
   * als den Bildschirm. Unter md bleiben deshalb nur Logo, Pro-Badge und
   * ein Konto-Knopf; Regeln und Abmelden stehen im aufklappbaren Menü.
   */

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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

  /*
   * PRO-VORSCHAU
   *
   * "Freischalten" startet nicht mehr direkt den Checkout, sondern öffnet
   * zuerst die Vorschau (ProPreviewModal). Erst deren Button
   * "Jetzt Pro freischalten" ruft handleUpgrade auf und leitet zu Stripe
   * weiter.
   */

  const [showProPreview, setShowProPreview] = useState(false);

  const openProPreview = () => {
    setUpgradeError(null);
    setShowProPreview(true);
  };

  const closeProPreview = () => {
    if (upgrading) {
      return;
    }

    setShowProPreview(false);
    setUpgradeError(null);
  };

  const handleUpgrade = async () => {
    if (upgrading) {
      return;
    }

    setUpgrading(true);
    setUpgradeError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Checkout failed.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Fehler beim Starten des Checkouts:", err);
      setUpgradeError(t("checkoutKonnteNichtGestartet"));
      setUpgrading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050708] text-white">
      <UsernameGate />
      <header className="relative z-40 border-b border-white/[0.08]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
              <img
                src="/images/landing/pong-stats-logo.png"
                alt={t("pongStatsLogo")}
                className="h-6 w-6 object-contain"
              />
            </div>

            <div className="leading-none">
              <div className="text-xs font-black tracking-wider text-white">{t("beerpong")}</div>

              <div className="mt-1 text-[9px] font-bold tracking-[0.25em] text-emerald-400">{t("sportsTec")}</div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.25em] text-white/25 lg:block">{t("playerPlatform")}</span>

            <div className="hidden h-1 w-1 rounded-full bg-cyan-400 md:block" />

            <span className="hidden text-xs font-black uppercase tracking-[0.2em] text-cyan-400 md:block">{t("pongStats")}</span>

            {isPro && (
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-400">{t("pro")}</span>
            )}

            <LanguageSwitcher />

            {/* Ab md: komplette Leiste */}

            <div className="hidden items-center gap-3 md:flex">
              <RulesLink />

              <div className="ml-2 h-4 w-px bg-white/[0.08]" />

              {authLoading ? null : userEmail ? (
                <div className="flex items-center gap-2">
                  <span className="hidden max-w-[140px] truncate text-[10px] font-bold text-white/40 lg:block">
                    {userEmail}
                  </span>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/50 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {signingOut ? "…" : t("abmelden")}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-400/[0.15]"
                >{t("anmelden")}</Link>
              )}
            </div>

            {/* Unter md: Konto-Knopf mit Menü (bzw. "Anmelden", wenn niemand eingeloggt ist) */}

            <div className="md:hidden">
              {authLoading ? null : userEmail ? (
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label={t("menue")}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/[0.08] text-xs font-black uppercase text-cyan-400 transition hover:bg-cyan-400/[0.15]"
                  >
                    {userEmail.charAt(0)}
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-white/[0.1] bg-[#0c0f16] p-2 shadow-xl"
                    >
                      <div className="truncate px-3 py-2 text-[11px] font-bold text-white/40">
                        {userEmail}
                      </div>

                      <div className="my-1 h-px bg-white/[0.08]" />

                      <Link
                        href="/regeln"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                      >{t("regeln")}</Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          void handleLogout();
                        }}
                        disabled={signingOut}
                        className="block w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {signingOut ? "…" : t("abmelden")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RulesLink />

                  <Link
                    href="/login"
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-400/[0.15]"
                  >{t("anmelden")}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>{t("zurueckZurStartseite")}</Link>

        {proRedirectStatus === "success" && (
          <div className="mb-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] px-5 py-4 text-sm font-bold text-cyan-300">{t("dankeFuerDeinenKauf")}</div>
        )}

        {proRedirectStatus === "cancelled" && (
          <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 text-sm font-bold text-white/40">{t("kaufAbgebrochenKeinProblem")}</div>
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
              <section className="mt-10 text-sm font-bold text-white/30">{t("lade")}</section>
            ) : (
              <>
                {upgradeError && (
                  <div className="mt-10 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80">
                    {upgradeError}
                  </div>
                )}

                {userEmail && (
                  <section className="mt-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <StatsRangeFilter value={range} onChange={setRange} />

                      <DashboardCustomizeButton
                        hiddenCount={layout.hidden.length}
                        onClick={() => setCustomizeOpen(true)}
                      />
                    </div>
                  </section>
                )}

                {layout.ready && (
                  <>
                    {(layout.isVisible("summary") || layout.isVisible("more")) && (
                      <section className="mt-4">
                        {/*
                          Die sechs Hauptwerte sind für alle sichtbar (auch ohne Pro).
                          "Weitere Statistiken" blendet PerformanceStats selbst nur mit
                          Pro ein.
                        */}
                        <PerformanceStats
                          isPro={isPro}
                          range={range}
                          showMain={layout.isVisible("summary")}
                          showMore={layout.isVisible("more")}
                        />
                      </section>
                    )}

                    {layout.isVisible("rating") && userEmail && (
                      <section className="mt-6 md:mt-8">
                        {/* Pro-Funktion: ohne Pro unscharf mit "Freischalten". */}
                        <ProLock
                          isPro={isPro}
                          loggedIn={Boolean(userEmail)}
                          onUpgrade={openProPreview}
                          upgrading={upgrading}
                        >
                          <SkillRating />
                        </ProLock>
                      </section>
                    )}

                    {(layout.isVisible("chart") || layout.isVisible("cups")) && (
                      <section className="mt-6 md:mt-8">
                        <ProLock
                          isPro={isPro}
                          loggedIn={Boolean(userEmail)}
                          onUpgrade={openProPreview}
                          upgrading={upgrading}
                        >
                          {/* Zwei Karten nebeneinander (mobil untereinander), gleich hoch; eine allein volle Breite. */}
                          <div
                            className={`grid gap-6 ${
                              layout.isVisible("chart") && layout.isVisible("cups")
                                ? "md:grid-cols-2"
                                : ""
                            }`}
                          >
                            {layout.isVisible("chart") && <PerformanceChart range={range} />}
                            {layout.isVisible("cups") && <CupPositionStats range={range} />}
                          </div>
                        </ProLock>
                      </section>
                    )}

                    {layout.isVisible("detail") && (
                      <section className="mt-6 md:mt-8">
                        <ProLock
                          isPro={isPro}
                          loggedIn={Boolean(userEmail)}
                          onUpgrade={openProPreview}
                          upgrading={upgrading}
                        >
                          <PerformanceDetail range={range} />
                        </ProLock>
                      </section>
                    )}

                    {layout.isVisible("flow") && (
                      <section className="mt-6 md:mt-8">
                        <ProLock
                          isPro={isPro}
                          loggedIn={Boolean(userEmail)}
                          onUpgrade={openProPreview}
                          upgrading={upgrading}
                        >
                          <ComebackStats range={range} />
                        </ProLock>
                      </section>
                    )}

                    {layout.isVisible("matchup") && (
                      <section className="mt-6 md:mt-8">
                        <ProLock
                          isPro={isPro}
                          loggedIn={Boolean(userEmail)}
                          onUpgrade={openProPreview}
                          upgrading={upgrading}
                        >
                          <MatchupStats range={range} />
                        </ProLock>
                      </section>
                    )}

                    {(layout.isVisible("achievements") || layout.isVisible("history")) && (
                      <section className="mt-6 md:mt-8">
                        <ProLock
                          isPro={isPro}
                          loggedIn={Boolean(userEmail)}
                          onUpgrade={openProPreview}
                          upgrading={upgrading}
                        >
                          {/* Zwei Karten nebeneinander (mobil untereinander), gleich hoch; eine allein volle Breite. */}
                          <div
                            className={`grid gap-6 ${
                              layout.isVisible("achievements") && layout.isVisible("history")
                                ? "md:grid-cols-2"
                                : ""
                            }`}
                          >
                            {layout.isVisible("achievements") && <AchievementsSection />}
                            {layout.isVisible("history") && (
                              <MatchHistory onSelectMatch={setSelectedMatch} />
                            )}
                          </div>
                        </ProLock>
                      </section>
                    )}

                    {layout.isVisible("progress") && userEmail && (
                      <section className="mt-6 md:mt-8">
                        {/* Pro-Funktion: ohne Pro unscharf mit "Freischalten". */}
                        <ProLock
                          isPro={isPro}
                          loggedIn={Boolean(userEmail)}
                          onUpgrade={openProPreview}
                          upgrading={upgrading}
                        >
                          <ProfileProgressCompact />
                        </ProLock>
                      </section>
                    )}

                    {layout.isVisible("ranking") && (
                      <section className="mt-6 md:mt-8">
                        <ProLock
                          isPro={isPro}
                          loggedIn={Boolean(userEmail)}
                          onUpgrade={openProPreview}
                          upgrading={upgrading}
                        >
                          <PlayerRanking onSelectPlayer={(player) => setSelectedPlayer(player)} />
                        </ProLock>
                      </section>
                    )}

                    {layout.isVisible("tournament") && userEmail && isPro && (
                      /* Pro-Funktion. Erscheint nur, wenn man in der Pong League mit einem Team verknüpft ist. */
                      <section className="mt-6 empty:hidden md:mt-8">
                        <TournamentCard />
                      </section>
                    )}

                    {layout.hidden.length === DASHBOARD_CARD_COUNT && (
                      <section className="mt-6 md:mt-8">
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
                          <div className="text-sm font-bold text-white/50">{t("alleKartenSindAusgeblendet")}</div>

                          <button
                            type="button"
                            onClick={layout.showAll}
                            className="mt-4 rounded-full border border-cyan-400/30 bg-cyan-400/[0.08] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-400/[0.16]"
                          >{t("alleAnzeigen")}</button>
                        </div>
                      </section>
                    )}
                  </>
                )}
              </>
            )}

            <section className="mt-8 pb-16">
              <Link
                href="/spieler/match"
                className="group relative flex min-h-28 items-center justify-between overflow-hidden rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] px-6 transition duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/[0.08] sm:px-8"
              >
                <div className="absolute -right-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[70px]" />

                <div className="relative">
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">{t("ready")}</div>

                  <div className="mt-2 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">{t("neuesMatchStarten")}</div>

                  <div className="mt-1 text-xs text-white/35">{t("spielerHinzufuegenUndLoslegen")}</div>
                </div>

                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xl font-bold text-black transition-transform duration-300 group-hover:translate-x-1">
                  →
                </div>
              </Link>
            </section>

            <DeleteAccountSection showResetStats />
          </>
        )}
      </div>

      {customizeOpen && (
        <DashboardCustomizeModal
          hidden={layout.hidden}
          onToggle={layout.toggle}
          onShowAll={layout.showAll}
          onClose={() => setCustomizeOpen(false)}
        />
      )}

      <ProPreviewModal
        open={showProPreview}
        onClose={closeProPreview}
        onUpgrade={handleUpgrade}
        upgrading={upgrading}
        error={upgradeError}
        loggedIn={Boolean(userEmail)}
      />
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

function ProLock({
  isPro,
  loggedIn,
  onUpgrade,
  upgrading,
  children,
}: {
  isPro: boolean;
  loggedIn: boolean;
  onUpgrade: () => void;
  upgrading: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("Stats.SpielerPage");

  if (isPro) {
    return <>{children}</>;
  }

  /*
   * Gäste sehen zuerst die Vorschau (ProPreviewModal) und werden erst
   * danach zur Anmeldung geführt - der Knopf hier öffnet nur die Vorschau.
   */
  if (!loggedIn) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">{t("proFunktion")}</div>

        <p className="mt-2 text-sm text-white/40">{t("siehDirAnWas")}</p>

        <button
          type="button"
          onClick={onUpgrade}
          className="mt-4 rounded-full border border-cyan-400/30 bg-cyan-400/[0.1] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-400/[0.18]"
        >{t("vorschauAnsehen")}</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-[#050708]/50 px-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-[#0c0f16]/95 px-6 py-5 text-center shadow-xl">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">{t("proFunktion")}</div>

          <button
            type="button"
            onClick={onUpgrade}
            disabled={upgrading}
            className="mt-3 rounded-full bg-cyan-400 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {upgrading ? t("laedt") : t("freischalten")}
          </button>
        </div>
      </div>
    </div>
  );
}
