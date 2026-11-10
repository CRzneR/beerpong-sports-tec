"use client";

import Image from "next/image";
import { useId } from "react";

/*
 * --------------------------------------------------------------------------
 * | ILLUSTRATIONEN DER PONG LEAGUE
 * --------------------------------------------------------------------------
 *
 * Pokal und Karten-Schwung sind reines SVG, das Banner ist ein Bild:
 *
 *   TrophyArt      goldener Pokal (Turnierkarten, leerer Zustand)
 *   LeagueBanner   Bannerbild im Seitenkopf (webp aus public/images/league)
 *   CardSwoosh     goldener Schwung im Hintergrund einer aktiven Karte
 *
 * Gradient-IDs kommen aus useId, damit mehrere Pokale auf einer Seite sich
 * nicht gegenseitig die Verläufe überschreiben.
 * --------------------------------------------------------------------------
 */

function useSafeId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

export function TrophyArt({
  className = "",
  muted = false,
}: {
  className?: string;
  /* Gedämpft (grau-golden) für noch nicht gestartete Turniere. */
  muted?: boolean;
}) {
  const id = useSafeId();

  return (
    <svg
      viewBox="0 0 120 150"
      className={className}
      style={muted ? { filter: "saturate(0.35) brightness(0.8)" } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a5a00" />
          <stop offset="0.22" stopColor="#f2b705" />
          <stop offset="0.48" stopColor="#ffe985" />
          <stop offset="0.74" stopColor="#f0b000" />
          <stop offset="1" stopColor="#855400" />
        </linearGradient>
        <linearGradient id={`${id}-trim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#c98a00" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#facc15" stopOpacity="0.35" />
          <stop offset="1" stopColor="#facc15" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="60" cy="78" rx="58" ry="66" fill={`url(#${id}-glow)`} />

      {/* Henkel */}
      <path
        d="M30 30 C4 28 4 74 40 80"
        fill="none"
        stroke={`url(#${id}-trim)`}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M90 30 C116 28 116 74 80 80"
        fill="none"
        stroke={`url(#${id}-trim)`}
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Kelch */}
      <path
        d="M25 18 H95 C95 60 82 82 67 90 H53 C38 82 25 60 25 18 Z"
        fill={`url(#${id}-body)`}
      />
      <rect x="21" y="12" width="78" height="10" rx="5" fill={`url(#${id}-trim)`} />
      <path
        d="M34 26 C34 52 42 68 54 80"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.28"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Stern auf dem Kelch */}
      <path
        d="M60 36 l4.4 9 9.9 1.4 -7.2 7 1.7 9.8 -8.8 -4.7 -8.8 4.7 1.7 -9.8 -7.2 -7 9.9 -1.4 Z"
        fill="#fff"
        fillOpacity="0.32"
      />

      {/* Schaft und Sockel */}
      <rect x="52" y="88" width="16" height="22" fill={`url(#${id}-body)`} />
      <ellipse cx="60" cy="100" rx="13" ry="4.5" fill={`url(#${id}-trim)`} />
      <rect x="36" y="108" width="48" height="10" rx="3" fill={`url(#${id}-trim)`} />
      <rect x="28" y="117" width="64" height="15" rx="4" fill={`url(#${id}-body)`} />
      <rect x="28" y="117" width="64" height="3" rx="1.5" fill="#fff" fillOpacity="0.25" />
    </svg>
  );
}

/*
 * Bannerbild im Seitenkopf (public/images/league/league-banner.webp).
 * Läuft über die ganze Breite und blendet nach unten in den Seitenhintergrund aus,
 * damit Kennzahlen und Karten sauber darauf stehen. Auf dem Handy ist es
 * kleiner und dezenter, damit die Überschrift lesbar bleibt. compact: niedrigere
 * Variante für die Turnierseite.
 */
export function LeagueBanner({ compact = false }: { compact?: boolean }) {
  const fade = "linear-gradient(to bottom, #000 55%, transparent 100%)";

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 h-[300px] overflow-hidden ${
        compact ? "md:h-[380px]" : "md:h-[500px]"
      }`}
      style={{ WebkitMaskImage: fade, maskImage: fade }}
      aria-hidden="true"
    >
      {/* Ab md etwas nach oben geschoben, damit der Pokal neben der Überschrift sitzt. */}
      <div className="absolute inset-x-0 top-0 h-full md:-top-[90px] md:h-[580px]">
        <Image
          src="/images/league/league-banner.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-top opacity-50 md:opacity-100"
        />
      </div>
    </div>
  );
}

export function CardSwoosh() {
  const id = useSafeId();

  return (
    <svg
      viewBox="0 0 900 220"
      preserveAspectRatio="xMaxYMid slice"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[70%] opacity-70"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#facc15" stopOpacity="0" />
          <stop offset="0.6" stopColor="#facc15" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffe27a" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <g fill="none" strokeLinecap="round" stroke={`url(#${id}-g)`}>
        <path d="M120 230 C 380 215, 640 120, 900 -10" strokeWidth="2" />
        <path d="M200 240 C 450 232, 690 150, 930 40" strokeWidth="1" opacity="0.6" />
        <path d="M420 240 C 600 230, 780 190, 920 120" strokeWidth="1" opacity="0.4" />
      </g>
    </svg>
  );
}
