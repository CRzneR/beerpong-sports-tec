import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ProductPage } from "@/components/products/ProductPage";
import { routing, type Locale } from "@/i18n/routing";
import { getProductContent } from "@/lib/products/productContent";
import { OG_LOCALE, SITE_URL, absoluteUrl, pageAlternates } from "@/lib/seo";

/*
 * --------------------------------------------------------------------------
 * | PRODUKTSEITE PONG STATS
 * --------------------------------------------------------------------------
 *
 * Route: /produkte/pong-stats (Deutsch) und /en/products/pong-stats (Englisch)
 * Datei: app/[locale]/produkte/pong-stats/page.tsx
 *
 * Öffentliche, indexierbare Seite mit Funktionen, Vorschaubildern, Preis und
 * FAQ. Die App selbst (/spieler) bleibt für Suchmaschinen gesperrt (noindex),
 * damit Google diese Seite als Einstieg zeigt und nicht den Login-Bereich.
 *
 * Texte und Bilder: lib/products/productContent.ts
 * Aufbau: components/products/ProductPage.tsx
 * --------------------------------------------------------------------------
 */

const HREF = "/produkte/pong-stats" as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/produkte/pong-stats">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const content = getProductContent("stats", locale as Locale);
  /* Eigenes Vorschaubild 1200x630 für Google, WhatsApp & Co. (public/images/products/og-*.png) */
  const ogImage = {
    url: `${SITE_URL}/images/products/og-pong-stats-${locale}.png`,
    width: 1200,
    height: 630,
    alt: content.hero.image.alt,
  };

  return {
    title: { absolute: content.metaTitle },
    description: content.metaDescription,
    alternates: pageAlternates(locale as Locale, HREF),
    openGraph: {
      type: "website",
      url: absoluteUrl(locale as Locale, HREF),
      siteName: "BeerPongSportsTec",
      title: content.metaTitle,
      description: content.metaDescription,
      locale: OG_LOCALE[locale as Locale],
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: content.metaTitle,
      description: content.metaDescription,
      images: [ogImage.url],
    },
  };
}

export default async function StatsProductPage({
  params,
}: PageProps<"/[locale]/produkte/pong-stats">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <ProductPage slug="stats" locale={locale as Locale} />;
}
