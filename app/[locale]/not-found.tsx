import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050708] px-5 text-center text-white">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-400">404</p>
      <h1 className="mt-4 text-3xl font-black uppercase sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-white/55">{t("text")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-black hover:bg-emerald-300"
      >
        {t("home")}
      </Link>
    </main>
  );
}
