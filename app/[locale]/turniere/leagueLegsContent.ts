/*
|--------------------------------------------------------------------------
| TEXTE FÜR "HIN- UND RÜCKSPIEL" (Deutsch / Englisch)
|--------------------------------------------------------------------------
|
| Datei: app/[locale]/turniere/leagueLegsContent.ts
|
| Bewusst eine eigene Datei und nicht in messages/de.json / en.json: So gibt
| es keine Konflikte mit deinen übrigen Übersetzungen.
|
*/

import { useLocale } from "next-intl";

export type LegsContent = {
  optionLabel: string;
  optionTitle: string;
  optionHint: string;
  infoSingle: string;
  infoDouble: string;
  firstLeg: string;
  returnLeg: string;
  modeLabel: string;
  modeSingle: string;
  modeDouble: string;
};

const CONTENT: Record<"de" | "en", LegsContent> = {
  de: {
    optionLabel: "Spielmodus",
    optionTitle: "Hin- und Rückspiel",
    optionHint: "Jede Paarung in der Gruppe wird zweimal gespielt – mit getauschten Seiten.",
    infoSingle:
      "Die Teams werden gleichmäßig auf die Gruppen verteilt. Innerhalb einer Gruppe spielt jeder einmal gegen jeden.",
    infoDouble:
      "Die Teams werden gleichmäßig auf die Gruppen verteilt. Innerhalb einer Gruppe spielt jeder zweimal gegen jeden (Hin- und Rückspiel).",
    firstLeg: "Hinspiel",
    returnLeg: "Rückspiel",
    modeLabel: "Gruppenphase",
    modeSingle: "Einfache Runde",
    modeDouble: "Hin- und Rückspiel",
  },
  en: {
    optionLabel: "Match mode",
    optionTitle: "Home and away (two legs)",
    optionHint: "Every pairing in a group is played twice, with sides swapped.",
    infoSingle:
      "Teams are distributed evenly across the groups. Within a group, everyone plays everyone once.",
    infoDouble:
      "Teams are distributed evenly across the groups. Within a group, everyone plays everyone twice (first and second leg).",
    firstLeg: "1st leg",
    returnLeg: "2nd leg",
    modeLabel: "Group stage",
    modeSingle: "Single round robin",
    modeDouble: "Double round robin",
  },
};

export function useLegsContent(): LegsContent {
  const locale = useLocale();
  return locale === "en" ? CONTENT.en : CONTENT.de;
}
