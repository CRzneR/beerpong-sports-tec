"use client";

import { useLocale } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";
import {
  ACTIVE_OPTIONAL_CATEGORIES,
  acceptAll,
  CONSENT_OPEN_EVENT_NAME,
  NO_CONSENT,
  rejectOptional,
  saveConsent,
  useConsent,
  type ConsentChoices,
  type OptionalCategoryId,
} from "@/lib/consent/consent";
import {
  getConsentContent,
  type ConsentContent,
  type StorageItem,
} from "@/lib/consent/consentContent";

import "./consent.css";

/*
|--------------------------------------------------------------------------
| COOKIE-BANNER + EINSTELLUNGEN
|--------------------------------------------------------------------------
|
| Datei: components/consent/CookieBanner.tsx
|
| Einmal im Layout eingebunden (app/[locale]/layout.tsx). Er zeigt
|
|   * unten ein Banner, solange noch keine Auswahl getroffen wurde,
|   * einen Einstellungsdialog (aus dem Banner oder über den Footer-Link
|     "Cookie-Einstellungen", dort ist auch der Widerruf möglich).
|
| Regeln, die hier eingehalten werden:
|   * "Alle akzeptieren" und "Nur notwendige" sind gleich groß und gleich
|     auffällig (kein Nudging), beide direkt auf der ersten Ebene.
|   * Nichts ist vorausgewählt.
|   * Die Seite bleibt bedienbar, das Banner ist kein Vollbild-Blocker
|     (Impressum und Datenschutz müssen immer erreichbar sein).
|   * Widerruf geht so leicht wie die Einwilligung.
|
| Die Oberfläche unterscheidet automatisch: Setzt die Seite nur Notwendiges
| ein (ACTIVE_OPTIONAL_CATEGORIES in lib/consent/consent.ts ist leer), ist
| das Banner ein Hinweis mit "Verstanden". Sobald optionale Dienste aktiv
| sind, erscheinen "Alle akzeptieren" / "Nur notwendige" / "Einstellungen".
|
*/

const HAS_OPTIONAL = ACTIVE_OPTIONAL_CATEGORIES.length > 0;

export function CookieBanner() {
  const locale = useLocale();
  const content = getConsentContent(locale);
  const { ready, decided, record } = useConsent();
  const [dialogOpen, setDialogOpen] = useState(false);

  /* Footer-Link "Cookie-Einstellungen" öffnet den Dialog über ein Browser-Ereignis. */
  useEffect(() => {
    const open = () => setDialogOpen(true);

    window.addEventListener(CONSENT_OPEN_EVENT_NAME, open);

    return () => window.removeEventListener(CONSENT_OPEN_EVENT_NAME, open);
  }, []);

  const closeDialog = useCallback(() => setDialogOpen(false), []);

  const showBanner = ready && !decided && !dialogOpen;

  return (
    <>
      {showBanner && (
        <Banner
          content={content}
          onOpenSettings={() => setDialogOpen(true)}
        />
      )}

      {dialogOpen && (
        <SettingsDialog
          content={content}
          initialChoices={record?.choices ?? NO_CONSENT}
          decided={decided}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------
   Banner
------------------------------------------------------- */

function Banner({
  content,
  onOpenSettings,
}: {
  content: ConsentContent;
  onOpenSettings: () => void;
}) {
  const titleId = useId();
  const textId = useId();
  const { banner } = content;

  return (
    <div
      className="bst-cc-banner"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={textId}
    >
      <div className="bst-cc-banner-head">
        <span className="bst-cc-dot" aria-hidden="true" />
        <h2 id={titleId} className="bst-cc-title">
          {banner.title}
        </h2>
      </div>

      <p id={textId} className="bst-cc-text">
        {HAS_OPTIONAL ? banner.textWithOptional : banner.textEssentialOnly}{" "}
        <Link href="/datenschutz" className="bst-cc-link">
          {banner.privacy}
        </Link>
        {" · "}
        <Link href="/impressum" className="bst-cc-link">
          {banner.imprint}
        </Link>
      </p>

      {HAS_OPTIONAL ? (
        <div className="bst-cc-actions">
          <button type="button" className="bst-cc-btn bst-cc-btn-reject" onClick={rejectOptional}>
            {banner.rejectOptional}
          </button>
          <button type="button" className="bst-cc-btn bst-cc-btn-accept" onClick={acceptAll}>
            {banner.acceptAll}
          </button>
          <button
            type="button"
            className="bst-cc-btn bst-cc-btn-ghost bst-cc-span"
            onClick={onOpenSettings}
          >
            {banner.settings}
          </button>
        </div>
      ) : (
        <div className="bst-cc-actions">
          <button type="button" className="bst-cc-btn bst-cc-btn-ghost" onClick={onOpenSettings}>
            {banner.details}
          </button>
          <button type="button" className="bst-cc-btn bst-cc-btn-accept" onClick={acceptAll}>
            {banner.understood}
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   Einstellungsdialog
------------------------------------------------------- */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SettingsDialog({
  content,
  initialChoices,
  decided,
  onClose,
}: {
  content: ConsentContent;
  initialChoices: ConsentChoices;
  decided: boolean;
  onClose: () => void;
}) {
  const { dialog, categories } = content;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ConsentChoices>(initialChoices);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

  /* Fokus in den Dialog holen, Hintergrund nicht scrollen lassen, Fokus am Ende zurückgeben. */
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  /* Escape schließt OHNE zu speichern; Tab bleibt im Dialog. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();

        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const toggleDetails = (id: string) => setOpenDetails((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleAcceptAll = () => {
    acceptAll();
    onClose();
  };

  const handleReject = () => {
    rejectOptional();
    onClose();
  };

  const handleSave = () => {
    saveConsent(draft);
    onClose();
  };

  const optionalIds: OptionalCategoryId[] = ["statistics", "external", "marketing"];

  return (
    <div
      className="bst-cc-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="bst-cc-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="bst-cc-dialog-head">
          <h2 id={titleId} className="bst-cc-dialog-title">
            {dialog.title}
          </h2>
          <button
            type="button"
            className="bst-cc-close"
            onClick={onClose}
            aria-label={dialog.close}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>

        <div className="bst-cc-dialog-body">
          <p className="bst-cc-text">{dialog.intro}</p>

          {/* Technisch notwendig */}
          <section className="bst-cc-cat">
            <div className="bst-cc-cat-row">
              <h3 className="bst-cc-cat-title">{categories.essential.title}</h3>
              <span className="bst-cc-badge bst-cc-badge-on">{dialog.alwaysOn}</span>
            </div>
            <p className="bst-cc-cat-text">{categories.essential.description}</p>
            <DetailsToggle
              open={openDetails.essential === true}
              onToggle={() => toggleDetails("essential")}
              dialog={dialog}
            />
            {openDetails.essential && (
              <ItemList items={content.essentialItems} dialog={dialog} />
            )}
          </section>

          {/* Optionale Kategorien */}
          {optionalIds.map((id) => {
            const active = ACTIVE_OPTIONAL_CATEGORIES.includes(id);
            const items = content.optionalItems[id];

            return (
              <section key={id} className="bst-cc-cat">
                <div className="bst-cc-cat-row">
                  <h3 className="bst-cc-cat-title">{categories[id].title}</h3>

                  {active ? (
                    <Switch
                      checked={draft[id]}
                      label={categories[id].title}
                      stateLabel={draft[id] ? dialog.on : dialog.off}
                      onChange={(value) => setDraft((prev) => ({ ...prev, [id]: value }))}
                    />
                  ) : (
                    <span className="bst-cc-badge">{dialog.notUsed}</span>
                  )}
                </div>

                <p className="bst-cc-cat-text">{categories[id].description}</p>

                {active && (
                  <>
                    <DetailsToggle
                      open={openDetails[id] === true}
                      onToggle={() => toggleDetails(id)}
                      dialog={dialog}
                    />
                    {openDetails[id] && <ItemList items={items} dialog={dialog} />}
                  </>
                )}
              </section>
            );
          })}

          {/* Dienste ohne Cookies */}
          <section className="bst-cc-cat">
            <h3 className="bst-cc-cat-title">{dialog.otherServicesTitle}</h3>
            <ul className="bst-cc-list">
              {dialog.otherServices.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </section>

          <p className="bst-cc-hint">
            {dialog.revokeHint}{" "}
            <Link href="/datenschutz" className="bst-cc-link" onClick={onClose}>
              {content.banner.privacy}
            </Link>
            {" · "}
            <Link href="/impressum" className="bst-cc-link" onClick={onClose}>
              {content.banner.imprint}
            </Link>
          </p>
        </div>

        <div className="bst-cc-dialog-foot">
          {HAS_OPTIONAL ? (
            <>
              <button type="button" className="bst-cc-btn bst-cc-btn-reject" onClick={handleReject}>
                {dialog.rejectOptional}
              </button>
              <button type="button" className="bst-cc-btn bst-cc-btn-ghost" onClick={handleSave}>
                {dialog.save}
              </button>
              <button type="button" className="bst-cc-btn bst-cc-btn-accept" onClick={handleAcceptAll}>
                {dialog.acceptAll}
              </button>
            </>
          ) : decided ? (
            <button type="button" className="bst-cc-btn bst-cc-btn-accept" onClick={onClose}>
              {dialog.close}
            </button>
          ) : (
            <button type="button" className="bst-cc-btn bst-cc-btn-accept" onClick={handleAcceptAll}>
              {content.banner.understood}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Kleine Bausteine
------------------------------------------------------- */

function Switch({
  checked,
  label,
  stateLabel,
  onChange,
}: {
  checked: boolean;
  label: string;
  stateLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="bst-cc-switch"
      data-on={checked ? "true" : "false"}
      onClick={() => onChange(!checked)}
    >
      <span className="bst-cc-switch-label">{stateLabel}</span>
      <span className="bst-cc-switch-track" aria-hidden="true">
        <span className="bst-cc-switch-thumb" />
      </span>
    </button>
  );
}

function DetailsToggle({
  open,
  onToggle,
  dialog,
}: {
  open: boolean;
  onToggle: () => void;
  dialog: ConsentContent["dialog"];
}) {
  return (
    <button type="button" className="bst-cc-more" aria-expanded={open} onClick={onToggle}>
      {open ? dialog.hideDetails : dialog.showDetails}
    </button>
  );
}

function ItemList({
  items,
  dialog,
}: {
  items: StorageItem[];
  dialog: ConsentContent["dialog"];
}) {
  if (items.length === 0) {
    return <p className="bst-cc-cat-text">{dialog.noItems}</p>;
  }

  return (
    <ul className="bst-cc-items">
      {items.map((item) => (
        <li key={item.name} className="bst-cc-item">
          <div className="bst-cc-item-head">
            <code className="bst-cc-code">{item.name}</code>
            <span className="bst-cc-chip">{item.type}</span>
          </div>
          <dl className="bst-cc-item-meta">
            <div>
              <dt>{dialog.columns.provider}</dt>
              <dd>{item.provider}</dd>
            </div>
            <div>
              <dt>{dialog.columns.purpose}</dt>
              <dd>{item.purpose}</dd>
            </div>
            <div>
              <dt>{dialog.columns.duration}</dt>
              <dd>{item.duration}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
