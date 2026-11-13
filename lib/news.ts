import fs from "node:fs";
import path from "node:path";

import { routing, type Locale } from "@/i18n/routing";

/*
|--------------------------------------------------------------------------
| NEWS: BEITRÄGE LESEN
|--------------------------------------------------------------------------
|
| Datei: lib/news.ts
|
| Beiträge liegen als Markdown-Dateien im Projekt:
|
|   content/news/<slug>/de.md
|   content/news/<slug>/en.md      (optional - fehlt sie, gibt es den Beitrag nur auf Deutsch)
|
| Ordner, die mit "_" beginnen (z. B. _vorlage), werden ignoriert.
| Beiträge mit "draft: true" im Kopf sind unsichtbar.
|
| Alles läuft beim Build (statische Seiten). Neuer Beitrag = Ordner anlegen,
| pushen, Vercel baut neu.
|
*/

export type NewsPost = {
  slug: string;
  locale: Locale;
  title: string;
  /* ISO-Datum, z. B. 2026-11-10 */
  date: string;
  category: string;
  excerpt: string;
  image?: string;
  imageAlt?: string;
  /* Optional: Beitrag hat eine eigene, handgebaute Seite (z. B. "/pokale-ringe") */
  page?: string;
  body: string;
};

const NEWS_DIR = path.join(process.cwd(), "content", "news");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseFile(raw: string): { meta: Record<string, string>; body: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { meta: {}, body: text.trim() };
  }

  const meta: Record<string, string> = {};

  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf(":");

    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    meta[key] = value;
  }

  return { meta, body: match[2].trim() };
}

function readPost(slug: string, locale: Locale): NewsPost | null {
  if (!SLUG_PATTERN.test(slug)) return null;

  const file = path.join(NEWS_DIR, slug, `${locale}.md`);

  if (!fs.existsSync(file)) return null;

  const { meta, body } = parseFile(fs.readFileSync(file, "utf8"));

  if (meta.draft === "true") return null;

  if (!meta.title || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? "")) {
    console.warn(`[news] ${slug}/${locale}.md übersprungen: "title" und "date" (JJJJ-MM-TT) sind Pflicht.`);

    return null;
  }

  const page = meta.page && meta.page in routing.pathnames ? meta.page : undefined;

  return {
    slug,
    locale,
    title: meta.title,
    date: meta.date,
    category: meta.category ?? "",
    excerpt: meta.excerpt ?? "",
    image: meta.image || undefined,
    imageAlt: meta.imageAlt || undefined,
    page,
    body,
  };
}

function listSlugs(): string[] {
  if (!fs.existsSync(NEWS_DIR)) return [];

  return fs
    .readdirSync(NEWS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .filter((slug) => SLUG_PATTERN.test(slug));
}

/* Alle Beiträge einer Sprache, neueste zuerst. */
export function getAllPosts(locale: Locale): NewsPost[] {
  return listSlugs()
    .map((slug) => readPost(slug, locale))
    .filter((post): post is NewsPost => post !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string, locale: Locale): NewsPost | null {
  return readPost(slug, locale);
}

/* In welchen Sprachen es den Beitrag gibt (für hreflang). */
export function getPostLocales(slug: string): Locale[] {
  return routing.locales.filter((locale) => readPost(slug, locale) !== null);
}

/* Alle Kombinationen für die statische Erzeugung der Beitragsseiten. */
export function getStaticNewsParams(): { locale: Locale; slug: string }[] {
  return routing.locales.flatMap((locale) =>
    getAllPosts(locale)
      .filter((post) => !post.page)
      .map((post) => ({ locale, slug: post.slug })),
  );
}

export function formatNewsDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    day: locale === "de" ? "2-digit" : "numeric",
    month: locale === "de" ? "2-digit" : "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
