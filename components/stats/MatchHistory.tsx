"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSavedMatches } from "@/app/spieler/match/matchStorage";
import type { SavedMatch } from "@/app/spieler/match/matchStorage";
import { getOwnProfile, getRegisteredPlayerIds } from "@/app/spieler/match/playerProfiles";
import { PanelModal, PanelTitle } from "@/components/stats/PanelCard";

interface MatchHistoryProps {
  onSelectMatch?: (match: SavedMatch) => void;
}

/*
 * --------------------------------------------------------------------------
 * | LETZTE MATCHES (Karte im Profil)
 * --------------------------------------------------------------------------
 *
 * Eine Zeile pro Match: Avatar, "vs. Gegner", Datum, Ergebnis (gespielte
 * Becher, aus Sicht des eigenen Teams) und Sieg/Niederlage. Die Liste
 * bleibt die öffentliche Liste (nur Matches mit ausschließlich
 * registrierten Spielern). War man selbst dabei, wird aus der eigenen
 * Sicht angezeigt - sonst neutral mit beiden Teams.
 * --------------------------------------------------------------------------
 */

const PREVIEW_COUNT = 4;

type Outcome = "win" | "loss" | "draw" | "teamA" | "teamB";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const OUTCOME_STYLE: Record<Outcome, { label: string; text: string; avatar: string }> = {
  win: {
    label: "Sieg",
    text: "text-green-400",
    avatar: "border-green-400/30 bg-green-400/10 text-green-300",
  },
  loss: {
    label: "Niederlage",
    text: "text-red-400",
    avatar: "border-red-400/30 bg-red-400/10 text-red-300",
  },
  draw: {
    label: "Unentschieden",
    text: "text-white/50",
    avatar: "border-white/15 bg-white/[0.05] text-white/60",
  },
  teamA: {
    label: "Team A",
    text: "text-blue-400",
    avatar: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  },
  teamB: {
    label: "Team B",
    text: "text-red-400",
    avatar: "border-red-400/30 bg-red-400/10 text-red-300",
  },
};

function MatchRow({
  match,
  ownId,
  onClick,
}: {
  match: SavedMatch;
  ownId: string | null;
  onClick: () => void;
}) {
  const state = match.state;

  const names = (team: "A" | "B") =>
    state.players
      .filter((player: { team: string }) => player.team === team)
      .map((player: { name: string }) => player.name)
      .join(", ") || "–";

  /* Gespielte Becher: wie viele gegnerische Becher ein Team getroffen hat. */
  const cupsHitBy = (team: "A" | "B") =>
    (team === "A" ? state.teamBCups : state.teamACups).filter((cup: { hit: boolean }) => cup.hit)
      .length;

  const own = ownId ? state.players.find((player: { id: string }) => player.id === ownId) : null;

  let title: string;
  let score: string;
  let outcome: Outcome;
  let avatarText: string;

  if (own) {
    const ownTeam = own.team as "A" | "B";
    const otherTeam = ownTeam === "A" ? "B" : "A";
    const opponents = state.players.filter((player: { team: string }) => player.team === otherTeam);

    title = `vs. ${names(otherTeam)}`;
    score = `${cupsHitBy(ownTeam)}:${cupsHitBy(otherTeam)}`;
    outcome = !state.winner ? "draw" : state.winner === ownTeam ? "win" : "loss";
    avatarText = initialsOf(opponents[0]?.name ?? "?");
  } else {
    title = `${names("A")} vs. ${names("B")}`;
    score = `${cupsHitBy("A")}:${cupsHitBy("B")}`;
    outcome = !state.winner ? "draw" : state.winner === "A" ? "teamA" : "teamB";
    avatarText = state.winner ?? "–";
  }

  const style = OUTCOME_STYLE[outcome];
  const date = new Date(match.savedAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/[0.04]"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-black ${style.avatar}`}
      >
        {avatarText}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-[11px] font-semibold text-white/35">
          {date.toLocaleDateString("de-DE")}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-sm font-black text-white">{score}</span>
        <span className={`mt-0.5 block text-[11px] font-black ${style.text}`}>{style.label}</span>
      </span>
    </button>
  );
}

export default function MatchHistory({ onSelectMatch }: MatchHistoryProps) {
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setMounted(true);

    /*
     * getSavedMatches() ist async (Supabase-Anfrage) und muss mit await
     * bzw. then verarbeitet werden, sonst landet ein Promise im State.
     * Das eigene Profil ist optional: ohne Login (oder ohne Treffer) wird
     * die Liste neutral angezeigt.
     */
    Promise.all([getSavedMatches(), getRegisteredPlayerIds(), getOwnProfile().catch(() => null)])
      .then(([result, registeredIds, ownProfile]) => {
        if (cancelled) {
          return;
        }

        /*
         * Nur Matches zeigen, an denen ausschließlich registrierte
         * Spieler beteiligt waren - sobald auch nur ein Gast dabei
         * war, verschwindet das komplette Match aus dieser Liste
         * (nicht nur der Gast selbst, sonst würde die Anzeige -
         * Sieger, Becher-Stand - keinen Sinn mehr ergeben).
         */
        const onlyRegistered = result.filter((match) =>
          match.state.players.every((player) => registeredIds.has(player.id)),
        );

        setMatches(onlyRegistered);
        setOwnId(ownProfile?.id ?? null);
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

  const select = (match: SavedMatch) => {
    setShowAll(false);
    onSelectMatch?.(match);
  };

  /*
   * Server und erster Client-Render müssen exakt dieselbe Ansicht
   * liefern - die Daten werden deshalb erst nach dem Mount gezeigt.
   */
  let body: ReactNode;

  if (!mounted) {
    body = (
      <div className="py-8 text-center text-sm font-bold text-white/50">Lade Match-Historie …</div>
    );
  } else if (error) {
    body = <div className="py-8 text-center text-sm font-bold text-red-400/70">{error}</div>;
  } else if (matches.length === 0) {
    body = (
      <div className="py-8 text-center text-sm font-bold text-white/50">
        Noch keine abgeschlossenen Matches
      </div>
    );
  } else {
    body = (
      <div className="divide-y divide-white/[0.05]">
        {matches.slice(0, PREVIEW_COUNT).map((match) => (
          <MatchRow key={match.id} match={match} ownId={ownId} onClick={() => select(match)} />
        ))}
      </div>
    );
  }

  return (
    <>
      <section className="flex h-full flex-col rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
        <PanelTitle
          action={
            matches.length > PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="shrink-0 text-xs font-bold text-cyan-300 transition hover:text-cyan-200"
              >
                Alle anzeigen
              </button>
            ) : null
          }
        >
          Letzte Matches
        </PanelTitle>

        <div className="mt-4">{body}</div>
      </section>

      {showAll && (
        <PanelModal title={`Letzte Matches · ${matches.length}`} onClose={() => setShowAll(false)}>
          <div className="divide-y divide-white/[0.05]">
            {matches.map((match) => (
              <MatchRow key={match.id} match={match} ownId={ownId} onClick={() => select(match)} />
            ))}
          </div>
        </PanelModal>
      )}
    </>
  );
}
