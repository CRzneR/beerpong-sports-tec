import Link from "next/link";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
            <span className="text-lg">🍺</span>
          </div>

          <div className="leading-none">
            <div className="text-sm font-black tracking-wider text-white">BEERPONG</div>

            <div className="mt-1 text-[10px] font-medium tracking-[0.25em] text-emerald-400">
              SPORTS TEC
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-sm font-medium text-emerald-400">
            Startseite
          </Link>

          <Link
            href="/turniere"
            className="text-sm font-medium text-white/60 transition hover:text-white"
          >
            Turniere
          </Link>

          <Link
            href="/spieler"
            className="text-sm font-medium text-white/60 transition hover:text-white"
          >
            Spieler & Stats
          </Link>

          <Link
            href="/community"
            className="text-sm font-medium text-white/60 transition hover:text-white"
          >
            Community
          </Link>

          <Link
            href="/ueber-uns"
            className="text-sm font-medium text-white/60 transition hover:text-white"
          >
            Über uns
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5 sm:block"
          >
            Login
          </Link>

          <Link
            href="/registrieren"
            className="rounded-full bg-emerald-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-emerald-300 sm:px-5 sm:text-sm"
          >
            Jetzt starten
            <span className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
