"use client";

import { useEffect, useRef, useState } from "react";

export type Cup = {
  id: number;
  hit: boolean;
};

interface BeerPongTableProps {
  teamACups: Cup[];
  teamBCups: Cup[];

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

  onCupClick?: (cupId: number) => void;
}

/*
|--------------------------------------------------------------------------
| FORMATIONEN
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

/*
 * 10 BECHER
 *
 * Team A:
 *
 * ● ● ● ●
 *  ● ● ●
 *   ● ●
 *    ●
 */

const FORMATION_10_TOP = [
  { x: 35, y: 15 },
  { x: 45, y: 15 },
  { x: 55, y: 15 },
  { x: 65, y: 15 },

  { x: 40, y: 26 },
  { x: 50, y: 26 },
  { x: 60, y: 26 },

  { x: 45, y: 37 },
  { x: 55, y: 37 },

  { x: 50, y: 47 },
];

/*
 * Team B:
 *
 *    ●
 *   ● ●
 *  ● ● ●
 * ● ● ● ●
 */

const FORMATION_10_BOTTOM = [
  { x: 50, y: 53 },

  { x: 45, y: 63 },
  { x: 55, y: 63 },

  { x: 40, y: 74 },
  { x: 50, y: 74 },
  { x: 60, y: 74 },

  { x: 35, y: 85 },
  { x: 45, y: 85 },
  { x: 55, y: 85 },
  { x: 65, y: 85 },
];

/*
|--------------------------------------------------------------------------
| 6ER FORMATION
|--------------------------------------------------------------------------
*/

/*
 * Team A
 *
 * ● ● ●
 *  ● ●
 *   ●
 */

const FORMATION_6_TOP = [
  { x: 40, y: 19 },
  { x: 50, y: 19 },
  { x: 60, y: 19 },

  { x: 45, y: 31 },
  { x: 55, y: 31 },

  { x: 50, y: 43 },
];

/*
 * Team B
 *
 *   ●
 *  ● ●
 * ● ● ●
 */

const FORMATION_6_BOTTOM = [
  { x: 50, y: 57 },

  { x: 45, y: 69 },
  { x: 55, y: 69 },

  { x: 40, y: 81 },
  { x: 50, y: 81 },
  { x: 60, y: 81 },
];

/*
|--------------------------------------------------------------------------
| 3ER FORMATION
|--------------------------------------------------------------------------
*/

/*
 * Team A
 *
 * ● ●
 *  ●
 */

const FORMATION_3_TOP = [
  { x: 45, y: 25 },
  { x: 55, y: 25 },

  { x: 50, y: 40 },
];

/*
 * Team B
 *
 *  ●
 * ● ●
 */

const FORMATION_3_BOTTOM = [
  { x: 50, y: 60 },

  { x: 45, y: 75 },
  { x: 55, y: 75 },
];

/*
|--------------------------------------------------------------------------
| 1ER FORMATION
|--------------------------------------------------------------------------
*/

const FORMATION_1_TOP = {
  x: 50,
  y: 47,
};

const FORMATION_1_BOTTOM = {
  x: 50,
  y: 53,
};

/*
|--------------------------------------------------------------------------
| EINZEL-TEAM FORMATIONEN (KOMPAKT)
|--------------------------------------------------------------------------
|
| Wird nur EIN Team angezeigt (z. B. im Treffer-Overlay, wo nur die
| gegnerischen Becher relevant sind), macht eine halbe, halbleere
| Spielfeldhälfte keinen Sinn. Diese Formationen zentrieren dieselbe
| Dreiecksform stattdessen über die volle Höhe der (kompakten) Box.
|
| Die x-Koordinaten bleiben identisch zu TOP/BOTTOM – nur die
| y-Koordinaten sind neu über 15–85% verteilt, statt nur eine halbe
| Feldhälfte (15–47 bzw. 53–85) zu nutzen.
|
*/

const FORMATION_10_SINGLE = [
  { x: 35, y: 15 },
  { x: 45, y: 15 },
  { x: 55, y: 15 },
  { x: 65, y: 15 },

  { x: 40, y: 39 },
  { x: 50, y: 39 },
  { x: 60, y: 39 },

  { x: 45, y: 63 },
  { x: 55, y: 63 },

  { x: 50, y: 85 },
];

const FORMATION_6_SINGLE = [
  { x: 40, y: 15 },
  { x: 50, y: 15 },
  { x: 60, y: 15 },

  { x: 45, y: 50 },
  { x: 55, y: 50 },

  { x: 50, y: 85 },
];

const FORMATION_3_SINGLE = [
  { x: 45, y: 15 },
  { x: 55, y: 15 },

  { x: 50, y: 85 },
];

const FORMATION_1_SINGLE = {
  x: 50,
  y: 50,
};

/*
|--------------------------------------------------------------------------
| FORMATIONS-STUFE ERMITTELN
|--------------------------------------------------------------------------
|
| FIX: Vorher wurde ein Re-Rack nur bei EXAKTEM Übergang ausgelöst
| (previousCount === 7 && remainingCount === 6, bzw. 4 → 3). Werden
| mehrere Becher in einer einzigen Aktion getroffen (z. B. ein Bounce,
| der 2 Becher auf einmal trifft), kann die Becherzahl eine Stufe
| komplett überspringen (z. B. 8 → 6 statt 8 → 7 → 6) – der exakte
| Vergleich hat dann nie gegriffen und der Re-Rack wurde übersprungen.
|
| Statt exakter Werte wird jetzt verglichen, ob sich die FORMATIONS-
| STUFE geändert hat – unabhängig davon, wie viele Becher auf einmal
| wegfallen (oder bei "Rückgängig" wieder dazukommen).
|
*/

type FormationTier = "ten" | "six" | "three" | "single" | "none";

function getFormationTier(remainingCount: number): FormationTier {
  if (remainingCount >= 7) {
    return "ten";
  }

  if (remainingCount >= 4) {
    return "six";
  }

  if (remainingCount >= 2) {
    return "three";
  }

  if (remainingCount === 1) {
    return "single";
  }

  return "none";
}

function getFormationForTier(
  tier: FormationTier,
  side: "top" | "bottom",
  compact: boolean,
): { x: number; y: number }[] {
  if (tier === "ten") {
    return compact ? FORMATION_10_SINGLE : side === "top" ? FORMATION_10_TOP : FORMATION_10_BOTTOM;
  }

  if (tier === "six") {
    return compact ? FORMATION_6_SINGLE : side === "top" ? FORMATION_6_TOP : FORMATION_6_BOTTOM;
  }

  if (tier === "three") {
    return compact ? FORMATION_3_SINGLE : side === "top" ? FORMATION_3_TOP : FORMATION_3_BOTTOM;
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| TYPE
|--------------------------------------------------------------------------
*/

type CupPosition = {
  id: number;
  x: number;
  y: number;
};

/*
|--------------------------------------------------------------------------
| STABILE POSITIONEN
|--------------------------------------------------------------------------
|
| Das ist der wichtige Teil:
|
| Ein Treffer verändert NICHT automatisch die Position
| der anderen Becher.
|
| Die Positionen werden nur beim tatsächlichen Re-Rack
| neu vergeben.
|
*/

function createInitialPositions(
  cups: Cup[],
  formation: { x: number; y: number }[],
): Record<number, { x: number; y: number }> {
  const result: Record<number, { x: number; y: number }> = {};

  cups.forEach((cup, index) => {
    const position = formation[index];

    if (position) {
      result[cup.id] = position;
    }
  });

  return result;
}

/*
|--------------------------------------------------------------------------
| CUP FORMATION
|--------------------------------------------------------------------------
*/

function CupFormation({
  cups,
  side,
  compact = false,
  selectable,
  selectableTeam,
  selectedCupIds,
  onCupClick,
}: {
  cups: Cup[];

  side: "top" | "bottom";

  /**
   * true = nur dieses eine Team wird angezeigt (Treffer-Overlay).
   * Die Formation wird dann zentriert über die volle Boxhöhe
   * verteilt, statt nur eine halbe Feldhälfte zu belegen.
   */
  compact?: boolean;

  selectable?: boolean;

  selectableTeam?: "A" | "B";

  selectedCupIds: number[];

  onCupClick?: (cupId: number) => void;
}) {
  const previousRemaining = useRef<number | null>(null);

  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({});

  const remainingCups = cups.filter((cup) => !cup.hit);

  const remainingCount = remainingCups.length;

  /*
   * Initialisierung
   */

  useEffect(() => {
    const currentTier = getFormationTier(remainingCount);

    if (previousRemaining.current === null) {
      if (currentTier === "single") {
        const lastCup = remainingCups[0];

        if (lastCup) {
          const position = compact
            ? FORMATION_1_SINGLE
            : side === "top"
              ? FORMATION_1_TOP
              : FORMATION_1_BOTTOM;

          setPositions({ [lastCup.id]: position });
        }
      } else {
        const initialFormation = getFormationForTier(currentTier, side, compact);

        setPositions(createInitialPositions(remainingCups, initialFormation));
      }

      previousRemaining.current = remainingCount;

      return;
    }

    const previousTier = getFormationTier(previousRemaining.current);

    /*
     * RE-RACK NUR BEI STUFENWECHSEL
     *
     * Egal ob mehrere Becher auf einmal wegfallen (Stufe wird
     * übersprungen) oder ob durch "Rückgängig" ein Becher wieder
     * dazukommt (Stufenwechsel rückwärts) – solange sich die Stufe
     * tatsächlich ändert, wird neu positioniert. Innerhalb derselben
     * Stufe (z. B. 10 → 9 → 8) passiert weiterhin NICHTS, die Becher
     * behalten ihre ursprüngliche Position.
     */

    if (currentTier !== previousTier) {
      if (currentTier === "single") {
        const lastCup = remainingCups[0];

        if (lastCup) {
          const position = compact
            ? FORMATION_1_SINGLE
            : side === "top"
              ? FORMATION_1_TOP
              : FORMATION_1_BOTTOM;

          setPositions({ [lastCup.id]: position });
        }
      } else if (currentTier !== "none") {
        const formation = getFormationForTier(currentTier, side, compact);

        setPositions(createInitialPositions(remainingCups, formation));
      }
    }

    previousRemaining.current = remainingCount;
  }, [remainingCount, side, compact]);

  /*
   * Positionen des aktuellen Teams.
   *
   * Treffer werden entfernt.
   *
   * Die übrigen Becher behalten ihre gespeicherte Position.
   */

  return (
    <>
      {remainingCups.map((cup) => {
        const position = positions[cup.id];

        /*
         * Falls React gerade zwischen zwei Zuständen ist,
         * wird der Becher noch nicht gerendert.
         */

        if (!position) {
          return null;
        }

        /*
         * Nur die gegnerischen Becher dürfen ausgewählt werden.
         */

        const isSelectable =
          selectable &&
          ((side === "top" && selectableTeam === "A") ||
            (side === "bottom" && selectableTeam === "B"));

        const isSelected = selectedCupIds.includes(cup.id);

        return (
          <button
            key={`${side}-${cup.id}`}
            type="button"
            disabled={!isSelectable}
            onClick={() => onCupClick?.(cup.id)}
            aria-label={`Becher ${cup.id}`}
            className={`
              absolute
              flex
              h-12
              w-12
              -translate-x-1/2
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border-2
              transition-all
              duration-150

              ${
                isSelected
                  ? `
                    scale-110
                    border-cyan-400
                    bg-cyan-400
                    shadow-[0_0_25px_rgba(34,211,238,0.45)]
                  `
                  : side === "top"
                    ? `
                      border-blue-500
                      bg-white
                      shadow-[0_0_18px_rgba(59,130,246,0.20)]
                    `
                    : `
                      border-red-500
                      bg-white
                      shadow-[0_0_18px_rgba(239,68,68,0.20)]
                    `
              }

              ${
                isSelectable
                  ? `
                    cursor-pointer
                    hover:scale-110
                    ${side === "top" ? "hover:border-blue-400" : "hover:border-red-400"}
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
            <span
              className={`
                h-8
                w-8
                rounded-full
                border

                ${
                  isSelected
                    ? `
                      border-cyan-300
                      bg-cyan-400
                    `
                    : side === "top"
                      ? `
                        border-blue-500
                        bg-blue-500/15
                      `
                      : `
                        border-red-500
                        bg-red-500/15
                      `
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
  selectable = false,
  selectableTeam,
  selectedCupIds = [],
  displayTeam = "both",
  onCupClick,
}: BeerPongTableProps) {
  const showTeamA = displayTeam === "both" || displayTeam === "A";

  const showTeamB = displayTeam === "both" || displayTeam === "B";

  /*
   * Wird nur EIN Team angezeigt (z. B. im Treffer-Overlay), rückt die
   * Formation kompakt in die Mitte einer spürbar niedrigeren Box,
   * statt eine halbleere Spielfeldhälfte darzustellen.
   */

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
          overflow-hidden
          rounded-[24px]
          border
          border-white/10
          bg-[#101318]
          shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]

          ${isSingleTeamView ? "aspect-[1.3]" : "aspect-[0.72]"}
        `}
      >
        {/* Spielfeldstruktur */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-20
            bg-[repeating-linear-gradient(
              0deg,
              transparent,
              transparent 7px,
              rgba(255,255,255,0.025) 8px
            )]
          "
        />

        {/* Mittellinie - nur sinnvoll, wenn wirklich beide Hälften zu sehen sind */}

        {!isSingleTeamView && (
          <div
            className="
              pointer-events-none
              absolute
              left-[10%]
              right-[10%]
              top-1/2
              border-t
              border-dashed
              border-white/10
            "
          />
        )}

        {/* TEAM A */}

        {showTeamA && (
          <div
            className="
              pointer-events-none
              absolute
              left-4
              top-4
              text-[9px]
              font-black
              uppercase
              tracking-[0.2em]
              text-blue-400/50
            "
          >
            Team A
          </div>
        )}

        {/* TEAM B */}

        {showTeamB && (
          <div
            className="
              pointer-events-none
              absolute
              bottom-4
              right-4
              text-[9px]
              font-black
              uppercase
              tracking-[0.2em]
              text-red-400/50
            "
          >
            Team B
          </div>
        )}

        {/* TEAM A */}

        {showTeamA && (
          <CupFormation
            cups={teamACups}
            side="top"
            compact={isSingleTeamView}
            selectable={selectable}
            selectableTeam={selectableTeam}
            selectedCupIds={selectedCupIds}
            onCupClick={onCupClick}
          />
        )}

        {/* TEAM B */}

        {showTeamB && (
          <CupFormation
            cups={teamBCups}
            side="bottom"
            compact={isSingleTeamView}
            selectable={selectable}
            selectableTeam={selectableTeam}
            selectedCupIds={selectedCupIds}
            onCupClick={onCupClick}
          />
        )}
      </div>

      {/* BECHERANZAHL */}

      {displayTeam === "both" && (
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
              border-blue-400/10
              bg-blue-400/[0.03]
              px-3
              py-1.5
              text-[9px]
              font-bold
              uppercase
              tracking-wider
              text-blue-400/50
            "
          >
            A · {teamACups.filter((cup) => !cup.hit).length}
          </div>

          <div
            className="
              rounded-full
              border
              border-red-400/10
              bg-red-400/[0.03]
              px-3
              py-1.5
              text-[9px]
              font-bold
              uppercase
              tracking-wider
              text-red-400/50
            "
          >
            B · {teamBCups.filter((cup) => !cup.hit).length}
          </div>
        </div>
      )}
    </div>
  );
}
