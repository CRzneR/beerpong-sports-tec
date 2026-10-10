import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Lightbulb,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Users,
} from "lucide-react";
import ContactForm from "@/components/kontakt/ContactForm";
import FaqList from "@/components/kontakt/FaqList";
import { Navbar } from "@/components/landing/Navbar";

export const metadata: Metadata = {
  title: "Kontakt | BeerPong Sports Tec",
  description: "Fragen, Feedback oder eine Idee? Schreib uns – wir freuen uns, von dir zu hören.",
};

// TODO: Durch die echte Adresse ersetzen, z. B. "Musterstraße 1, 80331 München"
const MAPS_TARGET = "Marienplatz, München";
const MAPS_QUERY = encodeURIComponent(MAPS_TARGET);

const highlights = [
  { icon: MessageSquare, label: "Schnelle Antworten" },
  { icon: Users, label: "Direkter Kontakt" },
  { icon: Lightbulb, label: "Offen für neue Ideen" },
];

const contactItems = [
  {
    icon: Mail,
    label: "E-Mail",
    value: "info@beerpong-sportstec.de",
    href: "mailto:info@beerpong-sportstec.de",
  },
  {
    icon: Phone,
    label: "Telefon",
    value: "+49 151 23456789",
    href: "tel:+4915123456789",
  },
  {
    icon: MapPin,
    label: "Standort",
    value: "München, Deutschland",
    href: `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`,
  },
];

const mapLabels = [
  { text: "Schwabing", className: "left-[8%] top-[16%]" },
  { text: "Bogenhausen", className: "right-[6%] top-[8%]" },
  { text: "Pasing", className: "left-[2%] top-[52%]" },
  { text: "Sendling", className: "left-[18%] top-[74%]" },
  { text: "Giesing", className: "right-[10%] top-[76%]" },
  { text: "Thalkirchen", className: "left-[4%] bottom-[6%]" },
];

export default function KontaktPage() {
  return (
    <main className="bg-[#050b0a] text-white">
      <Navbar />
      <Link
        href="/"
        className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
      >
        <span className="transition-transform group-hover:-translate-x-1">←</span>
        Zurück zur Startseite
      </Link>

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        <Image
          src="/images/landing/hero-background.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center] md:object-center"
        />
        {/* Overlay: mobil flächig, ab md als Verlauf von links */}
        <div className="absolute inset-0 bg-[#050b0a]/75 md:hidden" aria-hidden="true" />
        <div
          className="absolute inset-0 hidden bg-gradient-to-r from-[#050b0a] via-[#050b0a]/70 to-transparent md:block"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050b0a] to-transparent"
          aria-hidden="true"
        />

        <div className="relative px-5 py-14 md:px-[6.5vw] md:py-20 lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
              Kontakt
            </p>
            <h1 className="mt-4 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-6xl">
              Lass uns
              <br />
              ins Gespräch
              <br />
              <span className="text-[#2EF2B0]">kommen.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/70 md:text-lg">
              Du hast Fragen, Feedback oder eine Idee? Wir freuen uns, von dir zu hören. Egal ob
              Support, Kooperation oder einfach nur ein Austausch – wir sind für dich da.
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              {highlights.map(({ icon: Icon, label }) => (
                <li key={label} className="flex max-w-[7.5rem] flex-col gap-2">
                  <Icon className="size-6 text-[#2EF2B0]" aria-hidden="true" />
                  <span className="text-xs leading-snug text-white/70">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 pb-16 md:px-[6.5vw] md:pb-24">
        {/* ───────── Kontaktdaten + Formular ───────── */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
          <div className="rounded-2xl border border-white/10 bg-[#0a1312] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
              Unsere Kontaktdaten
            </p>
            <h2 className="mt-4 text-2xl font-bold leading-tight md:text-3xl">
              Direkt. Persönlich.
              <br />
              Unkompliziert.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Du erreichst uns auf verschiedenen Wegen. Wir melden uns so schnell wie möglich bei
              dir.
            </p>

            <ul className="mt-8 flex flex-col gap-3">
              {contactItems.map(({ icon: Icon, label, value, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-[#2EF2B0]/40 hover:bg-[#2EF2B0]/[0.04]"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#2EF2B0]/10 text-[#2EF2B0]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white/60">{label}</span>
                      <span className="block truncate text-sm font-medium text-white">{value}</span>
                    </span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-[#2EF2B0] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a1312] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
              Nachricht senden
            </p>
            <h2 className="mt-4 text-2xl font-bold leading-tight md:text-3xl">
              Schreib uns eine Nachricht.
            </h2>
            <p className="mt-3 text-sm text-white/60">
              Fülle einfach das Formular aus und wir melden uns schnellstmöglich bei dir.
            </p>
            <ContactForm />
          </div>
        </section>

        {/* ───────── Standort ───────── */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1312]">
          <div className="grid md:grid-cols-3">
            <div className="flex flex-col items-start justify-center p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
                Unser Standort
              </p>
              <h2 className="mt-4 text-2xl font-bold md:text-3xl">Hier findest du uns.</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                Auch wenn wir digital für dich da sind – unsere Wurzeln liegen in München. Komm
                gerne vorbei oder vereinbare einen Termin.
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2EF2B0] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2EF2B0] hover:text-[#04120e]"
              >
                Route anzeigen
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>

            {/* Karten-Platzhalter (kann später durch ein echtes Kartenbild ersetzt werden) */}
            <div
              className="relative min-h-[220px] bg-[#071110] md:min-h-[280px]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(46,242,176,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(46,242,176,0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
              role="img"
              aria-label="Kartenausschnitt München"
            >
              {mapLabels.map((label) => (
                <span
                  key={label.text}
                  className={`absolute text-[10px] uppercase tracking-[0.15em] text-white/30 ${label.className}`}
                >
                  {label.text}
                </span>
              ))}
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
                <MapPin className="size-8 text-[#2EF2B0]" aria-hidden="true" />
                <span className="text-lg font-semibold">München</span>
              </div>
            </div>

            <div className="relative min-h-[220px] md:min-h-[280px]">
              <Image
                src="/images/landing/kontakt-lounge.jpg"
                alt="Lounge von BeerPong Sports Tec"
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-[#0a1312] via-transparent to-transparent md:bg-gradient-to-r"
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        {/* ───────── FAQ ───────── */}
        <section className="grid gap-8 py-6 md:grid-cols-2 md:gap-12 md:py-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2EF2B0]">
              Häufige Fragen
            </p>
            <h2 className="mt-4 text-2xl font-bold md:text-3xl">Schnelle Antworten.</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              Vielleicht findest du hier schon die richtige Antwort. Falls nicht – schreib uns
              einfach!
            </p>
            <Link
              href="/faq"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2EF2B0] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2EF2B0] hover:text-[#04120e]"
            >
              Alle Fragen ansehen
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <FaqList />
        </section>
      </div>
    </main>
  );
}
