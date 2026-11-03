"use client";

import { useLocale, useTranslations } from "next-intl";
import NextLink from "next/link";
import { useParams } from "next/navigation";

import { getPathname, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/*
 * Sprachumschalter "DE | EN".
 *
 * Bewusst echte Links (kein Button mit Skript): Suchmaschinen können ihnen
 * folgen, und er führt auf der gleichen Seite in die andere Sprache
 * (/regeln <-> /en/rules, auch bei Turnier-IDs).
 *
 * Die Zieladresse wird fertig berechnet (getPathname) und mit dem normalen
 * next/link verlinkt. Der Link aus @/i18n/navigation würde für Deutsch "/de/..."
 * erzeugen, das erst per Weiterleitung zu "/..." wird.
 */

type Href = Parameters<typeof getPathname>[0]["href"];

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams();
  const t = useTranslations("LanguageSwitcher");

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex items-center rounded-full border border-white/15 p-0.5 text-[11px] font-bold"
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        /* pathname und params passen zusammen, TypeScript kann das aber nicht pro Seite prüfen. */
        const href = getPathname({ locale: code, href: { pathname, params } as Href });

        return (
          <NextLink
            key={code}
            href={href}
            hrefLang={code}
            lang={code}
            aria-current={active ? "true" : undefined}
            aria-label={active ? undefined : t("switchTo", { language: t(code) })}
            className={`rounded-full px-2.5 py-1.5 uppercase tracking-wide transition ${
              active ? "bg-emerald-400 text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {code}
          </NextLink>
        );
      })}
    </div>
  );
}
