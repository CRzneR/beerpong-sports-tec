import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { absoluteUrl, pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Meta" });

  return {
    title: { absolute: t("aboutTitle") },
    description: t("aboutDescription"),
    alternates: pageAlternates(locale as Locale, "/about"),
    openGraph: { url: absoluteUrl(locale as Locale, "/about") },
  };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "About" });
  const common = await getTranslations({ locale, namespace: "Common" });

  return (
    <main className="min-h-screen bg-[#050708] text-white">
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-black tracking-[0.08em]">
            BEERPONG <span className="text-emerald-400">SPORTS TEC</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold text-white/70 hover:border-emerald-400/60 hover:text-white"
            >
              ← {common("back")}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:py-28">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-400">
            {t("eyebrow")}
          </p>
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
            {t("title1")}
            <br />
            <span className="text-emerald-400">{t("title2")}</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            {t("intro")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <Card number="01" title="PLAY">
            {t("play")}
          </Card>
          <Card number="02" title="TRACK">
            {t("track")}
          </Card>
          <Card number="03" title="COMPETE">
            {t("compete")}
          </Card>
        </div>

        <div className="mt-5 rounded-3xl border border-white/[0.09] bg-white/[0.025] p-7 sm:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
                {t("ideaEyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
                {t("ideaTitle1")}
                <br />
                <span className="text-white/40">{t("ideaTitle2")}</span>
              </h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-white/55">
              <p>{t("ideaText1")}</p>
              <p>{t("ideaText2")}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.035] p-7 text-center sm:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
            {t("ctaEyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase sm:text-3xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/50">{t("ctaText")}</p>
          <Link
            href="/"
            className="mt-7 inline-flex rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-black hover:bg-emerald-300"
          >
            {t("ctaButton")}
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] py-7">
        <div className="mx-auto flex max-w-5xl justify-between px-5 text-xs text-white/35">
          <span>{t("footerLeft")}</span>
          <span>{t("footerRight")}</span>
        </div>
      </footer>
    </main>
  );
}

function Card({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-white/[0.09] bg-[#0a0d0f] p-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.22em] text-white/25">{number}</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
      </div>
      <h2 className="mt-10 text-xl font-black tracking-[0.12em]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/45">{children}</p>
    </article>
  );
}
