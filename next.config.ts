import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/*
 * Englische Adressen, deren Seite noch deutschen Text zeigt.
 *
 * Solange eine Seite nicht übersetzt ist, bekommt ihre /en-Adresse den Header
 * "X-Robots-Tag: noindex" - Google nimmt sie dann nicht als zweite, englisch
 * beschriftete Kopie derselben deutschen Seite in den Index auf.
 *
 * Sobald du eine Seite übersetzt hast: ihren Eintrag hier LÖSCHEN.
 */
const UNTRANSLATED_EN_PATHS = [
  "/en/pong-stats",
  "/en/pong-league",
  "/en/legal-notice",
  "/en/privacy",
];

const nextConfig: NextConfig = {
  async headers() {
    return UNTRANSLATED_EN_PATHS.map((path) => ({
      source: `${path}/:rest*`,
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    }));
  },
};

export default withNextIntl(nextConfig);
