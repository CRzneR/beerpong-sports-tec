/*
|--------------------------------------------------------------------------
| K.-O.-TURNIERBAUM: LAYOUT
|--------------------------------------------------------------------------
|
| Berechnet für den "festen Turnierbaum" die Positionen aller Boxen und die
| Verbindungslinien. Reine Funktion ohne React, damit sie sich testen lässt.
|
| Aufbau wie in einer klassischen Turnier-Grafik:
|  - links die erste Hälfte des Baums, rechts die zweite (gespiegelt),
|    beide laufen nach innen,
|  - in der Mitte das Finale mit den beiden Finalisten und dem Pokal,
|  - jedes Team ist eine Box. Zwei Boxen, die gegeneinander spielen, stehen
|    übereinander und sind per Linie mit der Box der nächsten Runde verbunden,
|    die genau auf der Mitte zwischen ihnen sitzt,
|  - Teams mit Freilos haben keine Box in Runde 1, sie erscheinen erst in
|    Runde 2 (dort, wo ihr Freilos-Spiel im Baum läge).
|
| Alle Maße sind Pixel. Y-Werte sind Mittelpunkte der Boxen.
|
*/

export const BRACKET_BOX_W = 184;
export const BRACKET_BOX_H = 42;
export const BRACKET_BOX_GAP = 6;
export const BRACKET_MATCH_GAP = 22;
export const BRACKET_COL_GAP = 46;
export const BRACKET_PAD = 12;
/* Platz unter dem Finale für den Pokal. */
export const BRACKET_TROPHY_SPACE = 150;

const PITCH = BRACKET_BOX_H + BRACKET_BOX_GAP;

export type BracketLayoutMatch = {
  id: string;
  round: number;
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
  status: "pending" | "finished" | "bye";
};

export type BracketBox = {
  key: string;
  matchId: string;
  round: number;
  slot: number;
  side: "A" | "B";
  teamId: string | null;
  /* Linke obere Ecke. */
  x: number;
  y: number;
  /* Spielt in der Mitte (Finale). */
  isFinal: boolean;
};

export type BracketLayout = {
  width: number;
  height: number;
  boxes: BracketBox[];
  /* SVG-Pfade der Verbindungslinien. */
  lines: string[];
  /* Mittelpunkt für den Pokal; null, wenn es keinen Baum gibt. */
  trophy: { x: number; y: number } | null;
};

const EMPTY: BracketLayout = { width: 0, height: 0, boxes: [], lines: [], trophy: null };

export function layoutKoBracket(matches: BracketLayoutMatch[]): BracketLayout {
  const rounds = matches.reduce((max, match) => Math.max(max, match.round), 0);

  if (rounds === 0) {
    return EMPTY;
  }

  const find = (round: number, slot: number) =>
    matches.find((match) => match.round === round && match.slot === slot);

  const boxes: BracketBox[] = [];
  const lines: string[] = [];
  const columns = (rounds - 1) * 2 + 1;
  const width = columns * BRACKET_BOX_W + (columns - 1) * BRACKET_COL_GAP + BRACKET_PAD * 2;
  const centerX = BRACKET_PAD + (rounds - 1) * (BRACKET_BOX_W + BRACKET_COL_GAP);

  /* Nur das Finale: zwei Boxen, kein Baum. */
  if (rounds === 1) {
    const final = find(1, 0);
    const centerY = BRACKET_PAD + BRACKET_BOX_H + BRACKET_BOX_GAP / 2;

    if (final) {
      boxes.push(
        centeredBox(final, "A", centerX, centerY - (BRACKET_BOX_H + BRACKET_BOX_GAP) / 2),
        centeredBox(final, "B", centerX, centerY + (BRACKET_BOX_H + BRACKET_BOX_GAP) / 2),
      );
    }

    return {
      width,
      height: centerY + BRACKET_BOX_H + BRACKET_TROPHY_SPACE,
      boxes: boxes.map((box) => ({ ...box, y: box.y - BRACKET_BOX_H / 2 })),
      lines: [],
      trophy: { x: centerX + BRACKET_BOX_W / 2, y: centerY + BRACKET_BOX_H + 54 },
    };
  }

  /* Y-Mitte der Einträge ganz links bzw. rechts (Runde 1): zwei Boxen pro Spiel. */
  const leafY = (index: number) =>
    BRACKET_PAD + BRACKET_BOX_H / 2 + index * PITCH + Math.floor(index / 2) * BRACKET_MATCH_GAP;

  const entryYs = (round: number, localSlot: number): [number, number] => {
    if (round === 1) {
      return [leafY(localSlot * 2), leafY(localSlot * 2 + 1)];
    }

    return [outY(round - 1, localSlot * 2), outY(round - 1, localSlot * 2 + 1)];
  };

  const outY = (round: number, localSlot: number): number => {
    const [a, b] = entryYs(round, localSlot);

    return (a + b) / 2;
  };

  const leafCount = 2 ** (rounds - 1);
  const halfHeight = leafY(leafCount - 1) + BRACKET_BOX_H / 2 + BRACKET_PAD;
  const rootY = outY(rounds - 1, 0);

  for (const half of ["left", "right"] as const) {
    for (let round = 1; round <= rounds - 1; round += 1) {
      const slotsInHalf = 2 ** (rounds - round - 1);
      const column = round - 1;

      const boxX =
        half === "left"
          ? BRACKET_PAD + column * (BRACKET_BOX_W + BRACKET_COL_GAP)
          : width - BRACKET_PAD - BRACKET_BOX_W - column * (BRACKET_BOX_W + BRACKET_COL_GAP);

      for (let local = 0; local < slotsInHalf; local += 1) {
        const globalSlot = half === "right" ? slotsInHalf + local : local;
        const match = find(round, globalSlot);

        if (!match || match.status === "bye") {
          continue;
        }

        const [yA, yB] = entryYs(round, local);
        const out = (yA + yB) / 2;

        boxes.push(
          {
            key: `${match.id}-A`,
            matchId: match.id,
            round,
            slot: globalSlot,
            side: "A",
            teamId: match.teamAId,
            x: boxX,
            y: yA - BRACKET_BOX_H / 2,
            isFinal: false,
          },
          {
            key: `${match.id}-B`,
            matchId: match.id,
            round,
            slot: globalSlot,
            side: "B",
            teamId: match.teamBId,
            x: boxX,
            y: yB - BRACKET_BOX_H / 2,
            isFinal: false,
          },
        );

        /* Verbindung: beide Boxen zusammenführen und zur Box der nächsten Runde. */
        const edge = half === "left" ? boxX + BRACKET_BOX_W : boxX;
        const direction = half === "left" ? 1 : -1;
        const joinX = edge + (direction * BRACKET_COL_GAP) / 2;
        const targetX = edge + direction * BRACKET_COL_GAP;

        lines.push(`M${edge} ${yA}H${joinX}V${yB}H${edge}`, `M${joinX} ${out}H${targetX}`);
      }
    }
  }

  /* Mitte: die beiden Finalisten übereinander, dazwischen laufen die Linien ein. */
  const final = find(rounds, 0);

  if (final) {
    const offset = (BRACKET_BOX_H + BRACKET_BOX_GAP) / 2;

    boxes.push(
      {
        ...centeredBox(final, "A", centerX, rootY - offset),
        y: rootY - offset - BRACKET_BOX_H / 2,
      },
      {
        ...centeredBox(final, "B", centerX, rootY + offset),
        y: rootY + offset - BRACKET_BOX_H / 2,
      },
    );
  }

  return {
    width,
    height: Math.max(halfHeight, rootY + BRACKET_BOX_H + BRACKET_TROPHY_SPACE),
    boxes,
    lines,
    trophy: { x: centerX + BRACKET_BOX_W / 2, y: rootY + BRACKET_BOX_H + 56 },
  };
}

function centeredBox(
  match: BracketLayoutMatch,
  side: "A" | "B",
  x: number,
  centerY: number,
): BracketBox {
  return {
    key: `${match.id}-${side}`,
    matchId: match.id,
    round: match.round,
    slot: match.slot,
    side,
    teamId: side === "A" ? match.teamAId : match.teamBId,
    x,
    y: centerY,
    isFinal: true,
  };
}
