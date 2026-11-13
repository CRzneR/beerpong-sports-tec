import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { NewsCard } from "@/components/news/NewsCard";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Markdown } from "@/lib/markdown";
import { formatNewsDate, getAllPosts, getPost, getPostLocales, getStaticNewsParams } from "@/lib/news";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

/*
 * --------------------------------------------------------------------------
 * | NEWS - EINZELNER BEITRAG
 * --------------------------------------------------------------------------
 *
 * Route: /news/<slug> und /en/news/<slug>
 * Datei: app/[locale]/news/[slug]/page.tsx
 *
 * Inhalt kommt aus content/news/<slug>/<sprache>.md. Beiträge mit "page:" im
 * Kopf haben eine eigene Seite und werden hier nicht erzeugt.
 * --------------------------------------------------------------------------
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticNewsParams();
}

function postHref(slug: string) {
  return { pathname: "/news/[slug]", params: { slug } } as const;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const post = getPost(slug, locale as Locale);

  if (!post || post.page) {
    return {};
  }

  /* hreflang nur für Sprachen, in denen es den Beitrag wirklich gibt */
  const available = getPostLocales(slug);
  const languages: Record<string, string> = {};

  for (const code of available) {
    languages[code] = absoluteUrl(code, postHref(slug));
  }

  languages["x-default"] = absoluteUrl(available.includes(routing.defaultLocale) ? routing.defaultLocale : available[0], postHref(slug));

  const image = post.image ? `${SITE_URL}${post.image}` : undefined;

  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: {
      canonical: absoluteUrl(locale as Locale, postHref(slug)),
      languages,
    },
    openGraph: {
      url: absoluteUrl(locale as Locale, postHref(slug)),
      type: "article",
      publishedTime: post.date,
      title: post.title,
      description: post.excerpt || undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function NewsPostPage({ params }: PageProps<"/[locale]/news/[slug]">) {
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const post = getPost(slug, locale as Locale);

  if (!post || post.page) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "News" });
  const more = getAllPosts(locale as Locale)
    .filter((other) => other.slug !== post.slug)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.image ? `${SITE_URL}${post.image}` : undefined,
    datePublished: post.date,
    inLanguage: locale === "de" ? "de-DE" : "en",
    mainEntityOfPage: absoluteUrl(locale as Locale, postHref(slug)),
    publisher: { "@type": "Organization", name: "BeerPongSportsTec", url: SITE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Navbar />

      <main className="bg-[#050708] pt-20 text-white">
        <article>
          <header className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-32 top-10 h-[420px] w-[620px] rounded-full bg-emerald-400/[0.07] blur-[130px]" />

            <div className="relative mx-auto max-w-3xl px-6 pb-8 pt-10 sm:pt-14 lg:px-8">
              <Link
                href="/news"
                className="group inline-flex items-center gap-2 text-xs font-semibold text-white/35 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                {t("backToNews")}
              </Link>

              <div className="mt-7 flex items-center gap-4">
                {post.category ? (
                  <span className="rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black">
                    {post.category}
                  </span>
                ) : null}

                <time dateTime={post.date} className="border-l border-white/15 pl-4 text-sm text-white/45 first:border-0 first:pl-0">
                  {formatNewsDate(post.date, locale as Locale)}
                </time>
              </div>

              <h1 className="mt-5 text-3xl font-black uppercase leading-[1] tracking-[-0.04em] text-white sm:text-5xl">
                {post.title}
              </h1>

              {post.excerpt ? (
                <p className="mt-5 text-base leading-relaxed text-white/55 md:text-lg">{post.excerpt}</p>
              ) : null}
            </div>
          </header>

          {post.image ? (
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
              <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-emerald-400/15 shadow-[0_0_60px_rgba(52,211,153,0.08)]">
                <Image
                  src={post.image}
                  alt={post.imageAlt ?? ""}
                  fill
                  priority
                  sizes="(min-width: 1024px) 896px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          ) : null}

          <div className="mx-auto max-w-3xl px-6 py-10 lg:px-8 lg:py-14">
            <Markdown source={post.body} />
          </div>
        </article>

        {more.length > 0 ? (
          <section className="border-t border-white/[0.06]">
            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-white md:text-3xl">
                {t("moreNews")}
              </h2>

              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {more.map((other) => (
                  <NewsCard key={other.slug} post={other} locale={locale as Locale} readMore={t("readMore")} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </>
  );
}
