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

  /*
   * FIX: Ohne jede Session liefert supabase.auth.getUser() oft
   * GLEICHZEITIG user: null UND einen AuthSessionMissingError zurück.
   * Der Error wurde hier vorher zuerst geprüft und geworfen, bevor
   * überhaupt klar war, dass "niemand eingeloggt" der eigentliche,
   * ganz normale Grund dafür ist - das ließ z. B. PlayerHero bei
   * nicht eingeloggten Besuchern mit einer Fehlermeldung abstürzen,
   * statt einfach den Gast-/Login-Zustand zu zeigen. Jetzt wird zuerst
   * geprüft, ob überhaupt ein Nutzer da ist, der eigentliche Fehler
   * interessiert nur noch, wenn trotzdem kein Nutzer zurückkommt.
   */

  const { data: userData } = await supabase.auth.getUser();

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
 * | BENUTZERNAME
 * --------------------------------------------------------------------------
 *
 * Jeder registrierte Account braucht einen Benutzernamen. Er steht an
 * zwei Stellen: in players.name (so erscheint man in Ranking & Matches)
 * und in den Auth-Metadaten (user_metadata.username), damit er auch
 * schon vor dem ersten Profil-Eintrag bekannt ist.
 *
 * Eindeutigkeit gilt nur unter REGISTRIERTEN Spielern (user_id nicht
 * null) - Gast-Namen aus der Lobby bleiben davon unberührt.
 * --------------------------------------------------------------------------
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/** Gibt eine Fehlermeldung zurück - oder null, wenn der Name formal passt. */
export function validateUsername(raw: string): string | null {
  const name = raw.trim();

  if (name.length < USERNAME_MIN_LENGTH) {
    return `Der Benutzername braucht mindestens ${USERNAME_MIN_LENGTH} Zeichen.`;
  }

  if (name.length > USERNAME_MAX_LENGTH) {
    return `Der Benutzername darf höchstens ${USERNAME_MAX_LENGTH} Zeichen haben.`;
  }

  if (!/^[\p{L}\p{N}_.\- ]+$/u.test(name)) {
    return "Erlaubt sind nur Buchstaben, Zahlen, Leerzeichen sowie _ . -";
  }

  return null;
}

/** true, wenn ein anderer registrierter Spieler den Namen schon hat. */
export async function isUsernameTaken(raw: string, ownPlayerId?: string): Promise<boolean> {
  const supabase = createClient();

  /* ilike ohne Platzhalter = Vergleich ohne Groß-/Kleinschreibung. */
  const escaped = raw.trim().replace(/[\\%_]/g, (char) => `\\${char}`);

  let query = supabase
    .from("players")
    .select("id")
    .ilike("name", escaped)
    .not("user_id", "is", null)
    .limit(1);

  if (ownPlayerId) {
    query = query.neq("id", ownPlayerId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).length > 0;
}

/**
 * Setzt den Benutzernamen des eingeloggten Accounts: aktualisiert die
 * verknüpfte players-Zeile (oder legt sie an, falls es noch keine gibt)
 * und schreibt den Namen in die Auth-Metadaten.
 */
export async function saveOwnUsername(raw: string): Promise<PlayerProfile> {
  const name = raw.trim();
  const formatError = validateUsername(name);

  if (formatError) {
    throw new Error(formatError);
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    throw new Error("Nicht eingeloggt.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (await isUsernameTaken(name, existing?.id)) {
    throw new Error("Dieser Benutzername ist schon vergeben.");
  }

  const initials = computeInitials(name);

  const query = existing
    ? supabase.from("players").update({ name, initials }).eq("id", existing.id)
    : supabase.from("players").insert({
        id: crypto.randomUUID(),
        name,
        initials,
        user_id: userData.user.id,
      });

  const { data, error } = await query.select("id, name, initials").single();

  if (error) {
    /* 23505 = unique violation (falls der Index aus username.sql aktiv ist) */
    if (error.code === "23505") {
      throw new Error("Dieser Benutzername ist schon vergeben.");
    }

    throw error;
  }

  const { error: metaError } = await supabase.auth.updateUser({ data: { username: name } });

  if (metaError) {
    console.error("Benutzername konnte nicht in den Auth-Daten gespeichert werden:", metaError);
  }

  return { id: data.id, name: data.name, initials: data.initials ?? initials };
}

/**
 * Für den UsernameGate: Wie steht es um den Account?
 *  - "anonymous": niemand eingeloggt, nichts zu tun
 *  - "ok": Benutzername vorhanden
 *  - "missing": eingeloggt, aber ohne Benutzernamen -> Abfrage nötig
 *    (suggestion = Name aus der Registrierung, falls schon bekannt)
 */
export async function getUsernameStatus(): Promise<
  { state: "anonymous" } | { state: "ok" } | { state: "missing"; suggestion: string }
> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return { state: "anonymous" };
  }

  const metaName =
    typeof user.user_metadata?.username === "string" ? user.user_metadata.username.trim() : "";

  const { data: row } = await supabase
    .from("players")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();

  const rowName = row?.name?.trim() ?? "";

  /*
   * Registrierung mit Namen, aber das Profil trägt noch einen anderen
   * (z. B. aus der E-Mail abgeleiteten) Namen: den gewählten übernehmen.
   */
  if (metaName && rowName.toLowerCase() !== metaName.toLowerCase()) {
    try {
      await saveOwnUsername(metaName);
      return { state: "ok" };
    } catch {
      return { state: "missing", suggestion: metaName };
    }
  }

  if (metaName) {
    return { state: "ok" };
  }

  return { state: "missing", suggestion: "" };
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

/*
 * --------------------------------------------------------------------------
 * | REGISTRIERTE SPIELER ERMITTELN
 * --------------------------------------------------------------------------
 *
 * "Registriert" heißt hier: die players-Zeile ist über user_id mit einem
 * echten Supabase-Auth-Account verknüpft (siehe getOwnProfile). Gäste
 * (per createPlayerProfile ohne Login angelegt) haben kein user_id.
 * Wird genutzt, um Gäste aus öffentlichen Listen (Match-Historie,
 * Spieler-Rangliste) auszublenden.
 * --------------------------------------------------------------------------
 */

export async function getRegisteredPlayerIds(): Promise<Set<string>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("players")
    .select("id, user_id")
    .not("user_id", "is", null);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.id as string));
}

/*
 * --------------------------------------------------------------------------
 * | GEGNER, GEGEN DIE STATISTIKEN ZÄHLEN
 * --------------------------------------------------------------------------
 *
 * Statistiken im Profil zählen nur Matches gegen registrierte Gegner.
 * Dazu zählen auch gelöschte Konten: Beim Löschen wird die players-Zeile
 * anonymisiert ("Gelöschter Spieler", ohne user_id) statt entfernt - die
 * Statistiken der Mitspieler sollen dadurch nicht schrumpfen (siehe
 * app/api/account/delete/route.ts, dort steht derselbe Name).
 * Gäste haben ebenfalls kein user_id, aber einen frei gewählten Namen.
 * --------------------------------------------------------------------------
 */

const DELETED_PLAYER_NAME = "Gelöschter Spieler";

export async function getRatedOpponentIds(): Promise<Set<string>> {
  const supabase = createClient();

  const { data, error } = await supabase.from("players").select("id, user_id, name");

  if (error) {
    throw error;
  }

  return new Set(
    (data ?? [])
      .filter((row) => row.user_id !== null || row.name === DELETED_PLAYER_NAME)
      .map((row) => row.id as string),
  );
}

/*
 * --------------------------------------------------------------------------
 * | EIGENEN PRO-STATUS LADEN
 * --------------------------------------------------------------------------
 *
 * is_pro wird NICHT in PlayerProfile aufgenommen - der Typ wird an
 * vielen Stellen (Lobby, Teams) verwendet, wo Pro-Status irrelevant
 * ist. Eigene, schlanke Funktion stattdessen, nur für die Paywall auf
 * der Profilseite. false, wenn niemand eingeloggt ist.
 * --------------------------------------------------------------------------
 */

export async function getOwnProStatus(): Promise<boolean> {
  const supabase = createClient();

  // Gleicher Fix wie bei getOwnProfile() oben - Details siehe dort.
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return false;
  }

  const { data, error } = await supabase
    .from("players")
    .select("is_pro")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.is_pro ?? false;
}
