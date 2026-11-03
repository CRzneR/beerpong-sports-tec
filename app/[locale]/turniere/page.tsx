"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

import { deleteTournament, getTournaments } from "./tournamentStorage";
import type { Tournament } from "./tournamentLogic";
import { createClient } from "@/lib/supabase/client";
import { UsernameGate } from "@/components/stats/UsernameGate";
import { DeleteAccountSection } from "@/components/stats/DeleteAccountSection";
import { useTranslations } from "next-intl";

export default function TurnierePage() {
  const t = useTranslations("League.ListPage");

  const router = useRouter();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) {
          return;
        }

        /*
         * Turniere gehören fest zum eingeloggten Account - ohne Login
         * direkt weiter zur Anmeldung, kein Turnier wird angezeigt.
         */
        if (!data.user) {
          router.replace({ pathname: "/login", query: { next: "/turniere" } });
          return;
        }

        setUserId(data.user.id);

        return getTournaments().then((result) => {
          if (!cancelled) {
            setTournaments(result);
          }
        });
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Turniere:", err);

        if (!cancelled) {
          setError(t("turnierePageLoadError"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleTournamentDeleted = (tournamentId: string) => {
    setTournaments((current) => current.filter((tournament) => tournament.id !== tournamentId));
  };

  /*
   * Die Liste enthält auch Turniere, bei denen man nur über den
   * Beitritts-Link mit einem Team verknüpft ist. Die gehören dem
   * Veranstalter und lassen sich hier nicht löschen.
   */
  const ownedCount = tournaments.filter((tournament) => tournament.userId === userId).length;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white sm:px-6 lg:px-8">
      <UsernameGate variant="league" />
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>{t("zurueckZurStartseite")}</Link>

          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-white/30 transition hover:text-white"
          >{t("abmelden")}</button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">{t("pongLeague")}</div>

            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">{t("deineTurniere")}</h1>
          </div>

          <Link
            href="/turniere/neu"
            className="rounded-full bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_25px_rgba(250,204,21,0.18)] transition hover:bg-yellow-300"
          >{t("neuesTurnier")}</Link>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="text-sm font-bold text-white/40">{t("ladeTurniere")}</div>
          ) : error ? (
            <div className="text-sm font-bold text-red-400/70">{error}</div>
          ) : tournaments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm font-bold text-white/40">{t("nochKeineTurniereLeg")}</div>
          ) : (
            <div className="space-y-3">
              {tournaments.map((tournament) => (
                <TournamentRow
                  key={tournament.id}
                  tournament={tournament}
                  isOwner={tournament.userId === userId}
                  onDeleted={handleTournamentDeleted}
                />
              ))}
            </div>
          )}
        </div>

        {/* Konto: dieselbe Löschfunktion wie auf der Spielerseite */}
        <div className="mt-12">
          <DeleteAccountSection tournamentCount={ownedCount} />
        </div>
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| TURNIER-ZEILE MIT LÖSCH-FUNKTION
|--------------------------------------------------------------------------
|
| Name/Team-Info bleiben als Link klickbar (führt zum Turnier), der
| Lösch-Button liegt bewusst NICHT innerhalb des Links (kein
| klickbares Element im anderen), sondern daneben in derselben Zeile.
|
*/

function TournamentRow({
  tournament,
  isOwner,
  onDeleted,
}: {
  tournament: Tournament;
  isOwner: boolean;
  onDeleted: (tournamentId: string) => void;
}) {
  const t = useTranslations("League.ListPage");

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await deleteTournament(tournament.id);
      onDeleted(tournament.id);
    } catch (err) {
      console.error("Fehler beim Löschen des Turniers:", err);
      setError(t("deleteFailed"));
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-yellow-400/30 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-4 p-5">
        <Link href={{ pathname: "/turniere/[tournamentId]", params: { tournamentId: tournament.id } }} className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-white">{tournament.name}</div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
            <span>
              {t("teamsGroups", { teamCount: tournament.teamCount, groupCount: tournament.groupCount })}
            </span>

            {!isOwner && (
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/[0.06] px-2 py-0.5 text-[8px] font-black tracking-wider text-yellow-400">{t("beigetreten")}</span>
            )}
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {!isOwner ? (
            <Link href={{ pathname: "/turniere/[tournamentId]", params: { tournamentId: tournament.id } }} className="text-yellow-400">
              →
            </Link>
          ) : confirming ? (
            <>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-full bg-red-400 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? t("loescht") : t("jaLoeschen")}
              </button>

              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/40 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >{t("abbrechen")}</button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/30 transition hover:border-red-400/30 hover:text-red-400"
              >{t("loeschen")}</button>

              <Link href={{ pathname: "/turniere/[tournamentId]", params: { tournamentId: tournament.id } }} className="text-yellow-400">
                →
              </Link>
            </>
          )}
        </div>
      </div>

      {error && <div className="px-5 pb-4 text-[10px] font-bold text-red-400/70">{error}</div>}
    </div>
  );
}
