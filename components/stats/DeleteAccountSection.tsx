"use client";

import { useEffect, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import { getOwnProfile, resetPlayerStats } from "@/app/spieler/match/playerProfiles";

/*
 * --------------------------------------------------------------------------
 * | KONTO LÖSCHEN
 * --------------------------------------------------------------------------
 *
 * Kleiner Bereich "Konto" ganz unten auf der Spielerseite und auf der
 * Pong-League-Übersicht. Für Gäste (nicht eingeloggt) rendert die
 * Komponente nichts.
 *
 * showResetStats (nur Spielerseite): zeigt neben "Konto löschen" auch
 * "Statistiken zurücksetzen". Das Zurücksetzen liegt bewusst hier unten
 * und nicht in der Statistik-Karte, damit es nicht versehentlich
 * angeklickt wird und auch erreichbar bleibt, wenn Karten im Dashboard
 * ausgeblendet sind.
 *
 * tournamentCount (optional, nur Pong League): Anzahl der eigenen
 * Turniere. Ist sie größer als 0, weist der Dialog darauf hin, dass sie
 * nach dem Löschen nicht mehr verwaltet werden können.
 *
 * Zum Bestätigen muss der eigene Benutzername eingetippt werden - ein
 * versehentlicher Klick reicht nicht. Die Löschung selbst passiert
 * serverseitig (POST /api/account/delete), weil der Login nur mit dem
 * Service-Role-Key gelöscht werden kann.
 * --------------------------------------------------------------------------
 */

export function DeleteAccountSection({
  tournamentCount = 0,
  showResetStats = false,
}: {
  tournamentCount?: number;
  showResetStats?: boolean;
}) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getOwnProfile()
      .then((profile) => {
        if (active) {
          setProfileId(profile?.id ?? null);
          setUsername(profile?.name ?? null);
        }
      })
      .catch((err) => console.error("Fehler beim Laden des Profils:", err));

    return () => {
      active = false;
    };
  }, []);

  if (!username) return null;

  const matches = confirmText.trim().toLowerCase() === username.toLowerCase();

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setConfirmText("");
    setError(null);
  };

  const closeReset = () => {
    if (resetting) return;
    setResetOpen(false);
    setResetError(null);
  };

  const handleReset = async () => {
    if (!profileId || resetting) return;

    setResetting(true);
    setResetError(null);

    try {
      await resetPlayerStats(profileId);

      /*
       * Statistiken werden an mehreren, unabhängig voneinander ladenden
       * Stellen der Seite angezeigt. Statt das zu synchronisieren, wird
       * nach erfolgreichem Reset einmal neu geladen.
       */
      window.location.reload();
    } catch (err) {
      console.error("Fehler beim Zurücksetzen der Statistiken:", err);

      setResetError("Zurücksetzen fehlgeschlagen. Bitte versuch es erneut.");
      setResetting(false);
    }
  };

  const handleDelete = async (event: FormEvent) => {
    event.preventDefault();
    if (!matches || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/account/delete", { method: "POST" });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Konto konnte nicht gelöscht werden.");
      }

      /* Lokale Session aufräumen (der Nutzer existiert serverseitig nicht mehr). */
      await createClient().auth.signOut();
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konto konnte nicht gelöscht werden.");
      setDeleting(false);
    }
  };

  return (
    <section className="border-t border-white/[0.06] pb-16 pt-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Konto</div>

      <div className={`mt-4 grid gap-6 ${showResetStats ? "md:grid-cols-2 md:gap-0" : ""}`}>
        {showResetStats && (
          <div className="flex flex-col gap-3 md:items-start md:pr-8">
            <p className="max-w-md text-xs font-semibold text-white/35">
              Entfernt deine bisherigen Matches, Trefferquote und Serien aus deiner Statistik. Dein
              Konto bleibt bestehen.
            </p>

            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="self-start rounded-full border border-red-400/20 bg-red-400/[0.05] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-red-400/80 transition hover:bg-red-400/[0.12] hover:text-red-400"
            >
              Statistiken zurücksetzen
            </button>
          </div>
        )}

        <div
          className={`flex flex-col gap-3 md:items-start ${
            showResetStats
              ? "border-t border-white/[0.06] pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0"
              : ""
          }`}
        >
          <p className="max-w-md text-xs font-semibold text-white/35">
            Löscht deinen Login und dein Profil dauerhaft. Deine Matches bleiben für deine
            Mitspieler erhalten, erscheinen aber unter „Gelöschter Spieler“.
          </p>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start rounded-full border border-red-400/20 bg-red-400/[0.05] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-red-400/80 transition hover:bg-red-400/[0.12] hover:text-red-400"
          >
            Konto löschen
          </button>
        </div>
      </div>

      {resetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-stats-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm"
          onClick={closeReset}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-red-400/20 bg-[#07090d] p-6 text-center text-white shadow-2xl"
          >
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
              Achtung
            </div>

            <h2 id="reset-stats-title" className="mt-1 text-lg font-black uppercase text-white">
              Statistiken wirklich zurücksetzen?
            </h2>

            <p className="mt-2 text-xs text-white/40">
              Deine bisherigen Matches, Trefferquote und Serien werden aus deiner Statistik
              entfernt. Das kann nicht rückgängig gemacht werden.
            </p>

            {resetError && (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-3 py-2 text-xs font-bold text-red-400/80">
                {resetError}
              </div>
            )}

            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={resetting}
                onClick={handleReset}
                className="w-full rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {resetting ? "Wird zurückgesetzt …" : "Ja, zurücksetzen"}
              </button>

              <button
                type="button"
                disabled={resetting}
                onClick={closeReset}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm"
          onClick={close}
        >
          <form
            onSubmit={handleDelete}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-red-400/20 bg-[#07090d] p-6 text-white shadow-2xl"
          >
            <h2
              id="delete-account-title"
              className="text-xl font-black uppercase tracking-tight text-red-400"
            >
              Konto wirklich löschen?
            </h2>

            <ul className="mt-3 list-inside list-disc space-y-1 text-xs font-semibold text-white/50">
              <li>Das lässt sich nicht rückgängig machen.</li>
              <li>Pro-Status und Statistik-Zuordnung gehen verloren.</li>
              <li>Eigene Turniere bleiben ohne Veranstalter bestehen.</li>
              {tournamentCount > 0 && (
                <li className="font-bold text-red-400/80">
                  {tournamentCount === 1
                    ? "Dein Turnier lässt sich danach nicht mehr verwalten. Lösche es vorher, wenn du das nicht möchtest."
                    : `Deine ${tournamentCount} Turniere lassen sich danach nicht mehr verwalten. Lösche sie vorher, wenn du das nicht möchtest.`}
                </li>
              )}
            </ul>

            <label className="mt-4 block text-[11px] font-bold text-white/50">
              Tippe zur Bestätigung deinen Benutzernamen:{" "}
              <span className="font-black text-white">{username}</span>
            </label>

            <input
              type="text"
              autoFocus
              autoComplete="off"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={username}
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/20 focus:border-red-400/40 focus:outline-none"
            />

            {error && (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80">
                {error}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={close}
                disabled={deleting}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-wider text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
              >
                Abbrechen
              </button>

              <button
                type="submit"
                disabled={!matches || deleting}
                className="rounded-xl border border-red-400/30 bg-red-400/[0.12] px-4 py-3 text-xs font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/[0.2] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {deleting ? "Lösche …" : "Endgültig löschen"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
