"use client";

import { useEffect } from "react";

/*
|--------------------------------------------------------------------------
| DISPLAY AN LASSEN (Screen Wake Lock)
|--------------------------------------------------------------------------
|
| Datei: app/[locale]/spieler/match/useScreenWakeLock.ts
|
| Solange `active` true ist, verhindert der Browser, dass sich das Display
| abschaltet bzw. gedimmt wird - wichtig während eines Matches, in dem man
| minutenlang nichts antippt.
|
| Hinweise:
| - Der Browser gibt den Lock automatisch frei, wenn der Tab in den
|   Hintergrund wechselt oder das Display manuell gesperrt wird. Deshalb
|   wird er beim Zurückkehren (visibilitychange) erneut angefordert.
| - Der Lock wird beim Beenden des Matches bzw. beim Verlassen der Seite
|   wieder freigegeben.
| - Browser ohne Unterstützung (z. B. sehr alte iOS-Versionen) tun einfach
|   nichts; es gibt keinen Fehler.
| - Funktioniert nur über HTTPS (bzw. localhost).
|
*/

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

export function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") {
      return;
    }

    const wakeLock = (navigator as WakeLockNavigator).wakeLock;

    if (!wakeLock) {
      return;
    }

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }

      if (sentinel && !sentinel.released) {
        return;
      }

      try {
        const next = await wakeLock.request("screen");

        if (cancelled) {
          next.release().catch(() => {});
          return;
        }

        sentinel = next;
      } catch (err) {
        // z. B. Energiesparmodus oder fehlende Berechtigung: Match läuft normal weiter.
        console.warn("Display-Sperre nicht verfügbar:", err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };

    void acquire();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Manche Browser verlangen eine Nutzer-Geste: beim ersten Tippen erneut versuchen.
    const handleFirstInteraction = () => {
      void acquire();
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { passive: true });

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pointerdown", handleFirstInteraction);

      if (sentinel && !sentinel.released) {
        sentinel.release().catch(() => {});
      }

      sentinel = null;
    };
  }, [active]);
}
