"use client";

import { useEffect, useState, type ReactNode } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import { getPlayerSkillRating, type SkillRatingOverview } from "@/app/spieler/match/playerStats";
import { PanelModal } from "@/components/stats/PanelCard";
import {
  MAX_DELTA,
  MIN_RANKED_MATCHES,
  PROVISIONAL_MATCHES,
  START_RATING,
} from "@/app/spieler/match/skillRating";

/*
 * --------------------------------------------------------------------------
 * | SKILL-RATING
 * --------------------------------------------------------------------------
 *
 * Eine Karte mit dem dynamischen Skill-Score (0 – 1000):
 *   - aktuelles Rating, Veränderung durch das letzte Match ("+24 Punkte")
 *     und Rang unter den registrierten Spielern,
 *   - persönliche Bestleistung,
 *   - Rating-Verlauf der letzten 30 Matches als Diagramm (ein Tipp bzw. Klick
 *     auf einen Punkt zeigt das Match dazu).
 *
 * Die Formel steht in skillRating.ts. Das Rating hängt von Ergebnis,
 * Becherdifferenz und Stärke der Gegner ab - nicht von der Trefferquote -,
 * und wird für neue Spieler erst nach PROVISIONAL_MATCHES Matches als
 * verlässlich gezeigt. Der Zeitraum-Filter wirkt hier nicht (immer Gesamtstand).
 * --------------------------------------------------------------------------
 */

const OUTER = "rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7";
const INNER = "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5";

function formatDate(iso: string | null): string {
  if (!iso) {
    return "–";
  }

  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta)}`;
}

function deltaTextClass(delta: number): string {
  if (delta > 0) return "text-emerald-400";
  if (delta < 0) return "text-red-400";
  return "text-white/50";
}

function deltaBadgeClass(delta: number): string {
  if (delta > 0) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (delta < 0) return "border-red-400/30 bg-red-400/10 text-red-300";
  return "border-white/15 bg-white/[0.05] text-white/60";
}

/* ------------------------------------------------------------------------ */
/* Verlaufs-Diagramm                                                         */
/* ------------------------------------------------------------------------ */

const CHART_W = 480;
const CHART_H = 250;
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 24;

function RatingChart({
  history,
  selected,
  onSelect,
}: {
  history: SkillRatingOverview["history"];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const values = history.map((step) => step.after);
  const count = values.length;

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(maxValue - minValue, 60);
  const middle = (minValue + maxValue) / 2;

  const low = Math.max(0, Math.floor((middle - span * 0.65) / 10) * 10);
  const high = Math.min(1000, Math.ceil((middle + span * 0.65) / 10) * 10);
  const range = Math.max(high - low, 1);

  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;

  const xAt = (index: number) =>
    count === 1 ? PAD_L + innerW / 2 : PAD_L + (index * innerW) / (count - 1);
  const yAt = (value: number) => PAD_T + innerH - ((value - low) / range) * innerH;

  const line = values
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`,
    )
    .join(" ");
  const area = `${line} L${xAt(count - 1).toFixed(1)} ${(PAD_T + innerH).toFixed(1)} L${xAt(0).toFixed(1)} ${(PAD_T + innerH).toFixed(1)} Z`;

  const gridValues = [0, 1, 2, 3].map((step) => Math.round(low + (range * step) / 3));
  const showStart = START_RATING >= low && START_RATING <= high;
  const columnW = count === 1 ? innerW : innerW / (count - 1);

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Rating-Verlauf der letzten ${count} Matches, aktuell ${values[count - 1]} Punkte`}
    >
      <defs>
        <linearGradient id="rating-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridValues.map((value) => (
        <g key={value}>
          <line
            x1={PAD_L}
            x2={CHART_W - PAD_R}
            y1={yAt(value)}
            y2={yAt(value)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
          <text
            x={PAD_L - 8}
            y={yAt(value) + 3.5}
            textAnchor="end"
            fontSize="11"
            fontWeight="700"
            fill="rgba(255,255,255,0.35)"
          >
            {value}
          </text>
        </g>
      ))}

      {showStart && (
        <line
          x1={PAD_L}
          x2={CHART_W - PAD_R}
          y1={yAt(START_RATING)}
          y2={yAt(START_RATING)}
          stroke="rgba(250,204,21,0.35)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      )}

      {count > 1 && <path d={area} fill="url(#rating-area)" />}
      {count > 1 && (
        <path
          d={line}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      <line
        x1={xAt(selected)}
        x2={xAt(selected)}
        y1={PAD_T}
        y2={PAD_T + innerH}
        stroke="rgba(34,211,238,0.35)"
        strokeWidth="1"
      />

      {values.map((value, index) => (
        <circle
          key={history[index].matchId}
          cx={xAt(index)}
          cy={yAt(value)}
          r={index === selected ? 6 : count > 18 ? 2.5 : 3.5}
          fill={index === selected ? "#22d3ee" : "#0c0f16"}
          stroke="#22d3ee"
          strokeWidth="2"
        />
      ))}

      <text x={PAD_L} y={CHART_H - 6} fontSize="11" fontWeight="700" fill="rgba(255,255,255,0.35)">
        {formatDate(history[0].savedAt)}
      </text>
      {count > 1 && (
        <text
          x={CHART_W - PAD_R}
          y={CHART_H - 6}
          textAnchor="end"
          fontSize="11"
          fontWeight="700"
          fill="rgba(255,255,255,0.35)"
        >
          {formatDate(history[count - 1].savedAt)}
        </text>
      )}

      {/* Unsichtbare Trefferflächen: Hover, Tippen und Klick wählen ein Match. */}
      {values.map((_, index) => (
        <rect
          key={`hit-${history[index].matchId}`}
          x={xAt(index) - columnW / 2}
          y={PAD_T}
          width={columnW}
          height={innerH}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onMouseEnter={() => onSelect(index)}
          onClick={() => onSelect(index)}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* Kleine Bausteine                                                          */
/* ------------------------------------------------------------------------ */

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
      <div className="text-[9px] font-black uppercase tracking-wider text-white/35">{label}</div>
      <div className="mt-1 text-xl font-black tracking-tight text-white">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] font-semibold text-white/35">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Erklärung: Wie setzt sich das Rating zusammen?                            */
/* ------------------------------------------------------------------------ */

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
      <div className="text-sm font-black tracking-tight text-white">{title}</div>
      <div className="mt-1 text-xs font-semibold leading-relaxed text-white/55">{children}</div>
    </div>
  );
}

function RatingInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <PanelModal title="So entsteht dein Skill-Rating" onClose={onClose}>
      <p className="text-xs font-semibold leading-relaxed text-white/45">
        Dein Rating ist eine Zahl von 0 bis 1000. Du startest bei {START_RATING}. Nach jedem Match
        steigt oder sinkt der Wert, je nachdem, wie das Match im Verhältnis zur Erwartung
        ausgegangen ist.
      </p>

      <div className="mt-4 space-y-3">
        <InfoBlock title="1. Stärke der Gegner">
          Aus den Ratings beider Teams wird berechnet, wer als Favorit ins Match geht (bei 2 gegen 2
          zählt der Durchschnitt des Teams). Ein Sieg gegen einen stärkeren Gegner bringt viele
          Punkte, ein Sieg gegen einen deutlich schwächeren kaum welche. Umgekehrt kostet eine
          Niederlage gegen einen Schwächeren mehr.
        </InfoBlock>

        <InfoBlock title="2. Ergebnis und Becherdifferenz">
          Zum Ergebnis zählt der Sieg (70 %) und der Anteil der Becher, die dein Team getroffen hat
          (30 %). Ein 10:2 ist deshalb mehr wert als ein 10:9, und eine knappe Niederlage kostet
          weniger als eine klare.
        </InfoBlock>

        <InfoBlock title="3. Neue Spieler bewegen sich stärker">
          In den ersten Matches schwankt das Rating stärker, damit es schnell zu deiner Stärke
          findet. Mit jedem Match werden die Schritte kleiner. Pro Match sind höchstens ±{MAX_DELTA}{" "}
          Punkte möglich.
        </InfoBlock>

        <InfoBlock title="4. Nicht nur die Trefferquote">
          Die Trefferquote geht nicht ein. Wer in wenigen Matches stark trifft, steht deshalb nicht
          sofort ganz oben. Bis zum {PROVISIONAL_MATCHES}. Match gilt dein Rating als vorläufig, in
          die Rangliste kommst du ab {MIN_RANKED_MATCHES} Matches.
        </InfoBlock>

        <InfoBlock title="Welche Matches zählen?">
          Wie bei deinen Statistiken: nur Matches gegen registrierte Gegner und nur Matches nach
          einem Zurücksetzen der Statistiken. Der Zeitraum-Filter wirkt beim Rating nicht.
        </InfoBlock>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-cyan-400 px-6 py-3 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-cyan-300"
        >
          Verstanden
        </button>
      </div>
    </PanelModal>
  );
}

/* ------------------------------------------------------------------------ */
/* Karte                                                                     */
/* ------------------------------------------------------------------------ */

export function SkillRating() {
  const [data, setData] = useState<SkillRatingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await getOwnProfile();

        if (!profile) {
          if (!cancelled) {
            setLoggedIn(false);
          }

          return;
        }

        const result = await getPlayerSkillRating(profile.id);

        if (!cancelled) {
          setData(result);
          setSelected(result ? result.history.length - 1 : 0);
          setError(false);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Skill-Ratings:", err);

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={`${OUTER} text-center text-sm font-bold text-white/40`}>
        Lade Skill-Rating …
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className={`${OUTER} text-center text-sm font-bold text-white/50`}>
        Melde dich an, um dein Skill-Rating zu sehen.
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${OUTER} text-center text-sm font-bold text-red-400/80`}>
        Skill-Rating konnte nicht geladen werden.
      </div>
    );
  }

  const header = (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 h-6 w-1 shrink-0 rounded-full bg-cyan-400" />

      <div>
        <div className="text-lg font-black tracking-tight text-white">Skill-Rating</div>
        <div className="mt-0.5 text-xs font-semibold text-white/40">
          Zählt Ergebnis, Becherdifferenz und Stärke deiner Gegner, nicht nur die Trefferquote.{" "}
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="font-black text-cyan-400 underline decoration-cyan-400/40 underline-offset-2 transition hover:text-cyan-300"
          >
            Mehr
          </button>
        </div>
      </div>

      {infoOpen && <RatingInfoModal onClose={() => setInfoOpen(false)} />}
    </div>
  );

  if (!data) {
    return (
      <div className={OUTER}>
        {header}
        <div className="mt-6 text-xs font-bold text-white/30">
          Noch kein Rating: Spiele ein Match gegen registrierte Gegner, dann geht es bei{" "}
          {START_RATING} Punkten los.
        </div>
      </div>
    );
  }

  const step = data.history[Math.min(selected, data.history.length - 1)];
  const trend = data.history.reduce((sum, item) => sum + item.delta, 0);
  const barWidth = Math.max(0, Math.min(100, data.rating / 10));
  const matchNumber =
    data.matches - (data.history.length - 1 - Math.min(selected, data.history.length - 1));

  return (
    <div className={OUTER}>
      {header}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        {/* RATING */}
        <div className={INNER}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
              Aktuelles Rating
            </span>

            {data.provisional && (
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-yellow-400">
                Vorläufig
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="text-5xl font-black leading-none tracking-tight text-white">
              {data.rating}
            </span>
            <span className="pb-1 text-sm font-black text-white/30">/ 1000</span>

            {data.lastDelta !== null && (
              <span
                className={`mb-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${deltaBadgeClass(data.lastDelta)}`}
              >
                {formatDelta(data.lastDelta)} Punkte
              </span>
            )}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${barWidth}%` }} />
          </div>

          <div className="mt-1.5 flex justify-between text-[9px] font-bold text-white/25">
            <span>0</span>
            <span>500</span>
            <span>1000</span>
          </div>

          <div className="mt-4 text-xs font-semibold text-white/50">
            {data.rank ? (
              <>
                Rang <span className="font-black text-white">#{data.rank.rank}</span> von{" "}
                {data.rank.total}{" "}
                {data.rank.total === 1 ? "platziertem Spieler" : "platzierten Spielern"}
              </>
            ) : (
              <>
                Noch {data.matchesToRank} {data.matchesToRank === 1 ? "Match" : "Matches"} bis zur
                Platzierung (ab {MIN_RANKED_MATCHES} Matches).
              </>
            )}
          </div>

          {data.provisional && (
            <div className="mt-1 text-[11px] font-semibold leading-relaxed text-white/35">
              Verlässlich ab {PROVISIONAL_MATCHES} Matches, bis dahin kann sich dein Wert noch
              stärker bewegen.
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Tile
              label="Bestleistung"
              value={String(data.best)}
              hint={formatDate(data.bestSavedAt)}
            />
            <Tile
              label={`Letzte ${data.history.length}`}
              value={`${formatDelta(trend)}`}
              hint={`${data.matches} ${data.matches === 1 ? "Match" : "Matches"} gesamt`}
            />
          </div>
        </div>

        {/* VERLAUF */}
        <div className={INNER}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
              Rating-Verlauf · letzte {data.history.length}{" "}
              {data.history.length === 1 ? "Match" : "Matches"}
            </span>
          </div>

          <div className="mt-3">
            <RatingChart history={data.history} selected={selected} onSelect={setSelected} />
          </div>

          {step && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/35">
                Match {matchNumber} · {formatDate(step.savedAt)}
              </span>

              <span className="min-w-0 truncate text-xs font-bold text-white/70">
                {step.won === null ? "Unentschieden" : step.won ? "Sieg" : "Niederlage"} gegen{" "}
                {step.opponentNames.join(" & ") || "–"}{" "}
                <span className="text-white/35">(Ø {step.opponentRating})</span>
              </span>

              <span className="ml-auto text-xs font-black text-white">
                {step.before} → {step.after}{" "}
                <span className={deltaTextClass(step.delta)}>({formatDelta(step.delta)})</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
