"use client";

import type { SavedMatch } from "@/app/spieler/match/matchStorage";

interface MatchHistoryDetailProps {
  match: SavedMatch;
  onBack?: () => void;
}

export default function MatchHistoryDetail({ match, onBack }: MatchHistoryDetailProps) {
  const { state } = match;

  const teamACupsRemaining = state.teamACups.filter((cup) => !cup.hit).length;

  const teamBCupsRemaining = state.teamBCups.filter((cup) => !cup.hit).length;

  const teamACupsHit = state.teamACups.filter((cup) => cup.hit).length;

  const teamBCupsHit = state.teamBCups.filter((cup) => cup.hit).length;

  const totalActions = state.actions?.length ?? 0;

  const date = new Date(match.savedAt);

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-6 text-white">
      <div className="mx-auto w-full max-w-2xl">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="
              mb-5
              rounded-full
              border
              border-white/[0.08]
              bg-white/[0.025]
              px-4
              py-2
              text-[9px]
              font-black
              uppercase
              tracking-[0.15em]
              text-white/40
              transition
              hover:bg-white/[0.06]
              hover:text-white
            "
          >
            ← Zurück
          </button>
        )}

        <div className="space-y-4">
          {/* HEADER */}

          <section className="rounded-2xl border border-white/10 bg-[#111419] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
              Match-Details
            </div>

            <div className="mt-2 text-xl font-black text-white">
              {state.winner ? `Team ${state.winner} gewinnt` : "Unentschieden"}
            </div>

            <div className="mt-2 text-[9px] font-bold text-white/30">
              {date.toLocaleDateString("de-DE")} ·{" "}
              {date.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </section>

          {/* TEAMS */}

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-blue-400/10 bg-blue-400/[0.03] p-4">
              <div className="text-[8px] font-black uppercase tracking-wider text-blue-400/60">
                Team A
              </div>

              <div className="mt-2 text-2xl font-black text-white">{teamACupsHit}</div>

              <div className="text-[9px] font-bold uppercase tracking-wider text-white/25">
                Becher getroffen
              </div>

              <div className="mt-3 text-[10px] font-bold text-white/40">
                {teamACupsRemaining} Becher übrig
              </div>
            </div>

            <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.03] p-4">
              <div className="text-[8px] font-black uppercase tracking-wider text-red-400/60">
                Team B
              </div>

              <div className="mt-2 text-2xl font-black text-white">{teamBCupsHit}</div>

              <div className="text-[9px] font-bold uppercase tracking-wider text-white/25">
                Becher getroffen
              </div>

              <div className="mt-3 text-[10px] font-bold text-white/40">
                {teamBCupsRemaining} Becher übrig
              </div>
            </div>
          </section>

          {/* AKTIONEN */}

          <section className="rounded-2xl border border-white/10 bg-[#111419] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
                  Match-Verlauf
                </div>

                <div className="mt-1 text-sm font-black text-white">{totalActions} Aktionen</div>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-white/30">
                Abgeschlossen
              </div>
            </div>

            {totalActions === 0 ? (
              <div className="mt-5 text-[10px] font-bold text-white/25">
                Keine Aktionen gespeichert.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {state.actions.map((action, index) => (
                  <div
                    key={`${index}-${action.type}`}
                    className="
                      flex
                      items-center
                      justify-between
                      rounded-xl
                      border
                      border-white/[0.06]
                      bg-white/[0.02]
                      px-3
                      py-2
                    "
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                      {action.type}
                    </div>

                    <div className="text-[9px] font-black text-white/50">{index + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
