"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * --------------------------------------------------------------------------
 * | HERO (mit GSAP)
 * --------------------------------------------------------------------------
 *
 * - Einlauf: Headline-Zeilen werden aufgedeckt, der Rest folgt gestaffelt
 * - Scrollen: Hintergrund-Parallax, Inhalt blendet beim Verlassen aus
 * - Maus (nur mit Zeigergerät): Lichtkegel folgt dem Zeiger, das Foto
 *   verschiebt sich minimal gegenläufig. Die Buttons bleiben bewusst
 *   ruhig (kein Magnet-Effekt, kein Hochschieben beim Hover).
 * - "Reduzierte Bewegung" in den Systemeinstellungen: keine Animation,
 *   alles ist sofort sichtbar
 *
 * Zum Ausblenden VOR dem ersten Frame (kein kurzes Aufblitzen der
 * fertigen Inhalte) tragen die animierten Elemente das Attribut
 * data-hero-hide. GSAP blendet sie ein, sobald die Seite hydriert ist.
 * Ohne JavaScript bzw. bei reduzierter Bewegung greift das CSS nicht.
 *
 * Wichtig: Animierte Elemente tragen KEINE Tailwind-Transform-Klassen
 * (translate/scale/rotate) - GSAP schreibt "transform" inline und würde
 * sie überschreiben. Bewegt wird deshalb nur an Wrappern, die keine
 * Hover-Transforms haben.
 * --------------------------------------------------------------------------
 */

const HIDE_UNTIL_READY_CSS = `
@media (prefers-reduced-motion: no-preference) {
  [data-hero-hide] { opacity: 0; }
}
`;

const NO_SCRIPT_CSS = `[data-hero-hide] { opacity: 1 !important; }`;

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
    const first = (selector: string) => root.querySelector<HTMLElement>(selector);

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

        const bg = first('[data-hero="bg"]');
        const content = first('[data-hero="content"]');
        const eyebrow = first('[data-hero="eyebrow"]');
        const lines = all('[data-hero="line"]');
        const masks = all('[data-hero="mask"]');
        const description = first('[data-hero="description"]');
        const actions = first('[data-hero="actions"]');
        const features = first('[data-hero="features"]');
        const badge = first('[data-hero="badge"]');
        const spot = first('[data-hero="spot"]');

        /* ---------- Einlauf ---------- */

        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });

        if (bg) {
          intro.fromTo(bg, { scale: 1.15 }, { scale: 1, duration: 2.4, ease: "power2.out" }, 0);
        }

        if (eyebrow) {
          intro.fromTo(eyebrow, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.2);
        }

        if (lines.length > 0) {
          intro.fromTo(
            lines,
            { yPercent: 115, opacity: 1 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 1.15,
              stagger: 0.12,
              ease: "power4.out",
              /*
               * Die Masken (overflow: hidden) werden nur fürs Aufdecken
               * gebraucht - danach wieder öffnen, sonst schneidet der
               * Rand den Leuchteffekt am Wort "Sport." ab.
               */
              onComplete: () => {
                gsap.set(masks, { overflow: "visible" });
              },
            },
            0.35,
          );
        }

        if (description) {
          intro.fromTo(
            description,
            { y: 28, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9 },
            0.85,
          );
        }

        if (actions) {
          intro.fromTo(actions, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 1.0);
        }

        if (features) {
          intro.fromTo(features, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.15);
          intro.fromTo(
            Array.from(features.children),
            { y: 22, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.7, stagger: 0.1 },
            1.15,
          );
        }

        if (badge) {
          intro.fromTo(badge, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 1 }, 1.4);

          /* schwebt danach dauerhaft leicht auf und ab */
          gsap.to(badge, {
            y: -8,
            duration: 2.6,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 2.6,
          });
        }

        /* ---------- Scrollen ---------- */

        if (bg) {
          gsap.to(bg, {
            yPercent: 8,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        if (content) {
          gsap.to(content, {
            y: -60,
            opacity: 0.1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom 35%",
              scrub: true,
            },
          });
        }

        /* ---------- Maus (nur mit Zeigergerät) ---------- */

        const cleanups: Array<() => void> = [];

        if (conditions.fine) {
          const spotX = spot ? gsap.quickTo(spot, "x", { duration: 1, ease: "power3" }) : null;
          const spotY = spot ? gsap.quickTo(spot, "y", { duration: 1, ease: "power3" }) : null;
          const bgX = bg ? gsap.quickTo(bg, "x", { duration: 1.2, ease: "power3" }) : null;
          const bgY = bg ? gsap.quickTo(bg, "y", { duration: 1.2, ease: "power3" }) : null;

          if (spot) {
            gsap.set(spot, { xPercent: -50, yPercent: -50 });
          }

          let spotVisible = false;

          const handleMove = (event: PointerEvent) => {
            const rect = root.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            if (spot && !spotVisible) {
              spotVisible = true;
              gsap.set(spot, { x, y });
              gsap.to(spot, { opacity: 1, duration: 0.8 });
            }

            spotX?.(x);
            spotY?.(y);

            bgX?.((0.5 - x / rect.width) * 24);
            bgY?.((0.5 - y / rect.height) * 16);
          };

          root.addEventListener("pointermove", handleMove);
          cleanups.push(() => root.removeEventListener("pointermove", handleMove));
        }

        return () => cleanups.forEach((cleanup) => cleanup());
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#050708] pt-20">
      <style>{HIDE_UNTIL_READY_CSS}</style>

      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>

      {/* Hintergrund */}
      <div className="absolute inset-0">
        {/*
          Foto: bewusst größer als der Bereich (Rand-Überstand), damit
          Parallax und Mausbewegung keine Lücken freilegen.
        */}
        <div
          data-hero="bg"
          className="absolute"
          style={{ left: "-3%", right: "-3%", top: "-12%", height: "124%" }}
        >
          <Image
            src="/images/landing/hero-background.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        {/*
          Dunkler Verlauf von links (wo der Text sitzt, fast deckend)
          nach rechts (Foto bleibt sichtbar) - sorgt für Lesbarkeit,
          ohne das Foto komplett zu verdecken.
        */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050708] via-[#050708]/85 to-transparent" />

        {/* Sanfter Verlauf oben/unten, für einen weichen Übergang zu Navbar und nächster Sektion */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050708]/50 via-transparent to-[#050708]" />

        {/* Markenfarbiger Glow, dezent übers Foto gelegt */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(52,211,153,0.12),transparent_35%)]" />

        {/* Lichtkegel, folgt dem Mauszeiger (erst sichtbar, sobald sich die Maus bewegt) */}
        <div
          data-hero="spot"
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-emerald-400/[0.10] opacity-0 blur-[120px]"
        />
      </div>

      {/* Inhalt */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center px-6 py-20 lg:px-8">
        <div data-hero="content" className="max-w-2xl">
          {/* Eyebrow */}
          <div data-hero="eyebrow" data-hero-hide className="mb-7 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.9)]" />

            <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              Play. Compete. Connect.
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl font-black uppercase leading-[0.9] tracking-[-0.055em] text-white sm:text-7xl lg:text-[6rem]">
            <HeroLine>Beerpong</HeroLine>

            <HeroLine>wird zum</HeroLine>

            <HeroLine>
              <span className="text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.2)]">
                Sport.
              </span>
            </HeroLine>
          </h1>

          {/* Beschreibung */}
          <p
            data-hero="description"
            data-hero-hide
            className="mt-8 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl"
          >
            Digitale Tools. Echte Community.
            <br />
            Für alle, die mehr aus Beerpong machen wollen.
          </p>

          {/* Buttons */}
          <div data-hero="actions" data-hero-hide className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/spieler"
              className="group block rounded-full bg-emerald-400 px-7 py-4 text-sm font-bold text-black shadow-[0_0_40px_rgba(52,211,153,0.15)] transition hover:bg-emerald-300 hover:shadow-[0_0_50px_rgba(52,211,153,0.28)]"
            >
              Jetzt entdecken
              <span className="ml-3 inline-block transition group-hover:translate-x-1">→</span>
            </Link>

            <button className="block rounded-full border border-white/20 px-7 py-4 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5">
              <span className="mr-3">▶</span>
              Video ansehen
            </button>
          </div>

          {/* Features */}
          <div
            data-hero="features"
            data-hero-hide
            className="mt-16 flex flex-wrap gap-8 border-t border-white/10 pt-7"
          >
            <HeroFeature icon="🏆" title="Turniere" subtitle="Organisieren" />

            <HeroFeature icon="📊" title="Statistiken" subtitle="Verfolgen" />

            <HeroFeature icon="👥" title="Community" subtitle="Zusammen spielen" />
          </div>
        </div>

        {/* Schwebendes Label übers Foto, unten rechts */}
        <div
          data-hero="badge"
          data-hero-hide
          className="absolute bottom-16 right-6 hidden rounded-2xl border border-emerald-400/20 bg-black/60 px-5 py-4 backdrop-blur-xl lg:block lg:right-8"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            Same Game.
          </div>

          <div className="mt-1 text-sm font-bold text-white">Higher Standards.</div>
        </div>
      </div>
    </section>
  );
}

/*
 * Eine Headline-Zeile mit Maske: Der Text schiebt sich beim Einlauf von
 * unten in die Zeile. Etwas Innenabstand (bei gleichem Zeilenabstand durch
 * negativen Außenabstand ausgeglichen) verhindert, dass die enge
 * Zeilenhöhe Oberlängen abschneidet.
 */

function HeroLine({ children }: { children: ReactNode }) {
  return (
    <span
      data-hero="mask"
      className="block overflow-hidden"
      style={{ paddingBlock: "0.12em", marginBlock: "-0.12em" }}
    >
      <span data-hero="line" data-hero-hide className="block">
        {children}
      </span>
    </span>
  );
}

/* Kleine Feature-Komponente */

function HeroFeature({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>

      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-white">{title}</div>

        <div className="text-[10px] uppercase tracking-wider text-white/40">{subtitle}</div>
      </div>
    </div>
  );
}
