import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Gem, ShieldCheck, Trophy } from "lucide-react";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { PodiumTrophies } from "@/components/features/PodiumTrophies";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL, absoluteUrl, pageAlternates } from "@/lib/seo";

/*
 * --------------------------------------------------------------------------
 * | POKALE & CHAMPIONSHIP RINGS  (Feature-Seite im Stil der Landingpage)
 * --------------------------------------------------------------------------
 *
 * Route: /pokale-ringe (Deutsch) und /en/trophies-and-rings (Englisch)
 * Datei: app/[locale]/pokale-ringe/page.tsx
 *
 * Texte: messages/de.json und messages/en.json unter "Trophies".
 * Bilder: public/images/features/ (Hero, Ring). Die Pokale sind SVG
 * (components/features/PodiumTrophies.tsx).
 *
 * Aufbau: Kopf mit Bild, Highlight (3 Karten), Championship Rings, Pokale,
 * "So funktioniert's" (3 Schritte) und Abschluss-Banner mit Link zu
 * "Neues Turnier".
 * --------------------------------------------------------------------------
 */

const PUBLISHED = "2026-11-10";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/pokale-ringe">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Meta" });

  return {
    title: { absolute: t("trophiesTitle") },
    description: t("trophiesDescription"),
    alternates: pageAlternates(locale as Locale, "/pokale-ringe"),
    openGraph: {
      url: absoluteUrl(locale as Locale, "/pokale-ringe"),
      type: "article",
      publishedTime: PUBLISHED,
      images: [{ url: `${SITE_URL}/images/features/pokale-ringe-hero.webp`, width: 1600, height: 901 }],
    },
  };
}

type TextCard = { title: string; text: string };

const CARD_ICONS = [Trophy, Gem, ShieldCheck] as const;

/* Grüner Haken-Kreis für die Aufzählungen */
function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-7 space-y-3.5">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3.5 text-sm font-medium text-white/80 sm:text-base">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-black">
            <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">{children}</div>
  );
}

export default async function PokaleRingePage({ params }: PageProps<"/[locale]/pokale-ringe">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Trophies" });
  const meta = await getTranslations({ locale, namespace: "Meta" });
  const common = await getTranslations({ locale, namespace: "Common" });

  const cards = t.raw("highlight.cards") as TextCard[];
  const ringBullets = t.raw("rings.bullets") as string[];
  const trophyBullets = t.raw("trophies.bullets") as string[];
  const steps = t.raw("how.steps") as TextCard[];
  const places = t.raw("trophies.places") as string[];

  const dateLabel = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    day: "numeric",
    month: locale === "de" ? "2-digit" : "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${PUBLISHED}T00:00:00Z`));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${t("title1")} ${t("title2")}`,
    description: meta("trophiesDescription"),
    image: `${SITE_URL}/images/features/pokale-ringe-hero.webp`,
    datePublished: PUBLISHED,
    inLanguage: locale === "de" ? "de-DE" : "en",
    mainEntityOfPage: absoluteUrl(locale as Locale, "/pokale-ringe"),
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
        {/* KOPF */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 top-10 h-[460px] w-[640px] rounded-full bg-emerald-400/[0.07] blur-[130px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8 lg:py-20">
            <div>
              <Link
                href="/"
                className="group inline-flex items-center gap-2 text-xs font-semibold text-white/35 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                {common("backHome")}
              </Link>

              <div className="mt-8 flex items-center gap-4">
                <span className="rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black">
                  {t("badge")}
                </span>

                <time dateTime={PUBLISHED} className="border-l border-white/15 pl-4 text-sm text-white/45">
                  {dateLabel}
                </time>
              </div>

              <h1 className="mt-6 text-4xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.4rem]">
                {t("title1")}
                <span className="mt-1 block text-emerald-400">{t("title2")}</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/50 lg:text-lg">
                {t("intro")}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-emerald-400/15 shadow-[0_0_60px_rgba(52,211,153,0.10)]">
              <Image
                src="/images/features/pokale-ringe-hero.webp"
                alt={t("imageAlt")}
                width={1600}
                height={901}
                priority
                sizes="(min-width: 1024px) 640px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* HIGHLIGHT */}
        <section className="border-t border-white/[0.06]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1.35fr] lg:items-center lg:gap-14 lg:px-8 lg:py-24">
            <div>
              <Eyebrow>{t("highlight.eyebrow")}</Eyebrow>

              <h2 className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                {t("highlight.title1")}
                <span className="block text-white/35">{t("highlight.title2")}</span>
              </h2>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/45">
                {t("highlight.text")}
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-3">
              {cards.map((card, index) => {
                const Icon = CARD_ICONS[index % CARD_ICONS.length];

                return (
                  <li
                    key={card.title}
                    className="flex flex-col items-center rounded-3xl border border-emerald-400/15 bg-white/[0.02] p-6 text-center transition duration-300 hover:border-emerald-400/35"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-400">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="mt-5 text-sm font-black uppercase tracking-wide text-white">
                      {card.title}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-white/50">{card.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* CHAMPIONSHIP RINGS */}
        <section className="relative overflow-hidden border-t border-white/[0.06]">
          <div className="pointer-events-none absolute right-0 top-1/2 h-[420px] w-[560px] -translate-y-1/2 rounded-full bg-emerald-400/[0.06] blur-[120px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
            <div>
              <Eyebrow>{t("rings.eyebrow")}</Eyebrow>

              <h2 className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                {t("rings.title")}
              </h2>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/45">{t("rings.text")}</p>

              <CheckList items={ringBullets} />
            </div>

            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/15 lg:max-w-none">
              <Image
                src="/images/features/ring.webp"
                alt={t("rings.imageAlt")}
                width={520}
                height={540}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* POKALE */}
        <section className="border-t border-white/[0.06]">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
            <div
              className="relative order-2 overflow-hidden rounded-3xl border border-emerald-400/15 bg-gradient-to-b from-emerald-400/[0.07] to-white/[0.01] px-6 pb-6 pt-10 lg:order-1"
              role="img"
              aria-label={t("trophies.imageAlt")}
            >
              <PodiumTrophies className="h-auto w-full" />

              <div className="mt-2 grid grid-cols-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                {places.map((place) => (
                  <div key={place}>{place}</div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <Eyebrow>{t("trophies.eyebrow")}</Eyebrow>

              <h2 className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                {t("trophies.title")}
              </h2>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/45">
                {t("trophies.text")}
              </p>

              <CheckList items={trophyBullets} />
            </div>
          </div>
        </section>

        {/* SO FUNKTIONIERT'S */}
        <section className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
            <Eyebrow>{t("how.eyebrow")}</Eyebrow>

            <h2 className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              {t("how.title")}
            </h2>

            <ol className="mt-10 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch md:gap-3 lg:gap-5">
              {steps.flatMap((step, index) => {
                const item = (
                  <li
                    key={step.title}
                    className="rounded-3xl border border-emerald-400/15 bg-white/[0.02] p-6 transition duration-300 hover:border-emerald-400/35"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-black">
                        {index + 1}
                      </span>

                      <h3 className="text-sm font-black uppercase tracking-wide text-white">
                        {step.title}
                      </h3>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-white/50">{step.text}</p>
                  </li>
                );

                if (index === steps.length - 1) return [item];

                return [
                  item,
                  <li
                    key={`arrow-${index}`}
                    aria-hidden="true"
                    className="hidden items-center justify-center text-emerald-400/70 md:flex"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </li>,
                ];
              })}
            </ol>
          </div>
        </section>

        {/* ABSCHLUSS */}
        <section className="px-6 pb-20 lg:px-8 lg:pb-28">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-emerald-400/20 bg-white/[0.02]">
            {/* Ring als Hintergrund rechts, blendet nach links aus */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] md:block"
              style={{
                WebkitMaskImage: "linear-gradient(to left, #000 20%, transparent 100%)",
                maskImage: "linear-gradient(to left, #000 20%, transparent 100%)",
              }}
              aria-hidden="true"
            >
              <Image
                src="/images/features/ring.webp"
                alt=""
                fill
                sizes="560px"
                className="object-cover object-center opacity-45"
              />
            </div>

            <div className="relative flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-12">
              <div className="max-w-xl">
                <h2 className="text-2xl font-black uppercase leading-tight tracking-[-0.03em] text-white sm:text-3xl lg:text-4xl">
                  {t("cta.title")}
                </h2>

                <p className="mt-4 text-base leading-relaxed text-white/55">{t("cta.text")}</p>
              </div>

              <Link
                href="/turniere/neu"
                className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-emerald-400 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_25px_rgba(52,211,153,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-[0_0_35px_rgba(52,211,153,0.3)] md:self-auto"
              >
                {t("cta.button")}

                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
