import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/*
 * --------------------------------------------------------------------------
 * | REGELN & SPIELWEISE (Startseite)
 * --------------------------------------------------------------------------
 */

type Step = { title: string; text: string };
type Score = { label: string; value: string };

const accents = [
  {
    card: "border-emerald-400/15 hover:border-emerald-400/35",
    number: "text-emerald-400/70",
  },
  {
    card: "border-pink-400/15 hover:border-pink-400/35",
    number: "text-pink-400/80",
  },
  {
    card: "border-emerald-400/15 hover:border-emerald-400/35",
    number: "text-emerald-400/70",
  },
  {
    card: "border-pink-400/15 hover:border-pink-400/35",
    number: "text-pink-400/80",
  },
] as const;

export function RulesSection() {
  const t = useTranslations("RulesSection");

  const steps = t.raw("steps") as Step[];
  const scores = t.raw("scores") as Score[];

  return (
    <section
      id="regeln"
      className="relative scroll-mt-20 overflow-hidden bg-[#050708] py-28 lg:py-36"
    >
      {/* Hintergrund */}
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-400/[0.035] blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <div className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
              {t("eyebrow")}
            </div>

            <h2 className="text-4xl font-black uppercase leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
              {t("title1")}
              <br />
              <span className="text-white/35">{t("title2")}</span>
            </h2>
          </div>

          <p className="max-w-xl text-base leading-relaxed text-white/45 lg:justify-self-end lg:text-lg">
            {t("intro")}
          </p>
        </div>

        {/* Schritte */}
        <ol className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const accent = accents[index % accents.length];

            return (
              <li
                key={step.title}
                className={`rounded-3xl border bg-white/[0.02] p-6 transition duration-300 ${accent.card}`}
              >
                <div className={`text-[10px] font-black tracking-[0.25em] ${accent.number}`}>
                  {String(index + 1).padStart(2, "0")}
                </div>

                <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-white">
                  {step.title}
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-white/55">{step.text}</p>
              </li>
            );
          })}
        </ol>

        {/* Wertung */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]">
          <div className="grid divide-y divide-white/[0.08] md:grid-cols-[auto_1fr] md:divide-x md:divide-y-0">
            <div className="flex items-center px-6 py-5 md:px-8">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
                {t("scoringTitle")}
              </div>
            </div>

            <div className="grid divide-y divide-white/[0.08] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {scores.map((score) => (
                <div key={score.label} className="px-6 py-5 md:px-8">
                  <div className="text-2xl font-black tracking-tight text-white">{score.value}</div>

                  <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/40">
                    {score.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fußzeile: Motto + Link */}
        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em] text-white/30">
              {t("motto1")}
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-white/30">
              {t("motto2")}
            </div>
          </div>

          <Link
            href="/regeln"
            className="group inline-flex items-center gap-2 self-start rounded-full bg-emerald-400 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_25px_rgba(52,211,153,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-[0_0_35px_rgba(52,211,153,0.3)] md:self-auto"
          >
            {t("cta")}

            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
