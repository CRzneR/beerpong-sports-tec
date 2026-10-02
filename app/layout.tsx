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
const description =
  "Beer-Pong-Matches live erfassen, Statistiken verfolgen und Turniere mit Gruppenphase und Tabellen organisieren - alles an einem Ort.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} - Beer Pong Statistiken & Turniere`,
    template: `%s | ${siteName}`,
  },
  description,
  alternates: {
    canonical: siteUrl,
  },
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
    title: `${siteName} - Beer Pong Statistiken & Turniere`,
    description,
    url: siteUrl,
    siteName,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - Beer Pong Statistiken & Turniere`,
    description,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
