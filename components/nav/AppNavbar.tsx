"use client";

import {
  ArrowRightLeft,
  ChevronDown,
  House,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DeleteAccountSection } from "@/components/stats/DeleteAccountSection";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getOwnProStatus } from "@/app/[locale]/spieler/match/playerProfiles";
import { getTournaments } from "@/app/[locale]/turniere/tournamentStorage";
import { createClient } from "@/lib/supabase/client";

import { getAppNavContent, type AppNavContent } from "./appNavContent";

import "./app-nav.css";

/*
|--------------------------------------------------------------------------
| NAVIGATIONSLEISTE FÜR PONG STATS UND PONG LEAGUE
|--------------------------------------------------------------------------
|
| Datei: components/nav/AppNavbar.tsx
|
| Eine gemeinsame Leiste für beide Anwendungen, eingebunden über
|   app/[locale]/spieler/layout.tsx   ->  <AppNavbar app="stats" />
|   app/[locale]/turniere/layout.tsx  ->  <AppNavbar app="league" />
|
| Oben "BEERPONG SPORTS TEC", darunter die Anwendung (Pong Stats in Cyan,
| Pong League in Gold). Rechts: Pro-Abzeichen, Sprache und das Konto-Menü
| (Konto verwalten, zur anderen Anwendung wechseln, Zurück zur Landingpage,
| Abmelden). Am Handy steht
| dasselbe im Menü hinter dem Knopf rechts.
|
| KONTO: Anmelden, Abmelden und "Konto verwalten" liegen hier. "Konto
| verwalten" öffnet ein Fenster mit der Konto-Löschung (und in Pong Stats
| "Statistiken zurücksetzen") - dieselbe Funktion wie früher unten auf den
| Seiten.
|
| Im Live-Match (/spieler/match ...) wird die Leiste ausgeblendet, dort ist
| der Platz für das Spielfeld gedacht.
|
*/

export type AppId = "stats" | "league";

/* Bereiche, in denen die Leiste nicht erscheint (Vollbild-Spielansicht). */
const HIDDEN_PREFIXES = ["/spieler/match"];

export function AppNavbar({ app }: { app: AppId }) {
  const locale = useLocale();
  const content = getAppNavContent(locale);
  const pathname = usePathname();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  /* Login-Status laden und aktuell halten. */
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!cancelled) {
          setUserEmail(data.user?.email ?? null);
        }
      })
      .catch((err) => console.error("Fehler beim Laden des Login-Status:", err))
      .finally(() => {
        if (!cancelled) {
          setAuthLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setUserEmail(session?.user?.email ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  /* Pro-Abzeichen. */
  useEffect(() => {
    let cancelled = false;

    if (!userEmail) {
      setIsPro(false);

      return;
    }

    getOwnProStatus()
      .then((pro) => {
        if (!cancelled) {
          setIsPro(pro);
        }
      })
      .catch((err) => console.error("Fehler beim Laden des Pro-Status:", err));

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  /* Menüs bei jedem Seitenwechsel schließen. */
  useEffect(() => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  /* Menüs: Klick daneben oder Escape schließt. */
  useEffect(() => {
    if (!menuOpen && !accountMenuOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (menuOpen && headerRef.current && !headerRef.current.contains(target)) {
        setMenuOpen(false);
      }

      if (accountMenuOpen && accountRef.current && !accountRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, accountMenuOpen]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setMenuOpen(false);
    setAccountMenuOpen(false);

    const { error } = await createClient().auth.signOut();

    if (error) {
      console.error("Fehler beim Abmelden:", error);
    }

    setUserEmail(null);
    setSigningOut(false);

    /* Pong League gibt es nur mit Konto, Pong Stats zeigt sich weiter als Gast. */
    if (app === "league") {
      router.push("/");
    }
  }, [app, router, signingOut]);

  const openAccountDialog = useCallback(() => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
    setAccountDialogOpen(true);
  }, []);

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  /* Wechsel zur jeweils anderen Anwendung. */
  const other =
    app === "stats"
      ? { href: "/turniere" as const, label: content.switchTo.league }
      : { href: "/spieler" as const, label: content.switchTo.stats };

  const appName = app === "stats" ? content.apps.stats : content.apps.league;
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "";

  return (
    <>
      <header ref={headerRef} className="bst-nav" data-app={app} data-open={menuOpen}>
        <div className="bst-nav-bar">
          {/* Marke: oben BEERPONG SPORTS TEC, darunter die Anwendung */}
          <Link href="/" className="bst-nav-brand" aria-label={`${content.brand} – ${content.home}`}>
            <span className="bst-nav-logo" aria-hidden="true">
              {/* Mit führendem "/", damit das Logo auch unter /en/... lädt. */}
              <img src="/images/icons/LogoBST.png" alt="" width={32} height={32} />
            </span>

            <span className="bst-nav-brand-text">
              <span className="bst-nav-brand-name">{content.brand}</span>
              <span className="bst-nav-brand-app">{appName}</span>
            </span>
          </Link>

          {/* Rechte Seite */}
          <div className="bst-nav-right">
            {isPro && <span className="bst-nav-pro">{content.pro}</span>}

            <div className="bst-nav-lang-bar">
              <LanguageSwitcher />
            </div>

            {/* Konto (ab md) */}
            <div className="bst-nav-account-desktop">
              {authLoading ? null : userEmail ? (
                <div ref={accountRef} className="bst-nav-account">
                  <button
                    type="button"
                    className="bst-nav-account-btn"
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                    aria-label={content.account.menu}
                    onClick={() => setAccountMenuOpen((open) => !open)}
                  >
                    <span className="bst-nav-avatar" aria-hidden="true">
                      {initial}
                    </span>
                    <ChevronDown size={14} strokeWidth={2.2} aria-hidden="true" />
                  </button>

                  {accountMenuOpen && (
                    <div role="menu" className="bst-nav-dropdown">
                      <div className="bst-nav-dropdown-label">{content.account.signedInAs}</div>
                      <div className="bst-nav-dropdown-email">{userEmail}</div>

                      <div className="bst-nav-divider" />

                      <button
                        type="button"
                        role="menuitem"
                        className="bst-nav-item"
                        onClick={openAccountDialog}
                      >
                        <UserRound size={16} strokeWidth={2} aria-hidden="true" />
                        {content.account.manage}
                      </button>

                      <Link href={other.href} role="menuitem" className="bst-nav-item">
                        <ArrowRightLeft size={16} strokeWidth={2} aria-hidden="true" />
                        {other.label}
                      </Link>

                      <Link href="/" role="menuitem" className="bst-nav-item">
                        <House size={16} strokeWidth={2} aria-hidden="true" />
                        {content.home}
                      </Link>

                      <div className="bst-nav-divider" />

                      <button
                        type="button"
                        role="menuitem"
                        className="bst-nav-item"
                        onClick={handleSignOut}
                        disabled={signingOut}
                      >
                        <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                        {signingOut ? content.account.signingOut : content.account.signOut}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bst-nav-guest">
                  <Link href="/" className="bst-nav-guest-home">
                    {content.home}
                  </Link>

                  <Link href="/login" className="bst-nav-signin">
                    {content.signIn}
                  </Link>
                </div>
              )}
            </div>

            {/* Menü-Knopf (unter md) */}
            <button
              type="button"
              className="bst-nav-burger"
              aria-label={menuOpen ? content.menuClose : content.menuOpen}
              aria-expanded={menuOpen}
              aria-controls="bst-nav-panel"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X size={20} strokeWidth={2} aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path
                    d="M5 9h14M5 15h9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Ausklappbares Menü (unter md) */}
        {menuOpen && (
          <div id="bst-nav-panel" className="bst-nav-panel">
            <Link href="/" className="bst-nav-panel-link">
              <span className="bst-nav-panel-icon">
                <House size={17} strokeWidth={2} aria-hidden="true" />
                {content.home}
              </span>
            </Link>

            <div className="bst-nav-divider" />

            <div className="bst-nav-lang-panel">
              <LanguageSwitcher />
            </div>

            {authLoading ? null : userEmail ? (
              <div>
                <div className="bst-nav-dropdown-label">{content.account.signedInAs}</div>
                <div className="bst-nav-dropdown-email">{userEmail}</div>
                {isPro && <span className="bst-nav-pro bst-nav-pro-inline">{content.pro}</span>}

                <button type="button" className="bst-nav-panel-link" onClick={openAccountDialog}>
                  <span className="bst-nav-panel-icon">
                    <UserRound size={17} strokeWidth={2} aria-hidden="true" />
                    {content.account.manage}
                  </span>
                </button>

                <Link href={other.href} className="bst-nav-panel-link">
                  <span className="bst-nav-panel-icon">
                    <ArrowRightLeft size={17} strokeWidth={2} aria-hidden="true" />
                    {other.label}
                  </span>
                </Link>

                <button
                  type="button"
                  className="bst-nav-panel-link"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  <span className="bst-nav-panel-icon">
                    <LogOut size={17} strokeWidth={2} aria-hidden="true" />
                    {signingOut ? content.account.signingOut : content.account.signOut}
                  </span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="bst-nav-panel-link bst-nav-panel-signin">
                {content.signIn}
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Bewusst NICHT im <header>: dessen Weichzeichner würde "fixed" einsperren. */}
      {accountDialogOpen && userEmail && (
        <AccountDialog
          app={app}
          content={content}
          email={userEmail}
          signingOut={signingOut}
          onSignOut={handleSignOut}
          onClose={() => setAccountDialogOpen(false)}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------
   Konto-Fenster
------------------------------------------------------- */

function AccountDialog({
  app,
  content,
  email,
  signingOut,
  onSignOut,
  onClose,
}: {
  app: AppId;
  content: AppNavContent;
  email: string;
  signingOut: boolean;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [ownedTournaments, setOwnedTournaments] = useState(0);

  /* onClose in einer Referenz halten, damit der Effekt unten nur einmal läuft (kein erneutes Fokussieren). */
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  /* Pong League: Anzahl eigener Turniere für den Hinweis beim Löschen. */
  useEffect(() => {
    if (app !== "league") {
      return;
    }

    let cancelled = false;

    Promise.all([createClient().auth.getUser(), getTournaments()])
      .then(([{ data }, tournaments]) => {
        if (!cancelled) {
          setOwnedTournaments(
            tournaments.filter((tournament) => tournament.userId === data.user?.id).length,
          );
        }
      })
      .catch((err) => console.error("Fehler beim Laden der Turniere:", err));

    return () => {
      cancelled = true;
    };
  }, [app]);

  /* Fokus, Scroll-Sperre, Escape. */
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      /* Ist gerade eine Sicherheitsabfrage (Löschen/Zurücksetzen) offen, schließt Escape nicht alles. */
      if (
        document.querySelector(
          '[aria-labelledby="delete-account-title"], [aria-labelledby="reset-stats-title"]',
        )
      ) {
        return;
      }

      onCloseRef.current();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="bst-nav-overlay"
      data-app={app}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="bst-nav-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bst-account-title"
        tabIndex={-1}
      >
        <div className="bst-nav-dialog-head">
          <h2 id="bst-account-title" className="bst-nav-dialog-title">
            {content.account.dialogTitle}
          </h2>

          <button
            type="button"
            className="bst-nav-dialog-close"
            onClick={onClose}
            aria-label={content.account.close}
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="bst-nav-dialog-body">
          <AccountRow label={content.account.signedInAs}>{email}</AccountRow>

          <button
            type="button"
            className="bst-nav-dialog-signout"
            onClick={onSignOut}
            disabled={signingOut}
          >
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
            {signingOut ? content.account.signingOut : content.account.signOut}
          </button>

          <DeleteAccountSection
            variant="panel"
            showResetStats={app === "stats"}
            tournamentCount={ownedTournaments}
          />
        </div>
      </div>
    </div>
  );
}

function AccountRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bst-nav-account-row">
      <div className="bst-nav-dropdown-label">{label}</div>
      <div className="bst-nav-account-value">{children}</div>
    </div>
  );
}
