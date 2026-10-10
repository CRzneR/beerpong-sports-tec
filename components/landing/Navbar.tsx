"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Startseite", href: "/" },
  { label: "Spieler & Stats", href: "/spieler" },
  { label: "Community", href: "/community" },
  { label: "Kontakt", href: "/kontakt" },
  { label: "Über uns", href: "/about" },
];

/* Startseite nur bei exakt "/", alle anderen auch bei Unterseiten (z. B. /spieler/123) */
function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
            <img
              src="/images/icons/LogoBST.png"
              alt="Logo"
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
        <nav className="hidden items-center gap-8 md:flex">
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
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5 sm:block"
          >
            Login
          </Link>

          <Link
            href="/registrieren"
            className="rounded-full bg-emerald-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-emerald-300 sm:px-5 sm:text-sm"
          >
            Jetzt starten
            <span className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
