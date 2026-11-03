import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function RulesLink() {
  const t = useTranslations("Rules");

  return (
    <Link
      href="/regeln"
      aria-label={t("linkAria")}
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2 text-[9px] font-black uppercase tracking-wider text-white/50 transition hover:bg-white/[0.08] hover:text-white md:px-3"
    >
      <span className="md:hidden">?</span>
      <span className="hidden md:inline">{t("linkLabel")}</span>
    </Link>
  );
}
