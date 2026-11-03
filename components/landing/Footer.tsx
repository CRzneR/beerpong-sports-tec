import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Footer");
  const navT = useTranslations("Nav");

  return (
    <footer className="border-t border-white/[0.08] bg-[#030506]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Main Footer */}
        <div className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
                {/* Wichtig: mit führendem "/" - ohne den Schrägstrich würde das Logo unter /en/... nicht laden. */}
                <img
                  src="/images/icons/LogoBST.png"
                  alt={navT("logoAlt")}
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

            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/35">
              {t("description")}
            </p>

            <div className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/20">
              {t("tagline")}
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              {t("products")}
            </h3>

            <nav className="mt-5 space-y-3">
              <FooterLink href="/turniere">Pong League</FooterLink>

              <FooterLink href="/spieler">Pong Stats</FooterLink>
            </nav>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              {t("company")}
            </h3>

            <nav className="mt-5 space-y-3">
              <FooterLink href="/about">{t("about")}</FooterLink>

              <FooterLink href="/kontakt">{t("contact")}</FooterLink>

              <FooterLink href="/community">{t("community")}</FooterLink>
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-5 border-t border-white/[0.08] py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-white/25">
            {t("rights", { year: new Date().getFullYear() })}
          </div>

          <div className="flex flex-wrap gap-5">
            <Link
              href="/impressum"
              className="text-xs text-white/25 transition hover:text-white/60"
            >
              {t("imprint")}
            </Link>

            <Link
              href="/datenschutz"
              className="text-xs text-white/25 transition hover:text-white/60"
            >
              {t("privacy")}
            </Link>

            <Link href="/agb" className="text-xs text-white/25 transition hover:text-white/60">
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------
   Footer Link
------------------------------------------------------- */

function FooterLink({
  href,
  children,
}: {
  href: "/turniere" | "/spieler" | "/about" | "/kontakt" | "/community";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block text-sm text-white/45 transition duration-200 hover:translate-x-1 hover:text-white"
    >
      {children}
    </Link>
  );
}
