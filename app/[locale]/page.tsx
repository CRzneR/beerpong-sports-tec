import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PlatformSection } from "@/components/landing/PlatformSection";
import { RulesSection } from "@/components/landing/RulesSection";
import { CommunityStats } from "@/components/landing/CommunityStats";
import { CommunitySection } from "@/components/landing/CommunitySection";
import { Footer } from "@/components/landing/Footer";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL, absoluteUrl, pageAlternates } from "@/lib/seo";

const SITE_NAME = "BeerPongSportsTec";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Meta" });

  return {
    title: { absolute: t("homeTitle") },
    description: t("homeDescription"),
    alternates: pageAlternates(locale as Locale, "/"),
    openGraph: { url: absoluteUrl(locale as Locale, "/") },
  };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Meta" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/images/landing/pong-stats-logo.png`,
        address: {
          "@type": "PostalAddress",
          addressLocality: "München",
          addressRegion: "Bayern",
          addressCountry: "DE",
        },
        // TODO: Social-Profile eintragen, falls vorhanden
        // sameAs: ["https://www.instagram.com/…"],
      },
      {
        "@type": "WebSite",
        "@id": `${absoluteUrl(locale as Locale, "/")}#website`,
        url: absoluteUrl(locale as Locale, "/"),
        name: SITE_NAME,
        description: t("homeDescription"),
        inLanguage: locale === "de" ? "de-DE" : "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <Navbar />

      <main>
        <Hero />
        <PlatformSection />
        <RulesSection />
        <CommunityStats />
        <CommunitySection />
      </main>

      <Footer />
    </>
  );
}
