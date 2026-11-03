"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";


import { QRCodeSVG } from "qrcode.react";

import {
  createPlayerProfile,
  deleteGuestProfile,
  getAllPlayerProfiles,
  getOwnGuestIds,
  getOwnProfile,
  getRegisteredPlayerIds,
  type PlayerProfile,
} from "@/app/[locale]/spieler/match/playerProfiles";

import {
  getMatchLobby,
  isLobbyHost,
  joinMatchLobby,
  leaveMatchLobby,
  startMatchLobby,
  subscribeMatchLobby,
  type MatchLobby,
} from "@/app/[locale]/spieler/match/matchLobby";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizePath } from "@/lib/localizePath";
import { createClient } from "@/lib/supabase/client";

import type { MatchPlayer } from "@/components/stats/match/PlayerCard";
import { useTranslations } from "next-intl";

interface PlayerSetupProps {
  lobbyId: string;
  onStart: (players: MatchPlayer[]) => void;
}

export default function PlayerSetup({ lobbyId, onStart }: PlayerSetupProps) {
  const t = useTranslations("Match.PlayerSetup");
  const locale = useLocale() as Locale;

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [lobby, setLobby] = useState<MatchLobby | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  /*
   * GAST-PROFIL LÖSCHEN
   *
   * confirmDeleteId: für diesen Gast wird gerade "Löschen?" abgefragt.
   * notice: Hinweis nach dem Löschen (z. B. wenn der Gast in einem gespeicherten
   * Match vorkommt und deshalb nur aus der Liste verschwindet).
   */

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /*
   * NUR DAS GERÄT, DAS "MATCH STARTEN" GEKLICKT HAT, SPIELT WIRKLICH
   *
   * Die Live-Match-Seite synchronisiert Würfe/Treffer NICHT über
   * mehrere Geräte hinweg (reiner lokaler React-State). Würde jedes
   * Gerät, das gerade in der Lobby war, beim Status-Wechsel auf "live"
   * eigenständig in die Match-Ansicht wechseln, bekäme jeder sein
   * eigenes, unabhängiges Abbild des Spiels - Treffer auf einem Gerät
   * würden auf keinem anderen auftauchen. isHost wird deshalb nur auf
   * DEM Gerät true, das den Start tatsächlich ausgelöst hat; alle
   * anderen zeigen stattdessen einen Warte-Bildschirm (siehe unten).
   */

  const [isHost, setIsHost] = useState(false);

  /*
   * ERSTELLER DER LOBBY
   *
   * Nur das Gerät, das die Lobby eröffnet hat, darf das Match starten
   * (siehe isLobbyHost in matchLobby.ts). Wer per QR-Code beitritt, sieht
   * stattdessen einen Hinweis. Erst nach dem Mount lesbar (localStorage).
   */

  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    setIsCreator(isLobbyHost(lobbyId));
  }, [lobbyId]);

  /*
   * BEITRITTS-LINK FÜR DEN QR-CODE
   *
   * window ist erst nach dem Mount im Browser verfügbar, deshalb per
   * useEffect setzen statt direkt beim ersten Render.
   */

  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    setJoinUrl(`${window.location.origin}${localizePath(`/spieler/match/${lobbyId}`, locale)}`);
  }, [lobbyId, locale]);

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
   * ECHTES PROFIL PER E-MAIL REGISTRIEREN
   *
   * Nutzt denselben Magic-Link-Mechanismus wie /login, aber mit einem
   * next-Parameter, der genau auf DIESE Lobby zeigt - app/auth/callback
   * liest diesen Parameter bereits aus und legt beim ersten Login
   * automatisch ein players-Profil an (ensureOwnProfile), daher muss
   * hier nichts an Login/Callback selbst geändert werden.
   */

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerSending, setRegisterSending] = useState(false);
  const [registerSent, setRegisterSent] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();

    const trimmed = registerEmail.trim();

    if (!trimmed || registerSending) {
      return;
    }

    setRegisterSending(true);
    setRegisterError(null);

    const supabase = createClient();

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          localizePath(`/spieler/match/${lobbyId}`, locale),
        )}`,
      },
    });

    if (sendError) {
      console.error("Fehler beim Registrieren:", sendError);
      setRegisterError(t("loginLinkKonnteNicht"));
    } else {
      setRegisterSent(true);
    }

    setRegisterSending(false);
  };

  /*
   * PROFILE + LOBBY LADEN
   */

  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [ownGuestIds, setOwnGuestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getAllPlayerProfiles(),
      getMatchLobby(lobbyId),
      getRegisteredPlayerIds(),
      getOwnGuestIds(),
    ])
      .then(([profileResult, lobbyResult, registeredResult, ownGuestsResult]) => {
        if (cancelled) {
          return;
        }

        setProfiles(profileResult);
        setLobby(lobbyResult);
        setRegisteredIds(registeredResult);
        setOwnGuestIds(ownGuestsResult);

        if (!lobbyResult) {
          setError(t("matchWurdeNichtGefunden"));
        }
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Lobby:", err);

        if (!cancelled) {
          setError(t("lobbyKonnteNichtGeladen"));
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

    /*
     * FIX: Registrierte (echte, eingeloggte) Profile dürfen hier nicht
     * mehr auftauchen - sonst könnte jeder in der Lobby den Account
     * einer anderen Person per Klick einem Team zuordnen, ohne dass
     * diese Person überhaupt anwesend ist oder zugestimmt hat. Ein
     * echtes Profil kann sich nur noch selbst über die "Das bist du"-
     * Karte hinzufügen (dort zwingend an den eigenen Login gebunden).
     * Diese Liste zeigt deshalb nur noch Gast-Profile.
     *
     * Und auch davon nur die, die man SELBST angelegt hat (ownGuestIds):
     * Gäste anderer Spieler sollen nicht in fremden Lobbys zur Auswahl
     * stehen. Wer schon in einem Team ist, wird weiterhin normal
     * angezeigt (teamA/teamB nutzen alle Profile).
     */
    return profiles.filter(
      (profile) =>
        !joinedIds.has(profile.id) && !registeredIds.has(profile.id) && ownGuestIds.has(profile.id),
    );
  }, [profiles, lobby, registeredIds, ownGuestIds]);

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
   * Läuft auf JEDEM verbundenen Gerät unabhängig (jedes hat seine eigene
   * Realtime-Subscription) - aber NUR das Host-Gerät (das "Match
   * starten" tatsächlich geklickt hat) wechselt wirklich in die
   * Match-Ansicht. Alle anderen bleiben hier und zeigen stattdessen den
   * Warte-Bildschirm weiter unten.
   */

  useEffect(() => {
    if (lobby?.status !== "live" || !isHost) {
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
  }, [lobby?.status, isHost]);

  const handleJoin = async (playerId: string, team: "A" | "B") => {
    setBusyPlayerId(playerId);
    setError(null);

    try {
      const updated = await joinMatchLobby(lobbyId, playerId, team);
      setLobby(updated);
    } catch (err) {
      console.error("Fehler beim Beitreten:", err);
      setError(t("beitretenFehlgeschlagen"));
    } finally {
      setBusyPlayerId(null);
    }
  };

  const handleLeave = async (playerId: string) => {
    setBusyPlayerId(playerId);
    setError(null);

    try {
      const updated = await leaveMatchLobby(lobbyId, playerId);
      setLobby(updated);
    } catch (err) {
      console.error("Fehler beim Entfernen:", err);
      setError(t("spielerKonnteNichtEntfernt"));
    } finally {
      setBusyPlayerId(null);
    }
  };

  const handleDeleteGuest = async (profile: PlayerProfile) => {
    setBusyPlayerId(profile.id);
    setError(null);
    setNotice(null);

    try {
      const result = await deleteGuestProfile(profile.id);

      setOwnGuestIds((current) => {
        const next = new Set(current);
        next.delete(profile.id);
        return next;
      });

      if (result === "deleted") {
        setProfiles((current) => current.filter((item) => item.id !== profile.id));
      } else {
        setNotice(
          t("gastInMatchVorhanden", { name: profile.name }),
        );
      }
    } catch (err) {
      console.error("Fehler beim Löschen des Gast-Profils:", err);
      setError(t("gastProfilKonnteNicht"));
    } finally {
      setConfirmDeleteId(null);
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
      setOwnGuestIds((current) => new Set(current).add(profile.id));
      setNewName("");

      await handleJoin(profile.id, team);
    } catch (err) {
      console.error("Fehler beim Anlegen des Spielers:", err);
      setError(t("spielerKonnteNichtAngelegt"));
    }
  };

  const handleStart = async () => {
    if (!isCreator || teamA.length === 0 || teamB.length === 0 || starting) {
      return;
    }

    setStarting(true);
    setError(null);

    /*
     * Muss VOR dem eigentlichen Start-Aufruf gesetzt werden: die
     * Realtime-Antwort (status wechselt auf "live") kann theoretisch
     * schneller zurückkommen, als dieser Funktionsaufruf fertig ist.
     */
    setIsHost(true);

    try {
      await startMatchLobby(lobbyId);
      // Der Wechsel ins Match passiert über den Realtime-Listener oben,
      // sobald status auf "live" wechselt.
    } catch (err) {
      console.error("Fehler beim Starten des Matches:", err);
      setError(t("matchKonnteNichtGestartet"));
      setStarting(false);
      setIsHost(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-6 text-white">
        <div className="mx-auto max-w-3xl text-sm font-bold text-white/40">{t("ladeMatch")}</div>
      </main>
    );
  }

  if (!lobby) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-6 text-white">
        <div className="mx-auto max-w-3xl text-sm font-bold text-red-400/70">
          {error ?? t("matchWurdeNichtGefunden")}
        </div>
      </main>
    );
  }

  /*
   * WARTE-BILDSCHIRM (Nicht-Host-Geräte, während das Match woanders läuft)
   */

  if (lobby.status === "live" && !isHost) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-5 py-6 text-center text-white">
        <div className="max-w-xs">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">{t("pongStats")}</div>

          <h1 className="mt-2 text-lg font-black uppercase">{t("matchLaeuft")}</h1>

          <p className="mt-3 text-sm text-white/40">{t("dasMatchWirdGerade")}</p>
        </div>
      </main>
    );
  }

  /*
   * MATCH BEENDET (Nicht-Host-Geräte, sobald das Host-Gerät fertig gespeichert hat)
   */

  if (lobby.status === "finished") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-5 py-6 text-center text-white">
        <div className="max-w-xs">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">{t("pongStats")}</div>

          <h1 className="mt-2 text-lg font-black uppercase">{t("matchBeendet")}</h1>

          <p className="mt-3 text-sm text-white/40">{t("abgeschlosseneMatchesFindestDu")}</p>

          <Link
            href="/spieler"
            className="mt-6 inline-block rounded-full border border-cyan-400/30 bg-cyan-400/[0.1] px-6 py-3 text-xs font-black uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-400/[0.18]"
          >{t("zurMatchHistorie")}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">{t("pongStats")}</div>

            <h1 className="mt-1 text-lg font-black uppercase">{t("matchLobby")}</h1>
          </div>

          {/* ABBRECHEN - zurück zum Profil in Pong Stats, ohne ein Match zu starten */}
          <Link
            href="/spieler"
            className="shrink-0 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/50 transition hover:border-red-400/30 hover:bg-red-400/[0.08] hover:text-red-400"
          >{t("abbrechen")}</Link>
        </div>

        <p className="mt-2 text-xs text-white/35">{t("andereSpielerScannenDen")}</p>

        {/* DAS BIST DU - prominenter direkter Beitritt für das eigene, eingeloggte Profil */}

        {ownProfile && !ownProfileJoined && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">{t("dasBistDu")}</div>
              <div className="mt-1 text-sm font-bold text-white">{t("istNochNichtIn", { name: ownProfile.name })}</div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busyPlayerId === ownProfile.id}
                onClick={() => handleJoin(ownProfile.id, "A")}
                className="rounded-xl border border-blue-400/20 bg-blue-400/[0.08] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-blue-400 transition hover:bg-blue-400/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
              >{t("teamA")}</button>

              <button
                type="button"
                disabled={busyPlayerId === ownProfile.id}
                onClick={() => handleJoin(ownProfile.id, "B")}
                className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
              >{t("teamB")}</button>
            </div>
          </div>
        )}

        {/* QR-CODE ZUM BEITRETEN */}
        {joinUrl && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={joinUrl} size={168} />
            </div>

            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{t("mitDemHandyScannen")}</div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-4 py-3 text-xs font-bold text-cyan-400/80">
            {notice}
          </div>
        )}

        {/* ECHTES PROFIL ERSTELLEN - nur relevant, solange niemand eingeloggt ist */}

        {!ownProfile && (
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">{t("nochKeinAccount")}</div>

            <p className="mt-2 text-xs text-white/40">{t("registriereDichMitDeiner")}</p>

            {registerSent ? (
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-4 py-3 text-xs font-bold text-cyan-400/80">{t("loginLinkAnGesendet", { registerEmail })}</div>
            ) : (
              <form onSubmit={handleRegister} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(event) => setRegisterEmail(event.target.value)}
                  placeholder={t("deineEmailDe")}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={registerSending}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/[0.1] px-4 py-3 text-xs font-black uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-400/[0.18] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {registerSending ? t("sendeLink") : t("loginLinkSenden")}
                </button>
              </form>
            )}

            {registerError && (
              <div className="mt-3 text-xs font-bold text-red-400/80">{registerError}</div>
            )}
          </div>
        )}

        {/* NEUEN SPIELER ANLEGEN UND BEITRETEN (Gast-Profil ohne Login) */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={t("nameGastProfilOhne")}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCreateAndJoin("A")}
              disabled={!newName.trim()}
              className="flex-1 rounded-xl border border-blue-400/20 bg-blue-400/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-blue-400 transition hover:bg-blue-400/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
            >{t("teamA2")}</button>

            <button
              type="button"
              onClick={() => handleCreateAndJoin("B")}
              disabled={!newName.trim()}
              className="flex-1 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-red-400 transition hover:bg-red-400/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
            >{t("teamB2")}</button>
          </div>
        </div>

        {/* VORHANDENE PROFILE */}
        <div className="mt-8">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">{t("mitBestehendemGastProfil")}</div>

          {available.length === 0 ? (
            <div className="mt-3 text-sm font-bold text-white/40">{t("keineWeiterenProfileVerfuegbar")}</div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {available.map((profile) =>
                confirmDeleteId === profile.id ? (
                  <div
                    key={profile.id}
                    className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/[0.06] px-3 py-2"
                  >
                    <span className="text-xs font-bold text-white">{t("loeschen", { name: profile.name })}</span>

                    <button
                      type="button"
                      disabled={busyPlayerId === profile.id}
                      onClick={() => handleDeleteGuest(profile)}
                      className="rounded-lg border border-red-400/30 bg-red-400/[0.15] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-300 disabled:opacity-40"
                    >{t("loeschen2")}</button>

                    <button
                      type="button"
                      disabled={busyPlayerId === profile.id}
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/50 disabled:opacity-40"
                    >{t("abbrechen")}</button>
                  </div>
                ) : (
                  <div
                    key={profile.id}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2"
                  >
                    <span className="text-xs font-bold text-white">
                      {profile.name}
                      {profile.id === ownProfile?.id && (
                        <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-cyan-400">{t("du")}</span>
                      )}
                    </span>

                    <button
                      type="button"
                      disabled={busyPlayerId === profile.id}
                      onClick={() => handleJoin(profile.id, "A")}
                      className="rounded-lg border border-blue-400/20 bg-blue-400/[0.08] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-400 disabled:opacity-40"
                    >{t("teamA")}</button>

                    <button
                      type="button"
                      disabled={busyPlayerId === profile.id}
                      onClick={() => handleJoin(profile.id, "B")}
                      className="rounded-lg border border-red-400/20 bg-red-400/[0.08] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-400 disabled:opacity-40"
                    >{t("teamB")}</button>

                    <button
                      type="button"
                      disabled={busyPlayerId === profile.id}
                      onClick={() => setConfirmDeleteId(profile.id)}
                      aria-label={t("gastProfilLoeschen", { name: profile.name })}
                      title={t("gastProfilLoeschen2")}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white/25 transition hover:bg-red-400/[0.12] hover:text-red-400 disabled:opacity-30"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
                      </svg>
                    </button>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* TEAMS (LIVE, ÜBER ALLE GERÄTE SYNCHRON) */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <TeamColumn
            title={t("teamA")}
            accent="text-blue-400"
            players={teamA}
            ownProfileId={ownProfile?.id ?? null}
            busyPlayerId={busyPlayerId}
            onRemove={handleLeave}
          />
          <TeamColumn
            title={t("teamB")}
            accent="text-red-400"
            players={teamB}
            ownProfileId={ownProfile?.id ?? null}
            busyPlayerId={busyPlayerId}
            onRemove={handleLeave}
          />
        </div>

        {/* START */}
        <div className="mt-8 flex flex-col items-center gap-4 pb-10">
          {isCreator ? (
            <button
              type="button"
              disabled={teamA.length === 0 || teamB.length === 0 || starting}
              onClick={handleStart}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/[0.1] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-cyan-400 transition hover:bg-cyan-400/[0.18] disabled:cursor-not-allowed disabled:opacity-20"
            >
              {starting ? t("starte") : t("matchStarten")}
            </button>
          ) : (
            <p className="max-w-xs text-center text-xs font-semibold text-white/40">{t("nurDerErstellerDer")}</p>
          )}

          <Link
            href="/spieler"
            className="text-[10px] font-black uppercase tracking-wider text-white/35 transition hover:text-red-400"
          >{t("abbrechen")}</Link>
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
  busyPlayerId,
  onRemove,
}: {
  title: string;
  accent: string;
  players: PlayerProfile[];
  ownProfileId: string | null;
  busyPlayerId: string | null;
  onRemove: (playerId: string) => void;
}) {
  const t = useTranslations("Match.PlayerSetup");

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${accent}`}>{title}</div>

      {players.length === 0 ? (
        <div className="mt-3 text-xs font-bold text-white/25">{t("nochNiemandBeigetreten")}</div>
      ) : (
        <div className="mt-3 space-y-2">
          {players.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2"
            >
              <span className="text-xs font-bold text-white">
                {profile.name}
                {profile.id === ownProfileId && (
                  <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-cyan-400">{t("du")}</span>
                )}
              </span>

              <button
                type="button"
                disabled={busyPlayerId === profile.id}
                onClick={() => onRemove(profile.id)}
                aria-label={t("entfernen", { name: profile.name })}
                className="shrink-0 text-sm font-black text-white/25 transition hover:text-white disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
