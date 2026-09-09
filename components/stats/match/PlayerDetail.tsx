"use client";

import PlayerStats from "./PlayerStats";

interface PlayerDetailProps {
  playerId: string;
  onBack?: () => void;
}

export default function PlayerDetail({ playerId, onBack }: PlayerDetailProps) {
  return (
    <div className="space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
        >
          ← Zurück
        </button>
      )}

      <PlayerStats playerId={playerId} />
    </div>
  );
}
