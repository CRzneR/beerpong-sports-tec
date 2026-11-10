"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { deleteTournament, getTournamentProgress, getTournaments } from "./tournamentStorage";
import type { TournamentProgress } from "./tournamentStorage";
import type { Tournament } from "./tournamentLogic";
import { createClient } from "@/lib/supabase/client";
import { UsernameGate } from "@/components/stats/UsernameGate";
import { DeleteAccountSection } from "@/components/stats/DeleteAccountSection";
import { CardSwoosh, LeagueBanner, TrophyArt } from "@/components/league/LeagueArt";
import { StatusBadge } from "@/components/league/LeagueBits";
import { useTranslations } from "next-intl";

/*
|--------------------------------------------------------------------------
| PONG LEAGUE: TURNIER-ÜBERSICHT
|--------------------------------------------------------------------------
|
| Aufbau von oben nach unten:
|
|   1. Zurück / Abmelden
|   2. Seitenkopf mit Illustration
|   3. Kennzahlen (aktiv, geplant, abgeschlossen, Teams) + "Neues Turnier"
|   4. Filter (Alle / Aktiv / Geplant / Abgeschlossen) + Ansichtsumschalter
|   5. Turniere als Karten oder als Liste
|   6. Konto
|
| Die gewählte Ansicht (Karten/Liste) wird pro Gerät gemerkt.
|
*/

type StatusFilter = "all" | "active" | "setup" | "finished";
type ViewMode = "grid" | "list";

const VIEW_STORAGE_KEY = "pongLeague.overviewView";

export default function TurnierePage() {
  const t = useTranslations("League.ListPage");

  const router = useRouter();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [progress, setProgress] = useState<Record<string, TournamentProgress> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");

  /* Gemerkte Ansicht erst nach dem Mounten lesen (kein Hydration-Unterschied). */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);

      if (stored === "grid" || stored === "list") {
        setView(stored);
      }
    } catch {
      /* Speicher gesperrt: bei der Standardansicht bleiben. */
    }
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);

    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* Nicht schlimm, die Ansicht gilt dann nur für diesen Besuch. */
    }
  };

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
          if (cancelled) {
            return;
          }

          setTournaments(result);

          /*
           * Der Spielfortschritt lädt getrennt nach: Die Karten erscheinen sofort,
           * die Fortschrittsbalken füllen sich, sobald die Zahlen da sind. Schlägt
           * das fehl, bleibt die Liste trotzdem benutzbar.
           */
          getTournamentProgress(result.map((tournament) => tournament.id))
            .then((counts) => {
              if (!cancelled) {
                setProgress(counts);
              }
            })
            .catch((err) => console.error("Fehler beim Laden des Turnierfortschritts:", err));
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

  /* Kennzahlen und Filterzähler */
  const activeCount = tournaments.filter((tournament) => tournament.status === "active").length;
  const plannedCount = tournaments.filter((tournament) => tournament.status === "setup").length;
  const finishedCount = tournaments.filter((tournament) => tournament.status === "finished").length;
  const teamTotal = tournaments.reduce((sum, tournament) => sum + tournament.teamCount, 0);

  const visible =
    filter === "all" ? tournaments : tournaments.filter((tournament) => tournament.status === filter);

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: t("filterAll"), count: tournaments.length },
    { key: "active", label: t("filterActive"), count: activeCount },
    { key: "setup", label: t("filterPlanned"), count: plannedCount },
    { key: "finished", label: t("filterFinished"), count: finishedCount },
  ];

  const stats: { key: string; icon: LucideIcon; value: number; label: string }[] = [
    { key: "active", icon: Trophy, value: activeCount, label: t("statActive", { count: activeCount }) },
    { key: "planned", icon: CalendarDays, value: plannedCount, label: t("statPlanned", { count: plannedCount }) },
    { key: "finished", icon: CircleCheck, value: finishedCount, label: t("statFinished", { count: finishedCount }) },
    { key: "teams", icon: Users, value: teamTotal, label: t("statTeams", { count: teamTotal }) },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090d] text-white">
      <UsernameGate variant="league" />

      <LeagueBanner />

      <div className="relative mx-auto max-w-[1464px] px-5 py-8 md:px-8 md:py-10">
        {/* 1. Zurück / Abmelden */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            <ArrowLeft
              size={16}
              strokeWidth={2}
              className="transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
            {t("zurueckZurStartseite")}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-semibold text-white/70 transition hover:text-white"
          >
            {t("abmelden")}
          </button>
        </div>

        {/* 2. Seitenkopf */}
        <header className="mt-12 md:mt-14">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400">
            {t("pongLeague")}
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{t("deineTurniere")}</h1>

          <p className="mt-3 max-w-xl text-base text-white/50 md:text-lg">{t("subtitle")}</p>
        </header>

        {/* 3. Kennzahlen + Neues Turnier */}
        <div className="mt-7 flex flex-col gap-3 md:mt-10 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:gap-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.key}
                icon={stat.icon}
                value={loading ? "–" : String(stat.value)}
                label={stat.label}
              />
            ))}
          </div>

          <Link
            href="/turniere/neu"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-yellow-400 px-6 py-2.5 text-sm font-black text-black shadow-[0_0_30px_rgba(250,204,21,0.25)] transition hover:bg-yellow-300 md:px-9 md:py-4 md:text-base md:shadow-[0_0_35px_rgba(250,204,21,0.28)]"
          >
            {t("neuesTurnier")}
          </Link>
        </div>

        {/* 4. Filter + Ansicht */}
        <div className="mt-6 flex items-center justify-between gap-3 md:mt-8 md:flex-wrap md:gap-4">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] md:flex-none md:flex-wrap md:gap-2.5 md:overflow-visible md:pr-0 md:[mask-image:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((item) => {
              const selected = filter === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(item.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition md:gap-2.5 md:px-5 md:py-2.5 md:text-sm ${
                    selected
                      ? "border-yellow-400 bg-yellow-400 text-black shadow-[0_0_24px_rgba(250,204,21,0.2)]"
                      : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {item.label}

                  <span
                    className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-black md:min-w-6 md:text-xs ${
                      selected ? "bg-black/15 text-black" : "bg-white/10 text-white/80"
                    }`}
                  >
                    {loading ? "–" : item.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 gap-1.5 md:gap-2">
            <ViewButton
              icon={LayoutGrid}
              label={t("viewGrid")}
              selected={view === "grid"}
              onClick={() => changeView("grid")}
            />

            <ViewButton
              icon={ListIcon}
              label={t("viewList")}
              selected={view === "list"}
              onClick={() => changeView("list")}
            />
          </div>
        </div>

        {/* 5. Turniere */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-4" role="status">
              <span className="sr-only">{t("ladeTurniere")}</span>

              <div className="h-44 animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.03]" />
              <div className="h-44 animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.02]" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] px-5 py-4 text-sm font-bold text-red-400/80">
              {error}
            </div>
          ) : tournaments.length === 0 ? (
            <EmptyState />
          ) : visible.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center text-sm font-bold text-white/40">
              {t("emptyFilter")}
            </div>
          ) : (
            <div
              className={
                view === "list"
                  ? "space-y-3"
                  : visible.length === 1
                    ? "grid gap-5"
                    : "grid gap-5 xl:grid-cols-2"
              }
            >
              {visible.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  isOwner={tournament.userId === userId}
                  progress={progress ? (progress[tournament.id] ?? null) : null}
                  progressLoading={progress === null}
                  view={view}
                  onDeleted={handleTournamentDeleted}
                />
              ))}
            </div>
          )}
        </div>

        {/* 6. Konto: dieselbe Löschfunktion wie auf der Spielerseite */}
        <div className="mt-14 md:mt-16">
          <DeleteAccountSection tournamentCount={ownedCount} variant="league" />
        </div>
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| KLEINE BAUSTEINE
|--------------------------------------------------------------------------
*/

function StatCard({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 md:gap-4 md:px-5 md:py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400 md:h-12 md:w-12">
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>

      <div className="min-w-0">
        <div className="text-xl font-black leading-none md:text-2xl">{value}</div>
        <div className="mt-1 text-[11px] leading-tight md:mt-1.5 md:text-xs text-white/50 md:text-[13px]">{label}</div>
      </div>
    </div>
  );
}

function ViewButton({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-9 w-10 items-center justify-center rounded-xl border transition md:h-11 md:w-12 ${
        selected
          ? "border-yellow-400 bg-yellow-400 text-black"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white"
      }`}
    >
      <Icon size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

function EmptyState() {
  const t = useTranslations("League.ListPage");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
      <TrophyArt className="mx-auto h-28 w-24" muted />

      <p className="mt-5 text-base font-bold text-white/55">{t("nochKeineTurniereLeg")}</p>

      <Link
        href="/turniere/neu"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-yellow-400 px-8 py-3.5 text-sm font-black text-black shadow-[0_0_30px_rgba(250,204,21,0.25)] transition hover:bg-yellow-300"
      >
        {t("neuesTurnier")}
      </Link>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| FORTSCHRITT EINES TURNIERS
|--------------------------------------------------------------------------
|
| Abgeschlossen: 100 %. Läuft die K.-o.-Phase, zählt sie. Sonst die
| Gruppenphase.
|
*/

type ProgressInfo = {
  phase: "group" | "ko" | "done";
  done: number;
  total: number;
  percent: number;
};

function describeProgress(tournament: Tournament, progress: TournamentProgress | null): ProgressInfo | null {
  if (!progress) {
    return null;
  }

  if (tournament.status === "finished") {
    return { phase: "done", done: 0, total: 0, percent: 100 };
  }

  const inKo = tournament.koMode !== null && progress.koTotal > 0;
  const done = inKo ? progress.koDone : progress.groupDone;
  const total = inKo ? progress.koTotal : progress.groupTotal;

  return {
    phase: inKo ? "ko" : "group",
    done,
    total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

function ProgressBar({
  info,
  loading,
  label,
  compact = false,
}: {
  info: ProgressInfo | null;
  loading: boolean;
  label: string;
  compact?: boolean;
}) {
  const t = useTranslations("League.ListPage");

  if (!info) {
    /* Zahlen laden noch (oder konnten nicht geladen werden): ruhiger Platzhalter. */
    return (
      <div className={compact ? "" : "max-w-xl"}>
        <div className={`h-2 rounded-full bg-white/10 ${loading ? "animate-pulse" : ""}`} />
      </div>
    );
  }

  const text =
    info.phase === "done"
      ? t("phaseDone")
      : info.phase === "ko"
        ? t("phaseKo", { done: info.done, total: info.total })
        : t("phaseGroup", { done: info.done, total: info.total });

  return (
    <div className={compact ? "" : "max-w-xl"}>
      <div className="flex items-center justify-between gap-4 text-sm text-white/65">
        <span className="truncate">{text}</span>
        <span className="shrink-0 font-black text-white">{info.percent} %</span>
      </div>

      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={info.percent}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            info.phase === "done"
              ? "bg-emerald-400"
              : "bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.5)]"
          }`}
          style={{ width: `${info.percent}%` }}
        />
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TURNIER-KARTE MIT LÖSCH-FUNKTION
|--------------------------------------------------------------------------
|
| Die ganze Karte ist klickbar: ein unsichtbarer Link liegt über der Karte
| (z-10). Der Lösch-Bereich liegt bewusst NICHT im Link, sondern darüber
| (z-20), damit kein klickbares Element im anderen steckt.
|
| Gleicher Baustein für Karten- und Listenansicht, nur das Layout
| unterscheidet sich.
|
*/

function TournamentCard({
  tournament,
  isOwner,
  progress,
  progressLoading,
  view,
  onDeleted,
}: {
  tournament: Tournament;
  isOwner: boolean;
  progress: TournamentProgress | null;
  progressLoading: boolean;
  view: ViewMode;
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

  const isActive = tournament.status === "active";
  const info = describeProgress(tournament, progress);
  const list = view === "list";

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
      <Users size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{t("teamsGroups", { teamCount: tournament.teamCount, groupCount: tournament.groupCount })}</span>
    </div>
  );

  const badges = (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={tournament.status} />

      {!isOwner && (
        <span className="rounded-lg border border-yellow-400/30 bg-yellow-400/[0.06] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-yellow-400">
          {t("beigetreten")}
        </span>
      )}
    </div>
  );

  const deleteButton = isOwner && !confirming && (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={t("loeschen")}
      title={t("loeschen")}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:border-red-400/40 md:h-10 md:w-10 hover:bg-red-400/[0.06] hover:text-red-400"
    >
      <Trash2 size={17} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );

  const arrow = (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-2 transition group-hover:bg-yellow-400 group-hover:text-black ${
        list ? "h-9 w-9 md:h-10 md:w-10" : "h-10 w-10 md:h-12 md:w-12"
      } ${isActive ? "border-yellow-400 text-yellow-400" : "border-white/25 text-white/60 group-hover:border-yellow-400"}`}
      aria-hidden="true"
    >
      <ArrowRight size={list ? 18 : 22} strokeWidth={2.25} />
    </span>
  );

  return (
    <article
      className={`group relative overflow-hidden border transition ${
        list ? "rounded-2xl" : "rounded-3xl"
      } ${
        isActive
          ? "border-yellow-400/70 bg-gradient-to-br from-yellow-400/[0.08] via-[#0b0d12] to-[#0b0d12] shadow-[0_0_40px_rgba(250,204,21,0.1)]"
          : "border-white/10 bg-white/[0.025] hover:border-white/25"
      }`}
    >
      {isActive && !list && <CardSwoosh />}

      {/* Klickfläche über der ganzen Karte */}
      <Link
        href={{ pathname: "/turniere/[tournamentId]", params: { tournamentId: tournament.id } }}
        aria-label={t("openTournament", { name: tournament.name })}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
      />

      {list ? (
        <div className="relative flex items-center gap-4 px-4 py-3.5 md:gap-6 md:px-6">
          <TrophyArt className="h-12 w-10 shrink-0 md:h-14 md:w-12" muted={tournament.status === "setup"} />

          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-black md:text-lg">{tournament.name}</div>

            <div className="mt-1">{meta}</div>

            <div className="mt-3 md:hidden">
              <ProgressBar info={info} loading={progressLoading} label={t("progressLabel")} compact />
            </div>
          </div>

          <div className="hidden w-64 shrink-0 lg:block xl:w-80">
            <ProgressBar info={info} loading={progressLoading} label={t("progressLabel")} compact />
          </div>

          <div className="hidden w-52 shrink-0 justify-end sm:flex">{badges}</div>

          <div className="relative z-20 flex shrink-0 items-center gap-2.5">
            {deleteButton}
            {arrow}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-4 p-5 sm:gap-8 md:px-10 md:py-8">
          <TrophyArt className="h-24 w-[4.5rem] shrink-0 sm:h-36 sm:w-28 md:h-40 md:w-32" muted={tournament.status === "setup"} />

          <div className="min-w-0 flex-1">
            {badges}

            <h2 className="mt-3 break-words text-2xl font-black sm:truncate md:text-3xl">{tournament.name}</h2>

            <div className="mt-2">{meta}</div>

            <div className="mt-5">
              <ProgressBar info={info} loading={progressLoading} label={t("progressLabel")} />
            </div>
          </div>

          {/* Ab sm rechts neben dem Text */}
          <div className="relative z-20 hidden shrink-0 items-center gap-3 sm:flex">
            {deleteButton}
            {arrow}
          </div>
        </div>
      )}

      {/* Mobil: Aktionen in einer eigenen Zeile unter dem Text */}
      {!list && (
        <div className="relative z-20 flex items-center justify-end gap-3 px-5 pb-5 sm:hidden">
          {deleteButton}
          {arrow}
        </div>
      )}

      {/* Löschen bestätigen: eigene Leiste unten, immer klickbar */}
      {(confirming || error) && (
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-t border-red-400/20 bg-red-400/[0.05] px-5 py-3 md:px-8">
          <div className="min-w-0 text-sm font-bold text-red-300/90">
            {error ?? t("confirmDelete", { name: tournament.name })}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="rounded-full bg-red-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? t("loescht") : t("jaLoeschen")}
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={deleting}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wider text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("abbrechen")}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
