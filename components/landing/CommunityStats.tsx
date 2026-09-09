export function CommunityStats() {
  return (
    <section className="relative overflow-hidden bg-[#050708] py-28 lg:py-36">
      {/* Hintergrund */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.035] blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <div className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
              Die Community
            </div>

            <h2 className="text-4xl font-black uppercase leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
              Mehr als nur
              <br />
              <span className="text-white/35">ein Spiel.</span>
            </h2>
          </div>

          <p className="max-w-xl text-base leading-relaxed text-white/45 lg:justify-self-end lg:text-lg">
            Beerpong Sports Tec verbindet Spieler, Matches und Turniere an einem Ort. Jede Partie
            wird Teil deiner persönlichen Geschichte.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025]">
          <div className="grid divide-y divide-white/[0.08] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            <CommunityStat value="2.481" label="Spieler" description="registrierte Spieler" />

            <CommunityStat value="184" label="Turniere" description="ausgetragen" />

            <CommunityStat value="12.640" label="Matches" description="gespielte Matches" />

            <CommunityStat value="68.921" label="Cups" description="getroffene Becher" />
          </div>
        </div>

        {/* Bottom statement */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <CommunityFeature
            number="01"
            title="Spielen"
            text="Starte Matches und tritt gegen andere Spieler an."
          />

          <CommunityFeature
            number="02"
            title="Messen"
            text="Tracke deine Leistung und sieh, wie du dich entwickelst."
          />

          <CommunityFeature
            number="03"
            title="Verbinden"
            text="Finde Spieler, Teams und eine Community, die genauso denkt wie du."
          />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------
   Statistic
------------------------------------------------------- */

function CommunityStat({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <div className="group p-7 sm:p-8 lg:p-9">
      <div className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">{value}</div>

      <div className="mt-2 text-sm font-bold uppercase tracking-wider text-emerald-400">
        {label}
      </div>

      <div className="mt-1 text-xs text-white/30">{description}</div>
    </div>
  );
}

/* -------------------------------------------------------
   Feature
------------------------------------------------------- */

function CommunityFeature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="border-t border-white/[0.1] pt-5">
      <div className="mb-5 text-[10px] font-bold tracking-[0.2em] text-white/25">{number}</div>

      <h3 className="text-lg font-bold text-white">{title}</h3>

      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">{text}</p>
    </div>
  );
}
