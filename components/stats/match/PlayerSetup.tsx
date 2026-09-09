"use client";

import { useEffect, useMemo, useState } from "react";

import { QRCodeSVG } from "qrcode.react";

import {
  createPlayerProfile,
  getAllPlayerProfiles,
  getOwnProfile,
  type PlayerProfile,
} from "@/app/spieler/match/playerProfiles";

import {
  getMatchLobby,
  joinMatchLobby,
  startMatchLobby,
  subscribeMatchLobby,
  type MatchLobby,
} from "@/app/spieler/match/matchLobby";

import type { MatchPlayer } from "@/components/stats/match/PlayerCard";

interface PlayerSetupProps {
  lobbyId: string;
  onStart: (players: MatchPlayer[]) => void;
}

export default function PlayerSetup({ lobbyId, onStart }: PlayerSetupProps) {
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [lobby, setLobby] = useState<MatchLobby | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  /*
   * BEITRITTS-LINK FÜR DEN QR-CODE
   *
   * window ist erst nach dem Mount im Browser verfügbar, deshalb per
   * useEffect setzen statt direkt beim ersten Render.
   */

  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/spieler/match/${lobbyId}`);
  }, [lobbyId]);

  /*
   * EIGENES PROFIL (falls eingeloggt)
   *
   * Wird als vollständiges Objekt (nicht nur die id) gehalten, weil
   * wir den Namen für den Doppel-Profil-Schutz in handleCreateAndJoin
   * brauchen (siehe dort) - nicht nur für die "(Du)"-Markierung.
   */

  const [ownProfile, setOwnProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    getOwnProfile()
      .then((profile) => {
        if (!cancelled) {
          setOwnProfile(profile);
        }
      })
      .catch((err) => {
        console.error("Fehler beim Laden des eigenen Profils:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * PROFILE + LOBBY LADEN
   */

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAllPlayerProfiles(), getMatchLobby(lobbyId)])
      .then(([profileResult, lobbyResult]) => {
        if (cancelled) {
          return;
        }

        setProfiles(profileResult);
        setLobby(lobbyResult);

        if (!lobbyResult) {
          setError("Match wurde nicht gefunden.");
        }
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Lobby:", err);

        if (!cancelled) {
          setError("Lobby konnte nicht geladen werden.");
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
  }, [lobbyId]);

  /*
   * LIVE-UPDATES DER LOBBY
   *
   * Sobald ein anderer Spieler beitritt oder das Match gestartet wird,
   * bekommen alle verbundenen Geräte die Änderung über Supabase
   * Realtime mit.
   */

  useEffect(() => {
    const unsubscribe = subscribeMatchLobby(lobbyId, (updated) => {
      setLobby(updated);
    });

    return unsubscribe;
  }, [lobbyId]);

  const teamA = useMemo(
    () => profiles.filter((profile) => lobby?.teamAPlayerIds.includes(profile.id)),
    [profiles, lobby],
  );

  const teamB = useMemo(
    () => profiles.filter((profile) => lobby?.teamBPlayerIds.includes(profile.id)),
    [profiles, lobby],
  );

  const available = useMemo(() => {
    const joinedIds = new Set([...(lobby?.teamAPlayerIds ?? []), ...(lobby?.teamBPlayerIds ?? [])]);

    return profiles.filter((profile) => !joinedIds.has(profile.id));
  }, [profiles, lobby]);

  /*
   * IST DAS EIGENE PROFIL SCHON IN DER LOBBY?
   *
   * Steuert die prominente "Das bist du"-Einladung unten: die soll
   * nur auftauchen, solange der eingeloggte Nutzer noch gar nicht
   * beigetreten ist.
   */

  const ownProfileJoined = useMemo(
    () =>
      Boolean(
        ownProfile &&
        (teamA.some((profile) => profile.id === ownProfile.id) ||
          teamB.some((profile) => profile.id === ownProfile.id)),
      ),
    [ownProfile, teamA, teamB],
  );

  /*
   * SOBALD status: "live" WIRD, INS MATCH WECHSELN
   *
   * Läuft auf JEDEM verbundenen Gerät unabhängig, da jedes Gerät seine
   * eigene Realtime-Subscription hat.
   */

  useEffect(() => {
    if (lobby?.status !== "live") {
      return;
    }

    const toMatchPlayer = (profile: PlayerProfile, team: "A" | "B"): MatchPlayer => ({
      id: profile.id,
      name: profile.name,
      initials: profile.initials,
      team,
      isGuest: false,
      throws: 0,
      hits: 0,
    });

    onStart([
      ...teamA.map((profile) => toMatchPlayer(profile, "A")),
      ...teamB.map((profile) => toMatchPlayer(profile, "B")),
    ]);
    // teamA/teamB bewusst nicht in den Deps: der Wechsel soll nur einmal
    // beim status-Wechsel ausgelöst werden, nicht bei jeder Team-Änderung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.status]);

  const handleJoin = async (playerId: string, team: "A" | "B") => {
    setBusyPlayerId(playerId);
    setError(null);

    try {
      const updated = await joinMatchLobby(lobbyId, playerId, team);
      setLobby(updated);
    } catch (err) {
      console.error("Fehler beim Beitreten:", err);
      setError("Beitreten fehlgeschlagen.");
    } finally {
      setBusyPlayerId(null);
    }
  };

  const handleCreateAndJoin = async (team: "A" | "B") => {
    const trimmed = newName.trim();

    if (!trimmed) {
      return;
    }

    setError(null);

    /*
     * SICHERHEITSNETZ GEGEN DOPPEL-PROFILE
     *
     * Tippt ein eingeloggter Nutzer hier versehentlich seinen eigenen
     * Namen erneut ein (statt sein Profil oben aus der Liste bzw. über
     * den "Das bist du"-Button zu wählen), würde createPlayerProfile()
     * ein ZWEITES, nicht mit user_id verknüpftes Profil anlegen. Dessen
     * Matches würden dann nie in der echten Statistik des Accounts
     * auftauchen. Bei einem Namens-Treffer (case-insensitive) wird
     * deshalb stattdessen das vorhandene eigene Profil verwendet.
     */

    if (ownProfile && trimmed.toLowerCase() === ownProfile.name.trim().toLowerCase()) {
      await handleJoin(ownProfile.id, team);
      setNewName("");
      return;
    }

    try {
      const profile = await createPlayerProfile(trimmed);

      setProfiles((current) => [...current, profile]);
      setNewName("");

      await handleJoin(profile.id, team);
    } catch (err) {
      console.error("Fehler beim Anlegen des Spielers:", err);
      setError("Spieler konnte nicht angelegt werden.");
    }
  };

  const handleStart = async () => {
    if (teamA.length === 0 || teamB.length === 0 || starting) {
      return;
    }

    setStarting(true);
    setError(null);

    try {
      await startMatchLobby(lobbyId);
      // Der Wechsel ins Match passiert über den Realtime-Listener oben,
      // sobald status auf "live" wechselt.
    } catch (err) {
      console.error("Fehler beim Starten des Matches:", err);
      setError("Match konnte nicht gestartet werden.");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-6 text-white">
        <div className="mx-auto max-w-3xl text-sm font-bold text-white/40">Lade Match …</div>
      </main>
    );
  }

  if (!lobby) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-6 text-white">
        <div className="mx-auto max-w-3xl text-sm font-bold text-red-400/70">
          {error ?? "Match wurde nicht gefunden."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
          Pong Stats
        </div>

        <h1 className="mt-1 text-lg font-black uppercase">Match-Lobby</h1>

        <p className="mt-2 text-xs text-white/35">
          Andere Spieler scannen den Code und wählen dann ihr Profil.
        </p>

        {/* DAS BIST DU - prominenter direkter Beitritt für das eigene, eingeloggte Profil */}

        {ownProfile && !ownProfileJoined && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
                Das bist du
              </div>
              <div className="mt-1 text-sm font-bold text-white">
                {ownProfile.name} ist noch nicht in der Lobby.
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busyPlayerId === ownProfile.id}
                onClick={() => handleJoin(ownProfile.id, "A")}
                className="rounded-xl border border-blue-400/20 bg-blue-400/[0.08] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-blue-400 transition hover:bg-blue-400/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Team A
              </button>

              <button
                type="button"
                disabled={busyPlayerId === ownProfile.id}
                onClick={() => handleJoin(ownProfile.id, "B")}
                className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Team B
              </button>
            </div>
          </div>
        )}

        {/* QR-CODE ZUM BEITRETEN */}
        {joinUrl && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={joinUrl} size={168} />
            </div>

            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
              Mit dem Handy scannen zum Beitreten
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80">
            {error}
          </div>
        )}

        {/* NEUEN SPIELER ANLEGEN UND BEITRETEN (Profil oder Gast) */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Dein Name (neues Profil oder Gast)"
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCreateAndJoin("A")}
              disabled={!newName.trim()}
              className="flex-1 rounded-xl border border-blue-400/20 bg-blue-400/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-blue-400 transition hover:bg-blue-400/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
            >
              + Team A
            </button>

            <button
              type="button"
              onClick={() => handleCreateAndJoin("B")}
              disabled={!newName.trim()}
              className="flex-1 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
            >
              + Team B
            </button>
          </div>
        </div>

        {/* VORHANDENE PROFILE */}
        <div className="mt-8">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
            Mit vorhandenem Profil beitreten
          </div>

          {available.length === 0 ? (
            <div className="mt-3 text-sm font-bold text-white/40">
              Keine weiteren Profile verfügbar.
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {available.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2"
                >
                  <span className="text-xs font-bold text-white">
                    {profile.name}
                    {profile.id === ownProfile?.id && (
                      <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-cyan-400">
                        (Du)
                      </span>
                    )}
                  </span>

                  <button
                    type="button"
                    disabled={busyPlayerId === profile.id}
                    onClick={() => handleJoin(profile.id, "A")}
                    className="rounded-lg border border-blue-400/20 bg-blue-400/[0.08] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-400 disabled:opacity-40"
                  >
                    Team A
                  </button>

                  <button
                    type="button"
                    disabled={busyPlayerId === profile.id}
                    onClick={() => handleJoin(profile.id, "B")}
                    className="rounded-lg border border-red-400/20 bg-red-400/[0.08] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-400 disabled:opacity-40"
                  >
                    Team B
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TEAMS (LIVE, ÜBER ALLE GERÄTE SYNCHRON) */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <TeamColumn
            title="Team A"
            accent="text-blue-400"
            players={teamA}
            ownProfileId={ownProfile?.id ?? null}
          />
          <TeamColumn
            title="Team B"
            accent="text-red-400"
            players={teamB}
            ownProfileId={ownProfile?.id ?? null}
          />
        </div>

        {/* START */}
        <div className="mt-8 flex justify-center pb-10">
          <button
            type="button"
            disabled={teamA.length === 0 || teamB.length === 0 || starting}
            onClick={handleStart}
            className="rounded-full border border-cyan-400/30 bg-cyan-400/[0.1] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-cyan-400 transition hover:bg-cyan-400/[0.18] disabled:cursor-not-allowed disabled:opacity-20"
          >
            {starting ? "Starte …" : "Match starten"}
          </button>
        </div>
      </div>
    </main>
  );
}

function TeamColumn({
  title,
  accent,
  players,
  ownProfileId,
}: {
  title: string;
  accent: string;
  players: PlayerProfile[];
  ownProfileId: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${accent}`}>{title}</div>

      {players.length === 0 ? (
        <div className="mt-3 text-xs font-bold text-white/25">Noch niemand beigetreten.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {players.map((profile) => (
            <div key={profile.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
              <span className="text-xs font-bold text-white">
                {profile.name}
                {profile.id === ownProfileId && (
                  <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-cyan-400">
                    (Du)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
