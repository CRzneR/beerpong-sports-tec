/*
|--------------------------------------------------------------------------
| LAUFENDES MATCH AUF DEM GERÄT ZWISCHENSPEICHERN
|--------------------------------------------------------------------------
|
| Datei: app/[locale]/spieler/match/matchSession.ts
|
| Der Spielstand (Becher, Würfe, Spieler ...) liegt in der Match-Seite nur
| im Arbeitsspeicher. Aktualisiert das Gerät, das das Match spielt, die
| Seite (oder schließt der Browser den Tab), wäre alles weg und die Seite
| würde fälschlich "Match läuft" (Warte-Bildschirm) zeigen.
|
| Deshalb wird der Stand nach jeder Änderung im localStorage dieses Geräts
| abgelegt und beim erneuten Öffnen der Seite wiederhergestellt. Er wird
| gelöscht, sobald das Match gespeichert oder abgebrochen wurde.
|
| Alles ist try/catch-gesichert: ist der Speicher gesperrt (z. B. privater
| Modus), läuft das Match wie bisher, nur ohne Wiederherstellung.
|
*/

const KEY_PREFIX = "bpst:live-match:";
const SNAPSHOT_VERSION = 1;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type MatchSessionSnapshot<T> = {
  version: number;
  savedAt: number;
  /** true, sobald das Speichern des beendeten Matches begonnen hat. */
  saveStarted: boolean;
  data: T;
};

export function saveMatchSession<T>(lobbyId: string, data: T, saveStarted: boolean): void {
  try {
    const snapshot: MatchSessionSnapshot<T> = {
      version: SNAPSHOT_VERSION,
      savedAt: Date.now(),
      saveStarted,
      data,
    };

    window.localStorage.setItem(KEY_PREFIX + lobbyId, JSON.stringify(snapshot));
  } catch {
    /* Speicher voll oder gesperrt: ohne Wiederherstellung weiterspielen. */
  }
}

export function loadMatchSession<T>(lobbyId: string): MatchSessionSnapshot<T> | null {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + lobbyId);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as MatchSessionSnapshot<T>;

    if (
      !parsed ||
      parsed.version !== SNAPSHOT_VERSION ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > MAX_AGE_MS ||
      typeof parsed.data !== "object" ||
      parsed.data === null
    ) {
      clearMatchSession(lobbyId);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearMatchSession(lobbyId: string): void {
  try {
    window.localStorage.removeItem(KEY_PREFIX + lobbyId);
  } catch {
    /* nichts zu tun */
  }
}

/** Räumt alte Zwischenstände (> 24 h) anderer Matches auf. */
export function pruneOldMatchSessions(): void {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);

      if (!key || !key.startsWith(KEY_PREFIX)) {
        continue;
      }

      const raw = window.localStorage.getItem(key);
      const savedAt = raw ? (JSON.parse(raw) as { savedAt?: number }).savedAt : undefined;

      if (typeof savedAt !== "number" || Date.now() - savedAt > MAX_AGE_MS) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    /* nichts zu tun */
  }
}
