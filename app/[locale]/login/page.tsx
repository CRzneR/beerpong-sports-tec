"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizePath } from "@/lib/localizePath";

import { createClient } from "@/lib/supabase/client";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isUsernameTaken,
  validateUsernameCode,
} from "@/app/[locale]/spieler/match/playerProfiles";
import { useTranslations } from "next-intl";

/*
 * useSearchParams() verlangt in Next.js einen Suspense-Wrapper auf der
 * Seite selbst - deshalb liegt die eigentliche Logik in einer inneren
 * Komponente, LoginPage darunter ist nur der Wrapper.
 */

function LoginForm() {
  const t = useTranslations("Login.Page");
  const tErr = useTranslations("Errors");
  const locale = useLocale() as Locale;

  const searchParams = useSearchParams();

  /*
   * next bestimmt zweierlei: wohin es nach dem Login geht, UND welches
   * der beiden Unterprojekte (Pong Stats / Pong League) hier gerade
   * angezeigt wird - je nachdem, von wo aus man hierher geschickt wurde.
   * Ohne next-Parameter (z. B. direkter Aufruf von /login) ist Pong
   * Stats der Standard, wie bisher.
   */

  const nextPath = searchParams.get("next") || "/spieler";
  const isLeague = nextPath.startsWith("/turniere");

  /*
   * Zwei Modi: "Anmelden" (nur E-Mail, für bestehende Konten) und
   * "Registrieren" (E-Mail + Pflicht-Benutzername). Der Name wandert als
   * Metadaten mit in die Account-Erstellung und wird danach (spätestens
   * vom UsernameGate) in das Spielerprofil übernommen.
   */

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (event: FormEvent) => {
    event.preventDefault();

    const trimmed = email.trim();

    if (!trimmed || sending) {
      return;
    }

    const trimmedName = username.trim();

    if (mode === "register") {
      const formatCode = validateUsernameCode(trimmedName);

      if (formatCode) {
        setError(tErr(formatCode, { min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH }));
        return;
      }
    }

    setSending(true);
    setError(null);

    if (mode === "register") {
      try {
        if (await isUsernameTaken(trimmedName)) {
          setError(tErr("usernameTaken"));
          setSending(false);
          return;
        }
      } catch (checkError) {
        /* Prüfung nicht möglich -> nicht blockieren, das Gate prüft erneut. */
        console.error("Namensprüfung fehlgeschlagen:", checkError);
      }
    }

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        ...(mode === "register" ? { data: { username: trimmedName } } : {}),
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(localizePath(nextPath, locale))}`,
      },
    });

    if (error) {
      console.error("Fehler beim E-Mail-Login:", error);
      setError(t("sendFailed"));
    } else {
      setSent(true);
    }

    setSending(false);
  };

  const accentText = isLeague ? "text-yellow-400" : "text-cyan-400";
  const accentBorder = isLeague ? "border-yellow-400/30" : "border-cyan-400/30";
  const accentBg = isLeague
    ? "bg-yellow-400/[0.1] hover:bg-yellow-400/[0.18]"
    : "bg-cyan-400/[0.1] hover:bg-cyan-400/[0.18]";
  const accentFocus = isLeague ? "focus:border-yellow-400/40" : "focus:border-cyan-400/40";
  const accentBanner = isLeague
    ? "border-yellow-400/20 bg-yellow-400/[0.05] text-yellow-400/80"
    : "border-cyan-400/20 bg-cyan-400/[0.05] text-cyan-400/80";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-5 py-6 text-white">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${accentText}`}>
            {isLeague ? t("pongLeague") : t("pongStats")}
          </div>

          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight">
            {mode === "register" ? t("registrieren") : t("anmelden")}
          </h1>
        </div>

        {!sent && (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
            {(["login", "register"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                  mode === value
                    ? `${accentBg.split(" ")[0]} ${accentText}`
                    : "text-white/35 hover:text-white"
                }`}
              >
                {value === "login" ? t("anmelden") : t("registrieren")}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80">
            {error}
          </div>
        )}

        {sent ? (
          <div className={`mt-6 rounded-xl border px-4 py-3 text-xs font-bold ${accentBanner}`}>{t("loginLinkAnGesendet", { email })}</div>
        ) : (
          <form onSubmit={handleEmailLogin} className="mt-6 flex flex-col gap-2">
            {mode === "register" && (
              <input
                type="text"
                required
                maxLength={USERNAME_MAX_LENGTH}
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("benutzername")}
                className={`rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none ${accentFocus}`}
              />
            )}

            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("deineEmailDe")}
              className={`rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none ${accentFocus}`}
            />

            <button
              type="submit"
              disabled={sending}
              className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-30 ${accentBorder} ${accentBg} ${accentText}`}
            >
              {sending
                ? t("sendeLink")
                : mode === "register"
                  ? t("registrierenLinkSenden")
                  : t("loginLinkSenden")}
            </button>
          </form>
        )}

        {/*
         * "Als Gast fortfahren" gibt es nur bei Pong Stats - Pong League
         * hat keinen Gast-Modus, Turniere sind fest an einen Account
         * gebunden.
         */}

        {!isLeague && (
          <div className="mt-8 text-center">
            <Link
              href="/spieler"
              className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 transition hover:text-white"
            >{t("alsGastFortfahren")}</Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
