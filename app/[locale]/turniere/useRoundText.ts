"use client";

import { useTranslations } from "next-intl";
import { roundText } from "./tournamentLogic";

/* Liefert eine Funktion, die einen Rundencode ("semi", "round:5" …) übersetzt. */
export function useRoundText(): (code: string | null) => string {
  const t = useTranslations("Rounds");

  return (code) => roundText(code, (key, values) => t(key as never, values as never));
}
