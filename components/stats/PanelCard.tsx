"use client";

import { useEffect, type ReactNode } from "react";

/*
 * --------------------------------------------------------------------------
 * | GEMEINSAME BAUSTEINE FÜR DIE KARTEN IM PROFIL
 * --------------------------------------------------------------------------
 *
 * PanelTitle: Überschrift mit cyanfarbenem Akzentbalken (optional mit
 *             Aktion rechts, z. B. "Alle anzeigen").
 * PanelModal: Overlay für die vollständigen Listen (alle Achievements,
 *             alle Matches). Schließt per Klick daneben, per × und Escape.
 * --------------------------------------------------------------------------
 */

export function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-5 w-1 shrink-0 rounded-full bg-cyan-400" />
        <div className="truncate text-sm font-black tracking-tight text-white">{children}</div>
      </div>

      {action}
    </div>
  );
}

export function PanelModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl border border-white/[0.1] bg-[#0c0f16] p-5 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <PanelTitle>{title}</PanelTitle>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-lg text-white/40 transition hover:bg-white/[0.1] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
