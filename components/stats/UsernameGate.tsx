"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  USERNAME_MAX_LENGTH,
  getUsernameStatus,
  saveOwnUsername,
  validateUsername,
} from "@/app/spieler/match/playerProfiles";

/*
 * --------------------------------------------------------------------------
 * | USERNAME-GATE
 * --------------------------------------------------------------------------
 *
 * Wer eingeloggt ist, aber noch keinen Benutzernamen hat (neuer Account
 * oder Altkonto von vor der Namenspflicht), bekommt dieses Fenster und
 * kommt erst weiter, wenn ein freier Name gespeichert ist. Es lässt sich
 * absichtlich NICHT schließen.
 *
 * Einbauen: einmal <UsernameGate /> in die Seiten für eingeloggte Nutzer
 * (Pong Stats und Pong League). Gäste sehen nichts.
 * --------------------------------------------------------------------------
 */

type Props = {
  /** "league" färbt das Fenster gelb statt cyan. */
  variant?: "stats" | "league";
};

export function UsernameGate({ variant = "stats" }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getUsernameStatus()
      .then((status) => {
        if (!active || status.state !== "missing") return;
        setName(status.suggestion);
        setOpen(true);
      })
      .catch((err) => console.error("Benutzername-Prüfung fehlgeschlagen:", err));

    return () => {
      active = false;
    };
  }, []);

  if (!open) return null;

  const isLeague = variant === "league";
  const accentText = isLeague ? "text-yellow-400" : "text-cyan-400";
  const accentBorder = isLeague ? "border-yellow-400/30" : "border-cyan-400/30";
  const accentBg = isLeague
    ? "bg-yellow-400/[0.1] hover:bg-yellow-400/[0.18]"
    : "bg-cyan-400/[0.1] hover:bg-cyan-400/[0.18]";
  const accentFocus = isLeague ? "focus:border-yellow-400/40" : "focus:border-cyan-400/40";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const formatError = validateUsername(name);
    if (formatError) {
      setError(formatError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveOwnUsername(name);
      /* Neu laden, damit Profilkarte, Ranking usw. den Namen sofort zeigen. */
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Benutzername konnte nicht gespeichert werden.",
      );
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#07090d] p-6 text-white shadow-2xl"
      >
        <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${accentText}`}>
          Willkommen
        </div>

        <h2 id="username-gate-title" className="mt-2 text-xl font-black uppercase tracking-tight">
          Wähle deinen Benutzernamen
        </h2>

        <p className="mt-2 text-xs font-semibold text-white/50">
          So erscheinst du in Matches, im Ranking und in Turnieren. Er muss einmalig sein.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80">
            {error}
          </div>
        )}

        <input
          type="text"
          autoFocus
          required
          maxLength={USERNAME_MAX_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Benutzername"
          className={`mt-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none ${accentFocus}`}
        />

        <button
          type="submit"
          disabled={saving}
          className={`mt-2 w-full rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-30 ${accentBorder} ${accentBg} ${accentText}`}
        >
          {saving ? "Speichere …" : "Speichern"}
        </button>
      </form>
    </div>
  );
}
