"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { deleteTournament, getTournamentDetail, updateMatchResult } from "../tournamentStorage";
import {
  computeGroupStandings,
  type Tournament,
  type TournamentTeam,
  type TournamentMatch,
} from "../tournamentLogic";
import { createClient } from "@/lib/supabase/client";

export default function TurnierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /*
   * MENÜ
   *
   * "Gruppen" = Team-Übersicht je Gruppe, "Spielplan" = alle Spiele
   * mit Ergebnis-Eingabe, "Verwaltung" = u. a. Turnier löschen.
   */

  const [tab, setTab] = useState<"gruppen" | "spielplan" | "verwaltung">("gruppen");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
         * Ohne Login direkt zur Anmeldung - RLS würde ein fremdes oder
         * nicht eingeloggtes Turnier ohnehin als "nicht gefunden"
         * zurückgeben, aber der Login-Hinweis ist hier hilfreicher als
         * die generische Fehlermeldung.
         */
        if (!data.user) {
          router.replace(`/login?next=${encodeURIComponent(`/turniere/${tournamentId}`)}`);
          return;
        }

        return getTournamentDetail(tournamentId).then((result) => {
          if (cancelled) {
            return;
          }

          if (!result) {
            setError("Turnier wurde nicht gefunden.");
            return;
          }

          setTournament(result.tournament);
          setTeams(result.teams);
          setMatches(result.matches);
        });
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
  }, [tournamentId, router]);

  const teamById = (id: string) => teams.find((team) => team.id === id);

  const groupLabels = Array.from(new Set(teams.map((team) => team.groupLabel))).sort();

  const handleSaveResult = async (
    matchId: string,
    teamAScore: number,
    teamBScore: number,
    previousFinishedAt: string | null,
  ) => {
    /*
     * Absichtlich kein try/catch hier - MatchRow fängt den Fehler
     * selbst ab, zeigt ihn direkt an der betroffenen Zeile an und
     * bleibt dann im Bearbeiten-Modus, statt die Felder zu sperren.
     */
    const updated = await updateMatchResult(matchId, teamAScore, teamBScore, previousFinishedAt);

    setMatches((current) => current.map((match) => (match.id === matchId ? updated : match)));
  };

  const handleDeleteTournament = async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteTournament(tournamentId);
      router.push("/turniere");
    } catch (err) {
      console.error("Fehler beim Löschen des Turniers:", err);
      setDeleteError("Turnier konnte nicht gelöscht werden.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white">
        <div className="mx-auto max-w-4xl text-sm font-bold text-white/40">Lade Turnier …</div>
      </main>
    );
  }

  if (error || !tournament) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white">
        <div className="mx-auto max-w-4xl text-sm font-bold text-red-400/70">
          {error ?? "Turnier wurde nicht gefunden."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/turniere"
          className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Zurück zu Turnieren
        </Link>

        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">
          Pong League
        </div>

        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">{tournament.name}</h1>

        <div className="mt-1 text-xs font-bold text-white/30">
          {tournament.teamCount} Teams · {tournament.groupCount}{" "}
          {tournament.groupCount === 1 ? "Gruppe" : "Gruppen"}
        </div>

        {/* MENÜ */}

        <div className="mt-8 flex gap-2 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => setTab("gruppen")}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition ${
              tab === "gruppen"
                ? "border-b-2 border-yellow-400 text-yellow-400"
                : "text-white/30 hover:text-white"
            }`}
          >
            Gruppen
          </button>

          <button
            type="button"
            onClick={() => setTab("spielplan")}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition ${
              tab === "spielplan"
                ? "border-b-2 border-yellow-400 text-yellow-400"
                : "text-white/30 hover:text-white"
            }`}
          >
            Spielplan
          </button>

          <button
            type="button"
            onClick={() => setTab("verwaltung")}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition ${
              tab === "verwaltung"
                ? "border-b-2 border-yellow-400 text-yellow-400"
                : "text-white/30 hover:text-white"
            }`}
          >
            Verwaltung
          </button>
        </div>

        {/* GRUPPEN */}

        {tab === "gruppen" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {groupLabels.map((groupLabel) => {
              const groupTeams = teams.filter((team) => team.groupLabel === groupLabel);
              const groupMatches = matches.filter((match) => match.groupLabel === groupLabel);
              const standings = computeGroupStandings(groupTeams, groupMatches);

              return (
                <div
                  key={groupLabel}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                    Gruppe {groupLabel}
                  </div>

                  <table className="mt-4 w-full text-left">
                    <thead>
                      <tr className="text-[9px] font-black uppercase tracking-wider text-white/30">
                        <th className="pb-2">Team</th>
                        <th className="pb-2 text-center" title="Spiele">
                          Sp
                        </th>
                        <th className="pb-2 text-center" title="Siege">
                          S
                        </th>
                        <th className="pb-2 text-center" title="Niederlagen">
                          N
                        </th>
                        <th
                          className="pb-2 text-center"
                          title="Trefferverhältnis (erzielt:kassiert)"
                        >
                          Treffer
                        </th>
                        <th className="pb-2 text-center" title="Punkte">
                          Pkt
                        </th>
                        <th className="pb-2 pl-2 text-right" title="Form (letzte 3 Spiele)">
                          Form
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {standings.map((row) => (
                        <tr key={row.team.id} className="border-t border-white/[0.06]">
                          <td className="py-2 pr-2 text-sm font-bold text-white">
                            {row.team.name}
                          </td>
                          <td className="py-2 text-center text-sm text-white/50">{row.played}</td>
                          <td className="py-2 text-center text-sm text-white/50">{row.wins}</td>
                          <td className="py-2 text-center text-sm text-white/50">{row.losses}</td>
                          <td className="py-2 text-center text-sm whitespace-nowrap text-white/50">
                            {row.scoredTotal}:{row.concededTotal}
                          </td>
                          <td className="py-2 text-center text-sm font-black text-yellow-400">
                            {row.points}
                          </td>
                          <td className="py-2 pl-2">
                            <div className="flex justify-end gap-1">
                              {row.form.length === 0 ? (
                                <span className="text-[9px] text-white/20">–</span>
                              ) : (
                                row.form.map((result, index) => (
                                  <span
                                    key={index}
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] text-[8px] font-black ${
                                      result === "S"
                                        ? "bg-green-400/20 text-green-400"
                                        : result === "N"
                                          ? "bg-red-400/20 text-red-400"
                                          : "bg-white/10 text-white/40"
                                    }`}
                                  >
                                    {result}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* SPIELPLAN */}

        {tab === "spielplan" && (
          <div className="mt-6 space-y-6">
            {groupLabels.map((groupLabel) => (
              <div key={groupLabel}>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                  Gruppe {groupLabel}
                </div>

                <div className="mt-3 space-y-2">
                  {matches
                    .filter((match) => match.groupLabel === groupLabel)
                    .map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        teamAName={teamById(match.teamAId)?.name ?? "?"}
                        teamBName={teamById(match.teamBId)?.name ?? "?"}
                        onSave={handleSaveResult}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VERWALTUNG */}

        {tab === "verwaltung" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                Gefahrenzone
              </div>

              <p className="mt-2 text-sm text-white/50">
                Löscht dieses Turnier unwiderruflich - inklusive aller Teams und Spielergebnisse.
                Das kann nicht rückgängig gemacht werden.
              </p>

              {deleteError && (
                <div className="mt-3 text-xs font-bold text-red-400/80">{deleteError}</div>
              )}

              {confirmingDelete ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteTournament}
                    disabled={deleting}
                    className="rounded-full bg-red-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "Löscht …" : "Ja, endgültig löschen"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="rounded-full border border-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-wider text-white/40 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="mt-4 rounded-full border border-red-400/30 px-5 py-3 text-xs font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/10"
                >
                  Turnier löschen
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| SPIEL-ZEILE MIT ERGEBNIS-EINGABE
|--------------------------------------------------------------------------
|
| Solange kein Ergebnis eingetragen ist, sind die Felder direkt offen
| ("Speichern"). Sobald ein Ergebnis gespeichert ist, werden die Felder
| gesperrt - "Bearbeiten" öffnet sie wieder zum Korrigieren, danach
| wird erneut gespeichert und wieder gesperrt.
|
*/

function MatchRow({
  match,
  teamAName,
  teamBName,
  onSave,
}: {
  match: TournamentMatch;
  teamAName: string;
  teamBName: string;
  onSave: (
    matchId: string,
    teamAScore: number,
    teamBScore: number,
    previousFinishedAt: string | null,
  ) => Promise<void>;
}) {
  const [scoreA, setScoreA] = useState(match.teamAScore?.toString() ?? "");
  const [scoreB, setScoreB] = useState(match.teamBScore?.toString() ?? "");
  const [editing, setEditing] = useState(match.status !== "finished");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isLocked = match.status === "finished" && !editing;

  const handleEdit = () => {
    setEditing(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    const a = Number(scoreA);
    const b = Number(scoreB);

    if (scoreA.trim() === "" || scoreB.trim() === "" || Number.isNaN(a) || Number.isNaN(b)) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await onSave(match.id, a, b, match.finishedAt);
      setEditing(false);
    } catch (err) {
      console.error("Fehler beim Speichern des Ergebnisses:", err);
      setSaveError("Konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="min-w-0 flex-1 truncate text-sm font-bold text-white">{teamAName}</div>

        <input
          type="number"
          min={0}
          value={scoreA}
          onChange={(event) => setScoreA(event.target.value)}
          disabled={isLocked}
          className="w-14 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-2 text-center text-sm font-black text-white focus:border-yellow-400/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        />

        <span className="shrink-0 text-white/20">:</span>

        <input
          type="number"
          min={0}
          value={scoreB}
          onChange={(event) => setScoreB(event.target.value)}
          disabled={isLocked}
          className="w-14 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-2 text-center text-sm font-black text-white focus:border-yellow-400/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        />

        <div className="min-w-0 flex-1 truncate text-right text-sm font-bold text-white">
          {teamBName}
        </div>

        <button
          type="button"
          onClick={isLocked ? handleEdit : handleSave}
          disabled={saving}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isLocked
              ? "border border-white/[0.08] text-white/30 hover:text-white"
              : "bg-yellow-400 text-black hover:bg-yellow-300"
          }`}
        >
          {saving ? "Speichert …" : isLocked ? "Bearbeiten" : "Speichern"}
        </button>
      </div>

      {saveError && (
        <div className="mt-1.5 px-1 text-[10px] font-bold text-red-400/70">{saveError}</div>
      )}
    </div>
  );
}
