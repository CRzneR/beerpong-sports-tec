import { gsap } from "gsap";

/*
 * --------------------------------------------------------------------------
 * | GEMEINSAME GSAP-HELFER FÜR DIE LANDINGPAGE
 * --------------------------------------------------------------------------
 */

/**
 * Magnetischer Effekt: Das Element wird leicht vom Mauszeiger angezogen
 * und gleitet beim Verlassen zurück.
 *
 * Gedacht für einen schlichten Wrapper (z. B. <span data-magnetic>) um
 * einen Button - NICHT für das Element mit den Hover-Klassen selbst:
 * GSAP schreibt "transform" inline, das würde Tailwinds
 * hover:-translate-y-* auf demselben Element blockieren.
 *
 * Die Mitte wird beim Betreten einmal gemessen und gespeichert. Würde man
 * bei jeder Bewegung neu messen, wandert das Element mit dem Zeiger und
 * der Effekt schwingt sich auf einen kleinen Rest ein.
 *
 * Gibt eine Aufräum-Funktion zurück.
 */
export function attachMagnetic(elements: HTMLElement[], strength = 0.3): () => void {
  const cleanups = elements.map((element) => {
    const moveX = gsap.quickTo(element, "x", { duration: 0.6, ease: "power3.out" });
    const moveY = gsap.quickTo(element, "y", { duration: 0.6, ease: "power3.out" });

    let centerX = 0;
    let centerY = 0;

    const handleEnter = () => {
      const rect = element.getBoundingClientRect();

      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    };

    const handleMove = (event: PointerEvent) => {
      moveX((event.clientX - centerX) * strength);
      moveY((event.clientY - centerY) * strength);
    };

    const handleLeave = () => {
      moveX(0);
      moveY(0);
    };

    element.addEventListener("pointerenter", handleEnter);
    element.addEventListener("pointermove", handleMove);
    element.addEventListener("pointerleave", handleLeave);

    return () => {
      element.removeEventListener("pointerenter", handleEnter);
      element.removeEventListener("pointermove", handleMove);
      element.removeEventListener("pointerleave", handleLeave);

      gsap.set(element, { x: 0, y: 0 });
    };
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}
