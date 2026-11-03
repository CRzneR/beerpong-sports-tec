"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

import { createMatchLobby, type MatchLobby } from "@/app/[locale]/spieler/match/matchLobby";
import { useTranslations } from "next-intl";

/*
 * --------------------------------------------------------------------------
 * | NEUES MATCH
 * --------------------------------------------------------------------------
 *
 * Route: /spieler/match (ohne id)
 *
 * FIX 1: Diese Datei enthielt bisher (offenbar ein Copy-Paste-Artefakt)
 * exakt denselben Code wie app/spieler/page.tsx - die komplette
 * Profilseite statt einer Lobby-Erstellung. Dadurch landete man beim
 * Klick auf "Neues Match starten" auf einer zweiten, identischen
 * Kopie der Profilseite, was wie ein Zurückspringen auf /spieler
 * aussah.
 *
 * FIX 2: Die erste Version dieser Seite blieb im Dev-Modus dauerhaft
 * bei "Match wird erstellt ..." hängen. Grund: React führt Effects im
 * Dev-Modus testweise zweimal aus (mount -> cleanup -> erneuter
 * mount). Ein reiner startedRef-Boolean verhinderte zwar den zweiten
 * createMatchLobby()-Aufruf, aber das Cleanup des ERSTEN Durchlaufs
 * setzte "cancelled" auf true, und der (durch den Guard blockierte)
 * zweite Durchlauf hängte sich an gar nichts mehr an, das die
 * Weiterleitung noch ausgelöst hätte.
 *
 * Jetzt wird stattdessen das Promise selbst in einem Ref gehalten:
 * der zweite Effect-Durchlauf erkennt, dass schon eine Anfrage läuft,
 * hängt sich mit einem EIGENEN (nicht abgebrochenen) then/catch an
 * dasselbe Promise an - und genau dieser Handler löst dann zuverlässig
 * die Weiterleitung aus, auch unter der Dev-Mode-Doppelausführung.
 *
 * Diese Seite hat keine eigene Darstellung: sie legt sofort eine neue
 * Lobby an und leitet zu /spieler/match/<id> weiter (dort übernimmt
 * PlayerSetup.tsx). router.replace statt router.push, damit diese
 * Zwischenseite nicht in der Browser-History landet.
 * --------------------------------------------------------------------------
 */

export default function NewMatchPage() {
  const t = useTranslations("Match.MatchPage");

  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const lobbyPromiseRef = useRef<Promise<MatchLobby> | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!lobbyPromiseRef.current) {
      lobbyPromiseRef.current = createMatchLobby();
    }

    lobbyPromiseRef.current
      .then((lobby) => {
        if (!cancelled) {
          router.replace({ pathname: "/spieler/match/[matchId]", params: { matchId: lobby.id } });
        }
      })
      .catch((err) => {
        console.error("Fehler beim Erstellen einer neuen Lobby:", err);

        if (!cancelled) {
          setError(t("matchKonnteNichtErstellt"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-5 text-white">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-sm font-bold text-red-400/80">{error}</div>

            <Link
              href="/spieler"
              className="mt-4 inline-block rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/50 transition hover:bg-white/[0.08] hover:text-white"
            >{t("zurueckZumProfil")}</Link>
          </>
        ) : (
          <div className="text-sm font-bold text-white/40">{t("matchWirdErstellt")}</div>
        )}
      </div>
    </main>
  );
}
