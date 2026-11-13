import { isNonThrowAction } from "./matchLogic";
import type { MatchState, Cup, RecordedFormation } from "./matchLogic";
import { matchCountsForAnyone } from "./matchEligibility";
import { getRatedOpponentIds, getRegisteredPlayerIds } from "./playerProfiles";
import { createClient } from "@/lib/supabase/client";
import { fetchAllByIds, fetchAllPages } from "@/lib/supabase/fetchAll";

/*
 * --------------------------------------------------------------------------
 * | GESPEICHERTES MATCH
 * --------------------------------------------------------------------------
 */

export type SavedMatch = {
  id: string;
  savedAt: string;
  state: MatchState;
};

/*
 * --------------------------------------------------------------------------
 * | SUPABASE ROWS
 * --------------------------------------------------------------------------
 */

type MatchRow = {
  id: string;
  created_at: string;
  winner: "A" | "B" | null;
  is_finished: boolean;
  started_at: string | null;
  finished_at: string | null;
};

type MatchPlayerRow = {
  match_id: string;
  player_id: string;
  team: "A" | "B";
};

type PlayerRow = {
  id: string;
  name: string;
};

type ActionRow = {
  id: string;
  match_id: string;
  player_id: string;
  team: "A" | "B";
  action_type: "hit" | "miss";
  /* "penalty" und "knockover" brauchen penalty-cups.sql in der Datenbank. */
  hit_type: "single" | "bounce" | "trickshot" | "penalty" | "knockover" | null;
  cup_ids: unknown;
  action_index: number;
  /* NEU: Becherposition beim Treffer (siehe matchLogic.ts, RecordedFormation) */
  formation: string | null;
  hit_slots: unknown;
};

/*
 * --------------------------------------------------------------------------
 * | HINWEIS
 * --------------------------------------------------------------------------
 *
 * Diese Version verwendet die Browser-Supabase-API und ist deshalb
 * asynchron. Die aufrufenden Stellen müssen saveMatch/getSavedMatches
 * entsprechend mit await verwenden.
 *
 * Die vollständige MatchState-Struktur wird für das Backend aus den
 * relationalen Tabellen rekonstruiert.
 * --------------------------------------------------------------------------
 */

function normalizeCupIds(value: unknown): number[] {
  /*
   * FIX: Becher-IDs sind Zahlen (1-10), keine Strings. Der alte Filter
   * (`typeof item === "string"`) hat dadurch bei JEDER rekonstruierten
   * Aktion die komplette cupIds-Liste rausgefiltert, wodurch
   * cupsRemoved in den aus getSavedMatches() aggregierten
   * Profil-Statistiken immer 0 war - obwohl die Live-Anzeige direkt
   * nach dem Match (die nicht über diesen Pfad läuft) korrekte Zahlen
   * zeigte.
   */
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is number => typeof item === "number");
}

function parseFormation(value: unknown): RecordedFormation | undefined {
  return value === "ten" || value === "six" || value === "three" ? value : undefined;
}

function parseHitSlots(value: unknown): number[] | undefined {
  const slots = normalizeCupIds(value);

  return slots.length > 0 ? slots : undefined;
}

/*
 * --------------------------------------------------------------------------
 * | BECHER AUS DEN AKTIONEN REKONSTRUIEREN
 * --------------------------------------------------------------------------
 *
 * FIX: teamACups/teamBCups wurden hier bisher immer als leere Arrays
 * aufgebaut ([]) - der Kommentar weiter unten behauptete zwar, sie
 * würden "aus den gespeicherten cup_ids aufgebaut", das ist aber nie
 * passiert. Dadurch zeigte z. B. die Match-Historie (MatchHistory.tsx)
 * für JEDES gespeicherte Match "0 Becher" bei beiden Teams an.
 *
 * Jetzt: 10 frische Becher pro Team, und für jede "hit"-Aktion werden
 * die getroffenen Becher beim GEGNERISCHEN Team des Werfers markiert -
 * exakt dieselbe Zuordnung wie in der Live-Logik (page.tsx).
 * --------------------------------------------------------------------------
 */

function createFreshCups(): Cup[] {
  return Array.from({ length: 10 }, (_, index) => ({ id: index + 1, hit: false }));
}

function reconstructCups(actions: ActionRow[]): { teamACups: Cup[]; teamBCups: Cup[] } {
  const teamACups = createFreshCups();
  const teamBCups = createFreshCups();

  const sorted = [...actions].sort((a, b) => a.action_index - b.action_index);

  for (const action of sorted) {
    if (action.action_type !== "hit") {
      continue;
    }

    const cupIds = normalizeCupIds(action.cup_ids);
    const opponentCups = action.team === "A" ? teamBCups : teamACups;

    for (const cupId of cupIds) {
      const cup = opponentCups.find((item) => item.id === cupId);

      if (cup) {
        cup.hit = true;
      }
    }
  }

  return { teamACups, teamBCups };
}

function reconstructState(
  match: MatchRow,
  matchPlayers: MatchPlayerRow[],
  players: PlayerRow[],
  actions: ActionRow[],
): MatchState {
  const playerMap = new Map(players.map((player) => [player.id, player]));

  const statePlayers = matchPlayers.map((relation) => {
    const player = playerMap.get(relation.player_id);

    return {
      id: relation.player_id,
      name: player?.name ?? "Unbekannter Spieler",
      team: relation.team,
    };
  });

  const stateActions = [...actions]
    .sort((a, b) => a.action_index - b.action_index)
    .map((action) => ({
      type: action.action_type,
      playerId: action.player_id,
      team: action.team,
      hitType: action.hit_type ?? undefined,
      cupIds: normalizeCupIds(action.cup_ids),
      formation: parseFormation(action.formation),
      hitSlots: parseHitSlots(action.hit_slots),
    }));

  const { teamACups, teamBCups } = reconstructCups(actions);

  /*
   * Diese Felder entsprechen der bestehenden MatchState-Struktur.
   */
  return {
    players: statePlayers,
    teamACups,
    teamBCups,
    currentTeam: "A",
    currentPlayerIndex: 0,
    actions: stateActions,
    winner: match.winner,
    isFinished: match.is_finished,
  } as unknown as MatchState;
}

/*
 * --------------------------------------------------------------------------
 * | ALLE GESPEICHERTEN MATCHES LADEN
 * --------------------------------------------------------------------------
 */

/*
 * Supabase liefert pro Anfrage höchstens 1000 Zeilen. Die Würfe (actions)
 * übersteigen das schnell - deshalb wird hier alles seitenweise geladen
 * (siehe lib/supabase/fetchAll.ts) und die ID-Listen werden gestückelt.
 */

const MATCH_COLUMNS = "id, created_at, winner, is_finished, started_at, finished_at";

const ACTION_COLUMNS =
  "id, match_id, player_id, team, action_type, hit_type, cup_ids, action_index, formation, hit_slots";

/* Lädt Spieler, Zuordnungen und Würfe zu den übergebenen Matches und baut daraus SavedMatches. */
async function buildSavedMatches(matches: MatchRow[]): Promise<SavedMatch[]> {
  if (matches.length === 0) {
    return [];
  }

  const supabase = createClient();
  const matchIds = matches.map((match) => match.id);

  const [matchPlayers, actions] = await Promise.all([
    fetchAllByIds<MatchPlayerRow>(matchIds, (ids, from, to) =>
      supabase
        .from("match_players")
        .select("match_id, player_id, team")
        .in("match_id", ids)
        .order("match_id", { ascending: true })
        .order("player_id", { ascending: true })
        .range(from, to),
    ),

    fetchAllByIds<ActionRow>(matchIds, (ids, from, to) =>
      supabase
        .from("actions")
        .select(ACTION_COLUMNS)
        .in("match_id", ids)
        .order("match_id", { ascending: true })
        .order("action_index", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  const playerIds = Array.from(
    new Set([...matchPlayers.map((item) => item.player_id), ...actions.map((item) => item.player_id)]),
  );

  const players = await fetchAllByIds<PlayerRow>(playerIds, (ids, from, to) =>
    supabase
      .from("players")
      .select("id, name")
      .in("id", ids)
      .order("id", { ascending: true })
      .range(from, to),
  );

  /* Einmal nach Match gruppieren statt für jedes Match alle Würfe zu durchsuchen. */
  const matchPlayersByMatch = new Map<string, MatchPlayerRow[]>();
  const actionsByMatch = new Map<string, ActionRow[]>();

  for (const item of matchPlayers) {
    const list = matchPlayersByMatch.get(item.match_id);

    if (list) {
      list.push(item);
    } else {
      matchPlayersByMatch.set(item.match_id, [item]);
    }
  }

  for (const item of actions) {
    const list = actionsByMatch.get(item.match_id);

    if (list) {
      list.push(item);
    } else {
      actionsByMatch.set(item.match_id, [item]);
    }
  }

  return matches.map((match) => ({
    id: match.id,
    savedAt: match.created_at,
    state: reconstructState(
      match,
      matchPlayersByMatch.get(match.id) ?? [],
      players,
      actionsByMatch.get(match.id) ?? [],
    ),
  }));
}

export async function getSavedMatches(): Promise<SavedMatch[]> {
  const supabase = createClient();

  /* created_at ist nicht eindeutig - id als zweites Kriterium hält das Blättern stabil. */
  const matches = await fetchAllPages<MatchRow>((from, to) =>
    supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );

  return buildSavedMatches(matches);
}

/*
 * Strafbecher/Umgeworfen in den letzten normalen Treffer des Teams einrechnen
 * (nur Sicherheitsnetz in saveMatch, siehe dort).
 */

function foldBonusCupActions(actions: MatchState["actions"]): MatchState["actions"] {
  const result = actions
    .filter((action) => !isNonThrowAction(action))
    .map((action) => ({ ...action }));

  for (const bonus of actions.filter((action) => isNonThrowAction(action))) {
    for (let index = result.length - 1; index >= 0; index -= 1) {
      const candidate = result[index];

      if (candidate.type === "hit" && candidate.team === bonus.team) {
        candidate.cupIds = [...candidate.cupIds, ...bonus.cupIds];
        break;
      }
    }
  }

  return result;
}

/*
 * --------------------------------------------------------------------------
 * | MATCH SPEICHERN
 * --------------------------------------------------------------------------
 */

/*
 * NUR MATCHES SPEICHERN, DIE ZÄHLEN
 *
 * Ein Match, das für keinen registrierten Spieler in die Statistik eingeht
 * (nur Gäste, oder registrierter Spieler gegen Gäste), wird nicht in der
 * Datenbank abgelegt. Das hält die Datenbank sauber und verhindert Müll.
 * Die Ergebnisanzeige nach dem Match rechnet mit dem Spielstand im Speicher
 * und ist davon nicht betroffen.
 *
 * Schlägt die Prüfung selbst fehl (z. B. Verbindungsproblem), wird im Zweifel
 * gespeichert, damit kein zählendes Match verloren geht.
 */

async function shouldPersistMatch(state: MatchState): Promise<boolean> {
  try {
    const [registeredIds, ratedIds] = await Promise.all([
      getRegisteredPlayerIds(),
      getRatedOpponentIds(),
    ]);

    return matchCountsForAnyone(state, registeredIds, ratedIds);
  } catch (error) {
    console.error(
      "Prüfung, ob das Match zählt, fehlgeschlagen - speichere sicherheitshalber:",
      error,
    );

    return true;
  }
}

export async function saveMatch(state: MatchState): Promise<SavedMatch> {
  if (!(await shouldPersistMatch(state))) {
    return {
      id: `local-${crypto.randomUUID()}`,
      savedAt: new Date().toISOString(),
      state,
    };
  }

  const supabase = createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      winner: state.winner,
      is_finished: state.isFinished,
    })
    .select("id, created_at, winner, is_finished, started_at, finished_at")
    .single();

  if (matchError) {
    throw matchError;
  }

  const uniquePlayers = new Map<string, { id: string; name: string; team: "A" | "B" }>();

  for (const player of state.players) {
    uniquePlayers.set(player.id, {
      id: player.id,
      name: player.name,
      team: player.team,
    });
  }

  for (const player of uniquePlayers.values()) {
    const { error } = await supabase.from("players").upsert(
      {
        id: player.id,
        name: player.name,
      },
      { onConflict: "id" },
    );

    if (error) {
      throw error;
    }
  }

  const matchPlayerRows = Array.from(uniquePlayers.values()).map((player) => ({
    match_id: match.id,
    player_id: player.id,
    team: player.team,
  }));

  if (matchPlayerRows.length > 0) {
    const { error } = await supabase.from("match_players").insert(matchPlayerRows);

    if (error) {
      throw error;
    }
  }

  const toRows = (actions: MatchState["actions"]) =>
    actions.map((action, index) => ({
      match_id: match.id,
      player_id: action.playerId,
      team: action.team,
      action_type: action.type,
      hit_type: action.type === "hit" ? (action.hitType ?? null) : null,
      cup_ids: action.cupIds,
      formation: action.type === "hit" ? (action.formation ?? null) : null,
      hit_slots: action.type === "hit" ? (action.hitSlots ?? null) : null,
      action_index: index,
    }));

  const actionRows = toRows(state.actions);

  if (actionRows.length > 0) {
    const { error } = await supabase.from("actions").insert(actionRows);

    if (error) {
      /*
       * SICHERHEITSNETZ: Lehnt die Datenbank "penalty"/"knockover" ab, weil
       * penalty-cups.sql noch nicht ausgeführt wurde, geht das Match nicht
       * verloren. Die Strafbecher werden dann dem letzten normalen Treffer
       * des Teams zugeschlagen (wie die Bonus-Becher): der Endstand stimmt,
       * nur die Gutschrift auf den Spieler fehlt.
       */
      if (!state.actions.some((action) => isNonThrowAction(action))) {
        throw error;
      }

      console.error(
        "Aktionen konnten nicht gespeichert werden - Strafbecher werden zusammengeführt. " +
          "Bitte penalty-cups.sql ausführen:",
        error,
      );

      const { error: fallbackError } = await supabase
        .from("actions")
        .insert(toRows(foldBonusCupActions(state.actions)));

      if (fallbackError) {
        throw fallbackError;
      }
    }
  }

  return {
    id: match.id,
    savedAt: match.created_at,
    state,
  };
}

/*
 * --------------------------------------------------------------------------
 * | EIN MATCH LADEN
 * --------------------------------------------------------------------------
 */

export async function getSavedMatch(matchId: string): Promise<SavedMatch | null> {
  const supabase = createClient();

  /* Nur dieses eine Match laden, nicht erst alle Matches mit allen Würfen. */
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [saved] = await buildSavedMatches([data as MatchRow]);

  return saved ?? null;
}

/*
 * --------------------------------------------------------------------------
 * | MATCH LÖSCHEN
 * --------------------------------------------------------------------------
 */

export async function deleteSavedMatch(matchId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("matches").delete().eq("id", matchId);

  if (error) {
    throw error;
  }

  return true;
}

/*
 * --------------------------------------------------------------------------
 * | ALLE MATCHES LÖSCHEN
 * --------------------------------------------------------------------------
 */

export async function clearSavedMatches(): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("matches").delete().not("id", "is", null);

  if (error) {
    throw error;
  }
}
