import Link from "next/link";

export function CommunitySection() {
  return (
    <section className="relative overflow-hidden bg-[#050708] py-32 lg:py-44">
      {/* Decorative background */}
      <div className="absolute inset-0">
        {/* Main glow */}
        <div className="absolute left-1/2 top-1/2 h-[450px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.07] blur-[140px]" />

        {/* Top line */}
        <div className="absolute left-1/2 top-0 h-px w-full max-w-7xl -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Bottom line */}
        <div className="absolute bottom-0 left-1/2 h-px w-full max-w-7xl -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center lg:px-8">
        {/* Eyebrow */}
        <div className="mb-7 flex items-center justify-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" />

          <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
            Join the Game
          </span>

          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
        </div>

        {/* Headline */}
        <h2 className="text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-white sm:text-6xl lg:text-8xl">
          Bereit für
          <br />
          die nächste
          <br />
          <span className="text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.15)]">
            Runde?
          </span>
        </h2>

        {/* Description */}
        <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/45 sm:text-lg">
          Erstelle dein Spielerprofil, entdecke deine Statistiken und werde Teil einer Community,
          die Beerpong als Sport versteht.
        </p>

        {/* Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/registrieren"
            className="group rounded-full bg-emerald-400 px-8 py-4 text-sm font-bold text-black shadow-[0_0_50px_rgba(52,211,153,0.15)] transition duration-300 hover:-translate-y-1 hover:bg-emerald-300 hover:shadow-[0_0_60px_rgba(52,211,153,0.25)]"
          >
            Profil erstellen
            <span className="ml-3 inline-block transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>

          <Link
            href="/spieler"
            className="rounded-full border border-white/15 px-8 py-4 text-sm font-semibold text-white transition duration-300 hover:border-white/30 hover:bg-white/5"
          >
            Pong Stats entdecken
          </Link>
        </div>

        {/* Bottom statement */}
        <div className="mt-20">
          <div className="mx-auto h-px w-16 bg-emerald-400/40" />

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-white/20">
            Good Players. Better People.
          </p>
        </div>
      </div>
    </section>
  );
}
