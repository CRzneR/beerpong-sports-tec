"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/*
 * --------------------------------------------------------------------------
 * | PRO-VORSCHAU
 * --------------------------------------------------------------------------
 *

 */

type Slide = {
  src: string;
  eyebrow: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    src: "/images/pro-previews/pro-preview-1.svg",
    eyebrow: "01",
    title: "Performance auf einen Blick",
    description:
      "Trefferquote, Treffer, Siege und mehr – alle Kennzahlen deiner Matches in einer Übersicht, inklusive Aufschlüsselung deiner Trefferarten.",
  },
  {
    src: "/images/pro-previews/pro-preview-2.svg",
    eyebrow: "02",
    title: "Dein Leistungsverlauf",
    description:
      "Verfolge deine Entwicklung über die letzten Matches und sieh, wie sich deine Trefferquote Spiel für Spiel verbessert.",
  },
  {
    src: "/images/pro-previews/pro-preview-3.svg",
    eyebrow: "03",
    title: "Match-Historie mit Details",
    description:
      "Alle abgeschlossenen Matches mit Ergebnis, übrigen Bechern und Detailansicht – jederzeit abrufbar.",
  },
  {
    src: "/images/pro-previews/pro-preview-4.svg",
    eyebrow: "04",
    title: "Weltrangliste",
    description:
      "Vergleiche dich mit deinen Freunden: Siege, Trefferquote und Treffer im direkten Ranking.",
  },
  {
    src: "/images/pro-previews/pro-preview-5.png",
    eyebrow: "05",
    title: "Treffer nach Becherposition",
    description:
      "Sieh auf einen Blick, welche Becher du am häufigsten triffst – getrennt nach 10er-, 6er- und 3er-Formation, als Heatmap aus deiner Wurfrichtung.",
  },
  {
    src: "/images/pro-previews/pro-preview-6.png",
    eyebrow: "06",
    title: "Jetzt Pro freischalten",
    description:
      "Mehr Statistiken, tiefere Analysen und dein komplettes Spiel auf dem nächsten Level – einmalige Zahlung, keine Abos, sofortiger Zugriff.",
  },
];

interface ProPreviewModalProps {
  open: boolean;
  onClose: () => void;
  /** Wird beim Klick auf den Button "Jetzt Pro freischalten" ausgeführt (startet den Checkout). */
  onUpgrade?: () => void;
  /** true, solange der Checkout gestartet wird - sperrt den Button und zeigt "Lädt …". */
  upgrading?: boolean;
  /** Fehlermeldung, falls der Checkout nicht gestartet werden konnte. */
  error?: string | null;
  /** Mit welchem Bild gestartet wird (0–5). */
  initialIndex?: number;
  /** false = Gast: der Haupt-Button führt zur Anmeldung statt zum Checkout. */
  loggedIn?: boolean;
  /** Ziel des Anmelden-Buttons für Gäste. */
  loginHref?: string;
}

export default function ProPreviewModal({
  open,
  onClose,
  onUpgrade,
  upgrading = false,
  error = null,
  initialIndex = 0,
  loggedIn = true,
  loginHref = "/login?next=/spieler",
}: ProPreviewModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const total = SLIDES.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  /*
   * Beim Öffnen immer auf das gewünschte Startbild zurücksetzen.
   */
  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
    }
  }, [open, initialIndex]);

  /*
   * Tastatur-Steuerung
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight") {
        goNext();
      } else if (event.key === "ArrowLeft") {
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, goNext, goPrev]);

  /*
   * Hintergrund-Scrollen sperren, solange das Modal offen ist.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const slide = SLIDES[index];

  /*
   * Wischen (Touch)
   */
  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) {
      return;
    }

    const delta = event.changedTouches[0].clientX - touchStartX.current;

    touchStartX.current = null;

    if (Math.abs(delta) < 50) {
      return;
    }

    if (delta < 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pro-Vorschau"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "880px",
          maxHeight: "100%",
          overflowY: "auto",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          background: "#0b0e13",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Kopfzeile */}
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 md:px-7 md:pt-6">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-400">
              Pong Stats Pro
            </div>

            <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-white md:text-2xl">
              Das schaltest du frei
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Vorschau schließen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-base font-bold text-white/60 transition hover:bg-white/[0.1] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Bildbereich */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative px-5 md:px-7"
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "960 / 600",
              overflow: "hidden",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              background: "#07090d",
            }}
          >
            {/*
             * Alle Bilder liegen übereinander, nur das aktive ist sichtbar.
             * Das vermeidet Flackern beim Blättern, weil die Bilder
             * bereits geladen sind.
             */}
            {SLIDES.map((item, slideIndex) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.src}
                src={item.src}
                alt={item.title}
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: slideIndex === index ? 1 : 0,
                  transition: "opacity 250ms ease",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            ))}

            {/* Zurück */}
            <button
              type="button"
              onClick={goPrev}
              aria-label="Vorheriges Bild"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-lg font-bold text-white backdrop-blur transition hover:border-cyan-400/50 hover:bg-black/80 hover:text-cyan-400"
            >
              ‹
            </button>

            {/* Weiter */}
            <button
              type="button"
              onClick={goNext}
              aria-label="Nächstes Bild"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-lg font-bold text-white backdrop-blur transition hover:border-cyan-400/50 hover:bg-black/80 hover:text-cyan-400"
            >
              ›
            </button>
          </div>
        </div>

        {/* Beschreibung */}
        <div className="px-5 pt-5 md:px-7">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] font-bold tracking-[0.25em] text-cyan-400/60">
              {slide.eyebrow} / {String(total).padStart(2, "0")}
            </span>

            <h3 className="text-base font-black uppercase tracking-tight text-white md:text-lg">
              {slide.title}
            </h3>
          </div>

          <p className="mt-2 min-h-[3.5rem] text-sm leading-relaxed text-white/45">
            {slide.description}
          </p>
        </div>

        {/* Punkte */}
        <div className="flex items-center justify-center gap-2 px-5 pt-3 md:px-7">
          {SLIDES.map((item, dotIndex) => (
            <button
              key={item.src}
              type="button"
              onClick={() => goTo(dotIndex)}
              aria-label={`Bild ${dotIndex + 1} anzeigen`}
              aria-current={dotIndex === index}
              style={{
                width: dotIndex === index ? "24px" : "8px",
                height: "8px",
                borderRadius: "999px",
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: dotIndex === index ? "#22d3ee" : "rgba(255, 255, 255, 0.2)",
                transition: "width 200ms ease, background 200ms ease",
              }}
            />
          ))}
        </div>

        {/* Fehlermeldung (Checkout konnte nicht gestartet werden) */}
        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs font-bold text-red-400/80 md:mx-7">
            {error}
          </div>
        )}

        {/* Aktion */}
        <div className="flex flex-col items-center gap-3 px-5 pb-6 pt-5 md:flex-row md:justify-between md:px-7">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-white/35 transition hover:text-white"
          >
            Vielleicht später
          </button>

          {loggedIn ? (
            <button
              type="button"
              disabled={upgrading}
              onClick={() => {
                onUpgrade?.();
              }}
              className="w-full rounded-full bg-cyan-400 px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            >
              {upgrading ? "Lädt …" : "Jetzt Pro freischalten"}
            </button>
          ) : (
            <Link
              href={loginHref}
              className="w-full rounded-full bg-cyan-400 px-8 py-3.5 text-center text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-cyan-300 md:w-auto"
            >
              Anmelden &amp; Pro freischalten
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
