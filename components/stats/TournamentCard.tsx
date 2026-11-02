"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getMyTournamentSummaries } from "@/app/turniere/tournamentStorage";
import type {
  MatchResultLetter,
  MyKoStatus,
  MyTournamentSummary,
} from "@/app/turniere/tournamentLogic";

/*
 * --------------------------------------------------------------------------
 * | TURNIER-CARD (PONG LEAGUE IN PONG STATS)
 * --------------------------------------------------------------------------
 *
 * Zeigt jedes Turnier, in dem das eigene Profil über den Beitritts-Link mit
 * einem Team verknüpft ist: Platz in der Gruppe, Bilanz, Form, das nächste
 * Spiel und die Gruppentabelle. Die Ergebnisse trägt weiter der Veranstalter
 * in der Pong League ein; hier wird nur mitverfolgt.
 *
 * Ist man in keinem Turnier, rendert die Card nichts (auch keinen Abstand,
 * siehe "empty:hidden" am Container auf der Spielerseite).
 * --------------------------------------------------------------------------
 */

const OUTER = "rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7";
const INNER = "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5";

const MAX_VISIBLE = 3;

const FORM_CLASS: Record<MatchResultLetter, string> = {
  S: "bg-green-400/20 text-green-400",
  N: "bg-red-400/20 text-red-400",
  U: "bg-white/10 text-white/40",
};

const RESULT_TEXT: Record<MatchResultLetter, string> = {
  S: "Sieg",
  N: "Niederlage",
  U: "Unentschieden",
};

function FormBadges({ form }: { form: MatchResultLetter[] }) {
  if (form.length === 0) {
    return <span className="text-[10px] font-bold text-white/25">Noch keine Spiele</span>;
  }

  return (
    <div className="flex gap-1">
      {form.map((result, index) => (
        <span
          key={index}
          className={`flex h-5 w-5 items-center justify-center rounded-[5px] text-[9px] font-black ${FORM_CLASS[result]}`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

function KoBox({ ko }: { ko: MyKoStatus }) {
  if (ko.stage === "champion") {
    return (
      <div className="rounded-xl border border-yellow-400/50 bg-yellow-400/[0.1] px-3.5 py-3">
        <div className="text-[9px] font-black uppercase tracking-wider text-yellow-400">
          K.-o.-Phase
        </div>
        <div className="mt-1 text-sm font-black text-yellow-300">Turniersieger!</div>
        <div className="mt-0.5 text-[11px] font-semibold text-white/45">
          Dein Team hat das Finale gewonnen.
        </div>
      </div>
    );
  }

  if (ko.stage === "next") {
    return (
      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] px-3.5 py-3">
        <div className="text-[9px] font-black uppercase tracking-wider text-yellow-400">
          K.-o. · {ko.roundLabel}
        </div>
        <div className="mt-1 truncate text-sm font-black text-white">
          gegen {ko.opponent?.name ?? "?"}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold text-white/35">
          Gesetzt auf Platz {ko.seed}
        </div>
      </div>
    );
  }

  if (ko.stage === "waiting") {
    return (
      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] px-3.5 py-3">
        <div className="text-[9px] font-black uppercase tracking-wider text-yellow-400">
          K.-o.-Phase
        </div>
        <div className="mt-1 text-sm font-black text-white">Du bist weiter</div>
        <div className="mt-0.5 text-[11px] font-semibold text-white/35">
          Nächste Runde: {ko.roundLabel}. Der Gegner steht noch nicht fest.
        </div>
      </div>
    );
  }

  if (ko.stage === "eliminated") {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
        <div className="text-[9px] font-black uppercase tracking-wider text-white/35">
          K.-o.-Phase
        </div>
        <div className="mt-1 text-sm font-black text-white">Ausgeschieden im {ko.roundLabel}</div>
        {ko.lostScore && (
          <div className="mt-0.5 truncate text-[11px] font-semibold text-white/40">
            {ko.lostScore.own}:{ko.lostScore.opponent} gegen {ko.opponent?.name ?? "?"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-xs font-bold text-white/50">
      Dein Team ist nicht für die K.-o.-Phase qualifiziert.
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
      <div className="text-[9px] font-black uppercase tracking-wider text-white/35">{label}</div>
      <div className="mt-1 text-lg font-black leading-none tracking-tight text-white">{value}</div>
    </div>
  );
}

function TournamentEntry({ summary }: { summary: MyTournamentSummary }) {
  const { tournament, team, groupStandings, standing, rank, nextMatch, lastMatch } = summary;

  const allPlayed = summary.totalMatches > 0 && summary.openMatches === 0;
  const groupSize = groupStandings.length;

  return (
    <div className={INNER}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/turniere/${tournament.id}`}
            className="block truncate text-base font-black tracking-tight text-white transition hover:text-yellow-400"
          >
            {tournament.name}
          </Link>

          <div className="mt-0.5 text-xs font-semibold text-white/40">
            Du spielst für <span className="font-black text-white/70">{team.name}</span> · Gruppe{" "}
            {summary.groupLabel}
          </div>
        </div>

        {summary.ko?.stage === "champion" ? (
          <span className="shrink-0 rounded-full border border-yellow-400/60 bg-yellow-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-300">
            Turniersieger
          </span>
        ) : (
          rank !== null && (
            <span className="shrink-0 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-400">
              {allPlayed ? "Endstand" : "Aktuell"} Platz {rank} von {groupSize}
            </span>
          )
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* BILANZ + SPIELE */}
        <div>
          {standing && (
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Spiele" value={String(standing.played)} />
              <Tile label="Bilanz" value={`${standing.wins}-${standing.losses}`} />
              <Tile label="Punkte" value={String(standing.points)} />
            </div>
          )}

          {standing && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/35">
                Form
              </span>
              <FormBadges form={standing.form} />
            </div>
          )}

          <div className="mt-4 space-y-2">
            {summary.ko ? (
              <KoBox ko={summary.ko} />
            ) : nextMatch ? (
              <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] px-3.5 py-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-yellow-400">
                  Nächstes Spiel
                </div>
                <div className="mt-1 truncate text-sm font-black text-white">
                  gegen {nextMatch.opponent.name}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-white/35">
                  {summary.openMatches === 1
                    ? "Das letzte offene Spiel in der Gruppe"
                    : `Noch ${summary.openMatches} Spiele offen`}
                </div>
              </div>
            ) : summary.totalMatches > 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-xs font-bold text-white/50">
                Alle Gruppenspiele sind gespielt.
              </div>
            ) : null}

            {lastMatch && lastMatch.ownScore !== null && lastMatch.opponentScore !== null && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-white/35">
                  Letztes Spiel
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm font-black text-white">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${FORM_CLASS[lastMatch.result]}`}
                  >
                    {RESULT_TEXT[lastMatch.result]}
                  </span>
                  <span>
                    {lastMatch.ownScore}:{lastMatch.opponentScore}
                  </span>
                  <span className="min-w-0 truncate font-bold text-white/50">
                    gegen {lastMatch.opponent.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GRUPPENTABELLE */}
        <div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-wider text-white/30">
                <th className="w-6 pb-2">#</th>
                <th className="pb-2">Team</th>
                <th className="pb-2 text-center" title="Spiele">
                  Sp
                </th>
                <th className="pb-2 text-center" title="Trefferverhältnis (erzielt:kassiert)">
                  Treffer
                </th>
                <th className="pb-2 text-right" title="Punkte">
                  Pkt
                </th>
              </tr>
            </thead>

            <tbody>
              {groupStandings.map((row, index) => {
                const isOwn = row.team.id === team.id;

                return (
                  <tr
                    key={row.team.id}
                    className={`border-t border-white/[0.06] ${isOwn ? "bg-yellow-400/[0.07]" : ""}`}
                  >
                    <td className="py-2 pl-1 text-xs font-black text-white/40">{index + 1}</td>
                    <td
                      className={`max-w-[9rem] truncate py-2 pr-2 text-sm font-bold ${
                        isOwn ? "text-yellow-400" : "text-white"
                      }`}
                    >
                      {row.team.name}
                    </td>
                    <td className="py-2 text-center text-sm text-white/50">{row.played}</td>
                    <td className="py-2 text-center text-sm whitespace-nowrap text-white/50">
                      {row.scoredTotal}:{row.concededTotal}
                    </td>
                    <td className="py-2 pr-1 text-right text-sm font-black text-yellow-400">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Link
            href={`/turniere/${tournament.id}`}
            className="mt-3 inline-block text-xs font-black text-yellow-400/80 transition hover:text-yellow-400"
          >
            Turnier in der Pong League öffnen →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TournamentCard() {
  const [summaries, setSummaries] = useState<MyTournamentSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMyTournamentSummaries()
      .then((result) => {
        if (!cancelled) {
          setSummaries(result);
        }
      })
      .catch((err) => {
        /*
         * Bewusst still: Die Card ist eine Zugabe. Fehlt z. B. noch das SQL
         * (league-link.sql), soll die Spielerseite nicht darunter leiden.
         */
        console.error("Fehler beim Laden der Turniere:", err);

        if (!cancelled) {
          setSummaries([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!summaries || summaries.length === 0) {
    return null;
  }

  const visible = summaries.slice(0, MAX_VISIBLE);
  const hidden = summaries.length - visible.length;

  return (
    <div className={OUTER}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-6 w-1 shrink-0 rounded-full bg-yellow-400" />

        <div>
          <div className="text-lg font-black tracking-tight text-white">
            {summaries.length === 1 ? "Dein Turnier" : "Deine Turniere"}
          </div>
          <div className="mt-0.5 text-xs font-semibold text-white/40">
            Aus der Pong League: Tabelle, Form und dein nächstes Spiel.
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {visible.map((summary) => (
          <TournamentEntry key={summary.tournament.id} summary={summary} />
        ))}
      </div>

      {hidden > 0 && (
        <Link
          href="/turniere"
          className="mt-4 inline-block text-xs font-black text-yellow-400/80 transition hover:text-yellow-400"
        >
          {hidden} weitere {hidden === 1 ? "Turnier" : "Turniere"} in der Pong League →
        </Link>
      )}
    </div>
  );
}
