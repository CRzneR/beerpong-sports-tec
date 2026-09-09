import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#050708] px-5 py-10 text-white sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Zurück zur Startseite
        </Link>

        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
          Pong Stats
        </div>

        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
          Impressum
        </h1>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-white/60">
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Angaben gemäß § 5 DDG
            </h2>
            <p className="mt-2">
              [Christoph Renz]
              <br />
              [Herzogstandstraße ]
              <br />
              [81539 München]
              <br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">Kontakt</h2>
            <p className="mt-2">E-Mail: [kontakt@beerpongsportstec.de]</p>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p className="mt-2">
              [Christoph Renz]
              <br />
              [Anschrift wie oben]
            </p>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              EU-Streitschlichtung
            </h2>
            <p className="mt-2">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
              bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline"
              >
                ec.europa.eu/consumers/odr
              </a>
              <br />
              Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor
              einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
