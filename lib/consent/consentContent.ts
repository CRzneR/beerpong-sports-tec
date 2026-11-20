/*
|--------------------------------------------------------------------------
| TEXTE DES COOKIE-BANNERS (Deutsch / Englisch)
|--------------------------------------------------------------------------
|
| Datei: lib/consent/consentContent.ts
|
| Bewusst eine eigene Datei und NICHT in messages/de.json / en.json: So
| kollidiert das Banner nie mit deinen anderen Übersetzungen.
|
| Die Listen unter "essentialItems" müssen zur Realität passen. Legst du neuen
| Speicher an (neuer localStorage-Schlüssel, neues Cookie), hier eintragen -
| und in der Datenschutzerklärung ergänzen.
|
| Die englischen Rechtstexte sind eine Arbeitsübersetzung und sollten, wie die
| übrigen englischen Rechtstexte, fachlich geprüft werden.
|
*/

import type { OptionalCategoryId } from "./consent";

export type ConsentLocale = "de" | "en";

export type StorageItem = {
  name: string;
  type: string;
  provider: string;
  purpose: string;
  duration: string;
};

export type ConsentContent = {
  banner: {
    title: string;
    /** Text, solange die Seite nur Notwendiges nutzt. */
    textEssentialOnly: string;
    /** Text, sobald es optionale Kategorien gibt. */
    textWithOptional: string;
    privacy: string;
    imprint: string;
    understood: string;
    acceptAll: string;
    rejectOptional: string;
    settings: string;
    details: string;
  };
  dialog: {
    title: string;
    intro: string;
    close: string;
    save: string;
    acceptAll: string;
    rejectOptional: string;
    alwaysOn: string;
    notUsed: string;
    on: string;
    off: string;
    showDetails: string;
    hideDetails: string;
    noItems: string;
    columns: { name: string; provider: string; purpose: string; duration: string };
    revokeHint: string;
    otherServicesTitle: string;
    otherServices: string[];
  };
  categories: Record<
    "essential" | OptionalCategoryId,
    { title: string; description: string }
  >;
  essentialItems: StorageItem[];
  /** Pro optionaler Kategorie die gesetzten Cookies/Speichereinträge (leer, solange nicht genutzt). */
  optionalItems: Record<OptionalCategoryId, StorageItem[]>;
  footerLink: string;
};

export const CONSENT_CONTENT: Record<ConsentLocale, ConsentContent> = {
  de: {
    banner: {
      title: "Datenschutz & Cookies",
      textEssentialOnly:
        "Wir nutzen nur technisch notwendige Cookies und lokalen Speicher, zum Beispiel für deinen Login und für Einstellungen auf diesem Gerät. Tracking, Analyse oder Werbung setzen wir nicht ein.",
      textWithOptional:
        "Wir nutzen notwendige Cookies und lokalen Speicher, damit die Seite funktioniert. Weitere Dienste (z. B. Statistik oder externe Inhalte) setzen wir nur mit deiner Einwilligung ein. Du kannst deine Auswahl jederzeit im Footer ändern.",
      privacy: "Datenschutzerklärung",
      imprint: "Impressum",
      understood: "Verstanden",
      acceptAll: "Alle akzeptieren",
      rejectOptional: "Nur notwendige",
      settings: "Einstellungen",
      details: "Details",
    },
    dialog: {
      title: "Cookie-Einstellungen",
      intro:
        "Hier siehst du genau, was auf deinem Gerät gespeichert wird und warum. Technisch notwendiger Speicher ist immer aktiv, weil die Seite ohne ihn nicht funktioniert. Alles andere entscheidest du.",
      close: "Schließen",
      save: "Auswahl speichern",
      acceptAll: "Alle akzeptieren",
      rejectOptional: "Nur notwendige",
      alwaysOn: "Immer aktiv",
      notUsed: "Aktuell nicht im Einsatz",
      on: "An",
      off: "Aus",
      showDetails: "Details anzeigen",
      hideDetails: "Details ausblenden",
      noItems: "Es werden keine Cookies oder Speichereinträge dieser Art gesetzt.",
      columns: {
        name: "Name",
        provider: "Anbieter",
        purpose: "Zweck",
        duration: "Speicherdauer",
      },
      revokeHint:
        "Du kannst deine Auswahl jederzeit über „Cookie-Einstellungen“ im Footer ändern oder widerrufen. Die Auswahl gilt für 6 Monate, danach fragen wir erneut.",
      otherServicesTitle: "Weitere Dienste ohne Cookies auf dieser Seite",
      otherServices: [
        "Zahlung (Stripe): Beim Kauf von Pro wirst du auf die Seiten von Stripe weitergeleitet. Dort gelten die Datenschutzhinweise von Stripe; Stripe kann dort eigene Cookies setzen.",
        "Kontaktformular (EmailJS): Erst wenn du das Formular absendest, werden deine Angaben zum Versand der Nachricht an EmailJS übermittelt. Dabei wird kein Cookie gesetzt.",
        "Schriftarten: Die Schriften werden von unserem eigenen Server ausgeliefert, es gibt keine Verbindung zu Google Fonts.",
      ],
    },
    categories: {
      essential: {
        title: "Technisch notwendig",
        description:
          "Für Login, Sicherheit und deine Einstellungen. Ohne diesen Speicher funktioniert die Seite nicht. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG, Art. 6 Abs. 1 lit. b und f DSGVO. Eine Einwilligung ist dafür nicht nötig.",
      },
      statistics: {
        title: "Statistik und Analyse",
        description:
          "Würde uns zeigen, wie die Seite genutzt wird. Wir setzen derzeit keine Statistik- oder Analysedienste ein.",
      },
      external: {
        title: "Externe Inhalte",
        description:
          "Wären z. B. eingebettete Videos oder Karten von Drittanbietern. Wir binden derzeit keine externen Inhalte ein, die Daten an Dritte übertragen.",
      },
      marketing: {
        title: "Marketing",
        description:
          "Wäre Werbung oder Retargeting. Wir setzen derzeit keine Marketing-Dienste ein.",
      },
    },
    essentialItems: [
      {
        name: "sb-…-auth-token",
        type: "Cookie",
        provider: "Diese Website (Supabase Auth)",
        purpose: "Hält deine Login-Sitzung aufrecht, damit du eingeloggt bleibst.",
        duration: "Bis zum Logout, höchstens 400 Tage",
      },
      {
        name: "bst_consent",
        type: "Cookie",
        provider: "Diese Website",
        purpose: "Merkt sich deine Cookie-Auswahl, damit wir nicht bei jedem Besuch erneut fragen.",
        duration: "6 Monate",
      },
      {
        name: "pongstats.dashboard.hidden.v1",
        type: "Lokaler Speicher",
        provider: "Diese Website",
        purpose: "Merkt sich, welche Bereiche du im Dashboard ausgeblendet hast.",
        duration: "Bis du ihn löschst",
      },
      {
        name: "bst:hosted-lobbies",
        type: "Lokaler Speicher",
        provider: "Diese Website",
        purpose: "Merkt sich Match-Lobbys, die du auf diesem Gerät eröffnet hast.",
        duration: "Bis du ihn löschst",
      },
      {
        name: "bst:guest-ids",
        type: "Lokaler Speicher",
        provider: "Diese Website",
        purpose: "Merkt sich Gast-Mitspieler, die du auf diesem Gerät angelegt hast.",
        duration: "Bis du ihn löschst",
      },
    ],
    optionalItems: { statistics: [], external: [], marketing: [] },
    footerLink: "Cookie-Einstellungen",
  },

  en: {
    banner: {
      title: "Privacy & cookies",
      textEssentialOnly:
        "We only use technically necessary cookies and local storage, for example for your login and for settings on this device. We do not use tracking, analytics or advertising.",
      textWithOptional:
        "We use necessary cookies and local storage to make the site work. We only use further services (for example statistics or external content) with your consent. You can change your choice at any time in the footer.",
      privacy: "Privacy policy",
      imprint: "Legal notice",
      understood: "Got it",
      acceptAll: "Accept all",
      rejectOptional: "Necessary only",
      settings: "Settings",
      details: "Details",
    },
    dialog: {
      title: "Cookie settings",
      intro:
        "Here you can see exactly what is stored on your device and why. Technically necessary storage is always active because the site does not work without it. You decide about everything else.",
      close: "Close",
      save: "Save selection",
      acceptAll: "Accept all",
      rejectOptional: "Necessary only",
      alwaysOn: "Always active",
      notUsed: "Not currently in use",
      on: "On",
      off: "Off",
      showDetails: "Show details",
      hideDetails: "Hide details",
      noItems: "No cookies or storage entries of this kind are set.",
      columns: {
        name: "Name",
        provider: "Provider",
        purpose: "Purpose",
        duration: "Duration",
      },
      revokeHint:
        "You can change or withdraw your choice at any time via “Cookie settings” in the footer. Your choice is valid for 6 months, after which we ask again.",
      otherServicesTitle: "Other services on this site that do not use cookies",
      otherServices: [
        "Payment (Stripe): When you buy Pro, you are redirected to Stripe’s pages. Stripe’s privacy notices apply there; Stripe may set its own cookies.",
        "Contact form (EmailJS): Only when you submit the form is your input sent to EmailJS to deliver the message. No cookie is set.",
        "Fonts: Fonts are served from our own server, there is no connection to Google Fonts.",
      ],
    },
    categories: {
      essential: {
        title: "Technically necessary",
        description:
          "For login, security and your settings. The site does not work without this storage. Legal basis: Section 25(2) no. 2 TDDDG, Art. 6(1)(b) and (f) GDPR. No consent is required.",
      },
      statistics: {
        title: "Statistics and analytics",
        description:
          "Would show us how the site is used. We currently do not use any statistics or analytics services.",
      },
      external: {
        title: "External content",
        description:
          "Would be, for example, embedded videos or maps from third parties. We currently do not embed external content that transfers data to third parties.",
      },
      marketing: {
        title: "Marketing",
        description:
          "Would be advertising or retargeting. We currently do not use any marketing services.",
      },
    },
    essentialItems: [
      {
        name: "sb-…-auth-token",
        type: "Cookie",
        provider: "This website (Supabase Auth)",
        purpose: "Keeps your login session so that you stay signed in.",
        duration: "Until logout, at most 400 days",
      },
      {
        name: "bst_consent",
        type: "Cookie",
        provider: "This website",
        purpose: "Remembers your cookie choice so we do not ask again on every visit.",
        duration: "6 months",
      },
      {
        name: "pongstats.dashboard.hidden.v1",
        type: "Local storage",
        provider: "This website",
        purpose: "Remembers which dashboard sections you have hidden.",
        duration: "Until you delete it",
      },
      {
        name: "bst:hosted-lobbies",
        type: "Local storage",
        provider: "This website",
        purpose: "Remembers match lobbies you opened on this device.",
        duration: "Until you delete it",
      },
      {
        name: "bst:guest-ids",
        type: "Local storage",
        provider: "This website",
        purpose: "Remembers guest players you created on this device.",
        duration: "Until you delete it",
      },
    ],
    optionalItems: { statistics: [], external: [], marketing: [] },
    footerLink: "Cookie settings",
  },
};

export function getConsentContent(locale: string): ConsentContent {
  return CONSENT_CONTENT[locale === "en" ? "en" : "de"];
}
