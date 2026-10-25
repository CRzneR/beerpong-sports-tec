"use client";

import { useState } from "react";

import BeerPongTable, { Cup, CupSlotAssignment } from "@/components/stats/match/BeerPongTable";

/*
 * Das Overlay hat drei Modi:
 * - "hit" (Standard, "Getroffen"): Einzeltreffer, Aufhüpfen, Trickshot
 * - "special" (Knopf "Special"): Umgeworfen und Strafbecher - Becher, die
 *   gutgeschrieben werden, ohne dass es ein Wurf war
 * - Bonus-Becher (defaultShotType="extra"): automatisch nach Rundenende
 *
 * "extra" ist KEINE auswählbare Trefferart mehr, sondern wird nur noch
 * intern für die automatischen Bonus-Becher nach Rundenende verwendet
 * (defaultShotType="extra"). "penalty" (Strafbecher) und "knockover"
 * (Umgeworfen) sind Becher, die dem Spieler gutgeschrieben werden, ohne dass
 * es ein Wurf war (siehe isNonThrowHitType in matchLogic.ts).
 */
export type ShotType = "single" | "bounce" | "trickshot" | "extra" | "penalty" | "knockover";

interface HitOverlayProps {
  playerName: string;

  playerTeam: "A" | "B";

  teamACups: Cup[];

  teamBCups: Cup[];

  /**
   * Von useCupSlotAssignment() im übergeordneten page.tsx berechnet -
   * siehe Kommentar dort. Muss dieselbe Zuordnung sein wie auf dem
   * Spielbildschirm, sonst zeigt das Overlay die Becher an anderen
   * Stellen als der Rest der Seite.
   */
  teamACupSlots: CupSlotAssignment;

  teamBCupSlots: CupSlotAssignment;

  /**
   * Mit welcher Trefferart soll das Overlay starten? Für den
   * normalen Ablauf "single" (Default), für automatische
   * Extra-Treffer-Ansprüche nach Rundenende "extra".
   */
  defaultShotType?: ShotType;

  /**
   * "hit" (Standard) oder "special" (Umgeworfen / Strafbecher). Special wird
   * über einen eigenen Knopf geöffnet und ist unabhängig davon möglich, ob der
   * Spieler in dieser Runde schon geworfen hat.
   */
  mode?: "hit" | "special";

  /**
   * Nur im "extra"-Modus relevant: wie viele Bonus-Becher auf einmal
   * zu wählen sind (siehe calculateExtraCups in page.tsx). Im
   * normalen Modus wird weiterhin genau EIN Becher pro Treffer
   * markiert.
   */
  requiredCupCount?: number;

  onClose: () => void;

  onSave: (data: { shotType: ShotType; cupIds: number[] }) => void;
}

type ShotTypeOption = {
  id: ShotType;

  title: string;

  description: string;
};

const hitShotTypes: ShotTypeOption[] = [
  {
    id: "single",

    title: "Einzeltreffer",

    description: "Direkter Treffer",
  },

  {
    id: "bounce",

    title: "Aufhüpfen",

    description: "Ball springt vorher auf",
  },

  {
    id: "trickshot",

    title: "Trickshot",

    description: "Besonderer Wurf",
  },
];

const specialShotTypes: ShotTypeOption[] = [
  {
    id: "knockover",

    title: "Umgeworfen",

    description: "Becher des Gegners wurde umgeworfen",
  },

  {
    id: "penalty",

    title: "Strafbecher",

    description: "Becher durch Regelverstoß des Gegners",
  },
];

/* Nur für den automatischen Bonus-Becher-Modus: eine feste, nicht wählbare Karte. */
const extraShotType: ShotTypeOption = {
  id: "extra",

  title: "Extra Treffer",

  description: "Bonus-Becher dieser Runde",
};

export default function HitOverlay({
  playerName,
  playerTeam,
  teamACups,
  teamBCups,
  teamACupSlots,
  teamBCupSlots,
  defaultShotType = "single",
  mode = "hit",
  requiredCupCount = 1,
  onClose,
  onSave,
}: HitOverlayProps) {
  const [shotType, setShotType] = useState<ShotType>(defaultShotType);

  const [selectedCups, setSelectedCups] = useState<number[]>([]);

  /*
   * Nur das gegnerische Team ist überhaupt anklickbar - das eigene
   * Feld wird hier deshalb gar nicht erst mitgerendert (siehe
   * displayTeam unten). Das spart auch spürbar Höhe.
   */

  const opponentTeam: "A" | "B" = playerTeam === "A" ? "B" : "A";

  /*
   * Becher auswählen
   *
   * Normaler Treffer: immer nur EIN Becher (egal ob Einzeltreffer,
   * Aufhüpfer oder Trickshot). Der Tisch steht während der laufenden
   * Runde noch unverändert so da, wie ihn auch die nächste Spielerin
   * sieht (keine Live-Vorschau einer Neuaufstellung mitten in der
   * Runde). Alles, was ein Treffer über diesen einen Becher hinaus
   * zählt (Aufhüpfer = 2, gleicher Becher = +1), kommt erst nach
   * Rundenende als "Extra Treffer" dran.
   *
   * Extra-Modus: genau requiredCupCount Becher auf einmal, aus der
   * dann schon aktuellen (ggf. neu aufgestellten) Formation - alle
   * gemeinsam, damit sich die Formation nicht mitten in der Auswahl
   * nochmal verschiebt.
   */

  const isExtraMode = defaultShotType === "extra";
  const selectionLimit = isExtraMode ? Math.max(1, requiredCupCount) : 1;

  const toggleCup = (cupId: number) => {
    setSelectedCups((current) => {
      if (current.includes(cupId)) {
        return current.filter((id) => id !== cupId);
      }

      if (selectionLimit === 1) {
        return [cupId];
      }

      if (current.length >= selectionLimit) {
        return current;
      }

      return [...current, cupId];
    });
  };

  /* Im Bonus-Becher-Modus ist die Trefferart fest, sonst alle Arten wählbar. */
  const isSpecialMode = !isExtraMode && mode === "special";

  const visibleShotTypes = isExtraMode
    ? [extraShotType]
    : isSpecialMode
      ? specialShotTypes
      : hitShotTypes;

  /* Statische Klassen (Tailwind): Anzahl Spalten der Trefferart-Leiste am Handy. */
  const mobileColumns = isExtraMode ? "grid-cols-1" : isSpecialMode ? "grid-cols-2" : "grid-cols-3";

  /* Strafbecher/Umgeworfen: kein Wurf, der Spieler wirft danach ganz normal weiter. */
  const isCreditOnly = shotType === "penalty" || shotType === "knockover";

  const saveLabel = isExtraMode
    ? "Bonus-Becher speichern"
    : isSpecialMode && shotType === "penalty"
      ? "Strafbecher speichern"
      : isSpecialMode && shotType === "knockover"
        ? "Umgeworfen speichern"
        : "Treffer speichern";

  const handleShotTypeChange = (next: ShotType) => {
    if (isExtraMode) {
      return;
    }

    setShotType(next);
    setSelectedCups([]);
  };

  /*
   * Treffer speichern
   */

  const canSave = selectedCups.length === selectionLimit;

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    onSave({
      shotType,
      cupIds: selectedCups,
    });
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/80
        p-4
        backdrop-blur-md
      "
    >
      <div
        className="
          relative
          flex
          max-h-[90dvh]
          w-full
          max-w-[1050px]
          flex-col
          overflow-hidden
          rounded-[28px]
          border
          border-white/10
          bg-[#111419]
          shadow-[0_30px_100px_rgba(0,0,0,0.7)]
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-white/[0.06]
            px-4
            py-3
            lg:px-7
            lg:py-6
          "
        >
          <div>
            <div
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.2em]
                text-cyan-400
                lg:text-[10px]
              "
            >
              {isExtraMode
                ? `Bonus-Becher auswählen · ${selectionLimit}`
                : isSpecialMode
                  ? "Special erfassen"
                  : "Treffer erfassen"}
            </div>

            <h2
              className="
                mt-1
                text-xl
                font-black
                uppercase
                tracking-tight
                lg:mt-2
                lg:text-3xl
              "
            >
              {playerName}
            </h2>
          </div>

          {/* SCHLIESSEN */}

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-white/[0.05]
              text-lg
              text-white/40
              transition
              hover:bg-white/[0.1]
              hover:text-white
              lg:h-12
              lg:w-12
              lg:text-2xl
            "
            aria-label="Overlay schließen"
          >
            ×
          </button>
        </div>

        {/* CONTENT - MOBILE (< lg) */}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 lg:hidden">
          <div className="shrink-0">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
              01 · {isSpecialMode ? "Special" : "Trefferart"}
            </div>

            <div className={`mt-2 grid gap-1.5 ${mobileColumns}`}>
              {visibleShotTypes.map((type) => {
                const active = shotType === type.id;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleShotTypeChange(type.id)}
                    className={`rounded-xl border p-1.5 text-center transition ${
                      active
                        ? "border-cyan-400 bg-cyan-400/[0.08]"
                        : "border-white/[0.08] bg-white/[0.015]"
                    }`}
                  >
                    <div
                      className={`text-[9px] font-black uppercase leading-tight ${
                        active ? "text-cyan-400" : "text-white"
                      }`}
                    >
                      {type.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {isCreditOnly && (
              <p className="mt-1.5 text-[9px] font-semibold leading-snug text-white/35">
                Kein Wurf: Der Becher wird gutgeschrieben, Würfe und Quote bleiben gleich.
              </p>
            )}
          </div>

          {/* BECHER-AUSWAHL */}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                02 · Getroffener Becher
              </div>

              <div className="text-xs font-black text-cyan-400">
                {selectedCups.length}/{selectionLimit} ausgewählt
              </div>
            </div>

            <div className="mt-2 min-h-0 flex-1 rounded-2xl border border-white/[0.06] bg-black/20 p-2">
              <BeerPongTable
                teamACups={teamACups}
                teamBCups={teamBCups}
                teamACupSlots={teamACupSlots}
                teamBCupSlots={teamBCupSlots}
                selectable={true}
                selectableTeam={opponentTeam}
                displayTeam={opponentTeam}
                selectedCupIds={selectedCups}
                onCupClick={toggleCup}
              />
            </div>
          </div>

          {/* SPEICHERN / ABBRECHEN */}

          <div className="shrink-0 space-y-1.5">
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="
                w-full
                rounded-xl
                bg-cyan-400
                px-4
                py-3
                text-xs
                font-black
                uppercase
                tracking-[0.12em]
                text-black
                transition
                hover:bg-cyan-300
                disabled:cursor-not-allowed
                disabled:bg-white/[0.05]
                disabled:text-white/20
              "
            >
              {saveLabel}
            </button>

            {defaultShotType !== "extra" && (
              <button
                type="button"
                onClick={onClose}
                className="
                  w-full
                  py-1.5
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.15em]
                  text-white/25
                  transition
                  hover:text-white
                "
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>

        {/* CONTENT - DESKTOP (ab lg) */}

        <div
          className="
            hidden
            min-h-0
            flex-1
            gap-8
            overflow-y-auto
            p-7
            lg:grid
            lg:grid-cols-[320px_1fr]
          "
        >
          {/* LINKE SEITE */}

          <div>
            <div
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.2em]
                text-white/30
              "
            >
              01 · {isSpecialMode ? "Special" : "Trefferart"}
            </div>

            <div
              className="
                mt-4
                space-y-3
              "
            >
              {visibleShotTypes.map((type) => {
                const active = shotType === type.id;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleShotTypeChange(type.id)}
                    className={`
                        w-full
                        rounded-2xl
                        border
                        p-4
                        text-left
                        transition

                        ${
                          active
                            ? `
                              border-cyan-400
                              bg-cyan-400/[0.08]
                              shadow-[0_0_30px_rgba(34,211,238,0.08)]
                            `
                            : `
                              border-white/[0.08]
                              bg-white/[0.015]
                              hover:border-white/20
                              hover:bg-white/[0.03]
                            `
                        }
                      `}
                  >
                    <div
                      className={`
                          text-base
                          font-black
                          uppercase

                          ${active ? "text-cyan-400" : "text-white"}
                        `}
                    >
                      {type.title}
                    </div>

                    <div
                      className="
                          mt-1
                          text-xs
                          text-white/30
                        "
                    >
                      {type.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {isCreditOnly && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/50">
                Kein Wurf: Der Becher wird dem Spieler gutgeschrieben und sofort entfernt. Würfe,
                Treffer und Trefferquote bleiben unverändert, der Spieler wirft danach ganz normal.
              </div>
            )}

            {shotType === "bounce" && (
              <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.05] p-3 text-[11px] leading-relaxed text-yellow-200/80">
                Ein Aufhüpfer zählt 2 Becher: hier den direkt getroffenen wählen, der zweite folgt
                automatisch nach Ende dieser Runde als "Extra Treffer" - aus der dann aktuellen
                Formation.
              </div>
            )}
          </div>

          {/* RECHTE SEITE */}

          <div>
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <div
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  text-white/30
                "
              >
                02 · Getroffener Becher
              </div>

              <div
                className="
                  text-sm
                  font-black
                  text-cyan-400
                "
              >
                {selectedCups.length}/{selectionLimit} ausgewählt
              </div>
            </div>

            <div
              className="
                mt-4
                rounded-2xl
                border
                border-white/[0.06]
                bg-black/20
                p-4
              "
            >
              <BeerPongTable
                teamACups={teamACups}
                teamBCups={teamBCups}
                teamACupSlots={teamACupSlots}
                teamBCupSlots={teamBCupSlots}
                selectable={true}
                selectableTeam={opponentTeam}
                displayTeam={opponentTeam}
                selectedCupIds={selectedCups}
                onCupClick={toggleCup}
              />
            </div>

            {/* SPEICHERN */}

            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="
                mt-5
                w-full
                rounded-2xl
                bg-cyan-400
                px-6
                py-5
                text-sm
                font-black
                uppercase
                tracking-[0.12em]
                text-black
                transition
                hover:bg-cyan-300
                disabled:cursor-not-allowed
                disabled:bg-white/[0.05]
                disabled:text-white/20
              "
            >
              {saveLabel}
            </button>

            {/* ABBRECHEN */}

            {defaultShotType !== "extra" && (
              <button
                type="button"
                onClick={onClose}
                className="
                  mt-3
                  w-full
                  py-3
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.15em]
                  text-white/25
                  transition
                  hover:text-white
                "
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
