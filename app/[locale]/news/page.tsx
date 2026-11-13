import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { NewsCard } from "@/components/news/NewsCard";
import { routing, type Locale } from "@/i18n/routing";
import { absoluteUrl, pageAlternates } from "@/lib/seo";
import { getAllPosts } from "@/lib/news";

/*
 * --------------------------------------------------------------------------
 * | NEWS - ÜBERSICHT
 * --------------------------------------------------------------------------
 *
 * Route: /news (Deutsch) und /en/news (Englisch)
 * Datei: app/[locale]/news/page.tsx
 *
 * Zeigt alle Beiträge aus content/news (neueste zuerst). Neuer Beitrag:
 * siehe content/news/_vorlage und LIESMICH.
 * --------------------------------------------------------------------------
 */

export async function generateMetadata({ params }: PageProps<"/[locale]/news">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Meta" });

  return {
    title: { absolute: t("newsTitle") },
    description: t("newsDescription"),
    alternates: pageAlternates(locale as Locale, "/news"),
    openGraph: { url: absoluteUrl(locale as Locale, "/news") },
  };
}

export default async function NewsPage({ params }: PageProps<"/[locale]/news">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "News" });
  const posts = getAllPosts(locale as Locale);

  return (
    <>
      <Navbar />

      <main className="bg-[#050708] pt-20 text-white">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 top-10 h-[420px] w-[620px] rounded-full bg-emerald-400/[0.07] blur-[130px]" />

          <div className="relative mx-auto max-w-7xl px-6 pb-8 pt-12 sm:pt-16 lg:px-8 lg:pt-20">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
              {t("eyebrow")}
            </div>

            <h1 className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              {t("pageTitle1")}
              <span className="block text-emerald-400">{t("pageTitle2")}</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/50 md:text-base">
              {t("subtitle")}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 pt-6 lg:px-8 lg:pb-28">
          {posts.length === 0 ? (
            <p className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
              {t("empty")}
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <NewsCard key={post.slug} post={post} locale={locale as Locale} readMore={t("readMore")} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
