"use client";

import { useEffect, useState } from "react";
import { getSavedMatches } from "@/app/spieler/match/matchStorage";
import type { SavedMatch } from "@/app/spieler/match/matchStorage";

interface MatchHistoryProps {
  onSelectMatch?: (match: SavedMatch) => void;
}

export default function MatchHistory({ onSelectMatch }: MatchHistoryProps) {
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setMounted(true);

    /*
     * FIX: getSavedMatches() ist jetzt async (Supabase-Anfrage),
     * wurde hier aber ohne await aufgerufen. Dadurch landete ein
     * Promise-Objekt statt eines Arrays im State, und
     * `matches.map(...)` weiter unten ist mit
     * "matches.map is not a function" abgestürzt.
     */
    getSavedMatches()
      .then((result) => {
        if (!cancelled) {
          setMatches(result);
        }
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Match-Historie:", err);

        if (!cancelled) {
          setError("Match-Historie konnte nicht geladen werden.");
          setMatches([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Server und erster Client-Render
   * müssen exakt dieselbe Ansicht liefern.
   *
   * localStorage wird deshalb erst nach
   * dem Mount im Browser gelesen.
   */
  if (!mounted) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111419] p-6 text-center">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
          Match-Historie
        </div>

        <div className="mt-3 text-sm font-bold text-white/50">Lade Match-Historie …</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111419] p-6 text-center">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
          Match-Historie
        </div>

        <div className="mt-3 text-sm font-bold text-red-400/70">{error}</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111419] p-6 text-center">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
          Match-Historie
        </div>

        <div className="mt-3 text-sm font-bold text-white/50">
          Noch keine abgeschlossenen Matches
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
        Match-Historie
      </div>

      {matches.map((match) => {
        const state = match.state;

        const teamACupsRemaining = state.teamACups.filter((cup: { hit: any }) => !cup.hit).length;

        const teamBCupsRemaining = state.teamBCups.filter((cup: { hit: any }) => !cup.hit).length;

        const date = new Date(match.savedAt);

        return (
          <button
            key={match.id}
            type="button"
            onClick={() => onSelectMatch?.(match)}
            className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-[#111419]
              p-4
              text-left
              transition-all
              duration-150
              hover:border-white/20
              hover:bg-white/[0.04]
            "
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
                  Match beendet
                </div>

                <div className="mt-1 text-sm font-black text-white">
                  {state.winner ? `Team ${state.winner} gewinnt` : "Unentschieden"}
                </div>
              </div>

              <div className="text-right text-[9px] font-bold text-white/30">
                {date.toLocaleDateString("de-DE")}
                <br />
                {date.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div
                className="
                  rounded-xl
                  border
                  border-blue-400/10
                  bg-blue-400/[0.03]
                  px-3
                  py-2
                "
              >
                <div className="text-[8px] font-black uppercase tracking-wider text-blue-400/60">
                  Team A
                </div>

                <div className="mt-1 text-sm font-black text-white">
                  {teamACupsRemaining} Becher
                </div>
              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-red-400/10
                  bg-red-400/[0.03]
                  px-3
                  py-2
                "
              >
                <div className="text-[8px] font-black uppercase tracking-wider text-red-400/60">
                  Team B
                </div>

                <div className="mt-1 text-sm font-black text-white">
                  {teamBCupsRemaining} Becher
                </div>
              </div>
            </div>

            <div className="mt-3 text-[8px] font-bold uppercase tracking-wider text-white/20">
              Tippen für Details
            </div>
          </button>
        );
      })}
    </div>
  );
}
