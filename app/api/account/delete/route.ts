import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * --------------------------------------------------------------------------
 * | KONTO LÖSCHEN
 * --------------------------------------------------------------------------
 *
 * Löscht den Login (auth.users) des aufrufenden Nutzers - und nur seinen
 * eigenen: die ID kommt ausschließlich aus der Session, nie aus dem
 * Request-Body.
 *
 * Matches und Aktionen gehören auch den Mitspielern. Die players-Zeile
 * wird deshalb nicht gelöscht, sondern anonymisiert ("Gelöschter
 * Spieler", ohne Verknüpfung zum Account). So bleiben Historie und
 * Statistiken der anderen vollständig.
 *
 * Reihenfolge (jeder Schritt bricht bei einem Fehler ab, bevor etwas
 * Unumkehrbares passiert):
 *   1. Turniere vom Account lösen (user_id -> null)
 *   2. Käufe vom Account lösen (Beleg bleibt wegen Aufbewahrungspflicht)
 *   3. Achievements löschen, Spielerprofil anonymisieren
 *   4. Login löschen
 *
 * Voraussetzung: account-delete.sql wurde in Supabase ausgeführt
 * (user_id-Spalten müssen null erlauben).
 * --------------------------------------------------------------------------
 */

const DELETED_NAME = "Gelöschter Spieler";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const admin = createAdminClient();

  /* 1. Turniere: bleiben bestehen, der Veranstalter wird anonym. */

  const { error: tournamentsError } = await admin
    .from("tournaments")
    .update({ user_id: null })
    .eq("user_id", user.id);

  if (tournamentsError) {
    console.error("Konto löschen - Turniere:", tournamentsError);

    return NextResponse.json(
      { error: "Konto konnte nicht gelöscht werden (Turniere). Bitte melde dich bei uns." },
      { status: 500 },
    );
  }

  /* 2. Käufe: Beleg bleibt (steuerrechtliche Aufbewahrung), aber ohne Account. */

  const { error: purchasesError } = await admin
    .from("purchases")
    .update({ user_id: null })
    .eq("user_id", user.id);

  if (purchasesError) {
    console.error("Konto löschen - Käufe:", purchasesError);

    return NextResponse.json(
      { error: "Konto konnte nicht gelöscht werden (Käufe). Bitte melde dich bei uns." },
      { status: 500 },
    );
  }

  /*
   * 3. Achievements löschen und Spielerprofil anonymisieren.
   *
   * Achievements gehören zur Person, nicht zu den Matches der anderen -
   * sie werden mitgelöscht. Ein Fehler hier (z. B. Tabelle existiert
   * nicht) bricht das Löschen nicht ab.
   */

  const { data: ownProfile } = await admin
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownProfile) {
    const { error: achievementsError } = await admin
      .from("achievements")
      .delete()
      .eq("player_id", ownProfile.id);

    if (achievementsError) {
      console.error("Konto löschen - Achievements:", achievementsError);
    }
  }

  const { error: profileError } = await admin
    .from("players")
    .update({
      user_id: null,
      name: DELETED_NAME,
      initials: "??",
      is_pro: false,
    })
    .eq("user_id", user.id);

  if (profileError) {
    console.error("Konto löschen - Profil:", profileError);

    return NextResponse.json(
      { error: "Konto konnte nicht gelöscht werden (Profil). Bitte melde dich bei uns." },
      { status: 500 },
    );
  }

  /* 4. Login löschen. */

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Konto löschen - Login:", deleteError);

    return NextResponse.json(
      { error: "Konto konnte nicht gelöscht werden (Login). Bitte melde dich bei uns." },
      { status: 500 },
    );
  }

  /*
   * Die Session-Cookies gehören jetzt zu einem nicht mehr existierenden
   * Nutzer. Der Client meldet sich direkt danach ab und räumt sie auf.
   */

  return NextResponse.json({ ok: true });
}
