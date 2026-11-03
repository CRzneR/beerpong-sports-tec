import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { absoluteUrl, pageAlternates } from "@/lib/seo";

/*
 * --------------------------------------------------------------------------
 * | REGELN
 * --------------------------------------------------------------------------
 *
 * Route: /regeln (Deutsch) und /en/rules (Englisch)
 * Datei: app/[locale]/regeln/page.tsx
 *
 * Die Texte stehen jetzt in messages/de.json und messages/en.json unter
 * "Rules.sections". Hier bleibt nur, was nicht übersetzt wird: Reihenfolge,
 * Nummer und Akzentfarbe jeder Regel.
 *
 * Die Akzentfarben stehen als vollständige, feste Klassen-Strings im
 * accents-Objekt (statt Klassennamen zur Laufzeit zusammenzusetzen) -
 * so findet Tailwind sie beim Build zuverlässig.
 * --------------------------------------------------------------------------
 */

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/regeln">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Meta" });

  return {
    title: { absolute: t("rulesTitle") },
    description: t("rulesDescription"),
    alternates: pageAlternates(locale as Locale, "/regeln"),
    openGraph: { url: absoluteUrl(locale as Locale, "/regeln") },
  };
}

type Accent = "cyan" | "pink";

type Paragraph = {
  label?: string;
  text: string;
};

type RuleText = {
  title: string;
  items?: string[];
  paragraphs?: Paragraph[];
};

const accents = {
  cyan: {
    card: "border-cyan-400/15 hover:border-cyan-400/30",
    number: "text-cyan-400/70",
    check: "text-cyan-400",
  },
  pink: {
    card: "border-pink-400/15 hover:border-pink-400/30",
    number: "text-pink-400/80",
    check: "text-pink-400",
  },
} as const;

/* id = Schlüssel in messages/*.json unter Rules.sections */
const RULES: { id: string; number: string; accent: Accent }[] = [
  { id: "general", number: "01", accent: "cyan" },
  { id: "start", number: "02", accent: "pink" },
  { id: "elbow", number: "03", accent: "cyan" },
  { id: "setup", number: "04", accent: "pink" },
  { id: "distraction", number: "05", accent: "pink" },
  { id: "direct", number: "06", accent: "cyan" },
  { id: "bounce", number: "07", accent: "pink" },
  { id: "recover", number: "08", accent: "cyan" },
  { id: "multi", number: "09", accent: "cyan" },
  { id: "defend", number: "10", accent: "pink" },
  { id: "end", number: "11", accent: "cyan" },
];

export default async function RegelnPage({ params }: PageProps<"/[locale]/regeln">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Rules" });
  const common = await getTranslations({ locale, namespace: "Common" });

  const rules = RULES.map((rule) => ({
    ...rule,
    ...(t.raw(`sections.${rule.id}`) as RuleText),
  }));

  const fairplay = t.raw("fairplay") as string[];

  return (
    <main className="min-h-screen bg-[#050708] px-5 py-10 text-white sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            {common("backHome")}
          </Link>

          <LanguageSwitcher />
        </div>

        {/* KOPF */}

        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
          {t("eyebrow")}
        </div>

        <h1 className="mt-2 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl">
          {t("title1")}
          <span className="block text-cyan-400">{t("title2")}</span>
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/50">
          {t("intro")}
        </p>

        {/* REGELN */}

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => {
            const accent = accents[rule.accent];

            return (
              <section
                key={rule.number}
                className={`rounded-3xl border bg-white/[0.02] p-6 transition duration-300 ${accent.card}`}
              >
                <div className={`text-[10px] font-black tracking-[0.25em] ${accent.number}`}>
                  {rule.number}
                </div>

                <h2 className="mt-3 text-sm font-black uppercase tracking-wide text-white">
                  {rule.title}
                </h2>

                {rule.items && (
                  <ul className="mt-4 space-y-2 text-sm text-white/60">
                    {rule.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className={`mt-0.5 text-xs font-black ${accent.check}`}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {rule.paragraphs && (
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/60">
                    {rule.paragraphs.map((paragraph) => (
                      <p key={paragraph.text}>
                        {paragraph.label && (
                          <span className="font-bold text-white/85">{paragraph.label} </span>
                        )}
                        {paragraph.text}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* FAIRPLAY */}

        <section className="mt-4 rounded-3xl border border-pink-400/15 bg-white/[0.02] p-6 md:flex md:items-center md:justify-between md:gap-10 md:p-8">
          <div>
            <div className="text-[10px] font-black tracking-[0.25em] text-pink-400/80">12</div>

            <h2 className="mt-3 text-sm font-black uppercase tracking-wide text-white">
              {t("fairplayTitle")}
            </h2>

            <div className="mt-4 space-y-2 text-sm leading-relaxed text-white/60">
              {fairplay.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-6 md:mt-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-white/30">
              {t("motto1")}
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-white/30">
              {t("motto2")}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
