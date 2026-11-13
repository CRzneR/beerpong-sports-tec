"use client";

import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link, usePathname } from "@/i18n/navigation";

/*
 * usePathname aus @/i18n/navigation liefert den internen Pfad OHNE Sprache
 * ("/spieler" auch unter /en/pong-stats) - die Aktiv-Erkennung bleibt
 * deshalb in beiden Sprachen gleich.
 */

const navItems = [
  { key: "home", href: "/" },
  { key: "playerStats", href: "/spieler" },
  { key: "news", href: "/news" },
  { key: "contact", href: "/kontakt" },
  { key: "about", href: "/about" },
] as const;

/* Startseite nur bei exakt "/", alle anderen auch bei Unterseiten (z. B. /spieler/123) */
function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
            <img
              src="/images/icons/LogoBST.png"
              alt={t("logoAlt")}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="leading-none">
            <div className="text-sm font-black tracking-wider text-white">BEERPONG</div>

            <div className="mt-1 text-[10px] font-medium tracking-[0.25em] text-emerald-400">
              SPORTS TEC
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav aria-label={t("mainNavigation")} className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => {
            const active = isActive(item.href, pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`text-sm font-medium transition ${
                  active ? "text-emerald-400" : "text-white/60 hover:text-white"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <Link
            href="/login"
            className="rounded-full bg-emerald-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-emerald-300 sm:px-5 sm:text-sm"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </header>
  );
}
