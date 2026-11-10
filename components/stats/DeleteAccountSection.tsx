"use client";

import { useEffect, useState, type FormEvent } from "react";
import { User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getOwnProfile, resetPlayerStats } from "@/app/[locale]/spieler/match/playerProfiles";
import { useLocale, useTranslations } from "next-intl";

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
 * variant (optional): "league" zeigt den Bereich als breite Zeile im Stil der
 * Pong-League-Übersicht (Symbol, Text, Button rechts). Standard ist die
 * schlichte Variante der Spielerseite.
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
  variant = "default",
}: {
  tournamentCount?: number;
  showResetStats?: boolean;
  variant?: "default" | "league";
}) {
  const t = useTranslations("Stats.DeleteAccountSection");
  const locale = useLocale();

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

      setResetError(t("zuruecksetzenFehlgeschlagenBitteVe"));
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
        throw new Error("delete failed");
      }

      /* Lokale Session aufräumen (der Nutzer existiert serverseitig nicht mehr). */
      await createClient().auth.signOut();
      window.location.href = locale === "de" ? "/" : `/${locale}`;
    } catch (err) {
      setError(t("kontoKonnteNichtGeloescht"));
      setDeleting(false);
    }
  };

  return (
    <section
      className={
        variant === "league"
          ? "relative pb-16 pt-10"
          : "border-t border-white/[0.06] pb-16 pt-8"
      }
    >
      {variant === "league" ? (
        <>
          {/* Trennlinie, die zu den Seiten hin ausläuft */}
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="flex items-center gap-4 md:gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 md:h-16 md:w-16">
                <User size={26} strokeWidth={1.6} aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <div className="text-lg font-black text-white">{t("konto")}</div>

                <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-white/50">
                  {t("loeschtDeinenLoginUnd")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 self-start rounded-xl border border-red-400/30 bg-red-400/[0.06] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/[0.14] md:self-auto"
            >
              {t("kontoLoeschen")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">{t("konto")}</div>

          <div className={`mt-4 grid gap-6 ${showResetStats ? "md:grid-cols-2 md:gap-0" : ""}`}>
            {showResetStats && (
              <div className="flex flex-col gap-3 md:items-start md:pr-8">
                <p className="max-w-md text-xs font-semibold text-white/35">{t("entferntDeineBisherigenMatches")}</p>

                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="self-start rounded-full border border-red-400/20 bg-red-400/[0.05] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-red-400/80 transition hover:bg-red-400/[0.12] hover:text-red-400"
                >{t("statistikenZuruecksetzen")}</button>
              </div>
            )}

            <div
              className={`flex flex-col gap-3 md:items-start ${
                showResetStats
                  ? "border-t border-white/[0.06] pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0"
                  : ""
              }`}
            >
              <p className="max-w-md text-xs font-semibold text-white/35">{t("loeschtDeinenLoginUnd")}</p>

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="self-start rounded-full border border-red-400/20 bg-red-400/[0.05] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-red-400/80 transition hover:bg-red-400/[0.12] hover:text-red-400"
              >{t("kontoLoeschen")}</button>
            </div>
          </div>
        </>
      )}

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
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">{t("achtung")}</div>

            <h2 id="reset-stats-title" className="mt-1 text-lg font-black uppercase text-white">{t("statistikenWirklichZuruecksetzen")}</h2>

            <p className="mt-2 text-xs text-white/40">{t("deineBisherigenMatchesTrefferquote")}</p>

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
                {resetting ? t("wirdZurueckgesetzt") : t("jaZuruecksetzen")}
              </button>

              <button
                type="button"
                disabled={resetting}
                onClick={closeReset}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
              >{t("abbrechen")}</button>
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
            >{t("kontoWirklichLoeschen")}</h2>

            <ul className="mt-3 list-inside list-disc space-y-1 text-xs font-semibold text-white/50">
              <li>{t("dasLaesstSichNicht")}</li>
              <li>{t("proStatusUndStatistik")}</li>
              <li>{t("eigeneTurniereBleibenOhne")}</li>
              {tournamentCount > 0 && (
                <li className="font-bold text-red-400/80">
                  {tournamentCount === 1
                    ? t("deinTurnierLaesstSich")
                    : t("deineTurniereLassenSich", { tournamentCount })}
                </li>
              )}
            </ul>

            <label className="mt-4 block text-[11px] font-bold text-white/50">{t("tippeZurBestaetigungDeinen")}{" "}
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
              >{t("abbrechen")}</button>

              <button
                type="submit"
                disabled={!matches || deleting}
                className="rounded-xl border border-red-400/30 bg-red-400/[0.12] px-4 py-3 text-xs font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/[0.2] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {deleting ? t("loesche") : t("endgueltigLoeschen")}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
