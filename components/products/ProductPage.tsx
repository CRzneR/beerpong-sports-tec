import Image from "next/image";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatProPrice, PRO_CURRENCY, proPriceForSchema } from "@/lib/pricing";
import {
  OTHER_PRODUCT_TEASER,
  getProductContent,
  getProductUi,
  type ProductContent,
  type ProductFeature,
  type ProductSlug,
} from "@/lib/products/productContent";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

/*
|--------------------------------------------------------------------------
| PRODUKTSEITE (Pong Stats / Pong League)
|--------------------------------------------------------------------------
|
| Datei: components/products/ProductPage.tsx
|
| Eine Vorlage für beide Produktseiten. Texte und Bilder kommen aus
| lib/products/productContent.ts, die Seiten selbst
| (app/[locale]/produkte/pong-stats/page.tsx und .../pong-league/page.tsx)
| sind nur dünne Hüllen mit Metadaten.
|
| Reiner Server-Text mit festen HTML-Elementen: Google und KI-Suchen lesen
| den kompletten Inhalt, auch die FAQ (per <details>, ohne JavaScript).
|
| Die Akzentfarben stehen als vollständige Klassen-Strings im ACCENTS-Objekt,
| damit Tailwind sie beim Build zuverlässig findet.
|
*/

const ACCENTS = {
  stats: {
    text: "text-cyan-400",
    eyebrow: "text-cyan-400",
    primaryButton:
      "bg-cyan-400 text-black shadow-[0_0_28px_rgba(34,211,238,0.2)] hover:bg-cyan-300 hover:shadow-[0_0_38px_rgba(34,211,238,0.32)]",
    secondaryButton: "border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10",
    glow: "bg-cyan-400/[0.07]",
    frame: "border-cyan-400/20 shadow-[0_30px_80px_-30px_rgba(34,211,238,0.25)]",
    chip: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    check: "bg-cyan-400/10 text-cyan-400",
    card: "border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.07] via-white/[0.02] to-transparent",
    cardHover: "hover:border-cyan-400/30",
    stepNumber: "border-cyan-400/30 text-cyan-300",
    summaryHover: "hover:text-cyan-300",
    link: "text-cyan-300 hover:text-cyan-200",
  },
  league: {
    text: "text-yellow-400",
    eyebrow: "text-yellow-400",
    primaryButton:
      "bg-yellow-400 text-black shadow-[0_0_28px_rgba(250,204,21,0.2)] hover:bg-yellow-300 hover:shadow-[0_0_38px_rgba(250,204,21,0.32)]",
    secondaryButton: "border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/10",
    glow: "bg-yellow-400/[0.07]",
    frame: "border-yellow-400/20 shadow-[0_30px_80px_-30px_rgba(250,204,21,0.22)]",
    chip: "border-yellow-400/25 bg-yellow-400/10 text-yellow-300",
    check: "bg-yellow-400/10 text-yellow-400",
    card: "border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.07] via-white/[0.02] to-transparent",
    cardHover: "hover:border-yellow-400/30",
    stepNumber: "border-yellow-400/30 text-yellow-300",
    summaryHover: "hover:text-yellow-300",
    link: "text-yellow-300 hover:text-yellow-200",
  },
} as const;

/* Pfade: Produktseite (interner Schlüssel) und die App selbst. */
const PRODUCT_HREF = {
  stats: "/produkte/pong-stats",
  league: "/produkte/pong-league",
} as const;

const APP_HREF = {
  stats: "/spieler",
  league: "/turniere",
} as const;

function openLabel(locale: Locale, name: string): string {
  return locale === "en" ? `Open ${name}` : `${name} öffnen`;
}

function withPrice(text: string, locale: Locale): string {
  return text.replace("{price}", formatProPrice(locale));
}

/* --------------------------------------------------------------------------
 * Strukturierte Daten für Google
 * -------------------------------------------------------------------------- */

function buildJsonLd(content: ProductContent, locale: Locale) {
  const slug = content.slug;
  const pageUrl = absoluteUrl(locale, PRODUCT_HREF[slug]);
  const ui = getProductUi(locale);
  const features = content.groups.flatMap((group) => group.features);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${pageUrl}#app`,
        name: content.name,
        description: content.schemaDescription,
        url: pageUrl,
        applicationCategory: "SportsApplication",
        operatingSystem: "Web",
        inLanguage: locale === "de" ? "de-DE" : "en",
        image: `${SITE_URL}${content.hero.image.src}`,
        screenshot: features.map((feature) => `${SITE_URL}${feature.image.src}`),
        featureList: features.map((feature) => feature.title),
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: [
          {
            "@type": "Offer",
            name: content.plans.free.title,
            price: "0",
            priceCurrency: PRO_CURRENCY,
          },
          {
            "@type": "Offer",
            name: `${content.name} ${content.plans.pro.title}`,
            price: proPriceForSchema(),
            priceCurrency: PRO_CURRENCY,
            description: ui.noSubscription,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: content.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: withPrice(item.answer, locale) },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: ui.home,
            item: absoluteUrl(locale, "/"),
          },
          { "@type": "ListItem", position: 2, name: content.name, item: pageUrl },
        ],
      },
    ],
  };
}

/* --------------------------------------------------------------------------
 * Seite
 * -------------------------------------------------------------------------- */

export function ProductPage({ slug, locale }: { slug: ProductSlug; locale: Locale }) {
  const content = getProductContent(slug, locale);
  const ui = getProductUi(locale);
  const accent = ACCENTS[slug];
  const otherSlug: ProductSlug = slug === "stats" ? "league" : "stats";
  const other = getProductContent(otherSlug, locale);
  const otherAccent = ACCENTS[otherSlug];
  const jsonLd = buildJsonLd(content, locale);
  const price = formatProPrice(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Navbar />

      <main className="overflow-x-clip bg-[#050708] pt-20 text-white">
        {/* ---------------------------------------------------------------- HERO */}
        <section className="relative">
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 top-0 h-[460px] w-[900px] max-w-full -translate-x-1/2 rounded-full blur-[130px] ${accent.glow}`}
          />

          <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
            <nav aria-label={ui.breadcrumbLabel} className="mb-8 text-xs text-white/35">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/" className="transition hover:text-white">
                    {ui.home}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-white/60">
                  {content.name}
                </li>
              </ol>
            </nav>

            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-5">
                <div
                  className={`mb-5 text-xs font-bold uppercase tracking-[0.3em] ${accent.eyebrow}`}
                >
                  {content.hero.eyebrow}
                </div>

                <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                  {content.hero.title}
                  <br />
                  <span className={accent.text}>{content.hero.titleAccent}</span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
                  {content.hero.lead}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={APP_HREF[slug]}
                    className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-wide transition duration-300 hover:-translate-y-0.5 ${accent.primaryButton}`}
                  >
                    {openLabel(locale, content.name)}
                    <span aria-hidden="true">→</span>
                  </Link>

                  <a
                    href="#funktionen"
                    className={`inline-flex items-center rounded-full border px-6 py-3.5 text-sm font-bold uppercase tracking-wide transition ${accent.secondaryButton}`}
                  >
                    {ui.seeFeatures}
                  </a>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className={`overflow-hidden rounded-2xl border bg-[#080b0c] ${accent.frame}`}>
                  <Image
                    src={content.hero.image.src}
                    alt={content.hero.image.alt}
                    width={content.hero.image.width}
                    height={content.hero.image.height}
                    priority
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="h-auto w-full"
                  />
                </div>

                <p className="mt-3 text-center text-[11px] text-white/30">{content.imageNote}</p>
              </div>
            </div>

            {/* Kennzahlen */}
            <dl className="mt-16 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {content.quickFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
                >
                  <dt className={`text-2xl font-black tracking-tight sm:text-3xl ${accent.text}`}>
                    {fact.value}
                  </dt>
                  <dd className="mt-2 text-xs leading-snug text-white/50 sm:text-sm">
                    {fact.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ----------------------------------------------------------- FUNKTIONEN */}
        <div id="funktionen" className="scroll-mt-24">
          {content.groups.map((group, groupIndex) => (
            <section
              key={group.id}
              aria-labelledby={`group-${group.id}`}
              className={groupIndex % 2 === 0 ? "bg-[#070a0b]" : "bg-[#050708]"}
            >
              <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
                <div className="mx-auto max-w-3xl text-center">
                  {groupIndex === 0 && (
                    <div
                      className={`mb-4 text-xs font-bold uppercase tracking-[0.3em] ${accent.eyebrow}`}
                    >
                      {ui.featuresTitle}
                    </div>
                  )}

                  <h2
                    id={`group-${group.id}`}
                    className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.03em] sm:text-4xl lg:text-5xl"
                  >
                    {group.title}
                  </h2>

                  <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/50">
                    {group.intro}
                  </p>
                </div>

                <div className="mt-14 space-y-16 lg:mt-20 lg:space-y-24">
                  {group.features.map((feature, index) => (
                    <FeatureRow
                      key={feature.id}
                      feature={feature}
                      reverse={index % 2 === 1}
                      accent={slug}
                      labels={{ free: ui.planFree, pro: ui.planPro }}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* ----------------------------------------------------------- SO FUNKTIONIERT'S */}
        <section aria-labelledby="steps-title" className="bg-[#070a0b]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div
                className={`mb-4 text-xs font-bold uppercase tracking-[0.3em] ${accent.eyebrow}`}
              >
                {ui.stepsEyebrow}
              </div>

              <h2
                id="steps-title"
                className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.03em] sm:text-4xl lg:text-5xl"
              >
                {ui.stepsTitle}
              </h2>
            </div>

            <ol className="mt-14 grid gap-5 md:grid-cols-3">
              {content.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${accent.stepNumber}`}
                  >
                    {index + 1}
                  </span>

                  <h3 className="mt-5 text-lg font-black tracking-tight">{step.title}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-white/55">{step.text}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 flex flex-col items-center gap-4 text-center">
              <p className="max-w-md text-sm text-white/50">{ui.startFreeText}</p>

              <Link
                href={APP_HREF[slug]}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-wide transition duration-300 hover:-translate-y-0.5 ${accent.primaryButton}`}
              >
                {openLabel(locale, content.name)}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- KOSTENLOS & PRO */}
        <section aria-labelledby="plans-title" className="bg-[#050708]">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div
                className={`mb-4 text-xs font-bold uppercase tracking-[0.3em] ${accent.eyebrow}`}
              >
                {ui.plansEyebrow}
              </div>

              <h2
                id="plans-title"
                className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.03em] sm:text-4xl lg:text-5xl"
              >
                {ui.plansTitle}
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/50">
                {ui.plansNote}
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2">
              <PlanCard
                title={content.plans.free.title}
                text={content.plans.free.text}
                items={content.plans.free.items}
                checkClass="bg-white/[0.06] text-white/70"
                className="border-white/[0.1] bg-white/[0.025]"
              />

              <PlanCard
                title={content.plans.pro.title}
                text={content.plans.pro.text}
                items={content.plans.pro.items}
                checkClass={accent.check}
                className={accent.card}
                price={price}
                priceNote={`${ui.oneTime} · ${ui.noSubscription}`}
                priceClass={accent.text}
              />
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- FAQ */}
        <section aria-labelledby="faq-title" className="bg-[#070a0b]">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="text-center">
              <div
                className={`mb-4 text-xs font-bold uppercase tracking-[0.3em] ${accent.eyebrow}`}
              >
                {ui.faqEyebrow}
              </div>

              <h2
                id="faq-title"
                className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.03em] sm:text-4xl lg:text-5xl"
              >
                {ui.faqTitle}
              </h2>
            </div>

            <div className="mt-12 divide-y divide-white/[0.08] rounded-3xl border border-white/[0.08] bg-white/[0.02]">
              {content.faq.map((item) => (
                <details key={item.question} className="group px-6 py-5 sm:px-7">
                  <summary
                    className={`flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-bold text-white transition [&::-webkit-details-marker]:hidden ${accent.summaryHover}`}
                  >
                    {item.question}

                    <span
                      aria-hidden="true"
                      className="shrink-0 text-xl leading-none text-white/40 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>

                  <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-[15px]">
                    {withPrice(item.answer, locale)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- ABSCHLUSS */}
        <section className="bg-[#050708]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="grid gap-5 lg:grid-cols-2">
              <div
                className={`relative overflow-hidden rounded-[2rem] border p-8 sm:p-10 ${accent.card}`}
              >
                <h2 className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.03em] sm:text-4xl">
                  {ui.ctaTitle}
                </h2>

                <p className="mt-4 max-w-md text-base leading-relaxed text-white/55">
                  {ui.ctaText}
                </p>

                <Link
                  href={APP_HREF[slug]}
                  className={`mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-wide transition duration-300 hover:-translate-y-0.5 ${accent.primaryButton}`}
                >
                  {openLabel(locale, content.name)}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div
                className={`relative overflow-hidden rounded-[2rem] border p-8 transition sm:p-10 ${otherAccent.card} ${otherAccent.cardHover}`}
              >
                <div
                  className={`text-xs font-bold uppercase tracking-[0.3em] ${otherAccent.eyebrow}`}
                >
                  {ui.otherTitle}
                </div>

                <h2 className="mt-4 text-3xl font-black uppercase leading-[0.98] tracking-[-0.03em] sm:text-4xl">
                  {other.name}
                </h2>

                <p className="mt-4 max-w-md text-base leading-relaxed text-white/55">
                  {OTHER_PRODUCT_TEASER[slug][locale]}
                </p>

                <Link
                  href={PRODUCT_HREF[otherSlug]}
                  className={`mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide transition ${otherAccent.link}`}
                >
                  {ui.otherCta}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <p className="mt-10 text-center text-sm text-white/35">
              <Link href="/regeln" className="underline-offset-4 transition hover:text-white hover:underline">
                {ui.rulesLink}
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* --------------------------------------------------------------------------
 * Bausteine
 * -------------------------------------------------------------------------- */

function FeatureRow({
  feature,
  reverse,
  accent,
  labels,
}: {
  feature: ProductFeature;
  reverse: boolean;
  accent: ProductSlug;
  labels: { free: string; pro: string };
}) {
  const styles = ACCENTS[accent];
  const isTall = feature.image.height / feature.image.width > 0.9;
  const isPro = feature.plan === "pro";

  return (
    <article className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
      <div className={`lg:col-span-5 ${reverse ? "lg:order-2" : "lg:order-1"}`}>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
            isPro ? styles.chip : "border-white/15 bg-white/[0.04] text-white/60"
          }`}
        >
          {isPro ? labels.pro : labels.free}
        </span>

        <h3 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">{feature.title}</h3>

        <p className="mt-4 text-base leading-relaxed text-white/60">{feature.text}</p>

        <ul className="mt-6 space-y-3">
          {feature.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 text-sm leading-relaxed text-white/75">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${styles.check}`}
              >
                ✓
              </span>

              {bullet}
            </li>
          ))}
        </ul>
      </div>

      <div className={`lg:col-span-7 ${reverse ? "lg:order-1" : "lg:order-2"}`}>
        <div
          className={`overflow-hidden rounded-2xl border bg-[#080b0c] ${styles.frame} ${
            isTall ? "mx-auto max-w-md" : ""
          }`}
        >
          <Image
            src={feature.image.src}
            alt={feature.image.alt}
            width={feature.image.width}
            height={feature.image.height}
            loading="lazy"
            sizes={isTall ? "(min-width: 768px) 28rem, 100vw" : "(min-width: 1024px) 58vw, 100vw"}
            className="h-auto w-full"
          />
        </div>
      </div>
    </article>
  );
}

function PlanCard({
  title,
  text,
  items,
  checkClass,
  className,
  price,
  priceNote,
  priceClass,
}: {
  title: string;
  text: string;
  items: string[];
  checkClass: string;
  className: string;
  price?: string;
  priceNote?: string;
  priceClass?: string;
}) {
  return (
    <div className={`rounded-3xl border p-7 sm:p-9 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-2xl font-black uppercase tracking-tight">{title}</h3>

        {price && <div className={`text-2xl font-black ${priceClass}`}>{price}</div>}
      </div>

      <p className="mt-2 text-sm text-white/50">{text}</p>

      {priceNote && <p className="mt-1 text-xs text-white/35">{priceNote}</p>}

      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-white/75">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${checkClass}`}
            >
              ✓
            </span>

            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
