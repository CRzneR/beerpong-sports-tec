import type { Metadata } from "next";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PlatformSection } from "@/components/landing/PlatformSection";
import { CommunityStats } from "@/components/landing/CommunityStats";
import { CommunitySection } from "@/components/landing/CommunitySection";
import { Footer } from "@/components/landing/Footer";

const SITE_URL = "https://www.beerpongsportstec.de";
const SITE_NAME = "BeerPongSportsTec";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "de-DE",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function Home() {
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
        <CommunityStats />
        <CommunitySection />
      </main>

      <Footer />
    </>
  );
}
