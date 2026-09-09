"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (event: FormEvent) => {
    event.preventDefault();

    const trimmed = email.trim();

    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Fehler beim E-Mail-Login:", error);
      setError("Login-Link konnte nicht gesendet werden.");
    } else {
      setSent(true);
    }

    setSending(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-5 py-6 text-white">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
            Pong Stats
          </div>

          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight">Anmelden</h1>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80">
            {error}
          </div>
        )}

        {sent ? (
          <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-4 py-3 text-xs font-bold text-cyan-400/80">
            Login-Link an {email} gesendet. E-Mails prüfen und Link öffnen.
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="mt-6 flex flex-col gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="deine@email.de"
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
            />

            <button
              type="submit"
              disabled={sending}
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/[0.1] px-4 py-3 text-xs font-black uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-400/[0.18] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {sending ? "Sende Link …" : "Login-Link senden"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/spieler"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 transition hover:text-white"
          >
            Als Gast fortfahren →
          </Link>
        </div>
      </div>
    </main>
  );
}
