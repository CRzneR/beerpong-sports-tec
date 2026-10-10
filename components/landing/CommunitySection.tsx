"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { attachMagnetic } from "@/components/landing/gsapUtils";

/*
 * --------------------------------------------------------------------------
 * | COMMUNITY-SEKTION (mit GSAP)
 * --------------------------------------------------------------------------
 *
 * - Laufband oben: läuft dauerhaft, wird beim Scrollen schneller und
 *   kehrt mit der Scrollrichtung um; pausiert, solange es nicht im Bild ist
 * - Foto-Hintergrund mit Parallax, Glow "atmet", Punkte pulsieren
 * - Headline wird zeilenweise aufgedeckt, Text/Buttons laufen ein
 * - Maus (nur mit Zeigergerät): magnetische Buttons
 * - "Reduzierte Bewegung": keine Animation
 * --------------------------------------------------------------------------
 */

const MARQUEE_WORDS = ["Play", "Track", "Compete", "Connect"];

/* 3 Durchläufe pro Gruppe, damit die Gruppe auch auf sehr breiten Bildschirmen breiter als der Bildschirm ist */
const MARQUEE_ITEMS = Array.from({ length: 3 }).flatMap(() => MARQUEE_WORDS);

export function CommunitySection() {
  const rootRef = useRef<HTMLDivElement>(null);

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
        const conditions: Record<string, boolean> = context.conditions ?? {};

        if (!conditions.motion) {
          return undefined;
        }

        const cleanups: Array<() => void> = [];

        /* ---------- Laufband ---------- */

        const marquee = first('[data-community="marquee"]');
        const track = first('[data-community="marquee-track"]');

        if (marquee && track) {
          const loop = gsap.to(track, {
            xPercent: -50,
            ease: "none",
            duration: 40,
            repeat: -1,
          });

          let direction = 1;
          const boost = { value: 0 };

          const applySpeed = () => {
            loop.timeScale(direction * (1 + boost.value));
          };

          const marqueeTrigger = ScrollTrigger.create({
            trigger: marquee,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              if (self.isActive) {
                loop.play();
              } else {
                loop.pause();
              }
            },
            onUpdate: (self) => {
              direction = self.direction === 1 ? 1 : -1;

              /* Schneller, je schneller gescrollt wird - und danach sanft zurück */
              gsap.to(boost, {
                value: Math.min(Math.abs(self.getVelocity()) / 300, 5),
                duration: 0.3,
                overwrite: true,
                onUpdate: applySpeed,
                onComplete: () => {
                  gsap.to(boost, { value: 0, duration: 1.2, onUpdate: applySpeed });
                },
              });
            },
          });

          /* Liegt das Laufband beim Start nicht im Bild, gar nicht erst laufen lassen */
          if (!marqueeTrigger.isActive) {
            loop.pause();
          }
        }

        /* ---------- Foto + Glow ---------- */

        const bg = first('[data-community="bg"]');
        const section = first('[data-community="section"]');

        if (bg && section) {
          gsap.fromTo(
            bg,
            { yPercent: -6 },
            {
              yPercent: 6,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }

        const glow = first('[data-community="glow"]');

        if (glow) {
          gsap.to(glow, {
            scale: 1.15,
            opacity: 0.7,
            duration: 4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        const dots = all('[data-community="dot"]');

        if (dots.length > 0) {
          gsap.to(dots, {
            scale: 1.6,
            opacity: 0.5,
            duration: 0.9,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        /* ---------- Inhalt beim Scrollen ---------- */

        const content = first('[data-community="content"]');
        const masks = all('[data-community="mask"]');

        if (content) {
          gsap.fromTo(
            all('[data-community="eyebrow"]'),
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: { trigger: content, start: "top 78%", once: true },
            },
          );

          gsap.fromTo(
            all('[data-community="line"]'),
            { yPercent: 115 },
            {
              yPercent: 0,
              duration: 1.2,
              stagger: 0.12,
              ease: "power4.out",
              scrollTrigger: { trigger: content, start: "top 72%", once: true },
              onComplete: () => {
                gsap.set(masks, { overflow: "visible" });
              },
            },
          );

          gsap.fromTo(
            all('[data-community="fade"]'),
            { y: 28, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              stagger: 0.15,
              ease: "power3.out",
              scrollTrigger: { trigger: content, start: "top 60%", once: true },
            },
          );

          const rule = first('[data-community="rule"]');

          if (rule) {
            gsap.fromTo(
              rule,
              { scaleX: 0 },
              {
                scaleX: 1,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: { trigger: rule, start: "top 95%", once: true },
              },
            );
          }
        }

        /* ---------- Maus (nur mit Zeigergerät) ---------- */

        if (conditions.fine) {
          cleanups.push(attachMagnetic(all("[data-magnetic]"), 0.35));
        }

        return () => cleanups.forEach((cleanup) => cleanup());
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef}>
      {/* LAUFBAND */}

      <div
        data-community="marquee"
        aria-hidden="true"
        className="relative overflow-hidden border-y border-white/[0.06] bg-[#050708] py-6"
      >
        <div data-community="marquee-track" className="flex w-max items-center">
          <MarqueeGroup />

          <MarqueeGroup />
        </div>
      </div>

      <section
        data-community="section"
        className="relative overflow-hidden bg-[#050708] py-32 lg:py-44"
      >
        {/* Foto-Hintergrund */}

        <div className="absolute inset-0">
          {/* größer als der Bereich, damit der Parallax keine Lücken freilegt */}
          <div
            data-community="bg"
            className="absolute inset-x-0"
            style={{ top: "-12%", height: "124%" }}
          >
            <Image
              src="/images/landing/community-photo.jpg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>

          {/*
            Kräftiger, gleichmäßiger Verlauf - anders als bei Hero.tsx, wo
            der Text links sitzt und rechts Platz für das Foto bleibt, ist
            hier der Text zentriert und füllt die ganze Breite. Deshalb
            rundum abdunkeln statt nur von einer Seite, sonst wird der Text
            über der ganzen Breite schwer lesbar.
          */}

          <div className="absolute inset-0 bg-[#050708]/80" />

          <div className="absolute inset-0 bg-gradient-to-b from-[#050708] via-transparent to-[#050708]" />
        </div>

        {/* Decorative background (bestehend, jetzt übers Foto gelegt) */}

        <div className="absolute inset-0">
          {/* Main glow (äußerer Wrapper zentriert per CSS, innerer "atmet" per GSAP) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              data-community="glow"
              className="h-[450px] w-[700px] rounded-full bg-emerald-400/[0.07] blur-[140px]"
            />
          </div>

          {/* Top line */}
          <div className="absolute left-1/2 top-0 h-px w-full max-w-7xl -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Bottom line */}
          <div className="absolute bottom-0 left-1/2 h-px w-full max-w-7xl -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div
          data-community="content"
          className="relative z-10 mx-auto max-w-5xl px-6 text-center lg:px-8"
        >
          {/* Eyebrow */}
          <div data-community="eyebrow" className="mb-7 flex items-center justify-center gap-3">
            <span
              data-community="dot"
              className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
            />

            <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
              Join the Game
            </span>

            <span
              data-community="dot"
              className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
            />
          </div>

          {/* Headline */}
          <h2 className="text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-white sm:text-6xl lg:text-8xl">
            <MaskLine>Bereit für</MaskLine>

            <MaskLine>die nächste</MaskLine>

            <MaskLine>
              <span className="text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.15)]">
                Runde?
              </span>
            </MaskLine>
          </h2>

          {/* Description */}
          <p
            data-community="fade"
            className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/45 sm:text-lg"
          >
            Erstelle dein Spielerprofil, entdecke deine Statistiken und werde Teil einer Community,
            die Beerpong als Sport versteht.
          </p>

          {/* Actions */}
          <div
            data-community="fade"
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <span data-magnetic className="inline-block">
              <Link
                href="/registrieren"
                className="group block rounded-full bg-emerald-400 px-8 py-4 text-sm font-bold text-black shadow-[0_0_50px_rgba(52,211,153,0.15)] transition duration-300 hover:-translate-y-1 hover:bg-emerald-300 hover:shadow-[0_0_60px_rgba(52,211,153,0.25)]"
              >
                Profil erstellen
                <span className="ml-3 inline-block transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </span>

            <span data-magnetic className="inline-block">
              <Link
                href="/spieler"
                className="block rounded-full border border-white/15 px-8 py-4 text-sm font-semibold text-white transition duration-300 hover:border-white/30 hover:bg-white/5"
              >
                Pong Stats entdecken
              </Link>
            </span>
          </div>

          {/* Bottom statement */}
          <div className="mt-20">
            <div data-community="rule" className="mx-auto h-px w-16 bg-emerald-400/40" />

            <p
              data-community="fade"
              className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-white/20"
            >
              Good Players. Better People.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/*
 * Eine Headline-Zeile mit Maske (Text schiebt sich von unten ein).
 * Innenabstand + negativer Außenabstand gleichen sich aus, damit die enge
 * Zeilenhöhe nichts abschneidet (z. B. die Pünktchen des Ä).
 */

function MaskLine({ children }: { children: ReactNode }) {
  return (
    <span
      data-community="mask"
      className="block overflow-hidden"
      style={{ paddingBlock: "0.12em", marginBlock: "-0.12em" }}
    >
      <span data-community="line" className="block">
        {children}
      </span>
    </span>
  );
}

/*
 * Eine Gruppe des Laufbands. Die Spur enthält zwei identische Gruppen und
 * läuft um genau eine Gruppenbreite (-50 %) - dadurch ist die Schleife
 * nahtlos. Jedes zweite Wort ist nur umrandet.
 */

function MarqueeGroup() {
  return (
    <div className="flex shrink-0 items-center gap-8 pr-8 md:gap-12 md:pr-12">
      {MARQUEE_ITEMS.map((word, index) => (
        <div key={index} className="flex items-center gap-8 md:gap-12">
          <span
            className="text-4xl font-black uppercase tracking-[-0.04em] md:text-6xl"
            style={
              index % 2 === 0
                ? { color: "rgba(255, 255, 255, 0.85)" }
                : { color: "transparent", WebkitTextStroke: "1px rgba(255, 255, 255, 0.3)" }
            }
          >
            {word}
          </span>

          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
        </div>
      ))}
    </div>
  );
}
