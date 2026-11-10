import { useId } from "react";

/*
 * --------------------------------------------------------------------------
 * | POKALE (Gold, Silber, Bronze)
 * --------------------------------------------------------------------------
 *
 * Datei: components/features/PodiumTrophies.tsx
 *
 * Drei Pokale als reines SVG für die Seite "Pokale & Championship Rings".
 * Gold steht in der Mitte und ist größer, Silber links, Bronze rechts.
 * Gradient-IDs kommen aus useId, damit sich mehrere Instanzen nicht stören.
 * --------------------------------------------------------------------------
 */

type Palette = { dark: string; mid: string; light: string; trim: string; trimDark: string };

const GOLD: Palette = {
  dark: "#8a5a00",
  mid: "#f2b705",
  light: "#ffe985",
  trim: "#ffe27a",
  trimDark: "#c98a00",
};

const SILVER: Palette = {
  dark: "#5b6470",
  mid: "#b7c0cb",
  light: "#f4f7fa",
  trim: "#e8edf2",
  trimDark: "#8c97a4",
};

const BRONZE: Palette = {
  dark: "#6b3a1a",
  mid: "#c27a43",
  light: "#f0b685",
  trim: "#e6a673",
  trimDark: "#9a5a2c",
};

function Cup({ id, palette, x, y, scale }: { id: string; palette: Palette; x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Henkel */}
      <path d="M30 30 C4 28 4 74 40 80" fill="none" stroke={`url(#${id}-trim)`} strokeWidth="7" strokeLinecap="round" />
      <path d="M90 30 C116 28 116 74 80 80" fill="none" stroke={`url(#${id}-trim)`} strokeWidth="7" strokeLinecap="round" />

      {/* Kelch */}
      <path d="M25 18 H95 C95 60 82 82 67 90 H53 C38 82 25 60 25 18 Z" fill={`url(#${id}-body)`} />
      <rect x="21" y="12" width="78" height="10" rx="5" fill={`url(#${id}-trim)`} />
      <path d="M34 26 C34 52 42 68 54 80" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />

      {/* Stern */}
      <path
        d="M60 36 l4.4 9 9.9 1.4 -7.2 7 1.7 9.8 -8.8 -4.7 -8.8 4.7 1.7 -9.8 -7.2 -7 9.9 -1.4 Z"
        fill="#fff"
        fillOpacity="0.34"
      />

      {/* Schaft und Sockel */}
      <rect x="52" y="88" width="16" height="22" fill={`url(#${id}-body)`} />
      <ellipse cx="60" cy="100" rx="13" ry="4.5" fill={`url(#${id}-trim)`} />
      <rect x="36" y="108" width="48" height="10" rx="3" fill={`url(#${id}-trim)`} />
      <rect x="28" y="117" width="64" height="15" rx="4" fill="#0b0f12" />
      <rect x="28" y="117" width="64" height="3" rx="1.5" fill={palette.light} fillOpacity="0.35" />
    </g>
  );
}

function Gradients({ id, palette }: { id: string; palette: Palette }) {
  return (
    <>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={palette.dark} />
        <stop offset="0.22" stopColor={palette.mid} />
        <stop offset="0.48" stopColor={palette.light} />
        <stop offset="0.74" stopColor={palette.mid} />
        <stop offset="1" stopColor={palette.dark} />
      </linearGradient>
      <linearGradient id={`${id}-trim`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={palette.trim} />
        <stop offset="1" stopColor={palette.trimDark} />
      </linearGradient>
    </>
  );
}

export function PodiumTrophies({ className = "" }: { className?: string }) {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg viewBox="0 0 520 250" className={className} aria-hidden="true" focusable="false">
      <defs>
        <Gradients id={`${base}g`} palette={GOLD} />
        <Gradients id={`${base}s`} palette={SILVER} />
        <Gradients id={`${base}b`} palette={BRONZE} />

        <radialGradient id={`${base}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#34d399" stopOpacity="0.28" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="260" cy="210" rx="250" ry="38" fill={`url(#${base}glow)`} />

      {/* Silber links, Bronze rechts (kleiner), Gold in der Mitte (größer) */}
      <Cup id={`${base}s`} palette={SILVER} x={44} y={74} scale={1.02} />
      <Cup id={`${base}b`} palette={BRONZE} x={338} y={92} scale={0.9} />
      <Cup id={`${base}g`} palette={GOLD} x={178} y={22} scale={1.3} />

      {/* Spiegelung / Boden */}
      <rect x="20" y="214" width="480" height="1" fill="#34d399" fillOpacity="0.25" />
    </svg>
  );
}
