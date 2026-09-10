import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#050708] text-white">
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-black tracking-[0.08em]">
            BEERPONG <span className="text-emerald-400">SPORTS TEC</span>
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold text-white/70 hover:border-emerald-400/60 hover:text-white"
          >
            ← Zurück
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:py-28">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-400">
            Mehr als ein Spiel
          </p>
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
            BeerPong.
            <br />
            <span className="text-emerald-400">Aber ernst.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            BeerPong Sports Tec verbindet echtes Spiel, Wettbewerb und Daten in einer digitalen
            Plattform. Matches werden erfasst, Leistungen sichtbar gemacht und Spieler können sich
            langfristig vergleichen.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <Card number="01" title="PLAY">
            Spiele Matches digital und erfasse Treffer direkt am Tisch.
          </Card>
          <Card number="02" title="TRACK">
            Jeder Wurf wird zur Statistik. Treffer, Misses und Match-Verläufe bleiben
            nachvollziehbar.
          </Card>
          <Card number="03" title="COMPETE">
            Vergleiche Leistungen, entwickle dich weiter und mach aus BeerPong einen Sport mit
            echten Daten.
          </Card>
        </div>

        <div className="mt-5 rounded-3xl border border-white/[0.09] bg-white/[0.025] p-7 sm:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
                Unsere Idee
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
                Good players.
                <br />
                <span className="text-white/40">Better people.</span>
              </h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-white/55">
              <p>
                Wir glauben, dass BeerPong mehr sein kann als eine einzelne Runde mit Freunden: mehr
                Wettbewerb, mehr Fairness und mehr Möglichkeiten, sich mit anderen Spielern zu
                messen.
              </p>
              <p>
                Deshalb entwickeln wir digitale Werkzeuge, die das Spiel professioneller machen,
                ohne das Wichtigste zu verlieren: Menschen zusammenzubringen und gemeinsam Spaß zu
                haben.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.035] p-7 text-center sm:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
            BeerPong Sports Tec
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase sm:text-3xl">
            Same game. Higher standards.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/50">
            Eine Plattform für Spieler, Teams und Communities, die BeerPong nicht nur spielen,
            sondern gemeinsam weiterentwickeln wollen.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-black hover:bg-emerald-300"
          >
            Zum Spiel →
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] py-7">
        <div className="mx-auto flex max-w-5xl justify-between px-5 text-xs text-white/35">
          <span>© BeerPong Sports Tec</span>
          <span>Good players. Better people.</span>
        </div>
      </footer>
    </main>
  );
}

function Card({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-white/[0.09] bg-[#0a0d0f] p-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.22em] text-white/25">{number}</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
      </div>
      <h2 className="mt-10 text-xl font-black tracking-[0.12em]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/45">{children}</p>
    </article>
  );
}
