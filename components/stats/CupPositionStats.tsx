"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getOwnProfile } from "@/app/spieler/match/playerProfiles";
import { PanelTitle } from "@/components/stats/PanelCard";
import {
  getPlayerCupPositionStats,
  type CupPositionStats as CupPositionData,
  type StatsRange,
} from "@/app/spieler/match/playerStats";

/*
 * --------------------------------------------------------------------------
 * | TREFFER NACH BECHERPOSITION
 * --------------------------------------------------------------------------
 *
 * Zeigt für jede Formation (10er, 6er, 3er), welche Becher wie oft
 * getroffen wurden - als Anteil an allen Treffern in dieser Formation.
 * Das ist eine VERTEILUNG, keine Trefferquote: Fehlwürfe speichern
 * nicht, auf welchen Becher gezielt wurde, deshalb gibt es kein "x %
 * der Würfe auf diesen Becher gingen rein".
 *
 * Ansicht aus Sicht des Werfers: Die Spitze des Dreiecks zeigt zu dir,
 * die breiteste Reihe steht hinten. Die Platz-Reihenfolge ist dieselbe
 * wie in matchLogic.ts (getShooterViewSlot).
 * --------------------------------------------------------------------------
 */

type Formation = "ten" | "six" | "three";

/*
 * Koordinaten in einem 100x100-Feld, Reihe für Reihe von hinten nach
 * vorn (Spitze zuletzt), links nach rechts - gleiche Reihenfolge wie
 * die Plätze in der Statistik. Abgeleitet aus den kompakten
 * Formationen in BeerPongTable.tsx (x dort 35-65, hier auf die
 * Feldbreite gestreckt).
 */

const POSITIONS: Record<Formation, { x: number; y: number }[]> = {
  ten: [
    { x: 12.5, y: 15 },
    { x: 37.5, y: 15 },
    { x: 62.5, y: 15 },
    { x: 87.5, y: 15 },
    { x: 25, y: 39 },
    { x: 50, y: 39 },
    { x: 75, y: 39 },
    { x: 37.5, y: 63 },
    { x: 62.5, y: 63 },
    { x: 50, y: 85 },
  ],
  six: [
    { x: 25, y: 15 },
    { x: 50, y: 15 },
    { x: 75, y: 15 },
    { x: 37.5, y: 50 },
    { x: 62.5, y: 50 },
    { x: 50, y: 85 },
  ],
  three: [
    { x: 37.5, y: 15 },
    { x: 62.5, y: 15 },
    { x: 50, y: 85 },
  ],
};

const TABS: { key: Formation; title: string; hint: string }[] = [
  { key: "ten", title: "10er", hint: "7–10 Becher" },
  { key: "six", title: "6er", hint: "4–6 Becher" },
  { key: "three", title: "3er", hint: "2–3 Becher" },
];

/* Dezente Heat-Skala: kaum sichtbar bei wenig Treffern, kräftig rot bei vielen. */
function heatFill(intensity: number): string {
  return `rgba(239, 68, 68, ${(0.08 + intensity * 0.72).toFixed(3)})`;
}

function heatStroke(intensity: number): string {
  return `rgba(248, 113, 113, ${(0.18 + intensity * 0.6).toFixed(3)})`;
}

export function CupPositionStats({ range = "all" }: { range?: StatsRange }) {
  const [data, setData] = useState<CupPositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Formation | null>(null);

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

        const stats = await getPlayerCupPositionStats(profile.id, range);

        if (!cancelled) {
          setData(stats);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Becherpositionen:", err);

        if (!cancelled) {
          setError("Becherpositionen konnten nicht geladen werden.");
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
  }, [range]);

  /* Start-Tab: die Formation mit den meisten Treffern. */
  const activeFormation: Formation = useMemo(() => {
    if (selected) {
      return selected;
    }

    if (!data) {
      return "ten";
    }

    return TABS.reduce(
      (best, tab) => (data[tab.key].total > data[best].total ? tab.key : best),
      "ten" as Formation,
    );
  }, [selected, data]);

  const current = data ? data[activeFormation] : null;
  const positions = POSITIONS[activeFormation];
  const maxCount = current ? Math.max(...current.counts, 0) : 0;
  const maxShare = current && current.total > 0 ? Math.round((maxCount / current.total) * 100) : 0;

  let content: ReactNode;

  if (loading) {
    content = (
      <div className="py-16 text-center text-sm font-bold text-white/40">
        Lade Becherpositionen …
      </div>
    );
  } else if (!loggedIn) {
    content = (
      <div className="py-16 text-center text-sm font-bold text-white/50">
        Melde dich an, um deine Becherpositionen zu sehen.
      </div>
    );
  } else if (error || !data || !current) {
    content = (
      <div className="py-16 text-center text-sm font-bold text-red-400/80">
        {error ?? "Becherpositionen konnten nicht geladen werden."}
      </div>
    );
  } else {
    content = (
      <>
        {/* FORMATIONS-TABS */}

        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1">
          {TABS.map((tab) => {
            const isActive = tab.key === activeFormation;

            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelected(tab.key)}
                className={`rounded-xl px-2 py-2 text-center transition ${
                  isActive ? "bg-cyan-400" : "hover:bg-white/[0.05]"
                }`}
              >
                <span
                  className={`block text-[11px] font-black uppercase tracking-wider ${
                    isActive ? "text-black" : "text-white/55"
                  }`}
                >
                  {tab.title}
                </span>
                <span
                  className={`block text-[9px] font-bold uppercase tracking-[0.12em] ${
                    isActive ? "text-black/55" : "text-white/25"
                  }`}
                >
                  <span className="hidden sm:inline">{tab.hint} · </span>
                  {data[tab.key].total}
                  <span className="sm:hidden"> Treffer</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* HEATMAP + LEGENDE */}

        <div className="mt-5 flex items-center justify-center gap-4 sm:gap-8">
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={`Treffer nach Becherposition, ${activeFormation === "ten" ? "10er" : activeFormation === "six" ? "6er" : "3er"}-Formation`}
            className="w-full max-w-[19rem]"
          >
            {positions.map((position, index) => {
              const count = current.counts[index] ?? 0;
              const intensity = maxCount > 0 ? count / maxCount : 0;
              const share = current.total > 0 ? Math.round((count / current.total) * 100) : 0;

              return (
                <g key={index}>
                  <ellipse
                    cx={position.x}
                    cy={position.y}
                    rx={10.5}
                    ry={9.6}
                    fill={count > 0 ? heatFill(intensity) : "rgba(255,255,255,0.03)"}
                    stroke={count > 0 ? heatStroke(intensity) : "rgba(255,255,255,0.1)"}
                    strokeWidth={0.6}
                  />

                  <text
                    x={position.x}
                    y={position.y - 0.4}
                    textAnchor="middle"
                    fontSize={5.2}
                    fontWeight={800}
                    fill={count > 0 ? "#fff" : "rgba(255,255,255,0.25)"}
                  >
                    {share}%
                  </text>

                  <text
                    x={position.x}
                    y={position.y + 4.6}
                    textAnchor="middle"
                    fontSize={3.4}
                    fontWeight={700}
                    fill={count > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.18)"}
                  >
                    {count}×
                  </text>
                </g>
              );
            })}
          </svg>

          {/* LEGENDE: oben der höchste Anteil, unten 0 % */}

          <div className="flex h-40 shrink-0 items-stretch gap-2.5 sm:h-48">
            <div
              className="w-2.5 rounded-full"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(239,68,68,0.8), rgba(255,255,255,0.05))",
              }}
            />

            <div className="flex flex-col justify-between py-0.5 text-[10px] font-bold text-white/40">
              <span>{maxShare} %</span>
              <span>0 %</span>
            </div>
          </div>
        </div>

        {/* HINWEISE */}

        <div className="mt-5 space-y-1 text-[11px] font-semibold text-white/30">
          {current.total === 0 ? (
            <p>
              In dieser Formation sind noch keine Treffer erfasst. Sie füllt sich mit neuen Matches.
            </p>
          ) : (
            <p>
              Basis: {current.total} Treffer in dieser Formation. Anteil = Verteilung deiner
              Treffer, keine Trefferquote.
            </p>
          )}

          <p>Ansicht aus deiner Wurfrichtung: Die Spitze zeigt zu dir.</p>

          {current.legacyHits > 0 && (
            <p>
              Enthält {current.legacyHits} Treffer aus älteren Matches (Positionen dort nur
              näherungsweise bekannt).
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
      <PanelTitle>Treffer nach Becherposition</PanelTitle>

      <div className="mt-5 flex-1">{content}</div>
    </section>
  );
}
