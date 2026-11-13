"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type Cup = {
  id: number;
  hit: boolean;
};

/**
 * Zuordnung Becher-ID → Formations-Slot (0-basiert). Wird zentral in
 * page.tsx einmal pro Team berechnet (siehe useCupSlotAssignment
 * unten) und an ALLE BeerPongTable-Instanzen (Mobile, Desktop,
 * Treffer-Overlay) weitergereicht, damit sie exakt dieselbe
 * Anordnung zeigen.
 */
export type CupSlotAssignment = Record<number, number>;

interface BeerPongTableProps {
  teamACups: Cup[];
  teamBCups: Cup[];

  /**
   * Stabile Slot-Zuordnung pro Team, siehe CupSlotAssignment oben.
   * Von useCupSlotAssignment(teamACups) / useCupSlotAssignment(teamBCups)
   * im Aufrufer berechnet - NICHT hier in der Komponente.
   */
  teamACupSlots: CupSlotAssignment;
  teamBCupSlots: CupSlotAssignment;

  selectable?: boolean;

  selectedCupIds?: number[];

  selectableTeam?: "A" | "B";

  /**
   * Welche Spielhälfte soll angezeigt werden?
   *
   * "both" = beide Teams
   * "A"    = nur Team A
   * "B"    = nur Team B
   */
  displayTeam?: "A" | "B" | "both";

  /**
   * Ist das Feld schmal (z. B. neben Score/Letzte Aktionen auf
   * Mobile), statt die volle verfügbare Breite zu bekommen (Desktop-
   * Spalte, Treffer-Overlay)? Steuert nur die BECHER-Formation
   * (breiterer Prozent-Abstand, damit sich die Becher in der
   * schmalen Spalte nicht überlappen) - nicht die Höhe/das
   * Seitenverhältnis, das steuert der Aufrufer selbst über die
   * umgebende Breite.
   */
  narrow?: boolean;

  /**
   * NEU: Becher-IDs, die in DIESER Runde schon getroffen wurden, aber
   * erst am Rundenende tatsächlich vom Tisch entfernt werden (siehe
   * page.tsx, roundHits). Bleiben hier noch im Array (hit: false),
   * werden aber optisch als "vorgemerkt" markiert statt normal weiß -
   * so bleiben sie sichtbar/stehen, bis die Runde komplett ist, genau
   * wie bei einer echten Partie.
   */
  pendingCupIds?: number[];

  onCupClick?: (cupId: number) => void;
}

/*
|--------------------------------------------------------------------------
| FORMATIONEN (NORMALE BREITE, z. B. DESKTOP-SPALTE)
|--------------------------------------------------------------------------
|
| Wichtig:
|
| Die Koordinaten sind bereits für die jeweilige Spielfeldhälfte definiert.
|
| TEAM A
|
|   ● ● ● ●
|    ● ● ●
|     ● ●
|      ●
|
| TEAM B
|
|      ●
|     ● ●
|    ● ● ●
|   ● ● ● ●
|
*/

const FORMATION_10_TOP = [
  { x: 29, y: 13 },
  { x: 43, y: 13 },
  { x: 57, y: 13 },
  { x: 71, y: 13 },

  { x: 36, y: 23.5 },
  { x: 50, y: 23.5 },
  { x: 64, y: 23.5 },

  { x: 43, y: 34 },
  { x: 57, y: 34 },

  { x: 50, y: 44.5 },
];

const FORMATION_10_BOTTOM = [
  { x: 50, y: 55.5 },

  { x: 43, y: 66 },
  { x: 57, y: 66 },

  { x: 36, y: 76.5 },
  { x: 50, y: 76.5 },
  { x: 64, y: 76.5 },

  { x: 29, y: 87 },
  { x: 43, y: 87 },
  { x: 57, y: 87 },
  { x: 71, y: 87 },
];

const FORMATION_6_TOP = [
  { x: 36, y: 19 },
  { x: 50, y: 19 },
  { x: 64, y: 19 },

  { x: 43, y: 31 },
  { x: 57, y: 31 },

  { x: 50, y: 43 },
];

const FORMATION_6_BOTTOM = [
  { x: 50, y: 57 },

  { x: 43, y: 69 },
  { x: 57, y: 69 },

  { x: 36, y: 81 },
  { x: 50, y: 81 },
  { x: 64, y: 81 },
];

const FORMATION_3_TOP = [
  { x: 43, y: 25 },
  { x: 57, y: 25 },

  { x: 50, y: 40 },
];

const FORMATION_3_BOTTOM = [
  { x: 50, y: 60 },

  { x: 43, y: 75 },
  { x: 57, y: 75 },
];

const FORMATION_1_TOP = {
  x: 50,
  y: 45,
};

const FORMATION_1_BOTTOM = {
  x: 50,
  y: 55,
};

/*
|--------------------------------------------------------------------------
| EINZEL-TEAM FORMATIONEN (KOMPAKT, TREFFER-OVERLAY)
|--------------------------------------------------------------------------
*/

const FORMATION_10_SINGLE_TOP = [
  { x: 29, y: 15 },
  { x: 43, y: 15 },
  { x: 57, y: 15 },
  { x: 71, y: 15 },

  { x: 36, y: 39 },
  { x: 50, y: 39 },
  { x: 64, y: 39 },

  { x: 43, y: 63 },
  { x: 57, y: 63 },

  { x: 50, y: 85 },
];

const FORMATION_10_SINGLE_BOTTOM = [
  { x: 50, y: 15 },

  { x: 43, y: 39 },
  { x: 57, y: 39 },

  { x: 36, y: 63 },
  { x: 50, y: 63 },
  { x: 64, y: 63 },

  { x: 29, y: 85 },
  { x: 43, y: 85 },
  { x: 57, y: 85 },
  { x: 71, y: 85 },
];

const FORMATION_6_SINGLE_TOP = [
  { x: 36, y: 15 },
  { x: 50, y: 15 },
  { x: 64, y: 15 },

  { x: 43, y: 50 },
  { x: 57, y: 50 },

  { x: 50, y: 85 },
];

const FORMATION_6_SINGLE_BOTTOM = [
  { x: 50, y: 15 },

  { x: 43, y: 50 },
  { x: 57, y: 50 },

  { x: 36, y: 85 },
  { x: 50, y: 85 },
  { x: 64, y: 85 },
];

const FORMATION_3_SINGLE_TOP = [
  { x: 43, y: 15 },
  { x: 57, y: 15 },

  { x: 50, y: 85 },
];

const FORMATION_3_SINGLE_BOTTOM = [
  { x: 50, y: 15 },

  { x: 43, y: 85 },
  { x: 57, y: 85 },
];

const FORMATION_1_SINGLE = {
  x: 50,
  y: 50,
};

/*
|--------------------------------------------------------------------------
| SCHMALE FORMATIONEN (z. B. Feld neben Score/Letzte Aktionen, Mobile)
|--------------------------------------------------------------------------
*/

const FORMATION_10_TOP_NARROW = [
  { x: 25, y: 13 },
  { x: 42, y: 13 },
  { x: 58, y: 13 },
  { x: 75, y: 13 },

  { x: 33, y: 23.5 },
  { x: 50, y: 23.5 },
  { x: 67, y: 23.5 },

  { x: 42, y: 34 },
  { x: 58, y: 34 },

  { x: 50, y: 44.5 },
];

const FORMATION_10_BOTTOM_NARROW = [
  { x: 50, y: 55.5 },

  { x: 42, y: 66 },
  { x: 58, y: 66 },

  { x: 33, y: 76.5 },
  { x: 50, y: 76.5 },
  { x: 67, y: 76.5 },

  { x: 25, y: 87 },
  { x: 42, y: 87 },
  { x: 58, y: 87 },
  { x: 75, y: 87 },
];

const FORMATION_6_TOP_NARROW = [
  { x: 32, y: 19 },
  { x: 50, y: 19 },
  { x: 68, y: 19 },

  { x: 40, y: 31 },
  { x: 60, y: 31 },

  { x: 50, y: 43 },
];

const FORMATION_6_BOTTOM_NARROW = [
  { x: 50, y: 57 },

  { x: 40, y: 69 },
  { x: 60, y: 69 },

  { x: 32, y: 81 },
  { x: 50, y: 81 },
  { x: 68, y: 81 },
];

const FORMATION_3_TOP_NARROW = [
  { x: 38, y: 25 },
  { x: 62, y: 25 },

  { x: 50, y: 40 },
];

const FORMATION_3_BOTTOM_NARROW = [
  { x: 50, y: 60 },

  { x: 38, y: 75 },
  { x: 62, y: 75 },
];

const FORMATION_1_TOP_NARROW = {
  x: 50,
  y: 45,
};

const FORMATION_1_BOTTOM_NARROW = {
  x: 50,
  y: 55,
};

/*
|--------------------------------------------------------------------------
| FORMATIONS-STUFE ERMITTELN
|--------------------------------------------------------------------------
*/

type FormationTier = "ten" | "six" | "three" | "single" | "none";

export function getFormationTier(remainingCount: number): FormationTier {
  if (remainingCount >= 7) return "ten";
  if (remainingCount >= 4) return "six";
  if (remainingCount >= 2) return "three";
  if (remainingCount === 1) return "single";
  return "none";
}

function getFormationForTier(
  tier: FormationTier,
  side: "top" | "bottom",
  compact: boolean,
  narrow: boolean,
): { x: number; y: number }[] {
  if (compact) {
    if (tier === "ten")
      return side === "top" ? FORMATION_10_SINGLE_TOP : FORMATION_10_SINGLE_BOTTOM;
    if (tier === "six") return side === "top" ? FORMATION_6_SINGLE_TOP : FORMATION_6_SINGLE_BOTTOM;
    if (tier === "three")
      return side === "top" ? FORMATION_3_SINGLE_TOP : FORMATION_3_SINGLE_BOTTOM;
    return [];
  }

  if (narrow) {
    if (tier === "ten")
      return side === "top" ? FORMATION_10_TOP_NARROW : FORMATION_10_BOTTOM_NARROW;
    if (tier === "six") return side === "top" ? FORMATION_6_TOP_NARROW : FORMATION_6_BOTTOM_NARROW;
    if (tier === "three")
      return side === "top" ? FORMATION_3_TOP_NARROW : FORMATION_3_BOTTOM_NARROW;
    return [];
  }

  if (tier === "ten") return side === "top" ? FORMATION_10_TOP : FORMATION_10_BOTTOM;
  if (tier === "six") return side === "top" ? FORMATION_6_TOP : FORMATION_6_BOTTOM;
  if (tier === "three") return side === "top" ? FORMATION_3_TOP : FORMATION_3_BOTTOM;

  return [];
}

function getSingleCupPosition(
  side: "top" | "bottom",
  compact: boolean,
  narrow: boolean,
): { x: number; y: number } {
  if (compact) return FORMATION_1_SINGLE;
  if (narrow) return side === "top" ? FORMATION_1_TOP_NARROW : FORMATION_1_BOTTOM_NARROW;
  return side === "top" ? FORMATION_1_TOP : FORMATION_1_BOTTOM;
}

/*
|--------------------------------------------------------------------------
| STABILE BECHER-SLOT-ZUORDNUNG (zentral, EIN Hook-Aufruf pro Team)
|--------------------------------------------------------------------------
*/

export function useCupSlotAssignment(cups: Cup[]): CupSlotAssignment {
  const previousRemaining = useRef<number | null>(null);

  const [slots, setSlots] = useState<CupSlotAssignment>({});

  const remainingCups = cups.filter((cup) => !cup.hit);

  const remainingCount = remainingCups.length;

  useEffect(() => {
    const currentTier = getFormationTier(remainingCount);

    const assignForTier = (tier: FormationTier): CupSlotAssignment => {
      if (tier === "none") {
        return {};
      }

      if (tier === "single") {
        const lastCup = remainingCups[0];

        return lastCup ? { [lastCup.id]: 0 } : {};
      }

      const result: CupSlotAssignment = {};

      remainingCups.forEach((cup, index) => {
        result[cup.id] = index;
      });

      return result;
    };

    if (previousRemaining.current === null) {
      setSlots(assignForTier(currentTier));

      previousRemaining.current = remainingCount;

      return;
    }

    const previousTier = getFormationTier(previousRemaining.current);

    if (currentTier !== previousTier) {
      setSlots(assignForTier(currentTier));
    }

    previousRemaining.current = remainingCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingCount]);

  return slots;
}

/*
|--------------------------------------------------------------------------
| CUP FORMATION
|--------------------------------------------------------------------------
*/

function CupFormation({
  cups,
  cupSlots,
  side,
  compact = false,
  narrow = false,
  selectable,
  selectableTeam,
  selectedCupIds,
  pendingCupIds,
  onCupClick,
}: {
  cups: Cup[];

  cupSlots: CupSlotAssignment;

  side: "top" | "bottom";

  compact?: boolean;

  narrow?: boolean;

  selectable?: boolean;

  selectableTeam?: "A" | "B";

  selectedCupIds: number[];

  pendingCupIds?: number[];

  onCupClick?: (cupId: number) => void;
}) {
  const t = useTranslations("Match.BeerPongTable");

  const remainingCups = cups.filter((cup) => !cup.hit);

  const tier = getFormationTier(remainingCups.length);

  const getPixelPosition = (cupId: number): { x: number; y: number } | undefined => {
    const slotIndex = cupSlots[cupId];

    if (slotIndex === undefined) {
      return undefined;
    }

    if (tier === "single") {
      return getSingleCupPosition(side, compact, narrow);
    }

    const formation = getFormationForTier(tier, side, compact, narrow);

    return formation[slotIndex];
  };

  return (
    <>
      {remainingCups.map((cup) => {
        const position = getPixelPosition(cup.id);

        if (!position) {
          return null;
        }

        const isSelectable =
          selectable &&
          ((side === "top" && selectableTeam === "A") ||
            (side === "bottom" && selectableTeam === "B"));

        const isSelected = selectedCupIds.includes(cup.id);

        /*
         * NEU: in dieser Runde schon getroffen, aber noch nicht
         * tatsächlich vom Tisch entfernt - steht noch, zählt aber
         * schon als "vorgemerkt".
         */
        const isPending = Boolean(pendingCupIds?.includes(cup.id));

        return (
          <button
            key={`${side}-${cup.id}`}
            type="button"
            disabled={!isSelectable}
            onClick={() => onCupClick?.(cup.id)}
            aria-label={t("becher", { id: cup.id })}
            className={`
              group/cup
              absolute
              flex
              ${selectable ? "h-6 w-6" : "h-4 w-4"}
              -translate-x-1/2
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border-2
              transition-all
              duration-150
              lg:h-12
              lg:w-12

              ${
                isSelected
                  ? `
                    scale-110
                    border-cyan-300
                    bg-cyan-400/70
                    shadow-[0_0_22px_rgba(34,211,238,0.75),inset_0_0_10px_rgba(255,255,255,0.35)]
                  `
                  : isPending
                    ? `
                      border-yellow-300
                      bg-yellow-400/25
                      shadow-[0_0_16px_rgba(250,204,21,0.6),inset_0_0_9px_rgba(250,204,21,0.35)]
                    `
                    : side === "top"
                      ? `
                        border-blue-300
                        bg-[#0a1f4a]/90
                        shadow-[0_0_16px_rgba(59,130,246,0.9),inset_0_0_10px_rgba(59,130,246,0.55)]
                      `
                      : `
                        border-rose-100
                        bg-red-600/90
                        shadow-[0_0_18px_rgba(239,68,68,0.95),inset_0_0_10px_rgba(255,130,130,0.55)]
                      `
              }

              ${
                isSelectable
                  ? `
                    cursor-pointer
                    hover:scale-110
                    ${side === "top" ? "hover:border-white" : "hover:border-white"}
                  `
                  : `
                    cursor-default
                  `
              }
            `}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          >
            {/* Becherkörper: weicher Schatten, der vom Rand Richtung Tischmitte wegläuft (nur Optik) */}
            <span
              aria-hidden="true"
              className={`
                pointer-events-none
                absolute
                left-1/2
                -z-10
                h-[130%]
                w-[88%]
                -translate-x-1/2
                ${side === "top" ? "top-1/2 rounded-b-[999px] bg-gradient-to-b from-blue-400/25 to-transparent" : "bottom-1/2 rounded-t-[999px] bg-gradient-to-t from-red-400/25 to-transparent"}
              `}
            />

            {/* Becheröffnung (Innenfläche) */}
            <span
              aria-hidden="true"
              className={`
                ${selectable ? "h-4 w-4" : "h-2.5 w-2.5"}
                rounded-full
                lg:h-8
                lg:w-8

                ${
                  isSelected
                    ? "bg-[radial-gradient(circle_at_35%_30%,#ecfeff,#22d3ee_70%)]"
                    : isPending
                      ? "bg-[radial-gradient(circle_at_35%_30%,rgba(254,240,138,0.55),rgba(250,204,21,0.2)_70%)]"
                      : side === "top"
                        ? "bg-[radial-gradient(circle_at_35%_30%,rgba(147,197,253,0.3),rgba(23,37,84,0.6)_70%)]"
                        : "bg-[radial-gradient(circle_at_35%_30%,rgba(255,175,175,0.55),rgba(220,38,38,0.35)_70%)]"
                }
              `}
            />
          </button>
        );
      })}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| HAUPTKOMPONENTE
|--------------------------------------------------------------------------
*/

export default function BeerPongTable({
  teamACups,
  teamBCups,
  teamACupSlots,
  teamBCupSlots,
  selectable = false,
  selectableTeam,
  selectedCupIds = [],
  displayTeam = "both",
  narrow = false,
  pendingCupIds,
  onCupClick,
}: BeerPongTableProps) {
  const t = useTranslations("Match.BeerPongTable");

  /* Eindeutige Gradient-IDs: mehrere Tische auf einer Seite (Mobile + Desktop + Overlay) dürfen sich nicht überschreiben. */
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const showTeamA = displayTeam === "both" || displayTeam === "A";

  const showTeamB = displayTeam === "both" || displayTeam === "B";

  const isSingleTeamView = displayTeam !== "both";

  return (
    <div
      className="
        relative
        mx-auto
        w-full
        max-w-[520px]
      "
    >
      {/* SPIELFELD */}

      <div
        className={`
          relative
          w-full

          ${isSingleTeamView ? "aspect-[1.3]" : "aspect-[0.72]"}
        `}
      >
        {isSingleTeamView ? (
          /* Einzel-Team-Ansicht: abgerundete Platte mit Neonrand */
          <div
            className={`
              pointer-events-none
              absolute
              inset-0
              rounded-[24px]
              border
              ${
                displayTeam === "B"
                  ? "border-red-400/55 shadow-[0_0_28px_rgba(239,68,68,0.3),inset_0_0_60px_rgba(0,0,0,0.55)]"
                  : "border-blue-400/55 shadow-[0_0_28px_rgba(59,130,246,0.3),inset_0_0_60px_rgba(0,0,0,0.55)]"
              }
              bg-[linear-gradient(180deg,#0b1a3c_0%,#070b18_100%)]
            `}
          />
        ) : (
          /* Beide Teams: Tisch in leichter Perspektive (unten breiter) */
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id={`${uid}-surface`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0b1d42" />
                <stop offset="0.5" stopColor="#070f24" />
                <stop offset="1" stopColor="#14091a" />
              </linearGradient>

              <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3b82f6" stopOpacity="0.85" />
                <stop offset="0.6" stopColor="#60a5fa" stopOpacity="0.95" />
                <stop offset="0.82" stopColor="#ef4444" stopOpacity="0.95" />
                <stop offset="1" stopColor="#fca5a5" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Vorderkante des Tisches */}
            <path
              d="M1.2 90 Q0.8 95 6 95 H94 Q99.2 95 98.8 90 L99.6 96 Q99.6 99.2 95 99.2 H5 Q0.4 99.2 0.4 96 Z"
              fill="#0a1118"
              stroke="#f87171"
              strokeOpacity="0.55"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            {/* Tischplatte */}
            <path
              d="M17 1.5 H83 Q87 1.5 87.6 5 L98.8 90 Q99.2 95 94 95 H6 Q0.8 95 1.2 90 L12.4 5 Q13 1.5 17 1.5 Z"
              fill={`url(#${uid}-surface)`}
              stroke={`url(#${uid}-edge)`}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              style={{ filter: "drop-shadow(0 0 7px rgba(59,130,246,0.65)) drop-shadow(0 8px 10px rgba(239,68,68,0.3))" }}
            />
          </svg>
        )}

        {/* Spielfeldstruktur (Textur, nur innerhalb der Tischplatte) */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-30
            bg-[repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(255,255,255,0.03) 4px
            )]
          "
          style={
            isSingleTeamView
              ? { borderRadius: 24 }
              : { clipPath: "polygon(14% 2%, 86% 2%, 98% 94%, 2% 94%)" }
          }
        />

        {/* Mittellinie mit Becher-Symbol */}

        {!isSingleTeamView && (
          <div
            className="
              pointer-events-none
              absolute
              left-[11%]
              right-[11%]
              top-1/2
              flex
              -translate-y-1/2
              items-center
              gap-2
            "
            aria-hidden="true"
          >
            <div className="flex-1 border-t border-dashed border-white/20" />

            <svg viewBox="0 0 24 28" className="h-4 w-4 shrink-0 text-blue-200/50 lg:h-8 lg:w-8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="2.6" />
              <path d="M3.4 6.5 L6.6 24.5 Q12 27.2 17.4 24.5 L20.6 6.5" />
              <path d="M5 13 Q12 15.8 19 13" opacity="0.6" />
            </svg>

            <div className="flex-1 border-t border-dashed border-white/20" />
          </div>
        )}

        {/* Team-Schilder */}

        {showTeamA && (
          <div
            className={`
              pointer-events-none
              absolute
              ${isSingleTeamView ? "left-3 top-3" : "left-1/2 top-[1.5%] -translate-x-1/2"}
              rounded-full
              border
              border-blue-400/60
              bg-[#06143a]/90
              ${narrow ? "px-1.5 text-[6px]" : "px-2 text-[7px]"}
              py-px
              font-black
              uppercase
              tracking-[0.18em]
              text-white
              shadow-[0_0_12px_rgba(59,130,246,0.55)]
              lg:px-5
              lg:py-1.5
              lg:text-[11px]
            `}
          >{t("teamA")}</div>
        )}

        {showTeamB && (
          <div
            className={`
              pointer-events-none
              absolute
              ${isSingleTeamView ? "bottom-3 right-3" : "bottom-[1.2%] left-1/2 -translate-x-1/2"}
              rounded-full
              border
              border-red-400/60
              bg-[#2a0710]/90
              ${narrow ? "px-1.5 text-[6px]" : "px-2 text-[7px]"}
              py-px
              font-black
              uppercase
              tracking-[0.18em]
              text-white
              shadow-[0_0_12px_rgba(239,68,68,0.55)]
              lg:px-5
              lg:py-1.5
              lg:text-[11px]
            `}
          >{t("teamB")}</div>
        )}

        {showTeamA && (
          <CupFormation
            cups={teamACups}
            cupSlots={teamACupSlots}
            side="top"
            compact={isSingleTeamView}
            narrow={narrow}
            selectable={selectable}
            selectableTeam={selectableTeam}
            selectedCupIds={selectedCupIds}
            pendingCupIds={pendingCupIds}
            onCupClick={onCupClick}
          />
        )}

        {showTeamB && (
          <CupFormation
            cups={teamBCups}
            cupSlots={teamBCupSlots}
            side="bottom"
            compact={isSingleTeamView}
            narrow={narrow}
            selectable={selectable}
            selectableTeam={selectableTeam}
            selectedCupIds={selectedCupIds}
            pendingCupIds={pendingCupIds}
            onCupClick={onCupClick}
          />
        )}
      </div>

      {/* BECHERANZAHL */}

      {displayTeam === "both" && !narrow && (
        <div
          className="
            mt-3
            flex
            justify-center
            gap-2
          "
        >
          <div
            className="
              rounded-full
              border
              border-blue-400/35
              bg-blue-500/10
              px-3
              py-1.5
              text-[9px]
              font-bold
              uppercase
              tracking-wider
              text-blue-200
            "
          >{t("a", { length: teamACups.filter((cup) => !cup.hit).length })}</div>

          <div
            className="
              rounded-full
              border
              border-red-400/35
              bg-red-500/10
              px-3
              py-1.5
              text-[9px]
              font-bold
              uppercase
              tracking-wider
              text-red-200
            "
          >{t("b", { length: teamBCups.filter((cup) => !cup.hit).length })}</div>
        </div>
      )}
    </div>
  );
}
