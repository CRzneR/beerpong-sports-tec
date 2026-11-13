"use client";

import { useTranslations } from "next-intl";

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
   * "Special": Umgeworfen / Strafbecher. Bleibt auch dann bedienbar, wenn der
   * Spieler in dieser Runde schon geworfen hat oder das andere Team dran ist
   * (siehe specialDisabled) - ein Becher kann jederzeit umfallen.
   */
  onSpecial: (player: MatchPlayer) => void;

  /**
   * true = Spieler ist gerade nicht dran (falsches Team am Zug
   * oder in dieser Runde schon aktiv gewesen). Daneben/Getroffen sind
   * dann gesperrt und die Kopfzeile wird abgedunkelt.
   */
  disabled?: boolean;

  /**
   * true = auch Special gesperrt (z. B. vor dem Anwurf, während Bonus-Becher
   * gewählt werden oder nach Spielende).
   */
  specialDisabled?: boolean;
}

export default function PlayerCard({
  player,
  onHit,
  onMiss,
  onSpecial,
  disabled = false,
  specialDisabled = false,
}: PlayerCardProps) {
  const t = useTranslations("Match.PlayerCard");

  const hitRate = player.throws > 0 ? Math.round((player.hits / player.throws) * 100) : 0;

  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-2xl
        border
        p-2.5
        backdrop-blur-md
        transition-colors
        transition-opacity
        lg:p-4

        ${
          player.team === "A"
            ? "border-blue-400/40 bg-gradient-to-br from-blue-500/[0.14] via-[#0a1226]/80 to-[#0a1226]/60 shadow-[0_0_26px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.07)]"
            : "border-red-400/40 bg-gradient-to-br from-red-500/[0.14] via-[#190b12]/80 to-[#190b12]/60 shadow-[0_0_26px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.07)]"
        }
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

          ${
            player.team === "A"
              ? "bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.95)]"
              : "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.95)]"
          }
        `}
      />

      <div
        className={`flex items-start justify-between gap-3 transition-opacity ${
          disabled ? "opacity-45" : "opacity-100"
        }`}
      >
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
              rounded-full
              border-2
              text-[10px]
              font-black
              lg:h-11
              lg:w-11
              lg:text-xs

              ${
                player.team === "A"
                  ? "border-blue-400 bg-blue-500/10 text-blue-300 shadow-[0_0_14px_rgba(59,130,246,0.45),inset_0_0_8px_rgba(59,130,246,0.25)]"
                  : "border-red-400 bg-red-500/10 text-red-300 shadow-[0_0_14px_rgba(239,68,68,0.45),inset_0_0_8px_rgba(239,68,68,0.25)]"
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
                >{t("gast")}</span>
              )}
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-[9px] uppercase tracking-wider text-white/25 lg:mt-1">
              <span>{t("wuerfe", { throws: player.throws })}</span>

              <span className="text-white/10">·</span>

              <span>{t("treffer", { hits: player.hits })}</span>
            </div>
          </div>
        </div>

        {/* Hit Rate */}

        <div className="shrink-0 text-right">
          <div className="text-sm font-black tracking-tight text-white lg:text-lg">{hitRate}%</div>

          <div className="text-[8px] font-bold uppercase tracking-wider text-white/20">{t("quote")}</div>
        </div>
      </div>

      {/* Actions */}

      <div className="mt-2 grid grid-cols-3 gap-2 lg:mt-4">
        <button
          type="button"
          onClick={() => onMiss(player)}
          disabled={disabled}
          className="
            min-h-9
            rounded-xl
            border
            border-white/[0.12]
            bg-white/[0.07]
            text-[10px]
            font-black
            uppercase
            tracking-[0.12em]
            text-white/75
            transition-all
            hover:border-white/[0.25]
            hover:bg-white/[0.12]
            hover:text-white
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-45
            disabled:hover:border-white/[0.12]
            disabled:hover:bg-white/[0.07]
            disabled:hover:text-white/75
            disabled:active:scale-100
            lg:min-h-12
          "
        >{t("daneben")}</button>

        <button
          type="button"
          onClick={() => onHit(player)}
          disabled={disabled}
          className="
            min-h-9
            rounded-xl
            border
            border-blue-300/50
            bg-gradient-to-b
            from-blue-400
            to-blue-600
            text-[10px]
            font-black
            uppercase
            tracking-[0.12em]
            text-white
            shadow-[0_0_18px_rgba(59,130,246,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]
            transition-all
            hover:from-blue-300
            hover:to-blue-500
            hover:shadow-[0_0_26px_rgba(59,130,246,0.75),inset_0_1px_0_rgba(255,255,255,0.4)]
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:border-blue-400/20
            disabled:from-blue-500/25
            disabled:to-blue-600/25
            disabled:text-white/45
            disabled:shadow-none
            disabled:hover:from-blue-500/25
            disabled:hover:to-blue-600/25
            disabled:active:scale-100
            lg:min-h-12
          "
        >{t("getroffen")}</button>

        <button
          type="button"
          onClick={() => onSpecial(player)}
          disabled={specialDisabled}
          className="
            min-h-9
            rounded-xl
            border
            border-yellow-400/50
            bg-yellow-400/[0.08]
            text-[10px]
            font-black
            uppercase
            tracking-[0.12em]
            text-yellow-300
            transition-all
            hover:border-yellow-400/50
            hover:bg-yellow-400/[0.14]
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-40
            disabled:hover:border-yellow-400/30
            disabled:hover:bg-yellow-400/[0.07]
            disabled:active:scale-100
            lg:min-h-12
          "
        >{t("special")}</button>
      </div>
    </div>
  );
}
