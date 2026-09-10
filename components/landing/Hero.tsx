import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050708] pt-20">
      {/* Hintergrund */}
      <div className="absolute inset-0">
        {/* Foto */}
        <Image
          src="/images/landing/hero-background.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#050708] via-[#050708]/85 to-transparent" />

        <div className="absolute inset-0 bg-gradient-to-b from-[#050708]/50 via-transparent to-[#050708]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(52,211,153,0.12),transparent_35%)]" />
      </div>

      {/* Inhalt */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center px-6 py-20 lg:px-8">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <div className="mb-7 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.9)]" />

            <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              Play. Compete. Connect.
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl font-black uppercase leading-[0.9] tracking-[-0.055em] text-white sm:text-7xl lg:text-[6rem]">
            Beerpong
            <br />
            wird zum
            <br />
            <span className="text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.2)]">
              Sport.
            </span>
          </h1>

          {/* Beschreibung */}
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl">
            Digitale Tools. Echte Community.
            <br />
            Für alle, die mehr aus Beerpong machen wollen.
          </p>

          {/* Buttons */}
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/spieler"
              className="group rounded-full bg-emerald-400 px-7 py-4 text-sm font-bold text-black shadow-[0_0_40px_rgba(52,211,153,0.15)] transition hover:-translate-y-1 hover:bg-emerald-300"
            >
              Jetzt entdecken
              <span className="ml-3 inline-block transition group-hover:translate-x-1">→</span>
            </Link>

            <button className="rounded-full border border-white/20 px-7 py-4 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5">
              <span className="mr-3">▶</span>
              Video ansehen
            </button>
          </div>

          {/* Features */}
          <div className="mt-16 flex flex-wrap gap-8 border-t border-white/10 pt-7">
            <HeroFeature icon="🏆" title="Turniere" subtitle="Organisieren" />

            <HeroFeature icon="📊" title="Statistiken" subtitle="Verfolgen" />

            <HeroFeature icon="👥" title="Community" subtitle="Zusammen spielen" />
          </div>
        </div>

        {/* Schwebendes Label übers Foto, unten rechts */}
        <div className="absolute bottom-16 right-6 hidden rounded-2xl border border-emerald-400/20 bg-black/60 px-5 py-4 backdrop-blur-xl lg:block lg:right-8">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            Same Game.
          </div>

          <div className="mt-1 text-sm font-bold text-white">Higher Standards.</div>
        </div>
      </div>
    </section>
  );
}

/* Kleine Feature-Komponente */

function HeroFeature({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>

      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-white">{title}</div>

        <div className="text-[10px] uppercase tracking-wider text-white/40">{subtitle}</div>
      </div>
    </div>
  );
}
