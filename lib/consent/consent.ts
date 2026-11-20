/*
|--------------------------------------------------------------------------
| EINWILLIGUNG (COOKIES / LOKALER SPEICHER)
|--------------------------------------------------------------------------
|
| Datei: lib/consent/consent.ts
|
| Hier liegt die komplette Logik, ohne Oberfläche:
|
|   * welche Kategorien es gibt und welche davon aktuell WIRKLICH genutzt werden,
|   * wo die Auswahl gespeichert wird (eigenes Cookie "bst_consent"),
|   * ein Hook zum Lesen (useConsent) und eine Funktion zum Öffnen der Einstellungen.
|
| Rechtlicher Rahmen (Deutschland):
|   * § 25 Abs. 1 TDDDG: Einwilligung nötig, sobald nicht notwendige Cookies /
|     Speicherzugriffe (Statistik, Marketing, eingebettete Fremd-Inhalte) im
|     Spiel sind. Rechtsgrundlage der Datenverarbeitung dahinter: Art. 6 Abs. 1
|     lit. a DSGVO.
|   * § 25 Abs. 2 Nr. 2 TDDDG: technisch notwendige Speicherung (Login, deine
|     Einstellungen, die Einwilligung selbst) braucht KEINE Einwilligung.
|
| WICHTIG - neuen Dienst einbauen (z. B. Analytics, YouTube, Karten):
|   1. Die Kategorie in ACTIVE_OPTIONAL_CATEGORIES eintragen.
|   2. CONSENT_VERSION um 1 erhöhen. Damit fragt das Banner alle Besucher
|      erneut. Eine Einwilligung gilt nur für das, was beim Klick angezeigt
|      wurde - Zustimmung "auf Vorrat" ist nicht wirksam.
|   3. Den Dienst nur laden, wenn useConsent().has("statistics") (o. ä.) wahr
|      ist, am einfachsten mit <ConsentGate category="statistics">.
|   4. Datenschutzerklärung und die Tabelle in consentContent.ts ergänzen.
|
*/

import { useCallback, useMemo, useSyncExternalStore } from "react";

/* -------------------------------------------------------
   Kategorien
------------------------------------------------------- */

export type OptionalCategoryId = "statistics" | "external" | "marketing";
export type CategoryId = "essential" | OptionalCategoryId;

export const OPTIONAL_CATEGORIES: readonly OptionalCategoryId[] = [
  "statistics",
  "external",
  "marketing",
];

/**
 * Optionale Kategorien, die die Seite AKTUELL tatsächlich einsetzt.
 *
 * Leer = Die Seite nutzt nur technisch Notwendiges. Das Banner ist dann ein
 * reiner Hinweis ("Verstanden"), es gibt nichts abzulehnen.
 */
export const ACTIVE_OPTIONAL_CATEGORIES: readonly OptionalCategoryId[] = [];

/** Erhöhen, sobald sich Dienste oder Zwecke ändern -> Banner erscheint erneut. */
export const CONSENT_VERSION = 1;

export const CONSENT_COOKIE = "bst_consent";

/** Gültigkeit der Auswahl. Danach wird neu gefragt (empfohlen: höchstens 6-12 Monate). */
export const CONSENT_MAX_AGE_DAYS = 180;

const CONSENT_CHANGED_EVENT = "bst:consent-changed";
const CONSENT_OPEN_EVENT = "bst:open-consent";

/* -------------------------------------------------------
   Datenmodell
------------------------------------------------------- */

export type ConsentChoices = Record<OptionalCategoryId, boolean>;

export type ConsentRecord = {
  /** Version der Einwilligungstexte, zu der die Auswahl getroffen wurde. */
  version: number;
  /** Zeitpunkt der Auswahl (ISO) - dient als Nachweis (Art. 7 Abs. 1 DSGVO). */
  timestamp: string;
  choices: ConsentChoices;
};

export const NO_CONSENT: ConsentChoices = {
  statistics: false,
  external: false,
  marketing: false,
};

/* -------------------------------------------------------
   Cookie lesen / schreiben
------------------------------------------------------- */

function readRawCookie(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const prefix = `${CONSENT_COOKIE}=`;
  const entry = document.cookie.split("; ").find((part) => part.startsWith(prefix));

  return entry ? entry.slice(prefix.length) : "";
}

/** Rohwert -> geprüfter Datensatz. Ungültig, abgelaufen oder alte Version = null (neu fragen). */
export function parseConsent(raw: string, now: number = Date.now()): ConsentRecord | null {
  if (!raw) {
    return null;
  }

  try {
    const data: unknown = JSON.parse(decodeURIComponent(raw));

    if (typeof data !== "object" || data === null) {
      return null;
    }

    const record = data as Partial<ConsentRecord>;

    if (record.version !== CONSENT_VERSION || typeof record.timestamp !== "string") {
      return null;
    }

    const savedAt = Date.parse(record.timestamp);

    if (!Number.isFinite(savedAt) || now - savedAt > CONSENT_MAX_AGE_DAYS * 86_400_000) {
      return null;
    }

    const source = (record.choices ?? {}) as Partial<ConsentChoices>;

    /* Nur Kategorien akzeptieren, die es gibt UND aktuell genutzt werden. */
    const choices: ConsentChoices = { ...NO_CONSENT };

    for (const id of ACTIVE_OPTIONAL_CATEGORIES) {
      choices[id] = source[id] === true;
    }

    return { version: record.version, timestamp: record.timestamp, choices };
  } catch {
    return null;
  }
}

function writeCookie(record: ConsentRecord) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const value = encodeURIComponent(JSON.stringify(record));

  document.cookie =
    `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE_DAYS * 86_400}; Path=/; SameSite=Lax${secure}`;
}

/* -------------------------------------------------------
   Aktionen
------------------------------------------------------- */

/**
 * Speichert die Auswahl. Kategorien, die nicht aktiv genutzt werden, werden
 * immer als "nein" gespeichert.
 */
export function saveConsent(choices: Partial<ConsentChoices>): ConsentRecord {
  const clean: ConsentChoices = { ...NO_CONSENT };

  for (const id of ACTIVE_OPTIONAL_CATEGORIES) {
    clean[id] = choices[id] === true;
  }

  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    choices: clean,
  };

  writeCookie(record);
  removeRevokedStorage(clean);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));

  return record;
}

export function acceptAll(): ConsentRecord {
  const all = { ...NO_CONSENT };

  for (const id of ACTIVE_OPTIONAL_CATEGORIES) {
    all[id] = true;
  }

  return saveConsent(all);
}

export function rejectOptional(): ConsentRecord {
  return saveConsent(NO_CONSENT);
}

/** Öffnet den Einstellungsdialog (z. B. aus dem Footer). */
export function openConsentSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
  }
}

export const CONSENT_OPEN_EVENT_NAME = CONSENT_OPEN_EVENT;

/**
 * Räumt auf, wenn eine Einwilligung entzogen wird: Speicher einer Kategorie,
 * die jetzt "nein" ist, wird gelöscht.
 *
 * Neuen Dienst eingebaut? Hier die Schlüssel eintragen, die er anlegt, z. B.
 *   statistics: { localStorage: ["_analytics_id"], cookies: ["_pk_id"] }
 */
const STORAGE_BY_CATEGORY: Record<
  OptionalCategoryId,
  { localStorage: string[]; cookies: string[] }
> = {
  statistics: { localStorage: [], cookies: [] },
  external: { localStorage: [], cookies: [] },
  marketing: { localStorage: [], cookies: [] },
};

function removeRevokedStorage(choices: ConsentChoices) {
  for (const id of OPTIONAL_CATEGORIES) {
    if (choices[id]) {
      continue;
    }

    const { localStorage: keys, cookies } = STORAGE_BY_CATEGORY[id];

    try {
      keys.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      /* Speicher gesperrt - nichts zu löschen. */
    }

    cookies.forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; Path=/`;
    });
  }
}

/* -------------------------------------------------------
   Hook
------------------------------------------------------- */

const SERVER_SNAPSHOT = "__server__";

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  /* Auswahl in einem anderen Tab geändert -> beim Zurückkehren neu lesen. */
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export type ConsentState = {
  /** false auf dem Server und beim ersten Render im Browser. */
  ready: boolean;
  /** Es gibt eine gültige Auswahl (Banner muss nicht mehr erscheinen). */
  decided: boolean;
  record: ConsentRecord | null;
  /** Hat der Besucher dieser Kategorie zugestimmt? "essential" ist immer true. */
  has: (category: CategoryId) => boolean;
};

export function useConsent(): ConsentState {
  const raw = useSyncExternalStore(subscribe, readRawCookie, () => SERVER_SNAPSHOT);

  const ready = raw !== SERVER_SNAPSHOT;
  const record = useMemo(() => (ready ? parseConsent(raw) : null), [raw, ready]);

  const has = useCallback(
    (category: CategoryId) => (category === "essential" ? true : record?.choices[category] === true),
    [record],
  );

  return { ready, decided: record !== null, record, has };
}

/** Einmalige Abfrage außerhalb von React (z. B. in einer Funktion). */
export function hasConsent(category: CategoryId): boolean {
  if (category === "essential") {
    return true;
  }

  return parseConsent(readRawCookie())?.choices[category] === true;
}
