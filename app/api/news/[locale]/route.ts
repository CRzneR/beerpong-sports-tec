import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";

import { routing, type Locale } from "@/i18n/routing";
import { getAllPosts, type NewsPost } from "@/lib/news";
import { SITE_URL } from "@/lib/seo";

/*
 * --------------------------------------------------------------------------
 * | NEWS-FEED FÜR DIE STORE-APP
 * --------------------------------------------------------------------------
 *
 * Route: /api/news/de und /api/news/en
 * Datei: app/api/news/[locale]/route.ts
 *
 * Gibt die News aus content/news als JSON zurück (neueste zuerst, ohne den
 * Beitragstext). Die App zeigt daraus die Karten auf Home und öffnet den
 * Beitrag im Browser. Der Feed wird beim Build erzeugt (wie die News-Seiten):
 * neuer Beitrag = pushen, Vercel baut neu, die App sieht ihn danach.
 * --------------------------------------------------------------------------
 */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const BASE = String(SITE_URL).replace(/\/+$/, "");

/* Übersetzten Pfad aus routing.pathnames holen (Text oder Sprache -> Text). */
function localizedPath(pathname: string, locale: Locale): string {
  const entry = (routing.pathnames as unknown as Record<string, string | Record<string, string> | undefined>)[pathname];

  if (typeof entry === "string") {
    return entry;
  }

  return entry?.[locale] ?? pathname;
}

function absolutePath(pathname: string, locale: Locale): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

  return `${BASE}${prefix}${pathname}`;
}

function postUrl(post: NewsPost, locale: Locale): string {
  /* Beiträge mit eigener, handgebauter Seite ("page:" im Kopf) führen dorthin. */
  const pathname = post.page
    ? localizedPath(post.page, locale)
    : localizedPath("/news/[slug]", locale).replace("[slug]", post.slug);

  return absolutePath(pathname, locale);
}

function absoluteImage(image: string | undefined): string | null {
  if (!image) {
    return null;
  }

  return image.startsWith("/") ? `${BASE}${image}` : image;
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return NextResponse.json({ error: "unknown locale" }, { status: 404 });
  }

  const posts = getAllPosts(locale as Locale).map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    category: post.category,
    excerpt: post.excerpt,
    image: absoluteImage(post.image),
    url: postUrl(post, locale as Locale),
  }));

  return NextResponse.json(
    { posts },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
        /* Öffentlicher Feed: erlaubt auch den Abruf aus der Web-Vorschau der App (Browser). */
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
