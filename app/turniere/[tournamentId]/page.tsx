"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

import {
  deleteTournament,
  getTournamentDetail,
  getTournamentMembers,
  leaveTournament,
  removeTournamentMember,
  resetKoPhase,
  saveKoResult,
  startKoPhase,
  updateMatchResult,
} from "../tournamentStorage";
import {
  MAX_KO_TEAMS,
  MAX_TEAM_SIZE,
  MIN_KO_TEAMS,
  buildInviteUrl,
  buildKoBracket,
  computeGroupStandings,
  computeKoQualifiersBy,
  isKoMatchEditable,
  koChampionId,
  koRoundLabel,
  koTeamCountAllowed,
  koTotalRounds,
  koWinnerId,
  maxQualifiersPerGroup,
  type KoMatch,
  type KoMode,
  type KoSelect,
  type Tournament,
  type TournamentMatch,
  type TournamentMember,
  type TournamentTeam,
} from "../tournamentLogic";
import { KoBracket, type KoBracketMatch } from "../KoBracket";
import { getOwnProStatus, getOwnProfile } from "@/app/spieler/match/playerProfiles";
import { createClient } from "@/lib/supabase/client";

type TabId = "gruppen" | "spielplan" | "ko" | "teams" | "verwaltung";

const TABS: { id: TabId; label: string }[] = [
  { id: "gruppen", label: "Gruppen" },
  { id: "spielplan", label: "Spielplan" },
  { id: "ko", label: "K.-o." },
  { id: "teams", label: "Teams" },
  { id: "verwaltung", label: "Verwaltung" },
];

export default function TurnierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [members, setMembers] = useState<TournamentMember[]>([]);
  const [koMatches, setKoMatches] = useState<KoMatch[]>([]);

  /* K.-o.-Phase starten (nur Veranstalter) */
  /* "Anzahl": Teams pro Gruppe (koSelectChoice "group") bzw. Teams insgesamt ("overall"). 0 = Vorschlag. */
  const [koPerGroup, setKoPerGroup] = useState(0);
  const [koSelectChoice, setKoSelectChoice] = useState<KoSelect>("group");
  const [koModeChoice, setKoModeChoice] = useState<KoMode>("reseed");
  const [startingKo, setStartingKo] = useState(false);
  const [koError, setKoError] = useState<string | null>(null);
  const [confirmingKoReset, setConfirmingKoReset] = useState(false);
  const [resettingKo, setResettingKo] = useState(false);
  const [confirmingKoBack, setConfirmingKoBack] = useState(false);
  /* Die K.-o.-Phase ist eine Pro-Funktion. null = Status wird noch geladen. */
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  /* Rückkehr von Stripe (?pro=success bzw. ?pro=cancelled). */
  const [proReturn, setProReturn] = useState<string | null>(null);
  /* Spiel, dessen Ergebnis der Veranstalter gerade im Baum einträgt. */
  const [koDialogMatchId, setKoDialogMatchId] = useState<string | null>(null);

  /*
   * Wer schaut hier zu? Der Veranstalter darf alles ändern. Spieler, die
   * ihr Profil über den Beitritts-Link mit einem Team verknüpft haben,
   * dürfen das Turnier nur ansehen (die Datenbank erzwingt das, die
   * Oberfläche blendet die Bedienelemente zusätzlich aus).
   */

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /*
   * MENÜ
   *
   * "Gruppen" = Tabellen je Gruppe, "Spielplan" = alle Spiele (der
   * Veranstalter trägt hier Ergebnisse ein), "Teams" = verknüpfte Spieler
   * und Einladung, "Verwaltung" (nur Veranstalter) = u. a. Turnier löschen.
   */

  const [tab, setTab] = useState<TabId>("gruppen");

  const [copied, setCopied] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

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

        setCurrentUserId(data.user.id);
        setOrigin(window.location.origin);

        return Promise.all([
          getTournamentDetail(tournamentId),
          getTournamentMembers(tournamentId),
          getOwnProfile().catch(() => null),
          getOwnProStatus().catch(() => false),
        ]).then(([result, memberRows, profile, pro]) => {
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
          setKoMatches(result.koMatches);
          setMembers(memberRows);
          setMyPlayerId(profile?.id ?? null);
          setIsPro(pro);
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

  useEffect(() => {
    setProReturn(new URLSearchParams(window.location.search).get("pro"));
  }, []);

  /*
   * Direkt nach der Zahlung schaltet der Stripe-Webhook Pro erst nach ein paar
   * Sekunden frei. Deshalb kurz nachfragen, statt den Hinweis stehen zu lassen.
   */
  useEffect(() => {
    if (proReturn !== "success" || isPro !== false) {
      return;
    }

    let attempts = 0;

    const timer = window.setInterval(() => {
      attempts += 1;

      getOwnProStatus()
        .then((pro) => {
          if (pro) {
            setIsPro(true);
          }
        })
        .catch(() => undefined);

      if (attempts >= 8) {
        window.clearInterval(timer);
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [proReturn, isPro]);

  const teamById = (id: string) => teams.find((team) => team.id === id);

  const groupLabels = Array.from(new Set(teams.map((team) => team.groupLabel))).sort();

  const isOwner = tournament !== null && tournament.userId === currentUserId;
  const myTeamId = members.find((member) => member.playerId === myPlayerId)?.teamId ?? null;
  const myTeam = myTeamId ? teamById(myTeamId) : undefined;

  /* K.-o.-Phase */

  const koStarted = tournament !== null && tournament.koMode !== null;
  const koTotal = koTotalRounds(koMatches);
  const championId = koChampionId(koMatches);
  const championTeam = championId ? teamById(championId) : undefined;
  const openGroupMatches = matches.filter((match) => match.status !== "finished").length;
  const maxPerGroup = maxQualifiersPerGroup(teams);
  /* Bei nur einer Gruppe führen beide Auswahlen zum selben Ergebnis, bleiben aber wählbar. */
  const singleGroup = groupLabels.length <= 1;
  const selectChoice: KoSelect = koSelectChoice;
  const maxOverall = Math.min(teams.length, MAX_KO_TEAMS);

  /* Mögliche Werte der Auswahl (Teamzahl muss zum Modus passen: 2, 4, 8 ... bzw. gerade). */
  const amountChoices =
    selectChoice === "group"
      ? Array.from({ length: maxPerGroup }, (_, index) => index + 1).filter((count) =>
          koTeamCountAllowed(koModeChoice, count * groupLabels.length),
        )
      : Array.from({ length: Math.max(0, maxOverall - 1) }, (_, index) => index + 2).filter(
          (count) => koTeamCountAllowed(koModeChoice, count),
        );

  /* Vorschlag: etwa 4 Teams insgesamt (Halbfinale). */
  const suggestedAmount =
    selectChoice === "group" ? Math.max(1, Math.ceil(4 / Math.max(1, groupLabels.length))) : 4;
  const effectivePerGroup =
    koPerGroup > 0 && amountChoices.includes(koPerGroup)
      ? koPerGroup
      : amountChoices.includes(suggestedAmount)
        ? suggestedAmount
        : (amountChoices.find((count) => count >= suggestedAmount) ??
          amountChoices[amountChoices.length - 1] ??
          suggestedAmount);
  const koQualifiers = computeKoQualifiersBy(selectChoice, teams, matches, effectivePerGroup);
  const koTeamCountValid = koTeamCountAllowed(koModeChoice, koQualifiers.length);
  const koDraftAll = koTeamCountValid
    ? buildKoBracket(
        koModeChoice,
        koQualifiers.map((entry) => entry.team.id),
      )
    : [];
  const koPreview = koDraftAll.filter((match) => match.round === 1);
  /* Der Entwurf als Baum-Vorschau (ohne echte IDs, nur zum Zeichnen). */
  const koDraftTreeMatches: KoBracketMatch[] = koDraftAll.map((match) => ({
    id: `draft-${match.round}-${match.slot}`,
    round: match.round,
    slot: match.slot,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    teamAScore: null,
    teamBScore: null,
    status: match.status,
  }));
  const koPreviewSeedById = new Map(koQualifiers.map((entry) => [entry.team.id, entry.seed]));

  /* Gruppenplatz jedes Teams ("1. Gruppe A" im Turnierbaum). */
  const groupRankById = new Map<string, number>();

  for (const label of groupLabels) {
    computeGroupStandings(
      teams.filter((team) => team.groupLabel === label),
      matches.filter((match) => match.groupLabel === label),
    ).forEach((standing, index) => groupRankById.set(standing.team.id, index + 1));
  }

  const koTagOf = (teamId: string): string | null => {
    const team = teamById(teamId);
    const rank = groupRankById.get(teamId);

    return team && rank ? `${rank}. Gruppe ${team.groupLabel}` : null;
  };

  const koDialogMatch = koDialogMatchId
    ? koMatches.find((match) => match.id === koDialogMatchId)
    : undefined;

  const handleStartKo = async () => {
    if (!tournament) {
      return;
    }

    setStartingKo(true);
    setKoError(null);

    try {
      const result = await startKoPhase(
        tournament,
        teams,
        matches,
        koModeChoice,
        selectChoice,
        effectivePerGroup,
      );

      if (result !== "started") {
        setKoError(
          result === "group_open"
            ? "Es sind noch nicht alle Gruppenspiele eingetragen."
            : result === "already_started"
              ? "Die K.-o.-Phase läuft bereits. Lade die Seite neu."
              : result === "not_allowed"
                ? "Nur der Veranstalter darf die K.-o.-Phase starten."
                : result === "pro_required"
                  ? "Die K.-o.-Phase gibt es nur mit Pro."
                  : "Diese Auswahl ist nicht gültig (Teamzahl oder Modus). Wähle sie neu.",
        );

        if (result === "pro_required") {
          setIsPro(false);
        }

        return;
      }

      const fresh = await getTournamentDetail(tournamentId);

      if (fresh) {
        setTournament(fresh.tournament);
        setTeams(fresh.teams);
        setMatches(fresh.matches);
        setKoMatches(fresh.koMatches);
      }
    } catch (err) {
      console.error("Fehler beim Starten der K.-o.-Phase:", err);

      /* Supabase-Fehler sind keine Error-Objekte, deshalb Code und Text einzeln lesen. */
      const code = (err as { code?: string } | null)?.code ?? "";
      const message = (err as { message?: string } | null)?.message ?? "";

      setKoError(
        code === "PGRST202" || code === "42883" || /could not find the function/i.test(message)
          ? "Die Datenbank-Funktion fehlt. Führe ko-phase.sql im Supabase-SQL-Editor aus."
          : `K.-o.-Phase konnte nicht gestartet werden.${message ? ` (${code ? `${code}: ` : ""}${message})` : ""}`,
      );
    } finally {
      setStartingKo(false);
    }
  };

  const handleResetKo = async () => {
    setResettingKo(true);
    setKoError(null);

    try {
      await resetKoPhase(tournamentId);

      const fresh = await getTournamentDetail(tournamentId);

      if (fresh) {
        setTournament(fresh.tournament);
        setTeams(fresh.teams);
        setMatches(fresh.matches);
        setKoMatches(fresh.koMatches);
      }

      setConfirmingKoReset(false);
      setConfirmingKoBack(false);
      setTab("ko");
    } catch (err) {
      console.error("Fehler beim Zurücksetzen der K.-o.-Phase:", err);
      setKoError("K.-o.-Phase konnte nicht zurückgesetzt werden.");
    } finally {
      setResettingKo(false);
    }
  };

  const handleSaveKoResult = async (matchId: string, teamAScore: number, teamBScore: number) => {
    /* Fehler fängt KoMatchCard selbst ab und zeigt sie an der betroffenen Karte. */
    if (!tournament) {
      return;
    }

    const updated = await saveKoResult(
      tournament,
      teams,
      koMatches,
      matchId,
      teamAScore,
      teamBScore,
    );

    setKoMatches(updated);
    setTournament({ ...tournament, status: koChampionId(updated) ? "finished" : "active" });
  };

  const inviteUrl = tournament?.joinCode ? buildInviteUrl(origin, tournament.joinCode) : "";

  /* Pro freischalten: Stripe-Checkout, danach zurück zu diesem Turnier. */
  const handleUpgrade = async () => {
    if (upgrading) {
      return;
    }

    setUpgrading(true);
    setUpgradeError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: `/turniere/${tournamentId}` }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Checkout fehlgeschlagen.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Fehler beim Starten des Checkouts:", err);
      setUpgradeError("Checkout konnte nicht gestartet werden.");
      setUpgrading(false);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Zwischenablage gesperrt: der Link steht im Feld und lässt sich markieren. */
    }
  };

  const handleRemoveMember = async (playerId: string) => {
    setMemberBusy(true);
    setMemberError(null);

    try {
      await removeTournamentMember(tournamentId, playerId);
      setMembers((current) => current.filter((member) => member.playerId !== playerId));
      setConfirmRemoveId(null);
    } catch (err) {
      console.error("Fehler beim Entfernen des Spielers:", err);
      setMemberError("Spieler konnte nicht entfernt werden.");
    } finally {
      setMemberBusy(false);
    }
  };

  const handleLeave = async () => {
    setMemberBusy(true);
    setMemberError(null);

    try {
      await leaveTournament(tournamentId);

      /* Ohne Verknüpfung darf ein Teilnehmer das Turnier nicht mehr sehen. */
      if (!isOwner) {
        router.push("/turniere");
        return;
      }

      setMembers((current) => current.filter((member) => member.playerId !== myPlayerId));
      setConfirmingLeave(false);
    } catch (err) {
      console.error("Fehler beim Lösen der Verknüpfung:", err);
      setMemberError("Verknüpfung konnte nicht gelöst werden.");
    } finally {
      setMemberBusy(false);
    }
  };

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

        {championTeam && (
          <div className="mr-2 mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/50 bg-yellow-400/[0.12] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-yellow-300">
            Turniersieger: {championTeam.name}
          </div>
        )}

        {myTeam && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-yellow-400">
            Du spielst für {myTeam.name}
          </div>
        )}

        {/* MENÜ */}

        <div className="mt-8 flex gap-2 overflow-x-auto border-b border-white/[0.08]">
          {TABS.filter((entry) => entry.id !== "verwaltung" || isOwner).map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`shrink-0 px-4 py-3 text-xs font-black uppercase tracking-wider transition ${
                tab === entry.id
                  ? "border-b-2 border-yellow-400 text-yellow-400"
                  : "text-white/30 hover:text-white"
              }`}
            >
              {entry.label}

              {entry.id === "ko" && isOwner && isPro === false && !koStarted && (
                <span className="ml-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/[0.08] px-1.5 py-0.5 text-[8px] font-black tracking-wider text-yellow-400">
                  PRO
                </span>
              )}
            </button>
          ))}
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
                        <tr
                          key={row.team.id}
                          className={`border-t border-white/[0.06] ${
                            row.team.id === myTeamId ? "bg-yellow-400/[0.07]" : ""
                          }`}
                        >
                          <td className="py-2 pr-2 text-sm font-bold text-white">
                            {row.team.id === myTeamId && (
                              <span
                                className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-yellow-400 align-middle"
                                aria-label="Dein Team"
                              />
                            )}
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
                    .map((match) =>
                      isOwner ? (
                        <MatchRow
                          key={match.id}
                          match={match}
                          teamAName={teamById(match.teamAId)?.name ?? "?"}
                          teamBName={teamById(match.teamBId)?.name ?? "?"}
                          onSave={handleSaveResult}
                        />
                      ) : (
                        <MatchRowReadOnly
                          key={match.id}
                          match={match}
                          teamAName={teamById(match.teamAId)?.name ?? "?"}
                          teamBName={teamById(match.teamBId)?.name ?? "?"}
                          highlight={match.teamAId === myTeamId || match.teamBId === myTeamId}
                        />
                      ),
                    )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* K.-O. */}

        {tab === "ko" && (
          <div className="mt-6 space-y-6">
            {koStarted ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold text-white/30">
                    {tournament.koMode === "reseed"
                      ? "Bester gegen Schlechtesten (vor jeder Runde neu gesetzt)"
                      : "Mit Freilos für die Besten"}
                    {" · "}
                    {tournament.koSelect === "overall"
                      ? `Beste ${tournament.koPerGroup} Teams`
                      : `${tournament.koPerGroup} pro Gruppe`}
                  </div>

                  {isOwner && !confirmingKoBack && (
                    <button
                      type="button"
                      onClick={() => {
                        setKoError(null);

                        /* Ohne eingetragene Ergebnisse geht nichts verloren: direkt zurück. */
                        if (koMatches.some((match) => match.status === "finished")) {
                          setConfirmingKoBack(true);
                        } else {
                          void handleResetKo();
                        }
                      }}
                      disabled={resettingKo}
                      className="rounded-full border border-white/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/50 transition hover:border-yellow-400/40 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ← Zurück zur Auswahl
                    </button>
                  )}
                </div>

                {isOwner && confirmingKoBack && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-4">
                    <p className="text-sm text-white/60">
                      Zurück zur Auswahl? Die K.-o.-Phase wird zurückgesetzt und alle eingetragenen
                      K.-o.-Ergebnisse gehen verloren. Die Gruppenphase bleibt unverändert.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleResetKo}
                        disabled={resettingKo}
                        className="rounded-full bg-red-400 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resettingKo ? "Setzt zurück …" : "Ja, zurück zur Auswahl"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmingKoBack(false)}
                        disabled={resettingKo}
                        className="rounded-full border border-white/[0.08] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/40 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Abbrechen
                      </button>
                    </div>

                    {koError && (
                      <div className="mt-3 text-xs font-bold text-red-400/80">{koError}</div>
                    )}
                  </div>
                )}

                {tournament.koMode === "bracket" && (
                  <div className="hidden md:block">
                    <KoBracket
                      matches={koMatches}
                      teamById={teamById}
                      tagOf={koTagOf}
                      seedOf={(teamId) => teamById(teamId)?.koSeed ?? null}
                      myTeamId={myTeamId}
                      championId={championId}
                      onSelectMatch={isOwner ? setKoDialogMatchId : undefined}
                    />
                  </div>
                )}

                <div
                  className={
                    tournament.koMode === "bracket"
                      ? "flex flex-col gap-6 md:hidden"
                      : "flex flex-col gap-6 md:flex-row md:gap-4 md:overflow-x-auto md:pb-2"
                  }
                >
                  {Array.from({ length: koTotal }, (_, index) => index + 1).map((round) => (
                    <div key={round} className="flex flex-col md:min-w-[230px] md:flex-1">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                        {koRoundLabel(round, koTotal)}
                      </div>

                      <div className="mt-3 flex flex-1 flex-col gap-3 md:justify-around">
                        {koMatches
                          .filter((match) => match.round === round)
                          .sort((a, b) => a.slot - b.slot)
                          .map((match) => (
                            <KoMatchCard
                              key={match.id}
                              match={match}
                              teamById={teamById}
                              isOwner={isOwner}
                              editable={isKoMatchEditable(match, koMatches)}
                              myTeamId={myTeamId}
                              onSave={handleSaveKoResult}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                {isOwner && koDialogMatch && (
                  <KoResultDialog
                    key={koDialogMatch.id}
                    match={koDialogMatch}
                    teamById={teamById}
                    editable={isKoMatchEditable(koDialogMatch, koMatches)}
                    onSave={handleSaveKoResult}
                    onClose={() => setKoDialogMatchId(null)}
                  />
                )}
              </>
            ) : isOwner && isPro === null ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm font-bold text-white/40">
                Lädt …
              </div>
            ) : isOwner && !isPro ? (
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.03] p-6 text-center md:p-8">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                  🔒 Pro-Funktion
                </div>

                <div className="mt-2 text-lg font-black text-white">K.-o.-Phase mit Pro</div>

                <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
                  Mit Pro startest du nach der Gruppenphase die K.-o.-Phase: Wähle, wie viele Teams
                  weiterkommen, und spiele den Turniersieger im Turnierbaum aus. Pro ist eine
                  einmalige Zahlung und schaltet auch die Statistiken in Pong Stats frei.
                </p>

                {proReturn === "success" && (
                  <div className="mx-auto mt-4 max-w-md rounded-xl border border-yellow-400/20 bg-yellow-400/[0.05] px-4 py-3 text-xs font-bold text-yellow-300">
                    Danke für deinen Kauf! Pro wird in der Regel innerhalb weniger Sekunden
                    freigeschaltet. Falls es noch nicht angezeigt wird, lade die Seite kurz neu.
                  </div>
                )}

                {upgradeError && (
                  <div className="mt-3 text-xs font-bold text-red-400/80">{upgradeError}</div>
                )}

                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="mt-5 rounded-full bg-yellow-400 px-6 py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_25px_rgba(250,204,21,0.18)] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {upgrading ? "Lädt …" : "Pro freischalten"}
                </button>
              </div>
            ) : isOwner ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                  K.-o.-Phase starten
                </div>

                <p className="mt-2 text-sm text-white/50">
                  Die besten Teams spielen im K.-o.-System den Turniersieger aus. Ein Spiel pro
                  Paarung, ein Unentschieden gibt es nicht.
                </p>

                {openGroupMatches > 0 ? (
                  <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-bold text-white/50">
                    Trag zuerst alle Gruppenspiele ein. Noch {openGroupMatches}{" "}
                    {openGroupMatches === 1 ? "Spiel" : "Spiele"} offen.
                  </div>
                ) : (
                  <>
                    <div className="mt-5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-white/40">
                        Wer kommt weiter?
                      </div>

                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        {(
                          [
                            {
                              id: "group",
                              title: "Beste jeder Gruppe",
                              text: "Aus jeder Gruppe kommen gleich viele Teams weiter, zum Beispiel die zwei Ersten.",
                            },
                            {
                              id: "overall",
                              title: "Beste Teams insgesamt",
                              text: "Die besten Teams über alle Gruppen, egal aus welcher Gruppe sie kommen.",
                            },
                          ] as { id: KoSelect; title: string; text: string }[]
                        ).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setKoSelectChoice(option.id);
                              setKoPerGroup(0);
                            }}
                            aria-pressed={selectChoice === option.id}
                            className={`rounded-2xl border p-4 text-left transition ${
                              selectChoice === option.id
                                ? "border-yellow-400/60 bg-yellow-400/[0.08]"
                                : "border-white/10 bg-white/[0.02] hover:border-yellow-400/30"
                            }`}
                          >
                            <div className="text-sm font-black text-white">{option.title}</div>
                            <div className="mt-1 text-xs font-semibold leading-relaxed text-white/45">
                              {option.text}
                            </div>
                          </button>
                        ))}
                      </div>

                      {singleGroup && (
                        <p className="mt-3 text-xs font-semibold text-white/35">
                          Dein Turnier hat nur eine Gruppe, beide Auswahlen ergeben dasselbe
                          Ergebnis.
                        </p>
                      )}
                    </div>

                    <div className="mt-5">
                      <label
                        htmlFor="ko-per-group"
                        className="text-[10px] font-black uppercase tracking-wider text-white/40"
                      >
                        Wie viele Teams kommen weiter?
                      </label>

                      <select
                        id="ko-per-group"
                        value={effectivePerGroup}
                        onChange={(event) => setKoPerGroup(Number(event.target.value))}
                        className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#0b0f14] px-3 py-2.5 text-sm font-bold text-white focus:border-yellow-400/40 focus:outline-none md:w-auto md:min-w-[260px]"
                      >
                        {selectChoice === "group"
                          ? Array.from({ length: maxPerGroup }, (_, index) => index + 1).map(
                              (count) => {
                                const total = count * groupLabels.length;

                                return (
                                  <option
                                    key={count}
                                    value={count}
                                    disabled={!koTeamCountAllowed(koModeChoice, total)}
                                  >
                                    {count} pro Gruppe ({total} Teams gesamt)
                                  </option>
                                );
                              },
                            )
                          : Array.from(
                              { length: Math.max(0, maxOverall - 1) },
                              (_, index) => index + 2,
                            ).map((count) => (
                              <option
                                key={count}
                                value={count}
                                disabled={!koTeamCountAllowed(koModeChoice, count)}
                              >
                                Die besten {count} Teams
                              </option>
                            ))}
                      </select>
                    </div>

                    <div className="mt-5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-white/40">
                        Modus
                      </div>

                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        {(
                          [
                            {
                              id: "reseed",
                              title: "Bester gegen Schlechtesten",
                              text: "Der beste Platz spielt gegen den schlechtesten, der zweitbeste gegen den zweitschlechtesten und so weiter, in jeder Runde neu. Keine Freilose, die Teamzahl muss 2, 4, 8 oder 16 sein.",
                            },
                            {
                              id: "bracket",
                              title: "Mit Freilos für die Besten",
                              text: "Passt die Teamzahl nicht auf 2, 4, 8 oder 16 (zum Beispiel 6), haben die besten Teams in Runde 1 frei, bei 6 Teams die beiden besten. Links und rechts im Baum stehen gleich viele Teams, deshalb nur gerade Teamzahlen.",
                            },
                          ] as { id: KoMode; title: string; text: string }[]
                        ).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setKoModeChoice(option.id)}
                            aria-pressed={koModeChoice === option.id}
                            className={`rounded-2xl border p-4 text-left transition ${
                              koModeChoice === option.id
                                ? "border-yellow-400/60 bg-yellow-400/[0.08]"
                                : "border-white/10 bg-white/[0.02] hover:border-yellow-400/30"
                            }`}
                          >
                            <div className="text-sm font-black text-white">{option.title}</div>
                            <div className="mt-1 text-xs font-semibold leading-relaxed text-white/45">
                              {option.text}
                            </div>
                          </button>
                        ))}
                      </div>

                      {amountChoices.length === 0 && (
                        <p className="mt-3 text-xs font-bold text-yellow-400/80">
                          {koModeChoice === "reseed"
                            ? `Mit dieser Auswahl ergibt sich nie 2, 4, 8 oder 16 Teams. Wähle „Beste Teams insgesamt" oder „Mit Freilos für die Besten".`
                            : "Mit dieser Auswahl ergibt sich keine gerade Teamzahl."}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-white/40">
                        {koModeChoice === "bracket" ? "Vorschau Turnierbaum" : "Vorschau Runde 1"} (
                        {koQualifiers.length} Teams)
                      </div>

                      {koTeamCountValid && koModeChoice === "bracket" && (
                        <div className="mt-3 hidden md:block">
                          <KoBracket
                            matches={koDraftTreeMatches}
                            teamById={teamById}
                            tagOf={koTagOf}
                            seedOf={(teamId) => koPreviewSeedById.get(teamId) ?? null}
                            myTeamId={null}
                            championId={null}
                          />
                        </div>
                      )}

                      {koTeamCountValid ? (
                        <ul
                          className={
                            koModeChoice === "bracket"
                              ? "mt-3 space-y-1.5 md:hidden"
                              : "mt-3 space-y-1.5"
                          }
                        >
                          {koPreview.map((match) => {
                            const a = teamById(match.teamAId ?? "");
                            const b = teamById(match.teamBId ?? "");

                            return (
                              <li
                                key={match.slot}
                                className="flex items-center gap-2 text-sm font-bold text-white/70"
                              >
                                <span className="min-w-0 truncate">
                                  <span className="mr-1.5 text-[10px] font-black text-white/30">
                                    #{koQualifiers.find((entry) => entry.team.id === a?.id)?.seed}
                                  </span>
                                  {a?.name}
                                </span>

                                {match.status === "bye" ? (
                                  <span className="shrink-0 rounded-full border border-yellow-400/30 bg-yellow-400/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-400">
                                    Freilos
                                  </span>
                                ) : (
                                  <>
                                    <span className="shrink-0 text-white/25">gegen</span>
                                    <span className="min-w-0 truncate">
                                      <span className="mr-1.5 text-[10px] font-black text-white/30">
                                        #
                                        {
                                          koQualifiers.find((entry) => entry.team.id === b?.id)
                                            ?.seed
                                        }
                                      </span>
                                      {b?.name}
                                    </span>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="mt-3 text-xs font-bold text-red-400/80">
                          {koModeChoice === "reseed"
                            ? "Ohne Freilose geht das nur mit 2, 4, 8, 16 oder 32 Teams. Wähle eine passende Anzahl oder den Modus mit Freilos."
                            : `Wähle eine gerade Teamzahl zwischen ${MIN_KO_TEAMS} und ${MAX_KO_TEAMS}, damit links und rechts im Baum gleich viele Teams stehen.`}
                        </div>
                      )}
                    </div>

                    {koError && (
                      <div className="mt-4 text-xs font-bold text-red-400/80">{koError}</div>
                    )}

                    <button
                      type="button"
                      onClick={handleStartKo}
                      disabled={startingKo || !koTeamCountValid}
                      className="mt-5 w-full rounded-full bg-yellow-400 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_25px_rgba(250,204,21,0.18)] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto md:px-8"
                    >
                      {startingKo ? "Startet …" : "K.-o.-Phase starten"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm font-bold text-white/40">
                Die K.-o.-Phase wurde noch nicht gestartet.
              </div>
            )}
          </div>
        )}

        {/* TEAMS */}

        {tab === "teams" && (
          <div className="mt-6 space-y-6">
            {isOwner && inviteUrl && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                  Spieler einladen
                </div>

                <p className="mt-2 text-sm text-white/50">
                  Jeder Spieler öffnet den Link, meldet sich an und wählt sein Team. Damit verknüpft
                  er sein eigenes Profil mit dem Teamnamen und kann das Turnier in Pong Stats
                  verfolgen. Ergebnisse trägst weiterhin du ein.
                </p>

                <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={inviteUrl}
                        onFocus={(event) => event.currentTarget.select()}
                        aria-label="Beitritts-Link"
                        className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs font-bold text-white/70 focus:border-yellow-400/40 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={handleCopyInvite}
                        className="shrink-0 rounded-full bg-yellow-400 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-yellow-300"
                      >
                        {copied ? "Kopiert" : "Kopieren"}
                      </button>
                    </div>

                    {!myTeamId && (
                      <Link
                        href={`/turniere/beitreten/${tournament.joinCode}`}
                        className="mt-3 inline-block text-xs font-bold text-yellow-400/80 transition hover:text-yellow-400"
                      >
                        Selbst mitspielen? Mich mit einem Team verknüpfen →
                      </Link>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-center gap-2 self-center">
                    <div className="rounded-xl bg-white p-3">
                      <QRCodeSVG value={inviteUrl} size={132} />
                    </div>

                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                      Mit dem Handy scannen
                    </div>
                  </div>
                </div>
              </div>
            )}

            {memberError && <div className="text-xs font-bold text-red-400/80">{memberError}</div>}

            {groupLabels.map((groupLabel) => (
              <div key={groupLabel}>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                  Gruppe {groupLabel}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {teams
                    .filter((team) => team.groupLabel === groupLabel)
                    .map((team) => {
                      const teamMembers = members.filter((member) => member.teamId === team.id);
                      const isMine = team.id === myTeamId;

                      return (
                        <div
                          key={team.id}
                          className={`rounded-2xl border p-4 ${
                            isMine
                              ? "border-yellow-400/40 bg-yellow-400/[0.05]"
                              : "border-white/10 bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 truncate text-sm font-black text-white">
                              {team.name}
                            </div>

                            <div className="shrink-0 text-[9px] font-black uppercase tracking-wider text-white/30">
                              {teamMembers.length}/{MAX_TEAM_SIZE}
                            </div>
                          </div>

                          {teamMembers.length === 0 ? (
                            <div className="mt-3 text-xs font-bold text-white/25">
                              Noch kein Spieler verknüpft
                            </div>
                          ) : (
                            <ul className="mt-3 space-y-1.5">
                              {teamMembers.map((member) => (
                                <li
                                  key={member.playerId}
                                  className="flex items-center justify-between gap-3 text-sm font-bold text-white/70"
                                >
                                  <span className="min-w-0 truncate">
                                    {member.name}
                                    {member.playerId === myPlayerId && (
                                      <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-yellow-400">
                                        Du
                                      </span>
                                    )}
                                  </span>

                                  {isOwner &&
                                    member.playerId !== myPlayerId &&
                                    (confirmRemoveId === member.playerId ? (
                                      <span className="flex shrink-0 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveMember(member.playerId)}
                                          disabled={memberBusy}
                                          className="rounded-full bg-red-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-black transition hover:bg-red-300 disabled:opacity-60"
                                        >
                                          Entfernen
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setConfirmRemoveId(null)}
                                          disabled={memberBusy}
                                          className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/40 transition hover:text-white disabled:opacity-60"
                                        >
                                          Nein
                                        </button>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmRemoveId(member.playerId)}
                                        aria-label={`${member.name} aus dem Turnier entfernen`}
                                        className="shrink-0 rounded-full border border-white/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/30 transition hover:border-red-400/30 hover:text-red-400"
                                      >
                                        Entfernen
                                      </button>
                                    ))}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}

            {myTeamId && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Deine Verknüpfung
                </div>

                <p className="mt-2 text-sm text-white/50">
                  Dein Profil ist mit {myTeam?.name ?? "deinem Team"} verknüpft.{" "}
                  {isOwner
                    ? "Du kannst die Verknüpfung lösen, das Turnier bleibt dir als Veranstalter erhalten."
                    : "Wenn du sie löst, siehst du das Turnier nicht mehr, bis du dem Link erneut folgst."}
                </p>

                {confirmingLeave ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleLeave}
                      disabled={memberBusy}
                      className="rounded-full bg-red-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {memberBusy ? "Löst …" : "Ja, Verknüpfung lösen"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmingLeave(false)}
                      disabled={memberBusy}
                      className="rounded-full border border-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-wider text-white/40 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingLeave(true)}
                    className="mt-4 rounded-full border border-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-wider text-white/40 transition hover:border-red-400/30 hover:text-red-400"
                  >
                    Verknüpfung lösen
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* VERWALTUNG */}

        {tab === "verwaltung" && isOwner && (
          <div className="mt-6 space-y-4">
            {koStarted && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  K.-o.-Phase
                </div>

                <p className="mt-2 text-sm text-white/50">
                  Setzt die K.-o.-Phase zurück und löscht alle K.-o.-Ergebnisse. Die Gruppenphase
                  bleibt unverändert, du kannst danach neu starten (zum Beispiel mit einer anderen
                  Teamzahl oder einem anderen Modus).
                </p>

                {koError && <div className="mt-3 text-xs font-bold text-red-400/80">{koError}</div>}

                {confirmingKoReset ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleResetKo}
                      disabled={resettingKo}
                      className="rounded-full bg-red-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {resettingKo ? "Setzt zurück …" : "Ja, zurücksetzen"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmingKoReset(false)}
                      disabled={resettingKo}
                      className="rounded-full border border-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-wider text-white/40 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingKoReset(true)}
                    className="mt-4 rounded-full border border-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-wider text-white/40 transition hover:border-red-400/30 hover:text-red-400"
                  >
                    K.-o.-Phase zurücksetzen
                  </button>
                )}
              </div>
            )}

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

/*
|--------------------------------------------------------------------------
| SPIEL-ZEILE NUR ZUM ANSEHEN (FÜR VERKNÜPFTE SPIELER)
|--------------------------------------------------------------------------
*/

function MatchRowReadOnly({
  match,
  teamAName,
  teamBName,
  highlight,
}: {
  match: TournamentMatch;
  teamAName: string;
  teamBName: string;
  highlight: boolean;
}) {
  const finished =
    match.status === "finished" && match.teamAScore !== null && match.teamBScore !== null;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-4 ${
        highlight ? "border-yellow-400/40 bg-yellow-400/[0.05]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="min-w-0 flex-1 truncate text-sm font-bold text-white">{teamAName}</div>

      <div
        className={`shrink-0 rounded-lg px-3 py-1.5 text-center text-sm font-black ${
          finished ? "bg-white/[0.06] text-white" : "text-white/25"
        }`}
      >
        {finished ? `${match.teamAScore} : ${match.teamBScore}` : "– : –"}
      </div>

      <div className="min-w-0 flex-1 truncate text-right text-sm font-bold text-white">
        {teamBName}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| K.-O.-SPIELKARTE
|--------------------------------------------------------------------------
|
| Zwei Zeilen (Team A und Team B) mit Setzplatz und Ergebnis. Der
| Veranstalter trägt das Ergebnis ein, alle anderen sehen es nur. Ein
| Freilos wird als solches angezeigt. Ein Unentschieden gibt es nicht.
|
*/

function KoMatchCard({
  match,
  teamById,
  isOwner,
  editable,
  myTeamId,
  onSave,
}: {
  match: KoMatch;
  teamById: (id: string) => TournamentTeam | undefined;
  isOwner: boolean;
  editable: boolean;
  myTeamId: string | null;
  onSave: (matchId: string, teamAScore: number, teamBScore: number) => Promise<void>;
}) {
  const teamA = match.teamAId ? teamById(match.teamAId) : undefined;
  const teamB = match.teamBId ? teamById(match.teamBId) : undefined;

  const [scoreA, setScoreA] = useState(match.teamAScore?.toString() ?? "");
  const [scoreB, setScoreB] = useState(match.teamBScore?.toString() ?? "");
  const [editing, setEditing] = useState(match.status !== "finished");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const winnerId = koWinnerId(match);
  const isBye = match.status === "bye";
  const ready = Boolean(teamA && teamB);
  const mine = Boolean(myTeamId && (match.teamAId === myTeamId || match.teamBId === myTeamId));
  const showInputs = isOwner && ready && !isBye && editing;

  const handleSave = async () => {
    const a = Number(scoreA);
    const b = Number(scoreB);

    if (scoreA.trim() === "" || scoreB.trim() === "" || Number.isNaN(a) || Number.isNaN(b)) {
      return;
    }

    if (a === b) {
      setError("Unentschieden ist im K.-o. nicht möglich.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(match.id, a, b);
      setEditing(false);
    } catch (err) {
      console.error("Fehler beim Speichern des K.-o.-Ergebnisses:", err);
      setError("Konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  const row = (team: TournamentTeam | undefined, isA: boolean) => {
    const isWinner = Boolean(team && winnerId === team.id);
    const score = isA ? match.teamAScore : match.teamBScore;

    return (
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-[10px] font-black text-white/30">
          {team?.koSeed ? `#${team.koSeed}` : ""}
        </span>

        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            team
              ? isWinner
                ? "font-black text-white"
                : winnerId
                  ? "font-bold text-white/40"
                  : "font-bold text-white"
              : "font-bold text-white/20"
          }`}
        >
          {team ? team.name : isBye ? "–" : "Offen"}
        </span>

        {showInputs ? (
          <input
            type="number"
            min={0}
            value={isA ? scoreA : scoreB}
            onChange={(event) =>
              isA ? setScoreA(event.target.value) : setScoreB(event.target.value)
            }
            aria-label={`Treffer ${team?.name ?? ""}`}
            className="w-14 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-center text-sm font-black text-white focus:border-yellow-400/40 focus:outline-none"
          />
        ) : (
          <span
            className={`w-8 shrink-0 text-center text-sm font-black ${
              isWinner ? "text-yellow-400" : "text-white/40"
            }`}
          >
            {match.status === "finished" && score !== null ? score : ""}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      <div
        className={`rounded-2xl border p-3.5 ${
          mine ? "border-yellow-400/40 bg-yellow-400/[0.05]" : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <div className="space-y-2">
          {row(teamA, true)}
          {isBye ? (
            <div className="pl-8 text-[9px] font-black uppercase tracking-wider text-yellow-400/80">
              Freilos
            </div>
          ) : (
            row(teamB, false)
          )}
        </div>

        {isOwner && ready && !isBye && (
          <div className="mt-3 flex items-center justify-between gap-2">
            {showInputs ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-yellow-400 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Speichert …" : "Speichern"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setError(null);
                }}
                disabled={!editable}
                title={editable ? undefined : "In einer späteren Runde wurde schon gespielt."}
                className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/30 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-white/30"
              >
                Bearbeiten
              </button>
            )}

            {!showInputs && !editable && (
              <span className="text-[9px] font-bold text-white/25">Gesperrt</span>
            )}
          </div>
        )}

        {!ready && !isBye && (
          <div className="mt-2 text-[9px] font-bold uppercase tracking-wider text-white/25">
            Wartet auf die Vorrunde
          </div>
        )}
      </div>

      {error && <div className="mt-1.5 px-1 text-[10px] font-bold text-red-400/70">{error}</div>}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| K.-O.-ERGEBNIS-DIALOG
|--------------------------------------------------------------------------
|
| Öffnet sich, wenn der Veranstalter im Turnierbaum auf ein Spiel klickt.
| Ein Unentschieden gibt es im K.-o. nicht. Ist in einer späteren Runde
| schon gespielt worden, ist das Ergebnis gesperrt.
|
*/

function KoResultDialog({
  match,
  teamById,
  editable,
  onSave,
  onClose,
}: {
  match: KoMatch;
  teamById: (id: string) => TournamentTeam | undefined;
  editable: boolean;
  onSave: (matchId: string, teamAScore: number, teamBScore: number) => Promise<void>;
  onClose: () => void;
}) {
  const teamA = match.teamAId ? teamById(match.teamAId) : undefined;
  const teamB = match.teamBId ? teamById(match.teamBId) : undefined;

  const [scoreA, setScoreA] = useState(match.teamAScore?.toString() ?? "");
  const [scoreB, setScoreB] = useState(match.teamBScore?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    const a = Number(scoreA);
    const b = Number(scoreB);

    if (scoreA.trim() === "" || scoreB.trim() === "" || Number.isNaN(a) || Number.isNaN(b)) {
      setError("Trag für beide Teams die Treffer ein.");
      return;
    }

    if (a === b) {
      setError("Unentschieden ist im K.-o. nicht möglich.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(match.id, a, b);
      onClose();
    } catch (err) {
      console.error("Fehler beim Speichern des K.-o.-Ergebnisses:", err);
      setError("Konnte nicht gespeichert werden.");
      setSaving(false);
    }
  };

  const field = (
    team: TournamentTeam | undefined,
    value: string,
    setValue: (v: string) => void,
  ) => (
    <label className="flex items-center gap-3">
      <span className="min-w-0 flex-1 truncate text-sm font-black text-white">
        {team?.name ?? "Offen"}
      </span>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={!editable}
        aria-label={`Treffer ${team?.name ?? ""}`}
        className="w-16 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-2 text-center text-sm font-black text-white focus:border-yellow-400/40 focus:outline-none disabled:opacity-50"
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="K.-o.-Ergebnis eintragen"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b0f14] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
          Ergebnis eintragen
        </div>

        <div className="mt-4 space-y-3">
          {field(teamA, scoreA, setScoreA)}
          {field(teamB, scoreB, setScoreB)}
        </div>

        {!editable && (
          <div className="mt-4 text-xs font-bold text-white/40">
            Gesperrt: In einer späteren Runde wurde schon gespielt.
          </div>
        )}

        {error && <div className="mt-4 text-xs font-bold text-red-400/80">{error}</div>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/50 transition hover:text-white"
          >
            Schließen
          </button>

          {editable && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-yellow-400 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Speichert …" : "Speichern"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
