"use client";

export type MatchPlayer = {
  id: string;
  name: string;
  initials: string;
  team: "A" | "B";
  isGuest: boolean;

  throws: number;
  hits: number;
};

interface PlayerCardProps {
  player: MatchPlayer;

  onHit: (player: MatchPlayer) => void;
  onMiss: (player: MatchPlayer) => void;

  /**
   * true = Spieler ist gerade nicht dran (falsches Team am Zug
   * oder in dieser Runde schon aktiv gewesen). Buttons sind dann
   * gesperrt und die Karte wird abgedunkelt.
   */
  disabled?: boolean;
}

export default function PlayerCard({ player, onHit, onMiss, disabled = false }: PlayerCardProps) {
  const hitRate = player.throws > 0 ? Math.round((player.hits / player.throws) * 100) : 0;

  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.08]
        bg-[#111419]
        p-2.5
        transition-colors
        transition-opacity
        lg:p-4

        ${disabled ? "opacity-45" : "opacity-100"}
      `}
    >
      {/* Team indicator */}

      <div
        className={`
          absolute
          left-0
          top-0
          h-full
          w-1

          ${player.team === "A" ? "bg-cyan-400" : "bg-fuchsia-400"}
        `}
      />

      <div className="flex items-start justify-between gap-3">
        {/* Player */}

        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          <div
            className={`
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-[10px]
              font-black
              lg:h-11
              lg:w-11
              lg:text-xs

              ${
                player.team === "A"
                  ? "bg-cyan-400/10 text-cyan-400"
                  : "bg-fuchsia-400/10 text-fuchsia-400"
              }
            `}
          >
            {player.initials}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-xs font-black uppercase tracking-tight text-white lg:text-sm">
                {player.name}
              </h3>

              {player.isGuest && (
                <span
                  className="
                    shrink-0
                    rounded-full
                    bg-white/[0.06]
                    px-2
                    py-0.5
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-white/35
                  "
                >
                  Gast
                </span>
              )}
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-[9px] uppercase tracking-wider text-white/25 lg:mt-1">
              <span>{player.throws} Würfe</span>

              <span className="text-white/10">·</span>

              <span>{player.hits} Treffer</span>
            </div>
          </div>
        </div>

        {/* Hit Rate */}

        <div className="shrink-0 text-right">
          <div className="text-sm font-black tracking-tight text-white lg:text-lg">{hitRate}%</div>

          <div className="text-[8px] font-bold uppercase tracking-wider text-white/20">Quote</div>
        </div>
      </div>

      {/* Actions */}

      <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-4">
        <button
          type="button"
          onClick={() => onMiss(player)}
          disabled={disabled}
          className="
            min-h-9
            rounded-xl
            border
            border-white/[0.08]
            bg-white/[0.025]
            text-[10px]
            font-black
            uppercase
            tracking-[0.12em]
            text-white/50
            transition-all
            hover:border-white/[0.16]
            hover:bg-white/[0.05]
            hover:text-white
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:hover:border-white/[0.08]
            disabled:hover:bg-white/[0.025]
            disabled:hover:text-white/50
            disabled:active:scale-100
            lg:min-h-12
          "
        >
          Daneben
        </button>

        <button
          type="button"
          onClick={() => onHit(player)}
          disabled={disabled}
          className="
            min-h-9
            rounded-xl
            bg-cyan-400
            text-[10px]
            font-black
            uppercase
            tracking-[0.12em]
            text-black
            shadow-[0_0_20px_rgba(34,211,238,0.08)]
            transition-all
            hover:bg-cyan-300
            hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:bg-cyan-400/30
            disabled:shadow-none
            disabled:hover:bg-cyan-400/30
            disabled:active:scale-100
            lg:min-h-12
          "
        >
          Getroffen
        </button>
      </div>
    </div>
  );
}
