import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050708] pt-20">
      {/* Hintergrund */}
      <div className="absolute inset-0">
        {/* Dunkler Verlauf */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(0,245,160,0.12),transparent_30%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(245,197,66,0.08),transparent_30%)]" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Inhalt */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center px-6 py-20 lg:px-8">
        <div className="grid w-full items-center gap-16 lg:grid-cols-2">
          {/* Linke Seite */}
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

          {/* Rechte Seite */}
          <div className="relative hidden min-h-[600px] lg:block">
            {/* Glow */}
            <div className="absolute right-10 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-[100px]" />

            {/* Tisch */}
            <div className="absolute right-0 top-1/2 h-[420px] w-[600px] -translate-y-1/2 rotate-[-4deg] rounded-[40%] border border-white/10 bg-gradient-to-b from-white/[0.05] to-black/40 shadow-2xl">
              {/* Tischkante */}
              <div className="absolute inset-x-10 bottom-8 h-1 rounded-full bg-emerald-400/30 shadow-[0_0_30px_rgba(52,211,153,0.4)]" />

              {/* Becher */}
              <Cup className="left-[18%] bottom-[28%] rotate-[-8deg]" />
              <Cup className="left-[36%] bottom-[18%] rotate-[4deg]" />
              <Cup className="left-[55%] bottom-[25%] rotate-[-3deg]" />
              <Cup className="left-[72%] bottom-[18%] rotate-[7deg]" />

              {/* Ball */}
              <div className="absolute left-[48%] top-[20%] h-14 w-14 rounded-full bg-white shadow-[0_0_35px_rgba(255,255,255,0.35)]" />
            </div>

            {/* Floating Label */}
            <div className="absolute right-0 top-20 rounded-2xl border border-emerald-400/20 bg-black/60 px-5 py-4 backdrop-blur-xl">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Same Game.
              </div>

              <div className="mt-1 text-sm font-bold text-white">Higher Standards.</div>
            </div>
          </div>
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

/* Becher */

function Cup({ className }: { className: string }) {
  return (
    <div
      className={`absolute h-28 w-24 rounded-b-[35%] rounded-t-[10%] border border-red-300/20 bg-gradient-to-b from-red-500 to-red-900 shadow-[0_15px_40px_rgba(0,0,0,0.6)] ${className}`}
    >
      <div className="absolute -top-2 left-[-3px] h-5 w-[calc(100%+6px)] rounded-full border border-red-200/20 bg-red-500/70" />
    </div>
  );
}
