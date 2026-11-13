"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getMatchDigests, type MatchDigest } from "@/app/[locale]/spieler/match/matchDigest";
import { getSavedMatch } from "@/app/[locale]/spieler/match/matchStorage";
import type { SavedMatch } from "@/app/[locale]/spieler/match/matchStorage";
import { getOwnProfile, getRegisteredPlayerIds } from "@/app/[locale]/spieler/match/playerProfiles";
import { PanelModal, PanelTitle } from "@/components/stats/PanelCard";
import { useLocale, useTranslations } from "next-intl";

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
    label: "sieg",
    text: "text-green-400",
    avatar: "border-green-400/30 bg-green-400/10 text-green-300",
  },
  loss: {
    label: "niederlage",
    text: "text-red-400",
    avatar: "border-red-400/30 bg-red-400/10 text-red-300",
  },
  draw: {
    label: "unentschieden",
    text: "text-white/50",
    avatar: "border-white/15 bg-white/[0.05] text-white/60",
  },
  teamA: {
    label: "teamA",
    text: "text-blue-400",
    avatar: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  },
  teamB: {
    label: "teamB",
    text: "text-red-400",
    avatar: "border-red-400/30 bg-red-400/10 text-red-300",
  },
};

function MatchRow({
  match,
  ownId,
  onClick,
}: {
  match: MatchDigest;
  ownId: string | null;
  onClick: () => void;
}) {
  const t = useTranslations("Stats.MatchHistory");
  const locale = useLocale();

  const names = (team: "A" | "B") =>
    match.players
      .filter((player) => player.team === team)
      .map((player) => player.name)
      .join(", ") || "–";

  /*
   * Gespielte Becher: wie viele gegnerische Becher ein Team getroffen hat.
   * Es zählen nur die Becher 1 bis 10 (wie in der Becher-Anzeige des Matches).
   */
  const cupsHitBy = (team: "A" | "B") =>
    (team === "A" ? match.cupsA : match.cupsB).filter((cupId) => cupId >= 1 && cupId <= 10).length;

  const own = ownId ? match.players.find((player) => player.id === ownId) : null;

  let title: string;
  let score: string;
  let outcome: Outcome;
  let avatarText: string;

  if (own) {
    const ownTeam = own.team;
    const otherTeam = ownTeam === "A" ? "B" : "A";
    const opponents = match.players.filter((player) => player.team === otherTeam);

    title = t("vsNames", { names: names(otherTeam) });
    score = `${cupsHitBy(ownTeam)}:${cupsHitBy(otherTeam)}`;
    outcome = !match.winner ? "draw" : match.winner === ownTeam ? "win" : "loss";
    avatarText = initialsOf(opponents[0]?.name ?? "?");
  } else {
    title = t("teamsVs", { a: names("A"), b: names("B") });
    score = `${cupsHitBy("A")}:${cupsHitBy("B")}`;
    outcome = !match.winner ? "draw" : match.winner === "A" ? "teamA" : "teamB";
    avatarText = match.winner ?? "–";
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
          {date.toLocaleDateString(locale)}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-sm font-black text-white">{score}</span>
        <span className={`mt-0.5 block text-[11px] font-black ${style.text}`}>{t(style.label)}</span>
      </span>
    </button>
  );
}

export default function MatchHistory({ onSelectMatch }: MatchHistoryProps) {
  const t = useTranslations("Stats.MatchHistory");

  const [matches, setMatches] = useState<MatchDigest[]>([]);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setMounted(true);

    /*
     * Die Liste braucht nur eine Zusammenfassung pro Match (getMatchDigests),
     * nicht jeden einzelnen Wurf. Das ganze Match mit allen Würfen wird erst
     * beim Anklicken geladen (siehe select).
     * Das eigene Profil ist optional: ohne Login (oder ohne Treffer) wird
     * die Liste neutral angezeigt.
     */
    Promise.all([getMatchDigests(), getRegisteredPlayerIds(), getOwnProfile().catch(() => null)])
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
          match.players.every((player) => registeredIds.has(player.id)),
        );

        setMatches(onlyRegistered);
        setOwnId(ownProfile?.id ?? null);
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Match-Historie:", err);

        if (!cancelled) {
          setError(t("matchHistorieKonnteNicht"));
          setMatches([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const select = async (match: MatchDigest) => {
    setShowAll(false);

    try {
      /* Erst jetzt das komplette Match mit allen Würfen laden (nur dieses eine). */
      const full: SavedMatch | null = await getSavedMatch(match.id);

      if (full) {
        onSelectMatch?.(full);
      }
    } catch (err) {
      console.error("Match konnte nicht geladen werden:", err);
    }
  };

  /*
   * Server und erster Client-Render müssen exakt dieselbe Ansicht
   * liefern - die Daten werden deshalb erst nach dem Mount gezeigt.
   */
  let body: ReactNode;

  if (!mounted) {
    body = (
      <div className="py-8 text-center text-sm font-bold text-white/50">{t("ladeMatchHistorie")}</div>
    );
  } else if (error) {
    body = <div className="py-8 text-center text-sm font-bold text-red-400/70">{error}</div>;
  } else if (matches.length === 0) {
    body = (
      <div className="py-8 text-center text-sm font-bold text-white/50">{t("nochKeineAbgeschlossenenMatches")}</div>
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
              >{t("alleAnzeigen")}</button>
            ) : null
          }
        >{t("letzteMatches")}</PanelTitle>

        <div className="mt-4">{body}</div>
      </section>

      {showAll && (
        <PanelModal title={t("letzteMatches2", { length: matches.length })} onClose={() => setShowAll(false)}>
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
