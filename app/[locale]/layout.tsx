import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { routing, type Locale } from "@/i18n/routing";
import { OG_LOCALE, SITE_URL } from "@/lib/seo";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/*
|--------------------------------------------------------------------------
| WURZEL-LAYOUT (pro Sprache)
|--------------------------------------------------------------------------
|
| Datei: app/[locale]/layout.tsx  (ersetzt app/layout.tsx)
|
| - setzt <html lang="de|en"> - wichtig für Suchmaschinen, Screenreader
|   und die Silbentrennung des Browsers,
| - lädt die Übersetzungen für Client-Komponenten,
| - liefert die Standard-Metadaten in der jeweiligen Sprache.
|
| Bewusst KEIN globales canonical mehr: Es zeigte vorher auf jeder Seite auf
| die Startseite. Jede Seite setzt ihr eigenes canonical (siehe lib/seo.ts).
|
*/

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Meta" });
  const siteName = t("siteName");
  const title = t("homeTitle");
  const description = t("homeDescription");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    icons: {
      icon: [
        { url: "/images/icons/icon-16.png", sizes: "16x16", type: "image/png" },
        { url: "/images/icons/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/images/icons/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/images/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/images/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title,
      description,
      siteName,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
      locale: OG_LOCALE[locale as Locale],
      alternateLocale: routing.locales
        .filter((code) => code !== locale)
        .map((code) => OG_LOCALE[code]),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  /* Ermöglicht statisches Rendern der Seiten. */
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
