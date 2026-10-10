"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * --------------------------------------------------------------------------
 * | PLATTFORM-SEKTION (mit GSAP)
 * --------------------------------------------------------------------------
 *
 * - Beim Scrollen: Überschrift (Zeilen werden aufgedeckt), Karten bauen sich
 *   auf, die Feature-Zeilen laufen nacheinander ein
 * - In den Vorschauen: Zahlen zählen hoch, Balken wachsen, die
 *   Liga-Spiele laufen ein, "LIVE" pulsiert
 * - Maus (nur mit Zeigergerät): Karten kippen leicht, ein Licht-Spot
 *   folgt dem Zeiger über die Karte
 * - "Reduzierte Bewegung": keine Animation, alles bleibt wie im Quelltext
 *
 * Die Karte besteht aus drei Schichten, weil GSAP "transform" inline
 * schreibt und Tailwinds Hover-Transform sonst blockieren würde:
 *   area  (ruhend, liefert stabile Maße für die Mausposition)
 *   card  (GSAP: Einlauf + Kippen)
 *   inner (das sichtbare Design samt hover:-translate-y-1)
 * --------------------------------------------------------------------------
 */

function formatCount(value: number, decimals: number, suffix: string, thousands: boolean) {
  const [integerPart, decimalPart] = value.toFixed(decimals).split(".");

  const integer = thousands ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : integerPart;

  return `${integer}${decimalPart ? `.${decimalPart}` : ""}${suffix}`;
}

export function PlatformSection() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const all = (selector: string, scope: ParentNode = root) =>
      Array.from(scope.querySelectorAll<HTMLElement>(selector));

    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        fine: "(hover: hover) and (pointer: fine)",
      },
      (context) => {
        const conditions = context.conditions ?? {};

        if (!conditions.motion) {
          return undefined;
        }

        const cleanups: Array<() => void> = [];

        /* ---------- Überschrift ---------- */

        const header = root.querySelector<HTMLElement>('[data-platform="header"]');
        const masks = all('[data-platform="mask"]');

        if (header) {
          gsap.fromTo(
            all('[data-platform="fade"]', header),
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: { trigger: header, start: "top 82%", once: true },
            },
          );

          gsap.fromTo(
            all('[data-platform="line"]', header),
            { yPercent: 115 },
            {
              yPercent: 0,
              duration: 1.1,
              stagger: 0.12,
              ease: "power4.out",
              scrollTrigger: { trigger: header, start: "top 82%", once: true },
              onComplete: () => {
                gsap.set(masks, { overflow: "visible" });
              },
            },
          );
        }

        /* Hintergrund-Glow wandert beim Scrollen minimal mit */
        const glow = root.querySelector<HTMLElement>('[data-platform="glow"]');

        if (glow) {
          gsap.fromTo(
            glow,
            { yPercent: -10 },
            {
              yPercent: 25,
              ease: "none",
              scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }

        /* ---------- Karten ---------- */

        all('[data-platform="area"]').forEach((area) => {
          const card = area.querySelector<HTMLElement>('[data-platform="card"]');

          if (!card) {
            return;
          }

          gsap.fromTo(
            card,
            { y: 70, opacity: 0, scale: 0.97 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 1.1,
              ease: "power3.out",
              scrollTrigger: { trigger: area, start: "top 85%", once: true },
            },
          );

          gsap.fromTo(
            all("[data-feature]", area),
            { x: -18, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: "power2.out",
              scrollTrigger: { trigger: area, start: "top 65%", once: true },
            },
          );

          /* Liga-Vorschau: Spiele laufen nacheinander ein */
          const matches = all("[data-match]", area);

          if (matches.length > 0) {
            gsap.fromTo(
              matches,
              { y: 16, opacity: 0, scale: 0.94 },
              {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.6,
                stagger: 0.12,
                ease: "back.out(1.6)",
                scrollTrigger: { trigger: area, start: "top 55%", once: true },
              },
            );
          }

          /* Stats-Vorschau: Balken wachsen von unten */
          const bars = all("[data-bar]", area);

          if (bars.length > 0) {
            gsap.set(bars, { scaleY: 0, transformOrigin: "50% 100%" });

            gsap.to(bars, {
              scaleY: 1,
              duration: 0.7,
              stagger: 0.05,
              ease: "back.out(1.4)",
              scrollTrigger: { trigger: area, start: "top 55%", once: true },
            });
          }

          /* Zahlen zählen hoch */
          all("[data-count]", area).forEach((element) => {
            const target = Number(element.dataset.count ?? 0);
            const decimals = Number(element.dataset.decimals ?? 0);
            const suffix = element.dataset.suffix ?? "";
            const thousands = element.dataset.thousands === "true";

            const finalText = element.textContent ?? "";
            const counter = { value: 0 };

            element.textContent = formatCount(0, decimals, suffix, thousands);

            cleanups.push(() => {
              element.textContent = finalText;
            });

            gsap.to(counter, {
              value: target,
              duration: 1.8,
              ease: "power2.out",
              scrollTrigger: { trigger: area, start: "top 55%", once: true },
              onUpdate: () => {
                element.textContent = formatCount(counter.value, decimals, suffix, thousands);
              },
              onComplete: () => {
                element.textContent = finalText;
              },
            });
          });

          /* ---------- Maus: Kippen + Licht-Spot ---------- */

          if (conditions.fine) {
            const spot = area.querySelector<HTMLElement>('[data-platform="spotlight"]');

            gsap.set(card, { transformPerspective: 1200 });

            const rotateX = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3.out" });
            const rotateY = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" });

            const handleEnter = () => {
              if (spot) {
                gsap.to(spot, { opacity: 1, duration: 0.4 });
              }
            };

            const handleMove = (event: PointerEvent) => {
              /* Maße kommen vom ruhenden "area"-Element, nicht von der gekippten Karte */
              const rect = area.getBoundingClientRect();
              const x = event.clientX - rect.left;
              const y = event.clientY - rect.top;

              rotateY((x / rect.width - 0.5) * 8);
              rotateX((0.5 - y / rect.height) * 8);

              if (spot) {
                spot.style.setProperty("--mx", `${x}px`);
                spot.style.setProperty("--my", `${y}px`);
              }
            };

            const handleLeave = () => {
              rotateX(0);
              rotateY(0);

              if (spot) {
                gsap.to(spot, { opacity: 0, duration: 0.5 });
              }
            };

            area.addEventListener("pointerenter", handleEnter);
            area.addEventListener("pointermove", handleMove);
            area.addEventListener("pointerleave", handleLeave);

            cleanups.push(() => {
              area.removeEventListener("pointerenter", handleEnter);
              area.removeEventListener("pointermove", handleMove);
              area.removeEventListener("pointerleave", handleLeave);
            });
          }
        });

        /* "LIVE" pulsiert */
        all('[data-platform="live"]').forEach((element) => {
          gsap.to(element, {
            opacity: 0.4,
            duration: 0.9,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        });

        return () => cleanups.forEach((cleanup) => cleanup());
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-[#050708] py-28 lg:py-36">
      {/* Background Glow (äußerer Wrapper zentriert per CSS, innerer wird von GSAP bewegt) */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <div
          data-platform="glow"
          className="h-[500px] w-[800px] rounded-full bg-emerald-400/[0.035] blur-[120px]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div data-platform="header" className="mx-auto max-w-3xl text-center">
          <div
            data-platform="fade"
            className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400"
          >
            The BeerPong Platform
          </div>

          <h2 className="text-4xl font-black uppercase leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
            <MaskLine>Zwei Bereiche.</MaskLine>

            <MaskLine>
              <span className="text-white/35">Ein Sport.</span>
            </MaskLine>
          </h2>

          <p
            data-platform="fade"
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg"
          >
            Organisiere deine Wettkämpfe mit Pong League und behalte deine persönliche Performance
            mit Pong Stats immer im Blick.
          </p>
        </div>

        {/* Product Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* PONG LEAGUE */}
          <ProductCard
            type="league"
            number="01"
            eyebrow="PONG LEAGUE"
            subtitle="Tournament Platform"
            logo="/images/landing/pong-league-logo.png"
            title={
              <>
                Compete.
                <br />
                <span className="text-yellow-400">Connect. Win.</span>
              </>
            }
            description="Erstelle Turniere, verwalte Teams und bringe deine Matches auf das nächste Level."
            features={["Turniere erstellen", "Teams & Spieler verwalten", "Spielplan & Ergebnisse"]}
            href="/turniere"
          />

          {/* PONG STATS */}
          <ProductCard
            type="stats"
            number="02"
            eyebrow="PONG STATS"
            subtitle="Player Performance"
            logo="/images/landing/pong-stats-logo.png"
            title={
              <>
                Track.
                <br />
                <span className="text-cyan-400">Improve. Repeat.</span>
              </>
            }
            description="Erstelle dein Spielerprofil, verfolge deine Performance und entdecke deine Entwicklung."
            features={[
              "Persönliches Spielerprofil",
              "Match-Historie & Statistiken",
              "Rankings & Achievements",
            ]}
            href="/spieler"
          />
        </div>
      </div>
    </section>
  );
}

/*
 * Eine Überschrift-Zeile mit Maske (Text schiebt sich von unten ein).
 * Innenabstand + negativer Außenabstand gleichen sich aus, damit die enge
 * Zeilenhöhe nichts abschneidet.
 */

function MaskLine({ children }: { children: ReactNode }) {
  return (
    <span
      data-platform="mask"
      className="block overflow-hidden"
      style={{ paddingBlock: "0.12em", marginBlock: "-0.12em" }}
    >
      <span data-platform="line" className="block">
        {children}
      </span>
    </span>
  );
}

/* =======================================================
   PRODUCT CARD
======================================================= */

function ProductCard({
  type,
  number,
  eyebrow,
  subtitle,
  logo,
  title,
  description,
  features,
  href,
}: {
  type: "league" | "stats";
  number: string;
  eyebrow: string;
  subtitle: string;
  logo: string;
  title: React.ReactNode;
  description: string;
  features: string[];
  href: string;
}) {
  const isLeague = type === "league";

  /* Farbe des Licht-Spots (RGB), als fester Wert statt Tailwind-Klasse */
  const spotlightRgb = isLeague ? "250, 204, 21" : "34, 211, 238";

  return (
    <div data-platform="area" className="h-full">
      <div data-platform="card" className="h-full">
        <div
          className={`group relative h-full overflow-hidden rounded-[2rem] border p-7 transition duration-500 hover:-translate-y-1 sm:p-9 lg:p-10 ${
            isLeague
              ? "border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.07] via-white/[0.025] to-transparent hover:border-yellow-400/30"
              : "border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.07] via-white/[0.025] to-transparent hover:border-cyan-400/30"
          }`}
        >
          {/* Background Glow */}
          <div
            className={`absolute -right-32 -top-32 h-72 w-72 rounded-full blur-[100px] transition duration-500 group-hover:scale-125 ${
              isLeague ? "bg-yellow-400/10" : "bg-cyan-400/10"
            }`}
          />

          {/* Licht-Spot, folgt dem Mauszeiger (nur mit Zeigergerät) */}
          <div
            data-platform="spotlight"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0"
            style={{
              background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(${spotlightRgb}, 0.10), transparent 60%)`,
            }}
          />

          <div className="relative z-10">
            {/* Top Row */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-white/25">
                    {number}
                  </span>

                  <span
                    className={`text-[11px] font-bold uppercase tracking-[0.25em] ${
                      isLeague ? "text-yellow-400" : "text-cyan-400"
                    }`}
                  >
                    {eyebrow}
                  </span>
                </div>

                <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
                  {subtitle}
                </div>
              </div>

              {/* Product Logo */}
              <div
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border transition duration-500 group-hover:scale-105 ${
                  isLeague ? "border-yellow-400/20" : "border-cyan-400/20"
                }`}
              >
                <Image
                  src={logo}
                  alt={`${eyebrow} Logo`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Title */}
            <h3 className="mt-8 text-3xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white sm:text-4xl">
              {title}
            </h3>

            {/* Description */}
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/50 sm:text-base">
              {description}
            </p>

            {/* Features */}
            <div className="mt-7 space-y-3">
              {features.map((feature) => (
                <div
                  key={feature}
                  data-feature
                  className="flex items-center gap-3 text-sm text-white/75"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      isLeague ? "bg-yellow-400/10 text-yellow-400" : "bg-cyan-400/10 text-cyan-400"
                    }`}
                  >
                    ✓
                  </span>

                  {feature}
                </div>
              ))}
            </div>

            {/* Product Preview */}
            <div className="relative mt-10 h-52 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080b0c]">
              {isLeague ? <LeaguePreview /> : <StatsPreview />}
            </div>

            {/* CTA */}
            <Link
              href={href}
              className={`mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-wide text-black transition duration-300 ${
                isLeague
                  ? "bg-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.18)] hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_35px_rgba(250,204,21,0.3)]"
                  : "bg-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.18)] hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_0_35px_rgba(34,211,238,0.3)]"
              }`}
            >
              {isLeague ? "Pong League entdecken" : "Pong Stats entdecken"}

              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =======================================================
   PONG LEAGUE PREVIEW
======================================================= */

function LeaguePreview() {
  return (
    <div className="absolute inset-0 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Pong League
          </div>

          <div className="mt-1 text-xs font-bold text-white">Spring Championship</div>
        </div>

        <span
          data-platform="live"
          className="rounded-full bg-yellow-400/10 px-2 py-1 text-[9px] font-bold text-yellow-400"
        >
          LIVE
        </span>
      </div>

      {/* Matches */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <LeagueMatch teamA="BPM Kings" teamB="Cup Destroyers" score="7 : 5" />

        <LeagueMatch teamA="Beer Bros" teamB="Red Cups" score="6 : 8" />

        <LeagueMatch teamA="The Tossers" teamB="Brew Crew" score="4 : 7" />
      </div>
    </div>
  );
}

function LeagueMatch({ teamA, teamB, score }: { teamA: string; teamB: string; score: string }) {
  return (
    <div data-match className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <div className="text-[9px] text-white/50">{teamA}</div>

      <div className="my-2 text-center text-sm font-black text-white">{score}</div>

      <div className="text-right text-[9px] text-white/50">{teamB}</div>
    </div>
  );
}

/* =======================================================
   PONG STATS PREVIEW
======================================================= */

function StatsPreview() {
  return (
    <div className="absolute inset-0 p-5">
      {/* Player */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-sm font-black text-black">
          MB
        </div>

        <div>
          <div className="text-xs font-bold text-white">MaxBPM</div>

          <div className="text-[9px] uppercase tracking-wider text-white/30">Player Level 12</div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <StatBox value={128} label="Matches" />

        <StatBox value={72.7} decimals={1} suffix="%" label="Winrate" />

        <StatBox value={1842} thousands label="Cups" />
      </div>

      {/* Chart */}
      <div className="mt-4 flex h-12 items-end gap-1">
        {[30, 42, 35, 52, 48, 65, 58, 75, 68, 88, 82, 96].map((height, index) => (
          <div
            key={index}
            data-bar
            className="flex-1 rounded-t-sm bg-cyan-400/30"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* =======================================================
   STAT BOX
======================================================= */

/*
 * Der Zahlentext steht im Quelltext bereits in seiner Endform (auch ohne
 * JavaScript und für Suchmaschinen korrekt) - die Animation zählt nur
 * dorthin hoch.
 */

function StatBox({
  value,
  label,
  decimals = 0,
  suffix = "",
  thousands = false,
}: {
  value: number;
  label: string;
  decimals?: number;
  suffix?: string;
  thousands?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div
        data-count={value}
        data-decimals={decimals}
        data-suffix={suffix}
        data-thousands={thousands}
        className="text-base font-black text-white"
      >
        {formatCount(value, decimals, suffix, thousands)}
      </div>

      <div className="mt-1 text-[8px] uppercase tracking-wider text-white/30">{label}</div>
    </div>
  );
}
