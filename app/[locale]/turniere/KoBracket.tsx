"use client";

import { useEffect, useRef, useState } from "react";

import { BRACKET_BOX_H, BRACKET_BOX_W, layoutKoBracket, type BracketBox } from "./koBracketLayout";
import { koWinnerId, type KoMatchStatus, type TournamentTeam } from "./tournamentLogic";
import { useTranslations } from "next-intl";

/*
|--------------------------------------------------------------------------
| K.-O.-TURNIERBAUM ALS GRAFIK
|--------------------------------------------------------------------------
|
| Zwei Hälften laufen nach innen, in der Mitte steht das Finale mit dem
| Pokal. Jede Box ist ein Team ("1. Gruppe A" darunter zeigt, woher es
| kommt). Gewinner stehen fett, Verlierer abgedunkelt, das eigene Team ist
| gelb markiert.
|
| Die Positionen berechnet koBracketLayout.ts. Die Grafik ist breit und
| wird deshalb in einem horizontal scrollbaren Bereich gezeigt.
|
*/

export type KoBracketMatch = {
  id: string;
  round: number;
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
  teamAScore: number | null;
  teamBScore: number | null;
  status: KoMatchStatus;
};

type Props = {
  matches: KoBracketMatch[];
  teamById: (id: string) => TournamentTeam | undefined;
  /* Zusatzzeile unter dem Namen, z. B. "1. Gruppe A". */
  tagOf: (teamId: string) => string | null;
  seedOf: (teamId: string) => number | null;
  myTeamId: string | null;
  championId: string | null;
  /* Nur der Veranstalter: Klick auf eine Box öffnet die Ergebnis-Eingabe. */
  onSelectMatch?: (matchId: string) => void;
};

/* Der Baum wird bis zu dieser Größe verkleinert, damit er in die Seite passt; darunter wird gescrollt. */
const MIN_SCALE = 0.6;

function Trophy({ highlight }: { highlight: boolean }) {
  const t = useTranslations("League.KoBracket");

  return (
    <svg
      viewBox="0 0 120 150"
      className={`h-[110px] w-[88px] ${highlight ? "drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]" : "opacity-80"}`}
      role="img"
      aria-label={t("pokal")}
    >
      <defs>
        <linearGradient id="ko-trophy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={highlight ? "#fff3b0" : "#e5e7eb"} />
          <stop offset="0.5" stopColor={highlight ? "#f5c518" : "#9ca3af"} />
          <stop offset="1" stopColor={highlight ? "#a87408" : "#4b5563"} />
        </linearGradient>
      </defs>
      <path
        d="M30 20 C6 20 6 62 34 70 M90 20 C114 20 114 62 86 70"
        fill="none"
        stroke="url(#ko-trophy)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M28 8 H92 C92 52 82 78 60 82 C38 78 28 52 28 8 Z" fill="url(#ko-trophy)" />
      <rect x="53" y="80" width="14" height="30" fill="url(#ko-trophy)" />
      <path d="M40 108 H80 L86 124 H34 Z" fill="url(#ko-trophy)" />
      <rect x="28" y="124" width="64" height="12" rx="3" fill="url(#ko-trophy)" />
    </svg>
  );
}

export function KoBracket({
  matches,
  teamById,
  tagOf,
  seedOf,
  myTeamId,
  championId,
  onSelectMatch,
}: Props) {
  const t = useTranslations("League.KoBracket");

  const layout = layoutKoBracket(matches);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    const element = wrapRef.current;

    if (!element) {
      return;
    }

    const update = () => setAvailable(element.clientWidth);

    update();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  if (layout.boxes.length === 0) {
    return null;
  }

  const scale =
    available > 0 && layout.width > 0
      ? Math.min(1, Math.max(MIN_SCALE, available / layout.width))
      : 1;

  const matchById = new Map(matches.map((match) => [match.id, match]));
  const champion = championId ? teamById(championId) : undefined;

  const renderBox = (box: BracketBox) => {
    const match = matchById.get(box.matchId);

    if (!match) {
      return null;
    }

    const team = box.teamId ? teamById(box.teamId) : undefined;
    const winnerId = koWinnerId(match);
    const isWinner = Boolean(team && winnerId === team.id);
    const isLoser = Boolean(team && winnerId && winnerId !== team.id);
    const mine = Boolean(team && myTeamId === team.id);
    const score = box.side === "A" ? match.teamAScore : match.teamBScore;
    const clickable = Boolean(onSelectMatch && match.teamAId && match.teamBId);
    const tag = team ? tagOf(team.id) : null;
    const seed = team ? seedOf(team.id) : null;

    const className = `absolute flex items-center gap-2 rounded-lg border px-2.5 text-left transition ${
      mine
        ? "border-yellow-400/60 bg-yellow-400/[0.1]"
        : team
          ? "border-white/[0.14] bg-white/[0.045]"
          : "border-white/[0.07] bg-white/[0.015]"
    } ${clickable ? "cursor-pointer hover:border-yellow-400/50" : ""}`;

    const style = { left: box.x, top: box.y, width: BRACKET_BOX_W, height: BRACKET_BOX_H };

    const content = (
      <>
        <span className="w-5 shrink-0 text-[9px] font-black text-white/30">
          {seed ? `#${seed}` : ""}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13px] leading-tight ${
              isWinner
                ? "font-black text-white"
                : isLoser
                  ? "font-bold text-white/35"
                  : team
                    ? "font-bold text-white"
                    : "font-bold text-white/20"
            }`}
          >
            {team ? team.name : ""}
          </span>

          {tag && (
            <span className="block truncate text-[9px] font-bold uppercase leading-tight tracking-wider text-white/35">
              {tag}
            </span>
          )}
        </span>

        {match.status === "finished" && score !== null && (
          <span
            className={`shrink-0 text-sm font-black ${isWinner ? "text-yellow-400" : "text-white/40"}`}
          >
            {score}
          </span>
        )}
      </>
    );

    if (clickable) {
      return (
        <button
          key={box.key}
          type="button"
          onClick={() => onSelectMatch?.(match.id)}
          className={className}
          style={style}
          aria-label={t("ergebnisEintragenGegen", { v: teamById(match.teamAId ?? "")?.name ?? "", v2: teamById(match.teamBId ?? "")?.name ?? "" })}
        >
          {content}
        </button>
      );
    }

    return (
      <div key={box.key} className={className} style={style}>
        {content}
      </div>
    );
  };

  return (
    <div ref={wrapRef} className="overflow-x-auto pb-3">
      <div
        className="mx-auto"
        style={{ width: layout.width * scale, height: layout.height * scale }}
      >
        <div
          className="relative origin-top-left"
          style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            className="pointer-events-none absolute left-0 top-0"
            aria-hidden="true"
          >
            {layout.lines.map((d, index) => (
              <path
                key={index}
                d={d}
                fill="none"
                stroke="rgba(250,204,21,0.28)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {layout.boxes.map(renderBox)}

          {layout.trophy && (
            <div
              className="absolute flex -translate-x-1/2 flex-col items-center"
              style={{ left: layout.trophy.x, top: layout.trophy.y - 12 }}
            >
              <Trophy highlight={Boolean(champion)} />

              {champion && (
                <div className="mt-2 max-w-[200px] truncate text-center text-[11px] font-black uppercase tracking-wider text-yellow-300">
                  {champion.name}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
