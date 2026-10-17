import type { Metadata } from "next";
import Link from "next/link";

/*
 * --------------------------------------------------------------------------
 * | REGELN
 * --------------------------------------------------------------------------
 *
 * Route: /regeln  (Datei: app/regeln/page.tsx)
 *
 * Reine Text-Seite, bewusst ein Server-Component ohne Zustand - die
 * Regeln stehen als Daten im Array unten. Zum Ändern oder Ergänzen
 * einer Regel reicht es, dort einen Eintrag anzupassen.
 *
 * Die Akzentfarben stehen als vollständige, feste Klassen-Strings im
 * accents-Objekt (statt Klassennamen zur Laufzeit zusammenzusetzen) -
 * so findet Tailwind sie beim Build zuverlässig.
 * --------------------------------------------------------------------------
 */

export const metadata: Metadata = {
  title: { absolute: "Beer Pong Regeln – BeerPong Sports Tec" },
  description:
    "Alle wichtigen Beer-Pong-Regeln auf einen Blick: Aufstellung, Ellenbogenregel, Aufsetzer, Mehrfachtreffer, Abwehren und Spielende. Für faire Matches und ein einheitliches Spielverständnis.",
  alternates: { canonical: "/regeln" },
};

type Accent = "cyan" | "pink";

type Paragraph = {
  label?: string;
  text: string;
};

type Rule = {
  number: string;
  title: string;
  accent: Accent;
  items?: string[];
  paragraphs?: Paragraph[];
};

const accents = {
  cyan: {
    card: "border-cyan-400/15 hover:border-cyan-400/30",
    number: "text-cyan-400/70",
    check: "text-cyan-400",
  },
  pink: {
    card: "border-pink-400/15 hover:border-pink-400/30",
    number: "text-pink-400/80",
    check: "text-pink-400",
  },
} as const;

const rules: Rule[] = [
  {
    number: "01",
    title: "Allgemeine Regeln",
    accent: "cyan",
    items: [
      "2 gegen 2",
      "2 Bälle, 2 Würfe pro Team",
      "1 gegen 1: Du wirfst beide Bälle (2 Würfe pro Runde)",
      "Ellbogen hinter die Tischkante",
      "Erst trinken, dann werfen!",
      "Formation immer Dreieck",
    ],
  },
  {
    number: "02",
    title: "Spielbeginn",
    accent: "pink",
    paragraphs: [
      { text: "Der Anwurf wird per Schere, Stein, Papier entschieden." },
      { text: "Der Gewinner fängt an." },
    ],
  },
  {
    number: "03",
    title: "Ellenbogenregel",
    accent: "cyan",
    paragraphs: [
      {
        text: "Der Ellenbogen des werfenden Spielers darf das Ende des Tisches nicht überschreiten.",
      },
      { text: "Bei wiederholtem Verstoß wird der Wurf für ungültig erklärt." },
    ],
  },
  {
    number: "04",
    title: "Aufstellung",
    accent: "pink",
    paragraphs: [
      {
        text: "Pro Team werden 10 Becher verwendet. Die Aufstellung erfolgt immer in Dreiecksform.",
      },
      { text: "Der letzte Becher wird immer mittig am Ende platziert." },
    ],
  },
  {
    number: "05",
    title: "Ablenkung",
    accent: "pink",
    paragraphs: [
      { text: "Ablenkung ist grundsätzlich erlaubt." },
      { label: "Erlaubt:", text: "Reden, Jubeln, Bewegungen hinter dem Tisch." },
      {
        label: "Nicht erlaubt:",
        text: "Verdecken des Bechers, Berühren des Tischs, Stehen neben dem Tisch.",
      },
    ],
  },
  {
    number: "06",
    title: "Direktwurf",
    accent: "cyan",
    paragraphs: [
      { text: "Trifft der Ball direkt in einen Becher, zählt 1 Becher." },
      { text: "Sobald der Ball einen Becher berührt hat, darf er abgewehrt werden." },
    ],
  },
  {
    number: "07",
    title: "Aufsetzer",
    accent: "pink",
    paragraphs: [
      {
        text: "Wird der Ball gewollt auf den Tisch geworfen und landet danach in einem Becher, zählen 2 Becher.",
      },
      { text: "Nach dem Kontakt mit dem Tisch darf der Ball sofort abgewehrt werden." },
    ],
  },
  {
    number: "08",
    title: "Recover & Trickshot",
    accent: "cyan",
    paragraphs: [
      {
        text: "Kommt ein geworfener Ball über die Tischhälfte zurück, kann dieser vom werfenden Team zurückgeholt werden („Recover“). Das Gegnerteam darf abwehren! Der Ball darf nicht den Boden berühren!",
      },
      {
        text: "Ein besonderer Wurf (erschwerte Bedingungen) kann – nach Absprache mit dem Schiedsrichter – als Trickshot gewertet werden.",
      },
    ],
  },
  {
    number: "09",
    title: "Mehrfachtreffer",
    accent: "cyan",
    paragraphs: [
      {
        text: "Treffen beide Spieler eines Teams in derselben Runde, erhält das Team 2 zusätzliche Würfe.",
      },
      {
        text: "Treffen beide Spieler denselben Becher, muss 1 zusätzlicher Becher nach Wahl des werfenden Teams getrunken werden.",
      },
    ],
  },
  {
    number: "10",
    title: "Abwehren",
    accent: "pink",
    paragraphs: [
      { text: "Nach Kontakt mit Tisch oder Becher darf abgewehrt werden." },
      { text: "Zu frühes Abwehren = Strafbecher." },
      {
        text: "Ein Ball darf aus dem Becher abgewehrt werden, wenn er sich sichtbar im Becher dreht. Ein Becher zählt nur als getroffen, wenn der Ball im Becher bleibt.",
      },
      {
        text: "Wird ein Becher angeworfen, in dem bereits ein Ball liegt, darf der Ball nicht abgewehrt werden.",
      },
    ],
  },
  {
    number: "11",
    title: "Spielende (Verlängerung)",
    accent: "cyan",
    paragraphs: [
      {
        text: "Hat ein Team alle Becher verloren, erhält das gegnerische Team die Möglichkeit zum Nachwerfen.",
      },
      {
        label: "Bei 3 oder mehr Bechern:",
        text: "Beide Spieler dürfen werfen.",
      },
      {
        label: "Bei 2 oder weniger Bechern:",
        text: "Nur ein Spieler darf werfen.",
      },
      {
        text: "Wird getroffen, darf weitergeworfen werden, bis kein Treffer mehr erzielt wird. Trifft das Team alle Becher, werden 3 neue Becher pro Team aufgestellt. Es geht weiter.",
      },
    ],
  },
];

export default function RegelnPage() {
  return (
    <main className="min-h-screen bg-[#050708] px-5 py-10 text-white sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Zurück zur Startseite
        </Link>

        {/* KOPF */}

        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
          Spielregeln
        </div>

        <h1 className="mt-2 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl">
          Beer Pong
          <span className="block text-cyan-400">Regeln</span>
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/50">
          Alle wichtigen Regeln auf einen Blick. Für faire Matches, mehr Spaß und ein einheitliches
          Spielverständnis.
        </p>

        {/* REGELN */}

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => {
            const accent = accents[rule.accent];

            return (
              <section
                key={rule.number}
                className={`rounded-3xl border bg-white/[0.02] p-6 transition duration-300 ${accent.card}`}
              >
                <div className={`text-[10px] font-black tracking-[0.25em] ${accent.number}`}>
                  {rule.number}
                </div>

                <h2 className="mt-3 text-sm font-black uppercase tracking-wide text-white">
                  {rule.title}
                </h2>

                {rule.items && (
                  <ul className="mt-4 space-y-2 text-sm text-white/60">
                    {rule.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className={`mt-0.5 text-xs font-black ${accent.check}`}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {rule.paragraphs && (
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/60">
                    {rule.paragraphs.map((paragraph) => (
                      <p key={paragraph.text}>
                        {paragraph.label && (
                          <span className="font-bold text-white/85">{paragraph.label} </span>
                        )}
                        {paragraph.text}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* FAIRPLAY */}

        <section className="mt-4 rounded-3xl border border-pink-400/15 bg-white/[0.02] p-6 md:flex md:items-center md:justify-between md:gap-10 md:p-8">
          <div>
            <div className="text-[10px] font-black tracking-[0.25em] text-pink-400/80">12</div>

            <h2 className="mt-3 text-sm font-black uppercase tracking-wide text-white">Fairplay</h2>

            <div className="mt-4 space-y-2 text-sm leading-relaxed text-white/60">
              <p>Respektvoller Umgang ist Pflicht.</p>
              <p>Diskussionen werden durch einen Schiedsrichter entschieden.</p>
              <p>Unsportliches Verhalten kann mit Strafbechern oder Wurfverlust bestraft werden.</p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-6 md:mt-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-white/30">
              Good players.
            </div>

            <div className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-white/30">
              Better people.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
