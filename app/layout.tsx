import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://www.beerpongsportstec.de";
const siteName = "BeerPongSportsTec";
const title = `${siteName} - Beer Pong Statistiken & Turniere`;
const description =
  "Beer-Pong-Matches live erfassen, Statistiken verfolgen und Turniere mit Gruppenphase und Tabellen organisieren - alles an einem Ort.";

const ogImage = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: title,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${siteName}`,
  },
  description,
  // Kein alternates.canonical hier: Er würde an jede Unterseite vererbt.
  // Der Canonical wird pro Seite gesetzt (Startseite: "/").
  icons: {
    icon: [
      { url: "/images/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/images/icons/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/icons/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName,
    images: [ogImage],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage.url],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
