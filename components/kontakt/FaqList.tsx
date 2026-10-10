"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Wie schnell erhalte ich eine Antwort?",
    answer: "In der Regel melden wir uns innerhalb von 1–2 Werktagen bei dir.",
  },
  {
    question: "Kann ich eine Kooperation anfragen?",
    answer:
      "Ja, gerne! Wähle im Kontaktformular den Betreff „Kooperation“ und beschreibe kurz deine Idee.",
  },
  {
    question: "Gibt es Support für die Apps?",
    answer:
      "Ja. Schreib uns über das Formular mit dem Betreff „Support“ und beschreibe dein Problem möglichst genau.",
  },
  {
    question: "Wo finde ich technische Dokumentationen?",
    answer:
      "Die technischen Dokumentationen findest du im Bereich „Features“. Bei offenen Fragen helfen wir dir direkt weiter.",
  },
];

export default function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;

        return (
          <div
            key={faq.question}
            className="rounded-xl border border-white/10 bg-[#0a1312] transition-colors hover:border-white/20"
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-sm text-white"
            >
              {faq.question}
              <ChevronDown
                className={`size-4 shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden="true"
              />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-sm leading-relaxed text-white/60">{faq.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
