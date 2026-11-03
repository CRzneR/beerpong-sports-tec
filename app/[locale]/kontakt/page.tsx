import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Lightbulb,
  Mail,
  MapPin,
  MessageSquare,
  Users,
} from "lucide-react";

import ContactForm from "@/components/kontakt/ContactForm";
import FaqList from "@/components/kontakt/FaqList";
import { Navbar } from "@/components/landing/Navbar";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { OG_LOCALE, SITE_URL, absoluteUrl, pageAlternates } from "@/lib/seo";

/*
 * Route: /kontakt (Deutsch) und /en/contact (Englisch)
 * Datei: app/[locale]/kontakt/page.tsx
 *
 * Texte: messages/de.json und messages/en.json, Bereich "Contact".
 * SITE_URL kommt jetzt aus lib/seo.ts (mit www, wie in der Search Console).
 */

const BRAND = "BeerPong Sports Tec";

// TODO: Echte Kontaktdaten eintragen (werden auch für die strukturierten Daten genutzt)
const EMAIL = "kontakt@beerpongsportstec.de";
const PHONE = "+49 151 23456789";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/kontakt">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Contact" });
  const url = absoluteUrl(locale as Locale, "/kontakt");

  return {
    // "absolute" verhindert, dass ein Titel-Template aus dem Layout die Marke doppelt anhängt
    title: { absolute: t("metaTitle", { brand: BRAND }) },
    description: t("metaDescription"),
    alternates: pageAlternates(locale as Locale, "/kontakt"),
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale as Locale],
      siteName: BRAND,
      url,
      title: t("metaTitle", { brand: BRAND }),
      description: t("metaDescription"),
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
  };
}

// TODO: Durch die echte Adresse ersetzen, z. B. "Musterstraße 1, 80331 München"
const MAPS_TARGET = "Marienplatz, München";
const MAPS_QUERY = encodeURIComponent(MAPS_TARGET);

const mapLabels = [
  { text: "Schwabing", className: "left-[8%] top-[16%]" },
  { text: "Bogenhausen", className: "right-[6%] top-[8%]" },
  { text: "Pasing", className: "left-[2%] top-[52%]" },
  { text: "Sendling", className: "left-[18%] top-[74%]" },
  { text: "Giesing", className: "right-[10%] top-[76%]" },
  { text: "Thalkirchen", className: "left-[4%] bottom-[6%]" },
];

export default async function KontaktPage({ params }: PageProps<"/[locale]/kontakt">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Contact" });
  const pageUrl = absoluteUrl(locale as Locale, "/kontakt");

  const highlights = [
    { icon: MessageSquare, label: t("highlightFast") },
    { icon: Users, label: t("highlightDirect") },
    { icon: Lightbulb, label: t("highlightIdeas") },
  ];

  const contactItems = [
    {
      icon: Mail,
      label: t("itemEmail"),
      value: EMAIL,
      href: `mailto:${EMAIL}`,
    },
    {
      icon: MapPin,
      label: t("itemLocation"),
      value: t("itemLocationValue"),
      href: `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`,
    },
  ];

  // Strukturierte Daten (JSON-LD): Organisation + Kontaktseite
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BRAND,
        url: SITE_URL,
        email: EMAIL,
        telephone: PHONE,
        address: {
          "@type": "PostalAddress",
          addressLocality: "München",
          addressRegion: "Bayern",
          addressCountry: "DE",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: EMAIL,
          telephone: PHONE,
          areaServed: "DE",
          availableLanguage: ["de", "en"],
        },
      },
      {
        "@type": "ContactPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: t("metaTitle", { brand: BRAND }),
        description: t("metaDescription"),
        inLanguage: locale === "de" ? "de-DE" : "en",
        about: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <div className="bg-[#050b0a] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <Navbar />

      <main>
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
        >
          <span aria-hidden="true" className="transition-transform group-hover:-translate-x-1">
            ←
          </span>
          {t("backHome")}
        </Link>

        {/* ───────── Hero ───────── */}
        <section className="relative overflow-hidden">
          <Image
            src="/images/landing/hero-background.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_center] md:object-center"
          />
          {/* Overlay: mobil flächig, ab md als Verlauf von links */}
          <div className="absolute inset-0 bg-[#050b0a]/75 md:hidden" aria-hidden="true" />
          <div
            className="absolute inset-0 hidden bg-gradient-to-r from-[#050b0a] via-[#050b0a]/70 to-transparent md:block"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050b0a] to-transparent"
            aria-hidden="true"
          />

          <div className="relative px-5 py-14 md:px-[6.5vw] md:py-20 lg:py-24">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
                {t("eyebrow")}
              </p>
              <h1 className="mt-4 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-6xl">
                {t("title1")}
                <br />
                {t("title2")}
                <br />
                <span className="text-[#2EF2B0]">{t("title3")}</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/70 md:text-lg">
                {t("intro")}
              </p>

              <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                {highlights.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex max-w-[7.5rem] flex-col gap-2">
                    <Icon className="size-6 text-[#2EF2B0]" aria-hidden="true" />
                    <span className="text-xs leading-snug text-white/70">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 pb-16 md:px-[6.5vw] md:pb-24">
          {/* ───────── Kontaktdaten + Formular ───────── */}
          <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
            <div className="rounded-2xl border border-white/10 bg-[#0a1312] p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
                {t("detailsEyebrow")}
              </p>
              <h2 className="mt-4 text-2xl font-bold leading-tight md:text-3xl">
                {t("detailsTitle1")}
                <br />
                {t("detailsTitle2")}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                {t("detailsText")}
              </p>

              <ul className="mt-8 flex flex-col gap-3">
                {contactItems.map(({ icon: Icon, label, value, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-[#2EF2B0]/40 hover:bg-[#2EF2B0]/[0.04]"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#2EF2B0]/10 text-[#2EF2B0]">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-white/60">{label}</span>
                        <span className="block truncate text-sm font-medium text-white">
                          {value}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-[#2EF2B0] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0a1312] p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
                {t("formEyebrow")}
              </p>
              <h2 className="mt-4 text-2xl font-bold leading-tight md:text-3xl">
                {t("formTitle")}
              </h2>
              <p className="mt-3 text-sm text-white/60">
                {t("formText")}
              </p>
              <ContactForm />
            </div>
          </section>

          {/* ───────── Standort ───────── */}
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1312]">
            <div className="grid md:grid-cols-3">
              <div className="flex flex-col items-start justify-center p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
                  {t("locationEyebrow")}
                </p>
                <h2 className="mt-4 text-2xl font-bold md:text-3xl">{t("locationTitle")}</h2>
                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  {t("locationText")}
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2EF2B0] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2EF2B0] hover:text-[#04120e]"
                >
                  {t("route")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </div>

              {/* Karten-Platzhalter (kann später durch ein echtes Kartenbild ersetzt werden) */}
              <div
                className="relative min-h-[220px] bg-[#071110] md:min-h-[280px]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(46,242,176,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(46,242,176,0.05) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
                role="img"
                aria-label={t("mapAria")}
              >
                {mapLabels.map((label) => (
                  <span
                    key={label.text}
                    className={`absolute text-[10px] uppercase tracking-[0.15em] text-white/30 ${label.className}`}
                  >
                    {label.text}
                  </span>
                ))}
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
                  <MapPin className="size-8 text-[#2EF2B0]" aria-hidden="true" />
                  <span className="text-lg font-semibold">{t("mapCity")}</span>
                </div>
              </div>

              <div className="relative min-h-[220px] md:min-h-[280px]">
                <Image
                  src="/images/landing/.jpg"
                  alt={t("loungeAlt", { brand: BRAND })}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-b from-[#0a1312] via-transparent to-transparent md:bg-gradient-to-r"
                  aria-hidden="true"
                />
              </div>
            </div>
          </section>

          {/* ───────── FAQ ───────── */}
          <section className="grid gap-8 py-6 md:grid-cols-2 md:gap-12 md:py-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
                {t("faqEyebrow")}
              </p>
              <h2 className="mt-4 text-2xl font-bold md:text-3xl">{t("faqTitle")}</h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
                {t("faqText")}
              </p>
              <Link
                href="/faq"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2EF2B0] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2EF2B0] hover:text-[#04120e]"
              >
                {t("faqAll")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <FaqList />
          </section>
        </div>
      </main>
    </div>
  );
}
