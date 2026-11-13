import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { NewsCard } from "@/components/news/NewsCard";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllPosts } from "@/lib/news";

/*
 * --------------------------------------------------------------------------
 * | NEWS-SEKTION (Startseite) - ersetzt die frühere Community-Sektion
 * --------------------------------------------------------------------------
 *
 * Datei: components/landing/NewsSection.tsx
 *
 * Zeigt die drei neuesten Beiträge aus content/news. Gibt es (in dieser
 * Sprache) keinen Beitrag, wird die Sektion gar nicht angezeigt.
 * --------------------------------------------------------------------------
 */

const LATEST_COUNT = 3;

export async function NewsSection() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("News");
  const posts = getAllPosts(locale).slice(0, LATEST_COUNT);

  if (posts.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-[#050708] py-20 lg:py-28">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-emerald-400/[0.05] blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
              {t("eyebrow")}
            </div>

            <h2 className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              {t("sectionTitle1")}
              <span className="block text-white/35">{t("sectionTitle2")}</span>
            </h2>
          </div>

          <Link
            href="/news"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:border-emerald-400/50 hover:text-emerald-400 md:self-auto"
          >
            {t("allNews")}

            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <NewsCard key={post.slug} post={post} locale={locale} readMore={t("readMore")} />
          ))}
        </div>
      </div>
    </section>
  );
}
