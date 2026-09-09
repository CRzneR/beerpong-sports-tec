"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { MatchStats, PlayerStats, TeamStats } from "@/app/spieler/match/matchStats";
import { createMatchLobby } from "@/app/spieler/match/matchLobby";

interface MatchResultProps {
  stats: MatchStats;
}

/*
 * --------------------------------------------------------------------------
 * | SPIELERZEILE
 * --------------------------------------------------------------------------
 */

function PlayerRow({ player }: { player: PlayerStats }) {
  return (
    <div
      className="
        grid
        grid-cols-[1fr_auto_auto_auto_auto]
        items-center
        gap-3
        rounded-xl
        border
        border-white/5
        bg-white/[0.02]
        px-4
        py-3
      "
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-white">{player.playerName}</div>

        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/25">
          Team {player.team}
        </div>
      </div>

      <div className="text-center">
        <div className="text-sm font-black text-white">{player.throws}</div>
        <div className="text-[8px] uppercase tracking-wider text-white/25">Würfe</div>
      </div>

      <div className="text-center">
        <div className="text-sm font-black text-white">{player.hits}</div>
        <div className="text-[8px] uppercase tracking-wider text-white/25">Treffer</div>
      </div>

      <div className="text-center">
        <div className="text-sm font-black text-white">{player.accuracy}%</div>
        <div className="text-[8px] uppercase tracking-wider text-white/25">Quote</div>
      </div>

      <div className="text-center">
        <div className="text-sm font-black text-white">{player.cupsHit}</div>
        <div className="text-[8px] uppercase tracking-wider text-white/25">Becher</div>
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------------------------------
 * | TEAM-STATISTIK
 * --------------------------------------------------------------------------
 */

function TeamStatsCard({ team }: { team: TeamStats }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div
          className={`
            text-xs
            font-black
            uppercase
            tracking-[0.2em]
            ${team.team === "A" ? "text-blue-400" : "text-red-400"}
          `}
        >
          Team {team.team}
        </div>

        <div className="text-xs font-black text-white">{team.cupsRemaining} Becher übrig</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <div className="text-lg font-black text-white">{team.hits}</div>
          <div className="text-[8px] uppercase tracking-wider text-white/25">Treffer</div>
        </div>

        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <div className="text-lg font-black text-white">{team.misses}</div>
          <div className="text-[8px] uppercase tracking-wider text-white/25">Daneben</div>
        </div>

        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <div className="text-lg font-black text-white">{team.accuracy}%</div>
          <div className="text-[8px] uppercase tracking-wider text-white/25">Quote</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-white/[0.02] p-2 text-center">
          <div className="text-xs font-black text-white">{team.singleHits}</div>
          <div className="text-[7px] uppercase tracking-wider text-white/20">Einzel</div>
        </div>

        <div className="rounded-lg bg-white/[0.02] p-2 text-center">
          <div className="text-xs font-black text-white">{team.bounceHits}</div>
          <div className="text-[7px] uppercase tracking-wider text-white/20">Aufhüpfer</div>
        </div>

        <div className="rounded-lg bg-white/[0.02] p-2 text-center">
          <div className="text-xs font-black text-white">{team.trickshotHits}</div>
          <div className="text-[7px] uppercase tracking-wider text-white/20">Trickshot</div>
        </div>

        <div className="rounded-lg bg-white/[0.02] p-2 text-center">
          <div className="text-xs font-black text-white">{team.cupsHit}</div>
          <div className="text-[7px] uppercase tracking-wider text-white/20">Becher</div>
        </div>
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------------------------------
 * | MATCH-ERGEBNIS
 * --------------------------------------------------------------------------
 */

export default function MatchResult({ stats }: MatchResultProps) {
  const router = useRouter();

  /*
   * "NOCHMAL SPIELEN"
   *
   * Erstellt eine frische, leere Lobby (createMatchLobby) und
   * navigiert dorthin - alle müssen erneut über den QR-Code/Link
   * beitreten, es werden keine Spieler/Teams übernommen.
   */

  const [creatingRematch, setCreatingRematch] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);

  const handleRematch = async () => {
    if (creatingRematch) {
      return;
    }

    setCreatingRematch(true);
    setRematchError(null);

    try {
      const lobby = await createMatchLobby();

      router.push(`/spieler/match/${lobby.id}`);
    } catch (err) {
      console.error("Fehler beim Erstellen einer neuen Lobby:", err);

      setRematchError("Neues Match konnte nicht erstellt werden.");
      setCreatingRematch(false);
    }
  };

  /*
   * "SPIEL BEENDEN"
   *
   * Zurück zur Profil-Übersicht.
   */

  const handleFinish = () => {
    router.push("/spieler");
  };

  const teamAPlayers = stats.players.filter((player: { team: string }) => player.team === "A");

  const teamBPlayers = stats.players.filter((player: { team: string }) => player.team === "B");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* ERGEBNIS */}

      <div className="rounded-3xl border border-white/10 bg-[#111419] p-6 text-center shadow-2xl">
        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25">
          Match beendet
        </div>

        <div className="mt-2 text-3xl font-black text-white">
          {stats.winner ? `Team ${stats.winner} gewinnt` : "Unentschieden"}
        </div>
      </div>

      {/* TEAM-STATISTIK */}

      <div className="grid gap-3 md:grid-cols-2">
        <TeamStatsCard team={stats.teamA} />
        <TeamStatsCard team={stats.teamB} />
      </div>

      {/* SPIELER */}

      <div className="rounded-2xl border border-white/10 bg-[#111419] p-4">
        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
          Spielerstatistik
        </div>

        <div className="space-y-2">
          {teamAPlayers.map((player: PlayerStats) => (
            <PlayerRow key={player.playerId} player={player} />
          ))}

          {teamBPlayers.map((player: PlayerStats) => (
            <PlayerRow key={player.playerId} player={player} />
          ))}
        </div>
      </div>

      {/* WEITER */}

      {rematchError && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-center text-xs font-bold text-red-400/80">
          {rematchError}
        </div>
      )}

      <div className="flex flex-col gap-3 pb-6 sm:flex-row">
        <button
          type="button"
          disabled={creatingRematch}
          onClick={handleRematch}
          className="flex-1 rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-white/20"
        >
          {creatingRematch ? "Erstelle Match …" : "Nochmal spielen"}
        </button>

        <button
          type="button"
          onClick={handleFinish}
          className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
        >
          Spiel beenden
        </button>
      </div>
    </div>
  );
}
