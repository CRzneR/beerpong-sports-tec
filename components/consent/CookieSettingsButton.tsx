"use client";

import { useLocale } from "next-intl";

import { openConsentSettings } from "@/lib/consent/consent";
import { getConsentContent } from "@/lib/consent/consentContent";

import "./consent.css";

/*
 * Link "Cookie-Einstellungen" (Footer, Datenschutzerklärung).
 * Öffnet den Einstellungsdialog - hier kann die Einwilligung jederzeit
 * geändert oder widerrufen werden.
 *
 *   <CookieSettingsButton />                       (Footer-Stil)
 *   <CookieSettingsButton className="..." />       (eigener Stil)
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  const locale = useLocale();

  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={className ?? "bst-cc-footer-link"}
    >
      {getConsentContent(locale).footerLink}
    </button>
  );
}
