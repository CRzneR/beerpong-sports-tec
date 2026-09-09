import { createClient } from "@/lib/supabase/client";

/*
 * --------------------------------------------------------------------------
 * | SPIELER-PROFIL
 * --------------------------------------------------------------------------
 *
 * Persistente Spieler, die über mehrere Matches hinweg wiederverwendet
 * werden können. Nutzt die bereits vorhandene `players`-Tabelle
 * (siehe matchStorage.ts) plus die neue Spalte `initials`.
 * --------------------------------------------------------------------------
 */

export type PlayerProfile = {
  id: string;
  name: string;
  initials: string;
};

type PlayerProfileRow = {
  id: string;
  name: string;
  initials: string | null;
};

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "??";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/*
 * --------------------------------------------------------------------------
 * | ALLE PROFILE LADEN
 * --------------------------------------------------------------------------
 */

export async function getAllPlayerProfiles(): Promise<PlayerProfile[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("players")
    .select("id, name, initials")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PlayerProfileRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    initials: row.initials ?? computeInitials(row.name),
  }));
}

/*
 * --------------------------------------------------------------------------
 * | EIGENES PROFIL LADEN
 * --------------------------------------------------------------------------
 *
 * Gibt das mit dem aktuell eingeloggten Account verknüpfte Profil zurück
 * (siehe user_id-Spalte, verknüpft im Auth-Callback). null, wenn niemand
 * eingeloggt ist (z.B. Gast-Modus).
 * --------------------------------------------------------------------------
 */

export async function getOwnProfile(): Promise<PlayerProfile | null> {
  const supabase = createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("players")
    .select("id, name, initials")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    initials: data.initials ?? computeInitials(data.name),
  };
}

/*
 * --------------------------------------------------------------------------
 * | NEUES PROFIL ANLEGEN
 * --------------------------------------------------------------------------
 */

export async function createPlayerProfile(name: string): Promise<PlayerProfile> {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Name darf nicht leer sein.");
  }

  const supabase = createClient();

  const initials = computeInitials(trimmed);
  const id = crypto.randomUUID();

  const { data, error } = await supabase
    .from("players")
    .insert({ id, name: trimmed, initials })
    .select("id, name, initials")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    initials: data.initials ?? initials,
  };
}

/*
 * --------------------------------------------------------------------------
 * | STATISTIKEN ZURÜCKSETZEN
 * --------------------------------------------------------------------------
 *
 * Löscht bewusst KEINE Matches/Actions - ein Match gehört nicht nur
 * einer Person, andere Mitspieler sollen davon unberührt bleiben.
 * Stattdessen wird nur ein Zeitstempel gesetzt: alle Aggregations-
 * Funktionen in playerStats.ts zählen für DIESEN Spieler ab sofort
 * nur noch Matches, die NACH diesem Zeitpunkt gespeichert wurden.
 * --------------------------------------------------------------------------
 */

export async function resetPlayerStats(playerId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("players")
    .update({ stats_reset_at: new Date().toISOString() })
    .eq("id", playerId);

  if (error) {
    throw error;
  }
}

/*
 * --------------------------------------------------------------------------
 * | RESET-ZEITSTEMPEL ALLER SPIELER LADEN
 * --------------------------------------------------------------------------
 *
 * Für getAllPlayerOverallStats() in playerStats.ts: dort wird in EINEM
 * Durchlauf über alle Matches aggregiert, deshalb werden die Reset-
 * Zeitstempel aller Spieler auf einmal als Map geladen statt pro
 * Spieler einzeln nachzufragen.
 * --------------------------------------------------------------------------
 */

export async function getStatsResetTimestamps(): Promise<Map<string, string | null>> {
  const supabase = createClient();

  const { data, error } = await supabase.from("players").select("id, stats_reset_at");

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((row) => [row.id as string, (row.stats_reset_at as string | null) ?? null]),
  );
}
