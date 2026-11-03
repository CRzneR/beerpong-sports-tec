"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { getTournamentByJoinCode, joinTournamentTeam } from "../../tournamentStorage";
import { MAX_TEAM_SIZE, type JoinPreview, type JoinResult } from "../../tournamentLogic";
import { createClient } from "@/lib/supabase/client";
import { UsernameGate } from "@/components/stats/UsernameGate";

/*
|--------------------------------------------------------------------------
| PONG LEAGUE: PROFIL MIT EINEM TEAM VERKNÜPFEN
|--------------------------------------------------------------------------
|
| Ziel-Seite des Beitritts-Links / QR-Codes (/turniere/beitreten/<code>).
| Jeder Spieler wählt hier SEIN Team und verknüpft damit sein eigenes
| Profil. Niemand kann andere Spieler verknüpfen. Danach erscheint das
| Turnier als Card in seinen Pong Stats.
|
*/

const ERROR_TEXT: Partial<Record<JoinResult, string>> = {
  full: "Dieses Team ist bereits voll. Wähle ein anderes Team.",
  finished: "Dieses Turnier ist bereits beendet.",
  invalid: "Der Link oder das Team ist nicht mehr gültig.",
  no_profile: "Lege zuerst deinen Spielernamen fest und versuche es dann erneut.",
};

export default function BeitrittPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedTeamId, setJoinedTeamId] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    const result = await getTournamentByJoinCode(code);

    setPreview(result);
    setSelectedTeamId((current) => current ?? result?.myTeamId ?? null);

    return result;
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) {
          return;
        }

        /* Ohne Login erst anmelden, danach landet man wieder genau hier. */
        if (!data.user) {
          router.replace(`/login?next=${encodeURIComponent(`/turniere/beitreten/${code}`)}`);
          return;
        }

        return loadPreview();
      })
      .catch((err) => {
        console.error("Fehler beim Laden des Turniers:", err);

        if (!cancelled) {
          setError("Turnier konnte nicht geladen werden.");
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
  }, [code, router, loadPreview]);

  const handleJoin = async () => {
    if (!selectedTeamId) {
      return;
    }

    setJoining(true);
    setJoinError(null);

    try {
      const result = await joinTournamentTeam(code, selectedTeamId);

      if (result === "joined") {
        setJoinedTeamId(selectedTeamId);
        await loadPreview();
        return;
      }

      if (result === "login") {
        router.replace(`/login?next=${encodeURIComponent(`/turniere/beitreten/${code}`)}`);
        return;
      }

      setJoinError(ERROR_TEXT[result] ?? "Beitritt fehlgeschlagen.");

      /* Besetzung hat sich geändert: Anzeige auffrischen. */
      if (result === "full") {
        await loadPreview();
        setSelectedTeamId(null);
      }
    } catch (err) {
      console.error("Fehler beim Beitritt:", err);
      setJoinError("Beitritt fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white">
        <div className="mx-auto max-w-2xl text-sm font-bold text-white/40">Lade Turnier …</div>
      </main>
    );
  }

  if (error || !preview) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="text-sm font-bold text-red-400/70">
            {error ?? "Dieser Beitritts-Link ist ungültig oder abgelaufen."}
          </div>

          <Link
            href="/turniere"
            className="mt-6 inline-block text-xs font-semibold text-white/30 transition hover:text-white"
          >
            ← Zu den Turnieren
          </Link>
        </div>
      </main>
    );
  }

  const alreadyJoined = preview.myTeamId !== null;
  const joinedTeam = preview.teams.find((team) => team.id === preview.myTeamId);
  const justJoined = joinedTeamId !== null && preview.myTeamId === joinedTeamId;
  const groupLabels = Array.from(new Set(preview.teams.map((team) => team.groupLabel))).sort();
  const changed = selectedTeamId !== null && selectedTeamId !== preview.myTeamId;

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white sm:px-6 lg:px-8">
      <UsernameGate variant="league" />

      <div className="mx-auto max-w-2xl">
        <Link
          href="/turniere"
          className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Zu den Turnieren
        </Link>

        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">
          Pong League
        </div>

        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">{preview.name}</h1>

        <div className="mt-1 text-xs font-bold text-white/30">
          {preview.teamCount} Teams · {preview.groupCount}{" "}
          {preview.groupCount === 1 ? "Gruppe" : "Gruppen"}
        </div>

        {justJoined && joinedTeam ? (
          <div className="mt-8 rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.05] p-6">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
              Verknüpft
            </div>

            <p className="mt-2 text-sm text-white/70">
              Dein Profil spielt jetzt für <span className="font-black">{joinedTeam.name}</span>. In
              deinen Pong Stats findest du das Turnier als Card mit Tabelle und nächstem Spiel.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/spieler"
                className="rounded-full bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition hover:bg-yellow-300"
              >
                Zu meinen Pong Stats
              </Link>

              <Link
                href={`/turniere/${preview.id}`}
                className="rounded-full border border-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-wider text-white/40 transition hover:text-white"
              >
                Turnier ansehen
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-white/50">
              {alreadyJoined
                ? `Du bist aktuell mit ${joinedTeam?.name ?? "einem Team"} verknüpft. Du kannst hier das Team wechseln.`
                : "Wähle dein Team. Dein Profil wird damit mit dem Teamnamen verknüpft, und du kannst das Turnier in Pong Stats verfolgen. Die Ergebnisse trägt der Veranstalter ein."}
            </p>

            <div className="mt-6 space-y-6">
              {groupLabels.map((groupLabel) => (
                <div key={groupLabel}>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                    Gruppe {groupLabel}
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {preview.teams
                      .filter((team) => team.groupLabel === groupLabel)
                      .map((team) => {
                        const isMine = team.id === preview.myTeamId;
                        const isFull = team.members.length >= MAX_TEAM_SIZE && !isMine;
                        const isSelected = team.id === selectedTeamId;

                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => setSelectedTeamId(team.id)}
                            disabled={isFull}
                            aria-pressed={isSelected}
                            className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected
                                ? "border-yellow-400/60 bg-yellow-400/[0.08]"
                                : "border-white/10 bg-white/[0.02] hover:border-yellow-400/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 truncate text-sm font-black text-white">
                                {team.name}
                              </div>

                              <div className="shrink-0 text-[9px] font-black uppercase tracking-wider text-white/30">
                                {isMine
                                  ? "Dein Team"
                                  : isFull
                                    ? "Voll"
                                    : `${team.members.length}/${MAX_TEAM_SIZE}`}
                              </div>
                            </div>

                            <div className="mt-2 truncate text-xs font-bold text-white/30">
                              {team.members.length === 0
                                ? "Noch niemand verknüpft"
                                : team.members.join(", ")}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {joinError && <div className="mt-5 text-xs font-bold text-red-400/80">{joinError}</div>}

            <button
              type="button"
              onClick={handleJoin}
              disabled={!changed || joining || preview.status === "finished"}
              className="mt-6 w-full rounded-full bg-yellow-400 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_25px_rgba(250,204,21,0.18)] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto md:px-8"
            >
              {joining
                ? "Verknüpft …"
                : alreadyJoined
                  ? "Team wechseln"
                  : "Mit diesem Team verknüpfen"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
