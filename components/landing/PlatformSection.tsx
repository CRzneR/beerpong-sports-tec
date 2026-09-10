import Image from "next/image";
import Link from "next/link";

export function PlatformSection() {
  return (
    <section className="relative overflow-hidden bg-[#050708] py-28 lg:py-36">
      {/* Background Glow */}
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-400/[0.035] blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
            The BeerPong Platform
          </div>

          <h2 className="text-4xl font-black uppercase leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
            Zwei Bereiche.
            <br />
            <span className="text-white/35">Ein Sport.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg">
            Organisiere deine Wettkämpfe mit Pong League und behalte deine persönliche Performance
            mit Pong Stats immer im Blick.
          </p>
        </div>

        {/* Product Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* PONG LEAGUE */}
          <ProductCard
            type="league"
            number="01"
            eyebrow="PONG LEAGUE"
            subtitle="Tournament Platform"
            logo="/images/landing/pong-league-logo.png"
            title={
              <>
                Compete.
                <br />
                <span className="text-yellow-400">Connect. Win.</span>
              </>
            }
            description="Erstelle Turniere, verwalte Teams und bringe deine Matches auf das nächste Level."
            features={["Turniere erstellen", "Teams & Spieler verwalten", "Spielplan & Ergebnisse"]}
            href="/turniere"
          />

          {/* PONG STATS */}
          <ProductCard
            type="stats"
            number="02"
            eyebrow="PONG STATS"
            subtitle="Player Performance"
            logo="/images/landing/pong-stats-logo.png"
            title={
              <>
                Track.
                <br />
                <span className="text-cyan-400">Improve. Repeat.</span>
              </>
            }
            description="Erstelle dein Spielerprofil, verfolge deine Performance und entdecke deine Entwicklung."
            features={[
              "Persönliches Spielerprofil",
              "Match-Historie & Statistiken",
              "Rankings & Achievements",
            ]}
            href="/spieler"
          />
        </div>
      </div>
    </section>
  );
}

/* =======================================================
   PRODUCT CARD
======================================================= */

function ProductCard({
  type,
  number,
  eyebrow,
  subtitle,
  logo,
  title,
  description,
  features,
  href,
}: {
  type: "league" | "stats";
  number: string;
  eyebrow: string;
  subtitle: string;
  logo: string;
  title: React.ReactNode;
  description: string;
  features: string[];
  href: string;
}) {
  const isLeague = type === "league";

  return (
    <div
      className={`group relative overflow-hidden rounded-[2rem] border p-7 transition duration-500 hover:-translate-y-1 sm:p-9 lg:p-10 ${
        isLeague
          ? "border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.07] via-white/[0.025] to-transparent hover:border-yellow-400/30"
          : "border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.07] via-white/[0.025] to-transparent hover:border-cyan-400/30"
      }`}
    >
      {/* Background Glow */}
      <div
        className={`absolute -right-32 -top-32 h-72 w-72 rounded-full blur-[100px] transition duration-500 group-hover:scale-125 ${
          isLeague ? "bg-yellow-400/10" : "bg-cyan-400/10"
        }`}
      />

      <div className="relative z-10">
        {/* Top Row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold tracking-[0.25em] text-white/25">
                {number}
              </span>

              <span
                className={`text-[11px] font-bold uppercase tracking-[0.25em] ${
                  isLeague ? "text-yellow-400" : "text-cyan-400"
                }`}
              >
                {eyebrow}
              </span>
            </div>

            <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
              {subtitle}
            </div>
          </div>

          {/* Product Logo */}
          <div
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border transition duration-500 group-hover:scale-105 ${
              isLeague ? "border-yellow-400/20" : "border-cyan-400/20"
            }`}
          >
            <Image src={logo} alt={`${eyebrow} Logo`} fill sizes="64px" className="object-cover" />
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-8 text-3xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white sm:text-4xl">
          {title}
        </h3>

        {/* Description */}
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/50 sm:text-base">
          {description}
        </p>

        {/* Features */}
        <div className="mt-7 space-y-3">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-sm text-white/75">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  isLeague ? "bg-yellow-400/10 text-yellow-400" : "bg-cyan-400/10 text-cyan-400"
                }`}
              >
                ✓
              </span>

              {feature}
            </div>
          ))}
        </div>

        {/* Product Preview */}
        <div className="relative mt-10 h-52 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080b0c]">
          {isLeague ? <LeaguePreview /> : <StatsPreview />}
        </div>

        {/* CTA */}
        <Link
          href={href}
          className={`mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-wide text-black transition duration-300 ${
            isLeague
              ? "bg-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.18)] hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_35px_rgba(250,204,21,0.3)]"
              : "bg-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.18)] hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_0_35px_rgba(34,211,238,0.3)]"
          }`}
        >
          {isLeague ? "Pong League entdecken" : "Pong Stats entdecken"}

          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  );
}

/* =======================================================
   PONG LEAGUE PREVIEW
======================================================= */

function LeaguePreview() {
  return (
    <div className="absolute inset-0 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Pong League
          </div>

          <div className="mt-1 text-xs font-bold text-white">Spring Championship</div>
        </div>

        <span className="rounded-full bg-yellow-400/10 px-2 py-1 text-[9px] font-bold text-yellow-400">
          LIVE
        </span>
      </div>

      {/* Matches */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <LeagueMatch teamA="BPM Kings" teamB="Cup Destroyers" score="7 : 5" />

        <LeagueMatch teamA="Beer Bros" teamB="Red Cups" score="6 : 8" />

        <LeagueMatch teamA="The Tossers" teamB="Brew Crew" score="4 : 7" />
      </div>
    </div>
  );
}

function LeagueMatch({ teamA, teamB, score }: { teamA: string; teamB: string; score: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <div className="text-[9px] text-white/50">{teamA}</div>

      <div className="my-2 text-center text-sm font-black text-white">{score}</div>

      <div className="text-right text-[9px] text-white/50">{teamB}</div>
    </div>
  );
}

/* =======================================================
   PONG STATS PREVIEW
======================================================= */

function StatsPreview() {
  return (
    <div className="absolute inset-0 p-5">
      {/* Player */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-sm font-black text-black">
          MB
        </div>

        <div>
          <div className="text-xs font-bold text-white">MaxBPM</div>

          <div className="text-[9px] uppercase tracking-wider text-white/30">Player Level 12</div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <StatBox value="128" label="Matches" />

        <StatBox value="72.7%" label="Winrate" />

        <StatBox value="1.842" label="Cups" />
      </div>

      {/* Chart */}
      <div className="mt-4 flex h-12 items-end gap-1">
        {[30, 42, 35, 52, 48, 65, 58, 75, 68, 88, 82, 96].map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-sm bg-cyan-400/30"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* =======================================================
   STAT BOX
======================================================= */

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div className="text-base font-black text-white">{value}</div>

      <div className="mt-1 text-[8px] uppercase tracking-wider text-white/30">{label}</div>
    </div>
  );
}
