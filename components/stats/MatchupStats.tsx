"use client";

import { useEffect, useState, type ReactNode } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import {
  getPlayerMatchupStats,
  type MatchupRecord,
  type PlayerMatchupStats,
  type StatsRange,
} from "@/app/spieler/match/playerStats";
import { PanelModal, PanelTitle } from "@/components/stats/PanelCard";

/*
 * --------------------------------------------------------------------------
 * | BILANZ GEGEN GEGNER + PARTNER-BILANZ
 * --------------------------------------------------------------------------
 *
 * Zwei Karten nebeneinander (mobil untereinander), geladen mit EINEM
 * Aufruf von getPlayerMatchupStats:
 *  - Gegner-Bilanz: Siege/Niederlagen gegen jeden einzelnen Mitspieler
 *  - Partner-Bilanz: dasselbe für Mitspieler im eigenen Team (2 gegen 2)
 *
 * Abzeichen ("Lieblingsgegner", "Angstgegner", "Bestes Team") gibt es erst
 * ab MIN_MATCHES gemeinsamen Matches, damit ein einzelnes Match nicht
 * gleich zum Lieblings- oder Angstgegner macht.
 * --------------------------------------------------------------------------
 */

const PREVIEW_COUNT = 5;
const MIN_MATCHES = 3;

type Badge = { label: string; className: string };

const BADGE_GOOD: Omit<Badge, "label"> = {
  className: "border-green-400/30 bg-green-400/10 text-green-300",
};
const BADGE_BAD: Omit<Badge, "label"> = {
  className: "border-red-400/30 bg-red-400/10 text-red-300",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Beste und schlechteste Bilanz unter allen mit genug gemeinsamen Matches. */
function pickExtremes(records: MatchupRecord[]): { best: string | null; worst: string | null } {
  const eligible = records.filter((record) => record.matches >= MIN_MATCHES);

  const rank = (a: MatchupRecord, b: MatchupRecord) =>
    b.winRate - a.winRate || b.matches - a.matches;

  const sorted = [...eligible].sort(rank);

  const best = sorted[0] && sorted[0].winRate > 50 ? sorted[0].playerId : null;
  const worst =
    sorted.length > 0 && sorted[sorted.length - 1].winRate < 50
      ? sorted[sorted.length - 1].playerId
      : null;

  return { best, worst };
}

function RecordRow({ record, badge }: { record: MatchupRecord; badge: Badge | null }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[11px] font-black text-white/60">
        {initialsOf(record.name)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-white">{record.name}</span>

          {badge && (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>

        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-cyan-400"
            style={{ width: `${record.winRate}%` }}
          />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-sm font-black text-white">
          {record.wins} S · {record.losses} N
        </div>
        <div className="mt-0.5 text-[11px] font-semibold text-white/35">{record.winRate} %</div>
      </div>
    </div>
  );
}

function RecordCard({
  title,
  records,
  emptyText,
  badgeFor,
  loading,
  message,
}: {
  title: string;
  records: MatchupRecord[];
  emptyText: string;
  badgeFor: (record: MatchupRecord) => Badge | null;
  loading: boolean;
  message: string | null;
}) {
  const [showAll, setShowAll] = useState(false);

  let body: ReactNode;

  if (loading) {
    body = <div className="py-10 text-center text-sm font-bold text-white/40">Lade …</div>;
  } else if (message) {
    body = <div className="py-10 text-center text-sm font-bold text-white/50">{message}</div>;
  } else if (records.length === 0) {
    body = <div className="py-10 text-center text-sm font-bold text-white/40">{emptyText}</div>;
  } else {
    body = (
      <div className="divide-y divide-white/[0.05]">
        {records.slice(0, PREVIEW_COUNT).map((record) => (
          <RecordRow key={record.playerId} record={record} badge={badgeFor(record)} />
        ))}
      </div>
    );
  }

  return (
    <>
      <section className="flex h-full flex-col rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
        <PanelTitle
          action={
            records.length > PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="shrink-0 text-xs font-bold text-cyan-300 transition hover:text-cyan-200"
              >
                Alle anzeigen
              </button>
            ) : null
          }
        >
          {title}
        </PanelTitle>

        <div className="mt-4">{body}</div>
      </section>

      {showAll && (
        <PanelModal title={`${title} · ${records.length}`} onClose={() => setShowAll(false)}>
          <div className="divide-y divide-white/[0.05]">
            {records.map((record) => (
              <RecordRow key={record.playerId} record={record} badge={badgeFor(record)} />
            ))}
          </div>
        </PanelModal>
      )}
    </>
  );
}

export function MatchupStats({ range = "all" }: { range?: StatsRange }) {
  const [data, setData] = useState<PlayerMatchupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await getOwnProfile();

        if (!profile) {
          if (!cancelled) {
            setLoggedIn(false);
          }

          return;
        }

        const result = await getPlayerMatchupStats(profile.id, range);

        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Bilanzen:", err);

        if (!cancelled) {
          setError("Bilanzen konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const message = !loggedIn ? "Melde dich an, um deine Bilanzen zu sehen." : error;

  const opponentExtremes = pickExtremes(data?.opponents ?? []);
  const partnerExtremes = pickExtremes(data?.partners ?? []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RecordCard
        title="Bilanz gegen Gegner"
        records={data?.opponents ?? []}
        emptyText="Noch keine Matches gegen andere Spieler."
        loading={loading}
        message={message}
        badgeFor={(record) =>
          record.playerId === opponentExtremes.best
            ? { label: "Lieblingsgegner", ...BADGE_GOOD }
            : record.playerId === opponentExtremes.worst
              ? { label: "Angstgegner", ...BADGE_BAD }
              : null
        }
      />

      <RecordCard
        title="Partner-Bilanz"
        records={data?.partners ?? []}
        emptyText="Noch keine Matches im Team (2 gegen 2)."
        loading={loading}
        message={message}
        badgeFor={(record) =>
          record.playerId === partnerExtremes.best ? { label: "Bestes Team", ...BADGE_GOOD } : null
        }
      />
    </div>
  );
}
