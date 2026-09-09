import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
 * Stellt sicher, dass zu diesem Account bereits ein players-Profil
 * existiert. Legt beim allerersten Login pro Account eine neue Zeile
 * an; bei jedem weiteren Login passiert hier nichts mehr.
 */
async function ensureOwnProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | undefined,
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

  const displayName = email?.split("@")[0] ?? "Spieler";

  const { error: insertError } = await supabase.from("players").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    name: displayName,
    initials: computeInitials(displayName),
  });

  if (insertError) {
    console.error("Fehler beim Anlegen des Spielerprofils:", insertError);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/spieler";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureOwnProfile(supabase, user.id, user.email);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Fehler beim Auth-Callback:", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
