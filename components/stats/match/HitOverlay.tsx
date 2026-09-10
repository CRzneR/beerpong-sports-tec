"use client";

import { useState } from "react";

import BeerPongTable, { Cup } from "@/components/stats/match/BeerPongTable";

export type ShotType = "single" | "bounce" | "trickshot";

interface HitOverlayProps {
  playerName: string;

  playerTeam: "A" | "B";

  teamACups: Cup[];

  teamBCups: Cup[];

  onClose: () => void;

  onSave: (data: { shotType: ShotType; cupIds: number[] }) => void;
}

const shotTypes: {
  id: ShotType;

  title: string;

  description: string;
}[] = [
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

export default function HitOverlay({
  playerName,
  playerTeam,
  teamACups,
  teamBCups,
  onClose,
  onSave,
}: HitOverlayProps) {
  const [shotType, setShotType] = useState<ShotType>("single");

  const [selectedCups, setSelectedCups] = useState<number[]>([]);

  /*
   * Nur das gegnerische Team ist überhaupt anklickbar - das eigene
   * Feld wird hier deshalb gar nicht erst mitgerendert (siehe
   * displayTeam unten). Das spart auch spürbar Höhe.
   */

  const opponentTeam: "A" | "B" = playerTeam === "A" ? "B" : "A";

  /*
   * Becher auswählen
   */

  const toggleCup = (cupId: number) => {
    setSelectedCups((current) => {
      if (current.includes(cupId)) {
        return current.filter((id) => id !== cupId);
      }

      return [...current, cupId];
    });
  };

  /*
   * Treffer speichern
   */

  const handleSave = () => {
    if (selectedCups.length === 0) {
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
      {/*
        OVERLAY

        max-h an dvh gebunden, flex-col: HEADER bleibt fix (shrink-0).
        Unterhalb von lg folgt ein eigener, kompakter Aufbau, der ohne
        internes Scrollen auskommt (Trefferart als schmale Reihe statt
        großer Karten mit Beschreibung, kleinere Abstände/Buttons) -
        ab lg exakt der bisherige Aufbau, unverändert.
      */}

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
              Treffer erfassen
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

        {/* CONTENT - MOBILE (< lg): eigener kompakter Aufbau, passt ohne Scroll */}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 lg:hidden">
          {/* TREFFERART - schmale Reihe statt gestapelter Karten mit Beschreibung */}

          <div className="shrink-0">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
              01 · Trefferart
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {shotTypes.map((type) => {
                const active = shotType === type.id;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setShotType(type.id)}
                    className={`rounded-xl border p-2 text-center transition ${
                      active
                        ? "border-cyan-400 bg-cyan-400/[0.08]"
                        : "border-white/[0.08] bg-white/[0.015]"
                    }`}
                  >
                    <div
                      className={`text-[10px] font-black uppercase ${
                        active ? "text-cyan-400" : "text-white"
                      }`}
                    >
                      {type.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BECHER-AUSWAHL */}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                02 · Getroffene Becher
              </div>

              <div className="text-xs font-black text-cyan-400">
                {selectedCups.length} ausgewählt
              </div>
            </div>

            <div className="mt-2 min-h-0 flex-1 rounded-2xl border border-white/[0.06] bg-black/20 p-2">
              <BeerPongTable
                teamACups={teamACups}
                teamBCups={teamBCups}
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
              disabled={selectedCups.length === 0}
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
              Treffer speichern
            </button>

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
          </div>
        </div>

        {/* CONTENT - DESKTOP (ab lg): unverändert */}

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
            {/* TREFFERART */}

            <div
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.2em]
                text-white/30
              "
            >
              01 · Trefferart
            </div>

            <div
              className="
                mt-4
                space-y-3
              "
            >
              {shotTypes.map((type) => {
                const active = shotType === type.id;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setShotType(type.id)}
                    className={`
                        w-full
                        rounded-2xl
                        border
                        p-5
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
                02 · Getroffene Becher
              </div>

              <div
                className="
                  text-sm
                  font-black
                  text-cyan-400
                "
              >
                {selectedCups.length} ausgewählt
              </div>
            </div>

            {/* NUR DAS GEGNERISCHE FELD - kompakt, nicht das ganze Spielfeld */}

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
              disabled={selectedCups.length === 0}
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
              Treffer speichern
            </button>

            {/* ABBRECHEN */}

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
          </div>
        </div>
      </div>
    </div>
  );
}
