/*
|--------------------------------------------------------------------------
| TEXTE DER NAVIGATIONSLEISTE (Deutsch / Englisch)
|--------------------------------------------------------------------------
|
| Datei: components/nav/appNavContent.ts
|
| Bewusst eine eigene Datei und nicht in messages/de.json / en.json: So gibt
| es keine Konflikte mit deinen übrigen Übersetzungen.
|
*/

export type NavLocale = "de" | "en";

export type AppNavContent = {
  brand: string;
  apps: { stats: string; league: string };
  switchTo: { stats: string; league: string };
  home: string;
  menuOpen: string;
  menuClose: string;
  mainNavigation: string;
  signIn: string;
  pro: string;
  account: {
    menu: string;
    manage: string;
    signOut: string;
    signingOut: string;
    dialogTitle: string;
    signedInAs: string;
    close: string;
  };
};

export const APP_NAV_CONTENT: Record<NavLocale, AppNavContent> = {
  de: {
    brand: "BEERPONG SPORTS TEC",
    apps: { stats: "Pong Stats", league: "Pong League" },
    switchTo: { stats: "Zu Pong Stats wechseln", league: "Zu Pong League wechseln" },
    home: "Zurück zur Landingpage",
    menuOpen: "Menü öffnen",
    menuClose: "Menü schließen",
    mainNavigation: "Hauptnavigation",
    signIn: "Anmelden",
    pro: "Pro",
    account: {
      menu: "Konto",
      manage: "Konto verwalten",
      signOut: "Abmelden",
      signingOut: "Wird abgemeldet …",
      dialogTitle: "Konto",
      signedInAs: "Angemeldet als",
      close: "Schließen",
    },
  },
  en: {
    brand: "BEERPONG SPORTS TEC",
    apps: { stats: "Pong Stats", league: "Pong League" },
    switchTo: { stats: "Switch to Pong Stats", league: "Switch to Pong League" },
    home: "Back to landing page",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    mainNavigation: "Main navigation",
    signIn: "Sign in",
    pro: "Pro",
    account: {
      menu: "Account",
      manage: "Manage account",
      signOut: "Sign out",
      signingOut: "Signing out …",
      dialogTitle: "Account",
      signedInAs: "Signed in as",
      close: "Close",
    },
  },
};

export function getAppNavContent(locale: string): AppNavContent {
  return APP_NAV_CONTENT[locale === "en" ? "en" : "de"];
}
