"use client";

import { FormEvent, useState } from "react";
import emailjs from "@emailjs/browser";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

type Status = "idle" | "sending" | "success" | "error";

/*
 * value = deutsche Bezeichnung (landet so in deiner E-Mail, egal in welcher Sprache das Formular
 * ausgefüllt wurde), key = Schlüssel für die Beschriftung in messages/*.json.
 */
const subjects = [
  { value: "Allgemeine Anfrage", key: "subjectGeneral" },
  { value: "Support", key: "subjectSupport" },
  { value: "Kooperation", key: "subjectCooperation" },
  { value: "Feedback / Idee", key: "subjectFeedback" },
  { value: "Sonstiges", key: "subjectOther" },
] as const;

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0d1a18] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#2EF2B0]/60 focus:ring-1 focus:ring-[#2EF2B0]/40";

function Required() {
  return (
    <span className="text-red-400" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

export default function ContactForm() {
  const t = useTranslations("ContactForm");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot: echte Nutzer sehen das Feld nicht und lassen es leer
    if (data.get("company")) {
      form.reset();
      setStatus("success");
      return;
    }

    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      console.error("EmailJS: Umgebungsvariablen fehlen (NEXT_PUBLIC_EMAILJS_*).");
      setStatus("error");
      return;
    }

    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();

    setStatus("sending");
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          reply_to: String(data.get("email") ?? "").trim(),
          subject: String(data.get("subject") ?? ""),
          message: String(data.get("message") ?? "").trim(),
          /* In welcher Sprache das Formular ausgefüllt wurde (im EmailJS-Template optional nutzbar). */
          language: locale,
        },
        { publicKey: PUBLIC_KEY },
      );
      form.reset();
      setStatus("success");
    } catch (error) {
      console.error("EmailJS Fehler:", error);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
      {/* Honeypot-Feld (für Menschen unsichtbar) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="company">{t("honeypot")}</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="firstName" className="mb-2 block text-sm text-white/80">
          {t("firstName")}
          <Required />
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          required
          autoComplete="given-name"
          placeholder={t("firstNamePlaceholder")}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="lastName" className="mb-2 block text-sm text-white/80">
          {t("lastName")}
          <Required />
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          required
          autoComplete="family-name"
          placeholder={t("lastNamePlaceholder")}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm text-white/80">
          {t("email")}
          <Required />
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="subject" className="mb-2 block text-sm text-white/80">
          {t("subject")}
          <Required />
        </label>
        <div className="relative">
          <select
            id="subject"
            name="subject"
            required
            defaultValue=""
            className={`${inputClass} appearance-none pr-10 invalid:text-white/30`}
          >
            <option value="" disabled>
              {t("subjectPlaceholder")}
            </option>
            {subjects.map((subject) => (
              <option key={subject.value} value={subject.value} className="bg-[#0d1a18] text-white">
                {t(subject.key)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/70"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="message" className="mb-2 block text-sm text-white/80">
          {t("message")}
          <Required />
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder={t("messagePlaceholder")}
          className={`${inputClass} resize-y`}
        />
      </div>

      <div className="flex flex-col gap-4 md:col-span-2 md:flex-row md:items-center md:justify-between md:gap-6">
        <label className="flex items-start gap-3 text-xs leading-relaxed text-white/60">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-white/20 bg-[#0d1a18] accent-[#2EF2B0]"
          />
          <span>
            {t.rich("consent", {
              privacy: (chunks) => (
                <Link href="/datenschutz" className="text-[#2EF2B0] underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2EF2B0] px-6 py-3 text-sm font-semibold text-[#04120e] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? t("sending") : t("submit")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="md:col-span-2" aria-live="polite">
        {status === "success" && (
          <p className="text-sm text-[#2EF2B0]">
            {t("success")}
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-400">
            {t("error")}
          </p>
        )}
      </div>
    </form>
  );
}
