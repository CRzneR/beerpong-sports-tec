"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { deleteTournament, getTournaments } from "./tournamentStorage";
import type { Tournament } from "./tournamentLogic";
import { createClient } from "@/lib/supabase/client";

export default function TurnierePage() {
  const router = useRouter();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
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
          router.replace("/login?next=/turniere");
          return;
        }

        return getTournaments().then((result) => {
          if (!cancelled) {
            setTournaments(result);
          }
        });
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Turniere:", err);

        if (!cancelled) {
          setError("Turniere konnten nicht geladen werden.");
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            Zurück zur Startseite
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-white/30 transition hover:text-white"
          >
            Abmelden
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">
              Pong League
            </div>

            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">Deine Turniere</h1>
          </div>

          <Link
            href="/turniere/neu"
            className="rounded-full bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_25px_rgba(250,204,21,0.18)] transition hover:bg-yellow-300"
          >
            + Neues Turnier
          </Link>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="text-sm font-bold text-white/40">Lade Turniere …</div>
          ) : error ? (
            <div className="text-sm font-bold text-red-400/70">{error}</div>
          ) : tournaments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm font-bold text-white/40">
              Noch keine Turniere. Leg dein erstes an.
            </div>
          ) : (
            <div className="space-y-3">
              {tournaments.map((tournament) => (
                <TournamentRow
                  key={tournament.id}
                  tournament={tournament}
                  onDeleted={handleTournamentDeleted}
                />
              ))}
            </div>
          )}
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
  onDeleted,
}: {
  tournament: Tournament;
  onDeleted: (tournamentId: string) => void;
}) {
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
      setError("Löschen fehlgeschlagen.");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-yellow-400/30 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-4 p-5">
        <Link href={`/turniere/${tournament.id}`} className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-white">{tournament.name}</div>

          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
            {tournament.teamCount} Teams · {tournament.groupCount}{" "}
            {tournament.groupCount === 1 ? "Gruppe" : "Gruppen"}
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-full bg-red-400 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Löscht …" : "Ja, löschen"}
              </button>

              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/40 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Abbrechen
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/30 transition hover:border-red-400/30 hover:text-red-400"
              >
                Löschen
              </button>

              <Link href={`/turniere/${tournament.id}`} className="text-yellow-400">
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
