import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;

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
 * Der bei der Registrierung gewählte Benutzername steckt in den
 * Auth-Metadaten. Er wird hier nochmal serverseitig geprüft - die
 * Metadaten kommen vom Client und sind nicht vertrauenswürdig.
 */
function readRegisteredUsername(metadata: Record<string, unknown> | undefined): string | null {
  const raw = metadata?.username;

  if (typeof raw !== "string") {
    return null;
  }

  const name = raw.trim();

  if (
    name.length < USERNAME_MIN_LENGTH ||
    name.length > USERNAME_MAX_LENGTH ||
    !/^[\p{L}\p{N}_.\- ]+$/u.test(name)
  ) {
    return null;
  }

  return name;
}

/*
 * Platzhalter-Name, falls kein (gültiger) Benutzername mitgekommen ist,
 * z. B. bei einer Anmeldung ohne vorherige Registrierung. Das
 * UsernameGate im Frontend fragt dann nach dem echten Namen.
 */
function fallbackName(email: string | undefined): string {
  const base = (email?.split("@")[0] ?? "Spieler").replace(/[^\p{L}\p{N}_.\- ]/gu, "");

  return (base || "Spieler").slice(0, USERNAME_MAX_LENGTH);
}

/*
 * Stellt sicher, dass zu diesem Account bereits ein players-Profil
 * existiert. Legt beim allerersten Login pro Account eine neue Zeile
 * an; bei jedem weiteren Login passiert hier nichts mehr.
 *
 * Ist der Wunschname schon vergeben (eindeutiger Index auf registrierten
 * Namen, Fehlercode 23505), wird eine Zahl angehängt. Wer bei der
 * Registrierung einen Namen gewählt hat, der inzwischen vergeben ist,
 * bekommt so trotzdem ein Profil - und das UsernameGate fragt erneut.
 */
async function ensureOwnProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | undefined,
  metadata: Record<string, unknown> | undefined,
) {
  const { data: existing, error: lookupError } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    console.error("Fehler beim Prüfen des Spielerprofils:", lookupError);
    return;
  }

  if (existing) {
    return;
  }

  const registered = readRegisteredUsername(metadata);
  const baseName = registered ?? fallbackName(email);

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = attempt === 0 ? "" : String(Math.floor(1000 + Math.random() * 9000));
    const displayName = `${baseName.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;

    const { error: insertError } = await supabase.from("players").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name: displayName,
      initials: computeInitials(displayName),
    });

    if (!insertError) {
      return;
    }

    if (insertError.code !== "23505") {
      console.error("Fehler beim Anlegen des Spielerprofils:", insertError);
      return;
    }
  }

  console.error("Spielerprofil konnte nicht angelegt werden: kein freier Name gefunden.");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  /*
   * next darf nur ein interner Pfad sein. Sonst ließe sich über einen
   * präparierten Link (z. B. next=@fremde-seite.de) nach dem Login auf
   * eine fremde Domain weiterleiten.
   */
  const rawNext = searchParams.get("next") ?? "/spieler";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/spieler";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureOwnProfile(supabase, user.id, user.email, user.user_metadata);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Fehler beim Auth-Callback:", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
