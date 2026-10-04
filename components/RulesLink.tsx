import Link from "next/link";

/*
 * Kleiner "Regeln"-Link für die obere Leiste.
 *
 * Unter md nur ein kompaktes "?" (die Leiste ist auf dem Handy ohnehin
 * eng), ab md mit Beschriftung - im selben Pillen-Stil wie "Abmelden".
 */

export function RulesLink() {
  return (
    <Link
      href="/regeln"
      aria-label="Regeln"
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2 text-[9px] font-black uppercase tracking-wider text-white/50 transition hover:bg-white/[0.08] hover:text-white md:px-3"
    >
      <span className="md:hidden">?</span>
      <span className="hidden md:inline">Regeln</span>
    </Link>
  );
}
