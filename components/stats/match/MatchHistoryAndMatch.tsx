"use client";

import { useState } from "react";
import MatchHistory from "./MatchHistory";
import MatchHistoryDetail from "./MatchHistoryDetail";
import PlayerRanking from "./PlayerRanking";
import PlayerDetail from "./PlayerDetail";
import type { SavedMatch } from "@/app/spieler/match/matchStorage";
import type { PlayerOverallStats } from "@/app/spieler/match/playerStats";

export default function MatchHistoryAndStats() {
  const [selectedMatch, setSelectedMatch] = useState<SavedMatch | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOverallStats | null>(null);

  if (selectedMatch) {
    return <MatchHistoryDetail match={selectedMatch} onBack={() => setSelectedMatch(null)} />;
  }

  if (selectedPlayer) {
    return (
      <PlayerDetail playerId={selectedPlayer.playerId} onBack={() => setSelectedPlayer(null)} />
    );
  }

  return (
    <div className="space-y-6">
      <MatchHistory onSelectMatch={setSelectedMatch} />
      <PlayerRanking onSelectPlayer={setSelectedPlayer} />
    </div>
  );
}
