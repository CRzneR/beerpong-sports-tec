"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createTournament } from "../tournamentStorage";
import { shuffleArray } from "../tournamentLogic";
import { createClient } from "@/lib/supabase/client";

const MIN_TEAMS = 2;
const MAX_TEAMS = 64;

export default function NeuesTurnierPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");

  /*
   * Die Zahlenfelder halten den getippten TEXT. Würde man bei jedem
   * Tastendruck direkt auf eine Zahl (mit Mindestwert) zurückrechnen,
   * ließe sich die letzte Ziffer nicht löschen: leer wird sofort wieder
   * zu 2 bzw. 1. Korrigiert wird erst beim Verlassen des Feldes (onBlur).
   */
  const [teamCountText, setTeamCountText] = useState("8");
  const [groupCountText, setGroupCountText] = useState("2");

  const teamCount = Number.parseInt(teamCountText, 10) || 0;
  const groupCount = Number.parseInt(groupCountText, 10) || 0;

  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) {
        return;
      }

      if (!data.user) {
        router.replace("/login?next=/turniere/neu");
        return;
      }

      setCheckingAuth(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const step1Valid =
    name.trim().length > 0 &&
    teamCount >= MIN_TEAMS &&
    teamCount <= MAX_TEAMS &&
    groupCount >= 1 &&
    groupCount <= teamCount;

  const handleTeamCountBlur = () => {
    const clamped = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, teamCount || MIN_TEAMS));

    setTeamCountText(String(clamped));

    /* Gruppen dürfen nie mehr sein als Teams. */
    if (groupCount > clamped) {
      setGroupCountText(String(clamped));
    }
  };

  const handleGroupCountBlur = () => {
    const upper = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, teamCount || MIN_TEAMS));

    setGroupCountText(String(Math.min(upper, Math.max(1, groupCount || 1))));
  };

  const handleContinue = () => {
    if (!step1Valid) {
      return;
    }

    /*
     * Bereits eingegebene Namen (falls man zurückgegangen ist) bleiben
     * erhalten, wird die Teamanzahl kleiner/größer wird entsprechend
     * gekürzt/aufgefüllt.
     */
    setTeamNames((current) =>
      Array.from({ length: teamCount }, (_, index) => current[index] ?? ""),
    );

    setStep(2);
  };

  const handleTeamNameChange = (index: number, value: string) => {
    setTeamNames((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const allTeamNamesFilled =
    teamNames.length === teamCount && teamNames.every((teamName) => teamName.trim().length > 0);

  const handleCreate = async () => {
    if (!allTeamNamesFilled || creating) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const tournament = await createTournament(
        name.trim(),
        teamNames.map((teamName) => teamName.trim()),
        groupCount,
      );

      router.push(`/turniere/${tournament.id}`);
    } catch (err) {
      console.error("Fehler beim Erstellen des Turniers:", err);
      setError("Turnier konnte nicht erstellt werden.");
      setCreating(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white">
        <div className="mx-auto max-w-2xl text-sm font-bold text-white/40">Lade …</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
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

        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">Neues Turnier</h1>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80">
            {error}
          </div>
        )}

        {step === 1 ? (
          <div className="mt-8 space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">
                Turniername
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Spring Championship"
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-yellow-400/40 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40">
                  Anzahl Teams
                </label>

                <input
                  type="number"
                  min={MIN_TEAMS}
                  max={MAX_TEAMS}
                  value={teamCountText}
                  onChange={(event) => setTeamCountText(event.target.value)}
                  onBlur={handleTeamCountBlur}
                  className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white focus:border-yellow-400/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40">
                  Anzahl Gruppen
                </label>

                <input
                  type="number"
                  min={1}
                  max={Math.max(teamCount, 1)}
                  value={groupCountText}
                  onChange={(event) => setGroupCountText(event.target.value)}
                  onBlur={handleGroupCountBlur}
                  className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white focus:border-yellow-400/40 focus:outline-none"
                />
              </div>
            </div>

            <p className="text-xs text-white/30">
              Die Teams werden gleichmäßig auf die Gruppen verteilt (z. B. bei 8 Teams / 2 Gruppen:
              4 Teams pro Gruppe). Innerhalb einer Gruppe spielt jeder einmal gegen jeden.
            </p>

            <button
              type="button"
              onClick={handleContinue}
              disabled={!step1Valid}
              className="w-full rounded-full bg-yellow-400 px-6 py-4 text-sm font-black uppercase tracking-wider text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-white/20"
            >
              Weiter zu Team-Namen
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/40">
                Team-Namen ({teamCount} Teams)
              </div>

              <button
                type="button"
                onClick={() => setTeamNames((current) => shuffleArray(current))}
                className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/40 transition hover:border-yellow-400/30 hover:text-yellow-400"
              >
                🔀 Mischen
              </button>
            </div>

            <div className="space-y-2">
              {teamNames.map((teamName, index) => (
                <input
                  key={index}
                  type="text"
                  value={teamName}
                  onChange={(event) => handleTeamNameChange(index, event.target.value)}
                  placeholder={`Team ${index + 1}`}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-yellow-400/40 focus:outline-none"
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={creating}
                className="rounded-full border border-white/[0.08] bg-white/[0.025] px-6 py-4 text-sm font-black uppercase tracking-wider text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Zurück
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!allTeamNamesFilled || creating}
                className="flex-1 rounded-full bg-yellow-400 px-6 py-4 text-sm font-black uppercase tracking-wider text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-white/20"
              >
                {creating ? "Erstelle Turnier …" : "Turnier erstellen"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
