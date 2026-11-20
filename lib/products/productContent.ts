/*
|--------------------------------------------------------------------------
| INHALTE DER PRODUKTSEITEN (Pong Stats und Pong League)
|--------------------------------------------------------------------------
|
| Datei: lib/products/productContent.ts
|
| Alle Texte, Bilder und Alt-Texte der beiden Produktseiten stehen hier
| (nicht in messages/de.json / en.json) - so bleiben deine übrigen
| Übersetzungen unberührt und du pflegst die Seiten an einer Stelle.
|
| BILDER
|   Liegen unter public/images/products/. Ein Bild tauschst du aus, indem du
|   die Datei gleichen Namens ersetzt (gleiches Seitenverhältnis, siehe
|   width/height unten) - oder hier den Dateinamen änderst.
|     "stats-live"          -> /images/products/stats-live.webp
|     localized: true       -> /images/products/league-groups-de.webp bzw. -en.webp
|   Die Screenshots zeigen Beispieldaten mit frei erfundenen Namen.
|
| NEUE FUNKTION?
|   Eintrag in "groups -> features" ergänzen, Bild in IMAGE_SIZES eintragen.
|
*/

export type ProductSlug = "stats" | "league";
export type ProductLocale = "de" | "en";

type Localized<T> = { de: T; en: T };

/* Breite x Höhe der Bilddateien (für Next/Image, verhindert Layout-Sprünge). */
const IMAGE_SIZES: Record<string, [number, number]> = {
  "stats-live": [1600, 1125],
  "stats-hit": [1600, 1125],
  "stats-lobby": [1200, 1290],
  "stats-overview": [1600, 883],
  "stats-rating": [1600, 809],
  "stats-cups": [1600, 768],
  "stats-detail": [1600, 740],
  "stats-gameflow": [1600, 994],
  "stats-matchups": [1600, 595],
  "stats-progress": [1600, 456],
  "stats-ranking": [1600, 694],
  "stats-tournament": [1600, 686],
  "league-list": [1600, 1195],
  "league-new": [1440, 1020],
  "league-groups": [1600, 1152],
  "league-sched": [1600, 1202],
  "league-ko": [1600, 1002],
  "league-teams": [1600, 1124],
};

export type ProductImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type ProductFeature = {
  id: string;
  title: string;
  text: string;
  bullets: string[];
  plan: "free" | "pro";
  image: ProductImage;
};

export type ProductGroup = {
  id: string;
  title: string;
  intro: string;
  features: ProductFeature[];
};

export type ProductContent = {
  slug: ProductSlug;
  name: string;
  /* <title> und Meta-Description */
  metaTitle: string;
  metaDescription: string;
  /* Kurzbeschreibung für schema.org */
  schemaDescription: string;
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    lead: string;
    image: ProductImage;
  };
  quickFacts: { value: string; label: string }[];
  groups: ProductGroup[];
  steps: { title: string; text: string }[];
  plans: {
    free: { title: string; text: string; items: string[] };
    pro: { title: string; text: string; items: string[] };
  };
  faq: { question: string; answer: string }[];
  /* Hinweis unter den Bildern */
  imageNote: string;
};

/* --------------------------------------------------------------------------
 * Gemeinsame Beschriftungen
 * -------------------------------------------------------------------------- */

export type ProductUi = {
  home: string;
  breadcrumbLabel: string;
  openApp: string;
  startFreeText: string;
  seeFeatures: string;
  featuresTitle: string;
  planFree: string;
  planPro: string;
  stepsEyebrow: string;
  stepsTitle: string;
  plansEyebrow: string;
  plansTitle: string;
  plansNote: string;
  oneTime: string;
  noSubscription: string;
  faqEyebrow: string;
  faqTitle: string;
  ctaTitle: string;
  ctaText: string;
  otherTitle: string;
  otherCta: string;
  rulesLink: string;
};

export const PRODUCT_UI: Localized<ProductUi> = {
  de: {
    home: "Startseite",
    breadcrumbLabel: "Brotkrumen",
    openApp: "Jetzt öffnen",
    startFreeText: "Kostenlos loslegen: Konto anlegen und das erste Match starten.",
    seeFeatures: "Funktionen ansehen",
    featuresTitle: "Was drinsteckt",
    planFree: "Kostenlos",
    planPro: "Pro",
    stepsEyebrow: "So funktioniert's",
    stepsTitle: "In drei Schritten startklar",
    plansEyebrow: "Kostenlos & Pro",
    plansTitle: "Was ist kostenlos, was ist Pro?",
    plansNote:
      "Pro gilt für Pong Stats und Pong League zusammen: einmal freischalten, beide Plattformen nutzen.",
    oneTime: "einmalig",
    noSubscription: "Kein Abo, keine Folgekosten.",
    faqEyebrow: "Häufige Fragen",
    faqTitle: "Gut zu wissen",
    ctaTitle: "Bereit für den ersten Wurf?",
    ctaText: "Konto erstellen, loslegen, Becher zählen. Der Einstieg ist kostenlos.",
    otherTitle: "Auch interessant",
    otherCta: "Mehr erfahren",
    rulesLink: "Beer-Pong-Regeln ansehen",
  },
  en: {
    home: "Home",
    breadcrumbLabel: "Breadcrumb",
    openApp: "Open now",
    startFreeText: "Start for free: create an account and begin your first match.",
    seeFeatures: "See features",
    featuresTitle: "What's inside",
    planFree: "Free",
    planPro: "Pro",
    stepsEyebrow: "How it works",
    stepsTitle: "Ready in three steps",
    plansEyebrow: "Free & Pro",
    plansTitle: "What is free and what is Pro?",
    plansNote:
      "Pro covers Pong Stats and Pong League together: unlock it once and use both platforms.",
    oneTime: "one-time",
    noSubscription: "No subscription, no recurring costs.",
    faqEyebrow: "FAQ",
    faqTitle: "Good to know",
    ctaTitle: "Ready for the first throw?",
    ctaText: "Create an account, get started, count cups. Getting started is free.",
    otherTitle: "You might also like",
    otherCta: "Learn more",
    rulesLink: "Read the beer pong rules",
  },
};

/* Teaser für das jeweils andere Produkt (unten auf der Seite). */
export const OTHER_PRODUCT_TEASER: Record<ProductSlug, Localized<string>> = {
  stats: {
    de: "Pong Stats wertet jedes Match aus: Trefferquote, Skill-Rating, Becherpositionen, Rangliste und mehr.",
    en: "Pong Stats analyses every match: hit rate, skill rating, cup positions, rankings and more.",
  },
  league: {
    de: "Pong League organisiert dein Turnier: Gruppen, Tabellen, Spielplan, K.-o.-Baum und Einladungslink.",
    en: "Pong League runs your tournament: groups, tables, schedule, knockout bracket and invite link.",
  },
};

/* --------------------------------------------------------------------------
 * Hilfsfunktion: Bild aufbauen
 * -------------------------------------------------------------------------- */

function img(key: string, locale: ProductLocale, alt: string, localized = false): ProductImage {
  const [width, height] = IMAGE_SIZES[key];

  return {
    src: `/images/products/${key}${localized ? `-${locale}` : ""}.webp`,
    width,
    height,
    alt,
  };
}

/* --------------------------------------------------------------------------
 * PONG STATS
 * -------------------------------------------------------------------------- */

function statsDe(): ProductContent {
  const l: ProductLocale = "de";

  return {
    slug: "stats",
    name: "Pong Stats",
    metaTitle: "Pong Stats: Beer-Pong-Statistik, Skill-Rating & Becher-Heatmap | BeerPongSportsTec",
    metaDescription:
      "Erfasse jeden Wurf live und sieh, wie gut du wirklich bist: Trefferquote, Skill-Rating, Heatmap nach Becherposition, Rangliste und Match-Historie. Im Browser, kostenlos starten.",
    schemaDescription:
      "Pong Stats erfasst Beer-Pong-Matches live und wertet sie aus: Trefferquote, Skill-Rating, Treffer nach Becherposition, Partner- und Gegner-Bilanz, Rangliste und Fortschritt.",
    hero: {
      eyebrow: "Pong Stats",
      title: "Deine Beer-Pong-Statistik.",
      titleAccent: "Wurf für Wurf.",
      lead: "Erfasse jedes Match live am Handy und lass dir danach zeigen, wie du wirklich spielst: Trefferquote, Skill-Rating, deine Lieblingsbecher, Serien, Comebacks und die Bilanz gegen jeden Gegner.",
      image: img(
        "stats-live",
        l,
        "Live-Match in Pong Stats: zwei Teams mit je zwei Spielern, Becher-Tisch in der Mitte, Daneben-, Getroffen- und Special-Tasten pro Spieler und Live-Spielstand",
      ),
    },
    quickFacts: [
      { value: "10 · 6 · 3", label: "Becher-Formationen werden mit erfasst" },
      { value: "0 – 1000", label: "Skill-Rating statt nur Trefferquote" },
      { value: "Elo", label: "Rating nach dem Elo-Prinzip, für Beer Pong angepasst" },
      { value: "Browser", label: "Keine Installation nötig" },
    ],
    groups: [
      {
        id: "erfassen",
        title: "Spielen und erfassen",
        intro:
          "Pong Stats ist für den Tisch gemacht: große Tasten, wenige Handgriffe, nichts geht verloren.",
        features: [
          {
            id: "live-match",
            title: "Match live erfassen",
            text: "Pro Wurf ein Tipp: Daneben, Getroffen oder Special. Der Spielstand, die Becher auf dem Tisch und die Match-Statistik laufen live mit.",
            bullets: [
              "Zwei Teams mit mehreren Spielern, du siehst immer, wer am Zug ist",
              "Trefferarten Einzeltreffer, Aufhüpfen (zählt zwei Becher) und Trickshot",
              "Strafbecher und Umgeworfen als Special",
              "Live-Spielstand, Match-Statistik und die letzten Aktionen im Blick",
              "Vertippt? Mit „Rückgängig“ nimmst du die letzte Aktion zurück",
            ],
            plan: "free",
            image: img(
              "stats-live",
              l,
              "Live-Match mit Becher-Tisch, Spielerkarten, Match-Statistik, letzten Aktionen und Spielstand 3 zu 3",
            ),
          },
          {
            id: "lobby",
            title: "Lobby mit QR-Code",
            text: "Du eröffnest die Lobby, deine Mitspieler scannen den Code und wählen ihr Profil. Wer kein Konto hat, spielt als Gast mit.",
            bullets: [
              "Mitspieler treten per QR-Code vom eigenen Handy bei",
              "Gast-Profile ohne Login für spontane Runden",
              "Spieler per Tipp Team A oder Team B zuweisen",
              "Das Match startet erst, wenn beide Teams besetzt sind",
            ],
            plan: "free",
            image: img(
              "stats-lobby",
              l,
              "Match-Lobby mit QR-Code zum Beitreten, Feld für Gast-Profile und den Teams A und B",
            ),
          },
          {
            id: "treffer",
            title: "Treffer genau festhalten",
            text: "Bei jedem Treffer wählst du die Trefferart und tippst den getroffenen Becher an. Pong Stats merkt sich dabei auch die Formation (10er, 6er oder 3er) und den Platz des Bechers.",
            bullets: [
              "Trefferart und Becher in einem Schritt",
              "Formation und Becherposition fließen in die Heatmap ein",
              "Aufhüpfer: der zweite Becher folgt automatisch als Extra-Treffer",
            ],
            plan: "free",
            image: img(
              "stats-hit",
              l,
              "Dialog Treffer erfassen mit den Trefferarten Einzeltreffer, Aufhüpfen und Trickshot sowie dem Becherdreieck des Gegners",
            ),
          },
        ],
      },
      {
        id: "auswerten",
        title: "Auswerten und verstehen",
        intro:
          "Nach dem Match beginnt der interessante Teil. Die Hauptwerte siehst du kostenlos, die tiefen Analysen schaltet Pro frei.",
        features: [
          {
            id: "uebersicht",
            title: "Dein Profil auf einen Blick",
            text: "Matches, Winrate, Trefferquote, Becher, Siege und Niederlagen, dazu ein Zeitraum-Filter und ein Dashboard, das du dir selbst zusammenstellst.",
            bullets: [
              "Zeitraum: Heute, letzte 10, letzte 30 oder alle Matches",
              "Dashboard anpassen: nur die Karten anzeigen, die dich interessieren",
              "Mit Pro zusätzlich: Würfe, Treffer, Fehlwürfe, Aufhüpfer, Trickshots, Strafbecher",
            ],
            plan: "free",
            image: img(
              "stats-overview",
              l,
              "Spielerprofil mit Zeitraum-Filter und sechs Kennzahlen: 62 Matches, 66,1 Prozent Winrate, 54 Prozent Trefferquote, 431 Becher, 41 Siege, 21 Niederlagen",
            ),
          },
          {
            id: "rating",
            title: "Skill-Rating von 0 bis 1000",
            text: "Die Trefferquote allein sagt wenig. Das Skill-Rating berücksichtigt Ergebnis, Becherdifferenz und die Stärke deiner Gegner und zeigt dir deinen Platz unter allen platzierten Spielern.",
            bullets: [
              "Aktuelles Rating, Bestleistung und Entwicklung der letzten 30 Matches",
              "Verlauf als Diagramm, mit dem Ergebnis jedes einzelnen Matches",
              "Ein Sieg gegen einen stärkeren Gegner bringt mehr Punkte, ein klares 10:2 mehr als ein knappes 10:9",
            ],
            plan: "pro",
            image: img(
              "stats-rating",
              l,
              "Skill-Rating 585 von 1000 mit Rang 1, Bestleistung 614 und Verlaufsdiagramm der letzten 30 Matches",
            ),
          },
          {
            id: "becherposition",
            title: "Heatmap: Welche Becher triffst du?",
            text: "Pong Stats zeigt dir pro Formation, auf welche Becher deine Treffer fallen, als Heatmap aus deiner Wurfrichtung. Dazu kommt der Verlauf deiner Trefferquote über die Zeit.",
            bullets: [
              "Getrennt nach 10er-, 6er- und 3er-Formation",
              "Anteil jedes Bechers an deinen Treffern, mit Anzahl",
              "Trefferquote pro Match als Verlauf mit Tendenz",
            ],
            plan: "pro",
            image: img(
              "stats-cups",
              l,
              "Verlaufsdiagramm der Trefferquote und Heatmap der Treffer nach Becherposition in der 10er-Formation",
            ),
          },
          {
            id: "detail",
            title: "Statistiken im Detail",
            text: "Wie oft triffst du direkt, wie oft über den Aufhüpfer, und wie gut bist du in der Endphase, wenn der Gegner nur noch wenige Becher hat?",
            bullets: [
              "Trefferarten: Einzeltreffer, Aufhüpfen, Trickshot in Prozent",
              "Endphase-Quote bei höchstens drei Bechern des Gegners",
              "Form der letzten sechs Spiele, längste Siegesserie und Trefferserie",
            ],
            plan: "pro",
            image: img(
              "stats-detail",
              l,
              "Detail-Statistik mit Winrate-Ring, Trefferarten, Endphase-Quote, Form der letzten sechs Spiele und Serien",
            ),
          },
          {
            id: "spielverlauf",
            title: "Spielverlauf: Comebacks und Führung",
            text: "Wie oft drehst du einen Rückstand? Gibst du eine Führung ab? Und wie wichtig ist der erste Treffer? Pong Stats beantwortet es mit deinen eigenen Matches.",
            bullets: [
              "Comeback-Quote und größter gedrehter Rückstand",
              "Führung gehalten und größte verspielte Führung",
              "Starttreffer-Quote und Siege nach Starttreffer",
              "Größter Sieg, größte Niederlage, knappe Matches, Ø Becherdifferenz",
              "Match-Historie mit Detailansicht für jedes Spiel",
            ],
            plan: "pro",
            image: img(
              "stats-gameflow",
              l,
              "Spielverlauf mit Comeback-Quote 24 Prozent, Führung gehalten 97 Prozent, Starttreffer 63 Prozent und Match-Ergebnissen",
            ),
          },
          {
            id: "bilanz",
            title: "Bilanz gegen Gegner und Partner",
            text: "Wer ist dein Lieblingsgegner, mit wem gewinnst du am meisten? Die Bilanz zeigt dir Siege, Niederlagen und Quote gegen jeden Mitspieler.",
            bullets: [
              "Bilanz gegen jeden Gegner, inklusive Lieblingsgegner",
              "Partner-Bilanz im Doppel, inklusive bestem Team",
            ],
            plan: "pro",
            image: img(
              "stats-matchups",
              l,
              "Bilanz gegen Gegner und Partner-Bilanz mit Siegen, Niederlagen und Quote pro Mitspieler",
            ),
          },
        ],
      },
      {
        id: "fortschritt",
        title: "Fortschritt und Vergleich",
        intro: "Sammle Level, schalte Achievements frei und miss dich mit deinen Freunden.",
        features: [
          {
            id: "fortschritt",
            title: "Level, XP und Achievements",
            text: "Jedes Match bringt dich weiter. Dein Profilfortschritt zeigt Level, XP und die nächsten Ziele, dazu kommen Achievements für besondere Leistungen.",
            bullets: [
              "Level mit XP-Anzeige und 30 Stufen in mehreren Kategorien",
              "Nächste Ziele mit Fortschrittsbalken",
              "Achievements, zum Beispiel für Trefferserien oder knappe Siege",
            ],
            plan: "pro",
            image: img(
              "stats-progress",
              l,
              "Profilfortschritt mit Level 9, XP-Balken, 17 von 30 Stufen und den nächsten Zielen",
            ),
          },
          {
            id: "rangliste",
            title: "Rangliste",
            text: "Vergleiche dich mit deinen Freunden und anderen Spielern: Siege, Trefferquote und Treffer im direkten Ranking.",
            bullets: [
              "Dein Platz auf einen Blick, deine Zeile ist hervorgehoben",
              "Tippe einen Spieler an und sieh seine Profil-Details",
            ],
            plan: "pro",
            image: img(
              "stats-ranking",
              l,
              "Weltrangliste mit fünf Spielern, Siegen und Trefferquote; die eigene Zeile ist hervorgehoben",
            ),
          },
          {
            id: "turnier",
            title: "Dein Turnier aus der Pong League",
            text: "Spielst du in einem Pong-League-Turnier mit, erscheint es als Karte in deinen Stats: Tabelle, Form, dein nächstes Spiel und der Stand in der K.-o.-Phase.",
            bullets: [
              "Tabelle deiner Gruppe mit deinem Team hervorgehoben",
              "Bilanz, Punkte und Form deines Teams",
              "Dein nächstes Spiel und dein letztes Ergebnis",
            ],
            plan: "pro",
            image: img(
              "stats-tournament",
              l,
              "Turnier-Karte mit Gruppentabelle, Bilanz, Form, K.-o.-Phase und letztem Spiel",
            ),
          },
        ],
      },
    ],
    steps: [
      {
        title: "Konto anlegen",
        text: "Kostenlos registrieren und Profilnamen wählen. Deine Statistik gehört dir und wächst mit jedem Match.",
      },
      {
        title: "Lobby öffnen und Match starten",
        text: "Mitspieler per QR-Code einladen oder als Gast hinzufügen, Teams festlegen und los geht's.",
      },
      {
        title: "Würfe erfassen, danach auswerten",
        text: "Pro Wurf ein Tipp. Nach dem Match speichert Pong Stats alles und aktualisiert dein Profil.",
      },
    ],
    plans: {
      free: {
        title: "Kostenlos",
        text: "Alles, was du fürs Spielen brauchst.",
        items: [
          "Matches live erfassen, inklusive Lobby und QR-Code",
          "Alle Trefferarten, Strafbecher und Umgeworfen",
          "Sechs Hauptwerte: Matches, Winrate, Trefferquote, Becher, Siege, Niederlagen",
          "Zeitraum-Filter und anpassbares Dashboard",
          "Pong League: Turniere mit Gruppenphase, Tabellen und Spielplan",
        ],
      },
      pro: {
        title: "Pro",
        text: "Die tiefen Analysen und Vergleiche.",
        items: [
          "Skill-Rating mit Verlauf und Platzierung",
          "Heatmap nach Becherposition und Leistungsverlauf",
          "Detail-Statistik, Endphase-Quote, Serien",
          "Spielverlauf: Comebacks, Führung, Starttreffer, Match-Historie",
          "Bilanz gegen Gegner und Partner",
          "Level, XP, Achievements und Rangliste",
          "Pong League: K.-o.-Phase mit Turnierbaum",
        ],
      },
    },
    faq: [
      {
        question: "Was ist Pong Stats?",
        answer:
          "Pong Stats ist die Statistik-Plattform von BeerPongSportsTec. Du erfasst deine Beer-Pong-Matches Wurf für Wurf und bekommst daraus Trefferquote, Skill-Rating, eine Heatmap nach Becherposition, Serien, Bilanzen gegen Gegner und mehr.",
      },
      {
        question: "Was kostet Pong Stats?",
        answer:
          "Der Einstieg ist kostenlos: Matches erfassen und die sechs Hauptwerte deines Profils sind ohne Bezahlung nutzbar. Pro schaltet die tiefen Analysen frei und kostet einmalig {price}, ohne Abo. Pro gilt auch für die K.-o.-Phase in der Pong League.",
      },
      {
        question: "Muss ich eine App installieren?",
        answer:
          "Nein. Pong Stats läuft im Browser, am Handy genauso wie am Rechner. Öffne die Seite einfach am Tisch, eine Installation ist nicht nötig.",
      },
      {
        question: "Brauchen meine Mitspieler ein Konto?",
        answer:
          "Nein. Mitspieler ohne Konto spielen als Gast mit. Für die Statistik zählen allerdings nur Matches gegen registrierte Gegner, damit die Werte vergleichbar bleiben. Wer sich ein Konto anlegt, bekommt sein eigenes Profil mit eigener Statistik.",
      },
      {
        question: "Wie wird das Skill-Rating berechnet?",
        answer:
          "Das Rating liegt auf einer Skala von 0 bis 1000. Jeder startet bei 500. Es berücksichtigt das Ergebnis, die Becherdifferenz und die Stärke deiner Gegner (Elo-Prinzip, für Beer Pong angepasst). Ein Sieg gegen einen starken Gegner bringt dir mehr als einer gegen einen schwachen, ein klarer Sieg mehr als ein knapper, und die Trefferquote allein entscheidet nicht. In die Rangliste kommst du ab fünf Matches.",
      },
      {
        question: "Wofür ist die Heatmap nach Becherposition gut?",
        answer:
          "Sie zeigt dir pro Formation (10er, 6er, 3er), auf welche Becher deine Treffer fallen. So erkennst du Muster, zum Beispiel ob du die hinteren Becher meidest, und kannst gezielt daran arbeiten.",
      },
      {
        question: "Kann ich meine Daten löschen?",
        answer:
          "Ja. In der Kontoverwaltung kannst du deine Statistik zurücksetzen oder dein Konto samt Daten löschen. Details dazu stehen in der Datenschutzerklärung.",
      },
    ],
    imageNote: "Beispieldaten: alle Namen und Zahlen sind frei erfunden.",
  };
}

function statsEn(): ProductContent {
  const l: ProductLocale = "en";

  return {
    slug: "stats",
    name: "Pong Stats",
    metaTitle: "Pong Stats: Beer Pong Statistics, Skill Rating & Cup Heatmap | BeerPongSportsTec",
    metaDescription:
      "Track every throw live and see how good you really are: hit rate, skill rating, heatmap by cup position, rankings and match history. Runs in your browser, free to start.",
    schemaDescription:
      "Pong Stats records beer pong matches live and analyses them: hit rate, skill rating, hits by cup position, partner and opponent records, rankings and progress.",
    hero: {
      eyebrow: "Pong Stats",
      title: "Your beer pong statistics.",
      titleAccent: "Throw by throw.",
      lead: "Track every match live on your phone, then see how you really play: hit rate, skill rating, your favourite cups, streaks, comebacks and your record against every opponent.",
      image: img(
        "stats-live",
        l,
        "Live match in Pong Stats: two teams of two players, cup table in the middle, miss, hit and special buttons per player and a live score",
      ),
    },
    quickFacts: [
      { value: "10 · 6 · 3", label: "Cup formations are recorded too" },
      { value: "0 – 1000", label: "Skill rating, not just hit rate" },
      { value: "Elo", label: "Rating based on the Elo principle, adapted for beer pong" },
      { value: "Browser", label: "No installation needed" },
    ],
    groups: [
      {
        id: "erfassen",
        title: "Play and record",
        intro:
          "Pong Stats is built for the table: big buttons, few taps, nothing gets lost.",
        features: [
          {
            id: "live-match",
            title: "Record matches live",
            text: "One tap per throw: miss, hit or special. The score, the cups on the table and the match statistics update live.",
            bullets: [
              "Two teams with several players, you always see whose turn it is",
              "Hit types: single hit, bounce (counts two cups) and trick shot",
              "Penalty cups and knocked-over cups as a special",
              "Live score, match statistics and the latest actions at a glance",
              "Mistapped? \"Undo\" takes back the last action",
            ],
            plan: "free",
            image: img(
              "stats-live",
              l,
              "Live match with cup table, player cards, match statistics, latest actions and a 3 to 3 score",
            ),
          },
          {
            id: "lobby",
            title: "Lobby with QR code",
            text: "You open the lobby, your friends scan the code and pick their profile. Anyone without an account joins as a guest.",
            bullets: [
              "Friends join by QR code from their own phone",
              "Guest profiles without a login for spontaneous rounds",
              "Assign players to Team A or Team B with a tap",
              "The match only starts once both teams have players",
            ],
            plan: "free",
            image: img(
              "stats-lobby",
              l,
              "Match lobby with a QR code to join, a field for guest profiles and Teams A and B",
            ),
          },
          {
            id: "treffer",
            title: "Capture every hit precisely",
            text: "For each hit you pick the hit type and tap the cup that was hit. Pong Stats also records the formation (10, 6 or 3 cups) and the cup's position.",
            bullets: [
              "Hit type and cup in a single step",
              "Formation and cup position feed into the heatmap",
              "Bounce: the second cup follows automatically as an extra hit",
            ],
            plan: "free",
            image: img(
              "stats-hit",
              l,
              "Record-hit dialog with the hit types single hit, bounce and trick shot and the opponent's cup triangle",
            ),
          },
        ],
      },
      {
        id: "auswerten",
        title: "Analyse and understand",
        intro:
          "The interesting part starts after the match. You see the key figures for free, Pro unlocks the deep analysis.",
        features: [
          {
            id: "uebersicht",
            title: "Your profile at a glance",
            text: "Matches, win rate, hit rate, cups, wins and losses, plus a time filter and a dashboard you put together yourself.",
            bullets: [
              "Time range: today, last 10, last 30 or all matches",
              "Customise the dashboard: show only the cards you care about",
              "With Pro also: throws, hits, misses, bounces, trick shots, penalty cups",
            ],
            plan: "free",
            image: img(
              "stats-overview",
              l,
              "Player profile with a time filter and six key figures: 62 matches, 66.1 percent win rate, 54 percent hit rate, 431 cups, 41 wins, 21 losses",
            ),
          },
          {
            id: "rating",
            title: "Skill rating from 0 to 1000",
            text: "Hit rate alone says little. The skill rating takes the result, the cup difference and the strength of your opponents into account and shows your place among all ranked players.",
            bullets: [
              "Current rating, personal best and the last 30 matches",
              "Trend chart with the outcome of every single match",
              "A win against a stronger opponent earns more points, and a clear 10:2 more than a narrow 10:9",
            ],
            plan: "pro",
            image: img(
              "stats-rating",
              l,
              "Skill rating 585 out of 1000 with rank 1, personal best 614 and a trend chart of the last 30 matches",
            ),
          },
          {
            id: "becherposition",
            title: "Heatmap: which cups do you hit?",
            text: "For each formation, Pong Stats shows which cups your hits land on, as a heatmap seen from your throwing direction. Your hit rate over time comes on top.",
            bullets: [
              "Split by 10-, 6- and 3-cup formation",
              "Share of each cup in your hits, with counts",
              "Hit rate per match as a trend with direction",
            ],
            plan: "pro",
            image: img(
              "stats-cups",
              l,
              "Hit rate trend chart and heatmap of hits by cup position in the 10-cup formation",
            ),
          },
          {
            id: "detail",
            title: "Detailed statistics",
            text: "How often do you hit directly, how often via a bounce, and how good are you in the endgame when the opponent has only a few cups left?",
            bullets: [
              "Hit types: single hit, bounce, trick shot in percent",
              "Endgame rate when the opponent has three cups or fewer",
              "Form of the last six games, longest winning streak and hit streak",
            ],
            plan: "pro",
            image: img(
              "stats-detail",
              l,
              "Detail statistics with a win rate ring, hit types, endgame rate, form of the last six games and streaks",
            ),
          },
          {
            id: "spielverlauf",
            title: "Game flow: comebacks and leads",
            text: "How often do you turn a deficit around? Do you give away leads? And how important is the first hit? Pong Stats answers with your own matches.",
            bullets: [
              "Comeback rate and biggest deficit turned around",
              "Leads held and biggest lead thrown away",
              "Opening-hit rate and wins after an opening hit",
              "Biggest win, biggest loss, close matches, average cup difference",
              "Match history with a detail view for every game",
            ],
            plan: "pro",
            image: img(
              "stats-gameflow",
              l,
              "Game flow with a 24 percent comeback rate, 97 percent leads held, 63 percent opening hits and match results",
            ),
          },
          {
            id: "bilanz",
            title: "Record against opponents and partners",
            text: "Who is your favourite opponent, and who do you win most with? The record shows wins, losses and rate against every player.",
            bullets: [
              "Record against every opponent, including favourite opponent",
              "Partner record in doubles, including best team",
            ],
            plan: "pro",
            image: img(
              "stats-matchups",
              l,
              "Record against opponents and partner record with wins, losses and rate per player",
            ),
          },
        ],
      },
      {
        id: "fortschritt",
        title: "Progress and comparison",
        intro: "Collect levels, unlock achievements and measure yourself against your friends.",
        features: [
          {
            id: "fortschritt",
            title: "Levels, XP and achievements",
            text: "Every match moves you forward. Your profile progress shows level, XP and your next goals, plus achievements for special performances.",
            bullets: [
              "Level with XP bar and 30 tiers across several categories",
              "Next goals with progress bars",
              "Achievements, for example for hit streaks or close wins",
            ],
            plan: "pro",
            image: img(
              "stats-progress",
              l,
              "Profile progress with level 9, an XP bar, 17 of 30 tiers and the next goals",
            ),
          },
          {
            id: "rangliste",
            title: "Ranking",
            text: "Compare yourself with your friends and other players: wins, hit rate and hits in a direct ranking.",
            bullets: [
              "Your place at a glance, your row is highlighted",
              "Tap a player to see their profile details",
            ],
            plan: "pro",
            image: img(
              "stats-ranking",
              l,
              "World ranking with five players, wins and hit rate; your own row is highlighted",
            ),
          },
          {
            id: "turnier",
            title: "Your tournament from Pong League",
            text: "If you play in a Pong League tournament, it appears as a card in your stats: table, form, your next match and your standing in the knockout phase.",
            bullets: [
              "Your group table with your team highlighted",
              "Record, points and form of your team",
              "Your next match and your last result",
            ],
            plan: "pro",
            image: img(
              "stats-tournament",
              l,
              "Tournament card with a group table, record, form, knockout phase and last match",
            ),
          },
        ],
      },
    ],
    steps: [
      {
        title: "Create an account",
        text: "Sign up for free and choose a profile name. Your statistics belong to you and grow with every match.",
      },
      {
        title: "Open a lobby and start a match",
        text: "Invite friends by QR code or add them as guests, set the teams and you're off.",
      },
      {
        title: "Record throws, then analyse",
        text: "One tap per throw. After the match Pong Stats saves everything and updates your profile.",
      },
    ],
    plans: {
      free: {
        title: "Free",
        text: "Everything you need to play.",
        items: [
          "Record matches live, including lobby and QR code",
          "All hit types, penalty cups and knocked-over cups",
          "Six key figures: matches, win rate, hit rate, cups, wins, losses",
          "Time filter and customisable dashboard",
          "Pong League: tournaments with group stage, tables and schedule",
        ],
      },
      pro: {
        title: "Pro",
        text: "The deep analysis and comparisons.",
        items: [
          "Skill rating with trend and ranking",
          "Heatmap by cup position and performance trend",
          "Detailed statistics, endgame rate, streaks",
          "Game flow: comebacks, leads, opening hits, match history",
          "Record against opponents and partners",
          "Levels, XP, achievements and ranking",
          "Pong League: knockout phase with bracket",
        ],
      },
    },
    faq: [
      {
        question: "What is Pong Stats?",
        answer:
          "Pong Stats is the statistics platform from BeerPongSportsTec. You record your beer pong matches throw by throw and get hit rate, skill rating, a heatmap by cup position, streaks, records against opponents and more.",
      },
      {
        question: "How much does Pong Stats cost?",
        answer:
          "Getting started is free: recording matches and the six key figures of your profile need no payment. Pro unlocks the deep analysis and costs {price} once, with no subscription. Pro also covers the knockout phase in Pong League.",
      },
      {
        question: "Do I need to install an app?",
        answer:
          "No. Pong Stats runs in your browser, on your phone just like on a computer. Just open the page at the table, no installation required.",
      },
      {
        question: "Do my friends need an account?",
        answer:
          "No. Friends without an account join as guests. For the statistics, however, only matches against registered opponents count, so the figures stay comparable. Anyone who creates an account gets their own profile with their own statistics.",
      },
      {
        question: "How is the skill rating calculated?",
        answer:
          "The rating is on a scale from 0 to 1000. Everyone starts at 500. It takes the result, the cup difference and the strength of your opponents into account (Elo principle, adapted for beer pong). A win against a strong opponent is worth more than one against a weak opponent, a clear win more than a narrow one, and hit rate alone does not decide. You enter the ranking after five matches.",
      },
      {
        question: "What is the heatmap by cup position good for?",
        answer:
          "For each formation (10, 6, 3 cups) it shows which cups your hits land on. That helps you spot patterns, for example whether you avoid the back cups, and work on them deliberately.",
      },
      {
        question: "Can I delete my data?",
        answer:
          "Yes. In the account settings you can reset your statistics or delete your account together with its data. Details are in the privacy policy.",
      },
    ],
    imageNote: "Example data: all names and figures are made up. Screenshots show the German interface.",
  };
}

/* --------------------------------------------------------------------------
 * PONG LEAGUE
 * -------------------------------------------------------------------------- */

function leagueDe(): ProductContent {
  const l: ProductLocale = "de";

  return {
    slug: "league",
    name: "Pong League",
    metaTitle: "Pong League: Beer-Pong-Turnier organisieren mit Gruppen, Tabellen & K.-o.-Baum | BeerPongSportsTec",
    metaDescription:
      "Organisiere dein Beer-Pong-Turnier online: Gruppenphase mit Live-Tabellen, Spielplan, K.-o.-Turnierbaum und Einladungslink mit QR-Code. Im Browser, kostenlos starten.",
    schemaDescription:
      "Pong League organisiert Beer-Pong-Turniere: Gruppenphase mit Tabellen und Spielplan, K.-o.-Turnierbaum, Einladungslink mit QR-Code und Verknüpfung mit den Spielerprofilen in Pong Stats.",
    hero: {
      eyebrow: "Pong League",
      title: "Dein Turnier.",
      titleAccent: "Ohne Zettelwirtschaft.",
      lead: "Lege ein Turnier in Minuten an, lade alle Teams per Link ein und halte Tabellen, Spielplan und den K.-o.-Baum live aktuell. Für die Kellerrunde genauso wie für das große Turnier mit bis zu 64 Teams.",
      image: img(
        "league-groups",
        l,
        "Turnier Sommer Cup 2026 in der Pong League mit Gruppentabellen, Turnierfortschritt und nächstem Spiel",
        true,
      ),
    },
    quickFacts: [
      { value: "2 – 64", label: "Teams pro Turnier" },
      { value: "Gruppen", label: "beliebig viele, automatisch verteilt" },
      { value: "K.-o.", label: "Turnierbaum bis 32 Teams" },
      { value: "Link + QR", label: "Teams laden sich selbst ein" },
    ],
    groups: [
      {
        id: "organisieren",
        title: "Turnier anlegen und verwalten",
        intro:
          "Von der Teamliste bis zum Turniersieger: Pong League nimmt dir die Rechnerei und das Sortieren ab.",
        features: [
          {
            id: "anlegen",
            title: "Turnier in Minuten angelegt",
            text: "Name, Teamanzahl, Gruppen, fertig. Pong League verteilt die Teams gleichmäßig auf die Gruppen und erstellt den kompletten Spielplan.",
            bullets: [
              "2 bis 64 Teams, beliebig viele Gruppen",
              "Teams werden gleichmäßig auf die Gruppen verteilt",
              "Team-Namen eintragen oder mit „Mischen“ neu auslosen",
              "In jeder Gruppe spielt jeder gegen jeden – auf Wunsch mit Hin- und Rückspiel",
            ],
            plan: "free",
            image: img(
              "league-new",
              l,
              "Formular Neues Turnier mit Turniername, Anzahl Teams und Anzahl Gruppen",
              true,
            ),
          },
          {
            id: "uebersicht",
            title: "Alle Turniere an einem Ort",
            text: "Aktive, geplante und abgeschlossene Turniere in einer Übersicht, mit Fortschritt und Phase auf einen Blick.",
            bullets: [
              "Status: aktiv, geplant oder abgeschlossen",
              "Fortschritt der Gruppenphase und der K.-o.-Phase pro Turnier",
              "Filter nach Status, Ansicht als Raster oder Liste",
            ],
            plan: "free",
            image: img(
              "league-list",
              l,
              "Übersicht Deine Turniere mit einem aktiven, einem geplanten und einem abgeschlossenen Turnier und Fortschrittsbalken",
              true,
            ),
          },
          {
            id: "teams",
            title: "Teams per Link und QR-Code einladen",
            text: "Du teilst den Beitrittslink oder zeigst den QR-Code. Jeder Spieler wählt sein Team und verknüpft damit sein eigenes Profil mit dem Teamnamen.",
            bullets: [
              "Einladungslink mit Kopieren-Knopf und QR-Code zum Scannen",
              "Bis zu vier Spieler pro Team",
              "Das Turnier erscheint bei den Spielern in Pong Stats",
              "Die Ergebnisse trägst weiterhin du als Veranstalter ein",
            ],
            plan: "free",
            image: img(
              "league-teams",
              l,
              "Reiter Teams mit Einladungslink, QR-Code und den Teams der Gruppen A und B mit verknüpften Spielern",
              true,
            ),
          },
        ],
      },
      {
        id: "spielen",
        title: "Spielen und verfolgen",
        intro:
          "Ergebnis eintragen, Tabelle aktualisiert sich. Alle sehen sofort, wo ihr Team steht.",
        features: [
          {
            id: "gruppen",
            title: "Live-Tabellen pro Gruppe",
            text: "Spiele, Siege, Niederlagen, Treffer, Differenz, Punkte und die Form der letzten Spiele. Dein nächstes Spiel steht immer rechts im Blick.",
            bullets: [
              "Drei Punkte pro Sieg, Sortierung nach Punkten",
              "Treffer-Verhältnis und Differenz für die Feinwertung",
              "Form der letzten Spiele als S/N-Anzeige",
              "Karte „Nächstes Spiel“ und Gruppenfilter",
            ],
            plan: "free",
            image: img(
              "league-groups",
              l,
              "Gruppe A und Gruppe B mit Tabelle, Treffern, Differenz, Punkten und Form sowie der Karte Nächstes Spiel",
              true,
            ),
          },
          {
            id: "spielplan",
            title: "Spielplan mit Ergebnis-Eingabe",
            text: "Alle Paarungen der Gruppenphase in einer Liste. Ergebnis eintragen, bei Bedarf nachträglich korrigieren.",
            bullets: [
              "Alle Spiele oder nur eine Gruppe anzeigen",
              "Sortierung nach Gruppe",
              "Ergebnisse jederzeit bearbeiten",
            ],
            plan: "free",
            image: img(
              "league-sched",
              l,
              "Spielplan der Gruppe A mit Ergebnisfeldern und Bearbeiten-Knöpfen sowie Turnierdetails",
              true,
            ),
          },
          {
            id: "ko",
            title: "K.-o.-Phase mit Turnierbaum",
            text: "Nach der Gruppenphase wählst du, wie viele Teams weiterkommen, und spielst den Turniersieger im Turnierbaum aus. Ein Spiel pro Paarung, ein Unentschieden gibt es nicht.",
            bullets: [
              "Weiterkommen pro Gruppe oder insgesamt",
              "Modus „Mit Freilos für die Besten“ für jede Teamanzahl",
              "Modus „Bester gegen Schlechtesten“ mit Neusetzung vor jeder Runde (bei 2, 4, 8, 16 oder 32 Teams)",
              "Bis zu 32 Teams im Baum, Ergebnisse direkt im Baum eintragen",
              "Pokal für den Turniersieger",
            ],
            plan: "pro",
            image: img(
              "league-ko",
              l,
              "K.-o.-Turnierbaum mit acht Teams, Viertelfinale, Halbfinale, Finale und Pokal",
              true,
            ),
          },
        ],
      },
    ],
    steps: [
      {
        title: "Turnier anlegen",
        text: "Name, Teamanzahl und Gruppen festlegen, Team-Namen eintragen. Der Spielplan entsteht automatisch.",
      },
      {
        title: "Teams einladen",
        text: "Beitrittslink teilen oder QR-Code zeigen. Jeder wählt sein Team und verknüpft sein Profil.",
      },
      {
        title: "Ergebnisse eintragen",
        text: "Nach jedem Spiel das Ergebnis eingeben. Tabellen, nächstes Spiel und K.-o.-Baum aktualisieren sich von selbst.",
      },
    ],
    plans: {
      free: {
        title: "Kostenlos",
        text: "Die komplette Gruppenphase.",
        items: [
          "Turniere mit 2 bis 64 Teams und beliebig vielen Gruppen",
          "Live-Tabellen, Spielplan und Ergebnis-Eingabe",
          "Einladungslink und QR-Code für die Teams",
          "Verknüpfung der Spielerprofile mit den Teams",
          "Turnier-Übersicht mit Fortschritt",
        ],
      },
      pro: {
        title: "Pro",
        text: "Der Weg zum Turniersieger.",
        items: [
          "K.-o.-Phase mit Turnierbaum für bis zu 32 Teams",
          "Zwei Modi: mit Freilosen oder Bester gegen Schlechtesten",
          "Ergebnisse direkt im Baum eintragen",
          "Dazu alle Pro-Analysen in Pong Stats",
        ],
      },
    },
    faq: [
      {
        question: "Was ist die Pong League?",
        answer:
          "Die Pong League ist die Turnier-Plattform von BeerPongSportsTec. Du legst ein Beer-Pong-Turnier mit Gruppen an, trägst Ergebnisse ein und siehst Tabellen, Spielplan und K.-o.-Baum live. Die Teams laden sich per Link oder QR-Code selbst ein.",
      },
      {
        question: "Was kostet die Pong League?",
        answer:
          "Turniere mit Gruppenphase, Tabellen und Spielplan sind kostenlos. Die K.-o.-Phase mit Turnierbaum gehört zu Pro. Das kostet einmalig {price}, ohne Abo, und schaltet zugleich alle Pro-Statistiken in Pong Stats frei.",
      },
      {
        question: "Wie viele Teams und Gruppen sind möglich?",
        answer:
          "Ein Turnier kann 2 bis 64 Teams haben, die du auf beliebig viele Gruppen verteilst. In der K.-o.-Phase sind bis zu 32 Teams möglich.",
      },
      {
        question: "Wie werden die Tabellen berechnet?",
        answer:
          "Für einen Sieg gibt es drei Punkte. Die Tabelle wird nach Punkten sortiert, dazu zeigt Pong League das Treffer-Verhältnis und die Differenz. In jeder Gruppe spielt jeder gegen jeden, auf Wunsch mit Hin- und Rückspiel.",
      },
      {
        question: "Wie funktioniert die K.-o.-Phase?",
        answer:
          "Nach der Gruppenphase legst du fest, wie viele Teams weiterkommen, entweder pro Gruppe oder insgesamt. Im Modus mit Freilosen funktioniert jede Teamanzahl, die Besten bekommen bei Bedarf ein Freilos. Im Modus „Bester gegen Schlechtesten“ wird vor jeder Runde neu gesetzt, das geht bei 2, 4, 8, 16 oder 32 Teams.",
      },
      {
        question: "Müssen meine Mitspieler ein Konto haben?",
        answer:
          "Zum Verfolgen des Turniers reicht der Link. Wer sein Profil mit einem Team verknüpfen will, meldet sich an, dann erscheint das Turnier auch in seinen Pong Stats. Die Ergebnisse trägt der Veranstalter ein.",
      },
      {
        question: "Muss ich etwas installieren?",
        answer:
          "Nein. Die Pong League läuft im Browser, am Handy genauso wie am Rechner.",
      },
    ],
    imageNote: "Beispieldaten: alle Namen und Ergebnisse sind frei erfunden.",
  };
}

function leagueEn(): ProductContent {
  const l: ProductLocale = "en";

  return {
    slug: "league",
    name: "Pong League",
    metaTitle: "Pong League: Run Beer Pong Tournaments with Groups, Tables & Knockout Bracket | BeerPongSportsTec",
    metaDescription:
      "Organise your beer pong tournament online: group stage with live tables, schedule, knockout bracket and an invite link with QR code. Runs in your browser, free to start.",
    schemaDescription:
      "Pong League runs beer pong tournaments: group stage with tables and schedule, knockout bracket, invite link with QR code and linking to player profiles in Pong Stats.",
    hero: {
      eyebrow: "Pong League",
      title: "Your tournament.",
      titleAccent: "No paperwork.",
      lead: "Set up a tournament in minutes, invite every team with a link and keep tables, schedule and the knockout bracket up to date live. From the basement round to a big tournament with up to 64 teams.",
      image: img(
        "league-groups",
        l,
        "Tournament Summer Cup 2026 in Pong League with group tables, tournament progress and next match",
        true,
      ),
    },
    quickFacts: [
      { value: "2 – 64", label: "Teams per tournament" },
      { value: "Groups", label: "as many as you like, distributed automatically" },
      { value: "Knockout", label: "Bracket for up to 32 teams" },
      { value: "Link + QR", label: "Teams invite themselves" },
    ],
    groups: [
      {
        id: "organisieren",
        title: "Set up and manage tournaments",
        intro:
          "From the team list to the champion: Pong League takes care of the maths and the sorting.",
        features: [
          {
            id: "anlegen",
            title: "A tournament in minutes",
            text: "Name, number of teams, groups, done. Pong League spreads the teams evenly across the groups and creates the full schedule.",
            bullets: [
              "2 to 64 teams, as many groups as you like",
              "Teams are spread evenly across the groups",
              "Enter team names or redraw them with \"Shuffle\"",
              "In every group, everyone plays everyone – optionally with home and away legs",
            ],
            plan: "free",
            image: img(
              "league-new",
              l,
              "New tournament form with tournament name, number of teams and number of groups",
              true,
            ),
          },
          {
            id: "uebersicht",
            title: "All tournaments in one place",
            text: "Active, planned and finished tournaments in one overview, with progress and phase at a glance.",
            bullets: [
              "Status: active, planned or finished",
              "Group stage and knockout progress per tournament",
              "Filter by status, view as grid or list",
            ],
            plan: "free",
            image: img(
              "league-list",
              l,
              "Your tournaments overview with an active, a planned and a finished tournament and progress bars",
              true,
            ),
          },
          {
            id: "teams",
            title: "Invite teams by link and QR code",
            text: "You share the join link or show the QR code. Every player picks their team and links their own profile to the team name.",
            bullets: [
              "Invite link with a copy button and a QR code to scan",
              "Up to four players per team",
              "The tournament shows up for the players in Pong Stats",
              "You, as the organiser, still enter the results",
            ],
            plan: "free",
            image: img(
              "league-teams",
              l,
              "Teams tab with invite link, QR code and the teams of groups A and B with linked players",
              true,
            ),
          },
        ],
      },
      {
        id: "spielen",
        title: "Play and follow",
        intro:
          "Enter a result and the table updates. Everyone sees right away where their team stands.",
        features: [
          {
            id: "gruppen",
            title: "Live tables per group",
            text: "Matches, wins, losses, hits, difference, points and form of the last games. Your next match is always in view on the right.",
            bullets: [
              "Three points per win, sorted by points",
              "Hit ratio and difference for the fine ranking",
              "Form of the last games as a W/L display",
              "\"Next match\" card and group filter",
            ],
            plan: "free",
            image: img(
              "league-groups",
              l,
              "Group A and Group B with table, hits, difference, points and form as well as the Next match card",
              true,
            ),
          },
          {
            id: "spielplan",
            title: "Schedule with result entry",
            text: "All pairings of the group stage in one list. Enter the result and correct it later if needed.",
            bullets: [
              "Show all matches or just one group",
              "Sort by group",
              "Edit results at any time",
            ],
            plan: "free",
            image: img(
              "league-sched",
              l,
              "Schedule of group A with result fields and edit buttons as well as tournament details",
              true,
            ),
          },
          {
            id: "ko",
            title: "Knockout phase with bracket",
            text: "After the group stage you choose how many teams advance and play out the champion in a bracket. One match per pairing, no draws.",
            bullets: [
              "Advance per group or overall",
              "\"With byes for the top seeds\" mode for any number of teams",
              "\"Best vs worst\" mode, re-seeded before every round (with 2, 4, 8, 16 or 32 teams)",
              "Up to 32 teams in the bracket, enter results right in the bracket",
              "Trophy for the champion",
            ],
            plan: "pro",
            image: img(
              "league-ko",
              l,
              "Knockout bracket with eight teams, quarter-finals, semi-finals, final and trophy",
              true,
            ),
          },
        ],
      },
    ],
    steps: [
      {
        title: "Create the tournament",
        text: "Set name, number of teams and groups, enter the team names. The schedule is created automatically.",
      },
      {
        title: "Invite the teams",
        text: "Share the join link or show the QR code. Everyone picks their team and links their profile.",
      },
      {
        title: "Enter the results",
        text: "Enter the result after each match. Tables, next match and knockout bracket update on their own.",
      },
    ],
    plans: {
      free: {
        title: "Free",
        text: "The complete group stage.",
        items: [
          "Tournaments with 2 to 64 teams and as many groups as you like",
          "Live tables, schedule and result entry",
          "Invite link and QR code for the teams",
          "Linking player profiles to teams",
          "Tournament overview with progress",
        ],
      },
      pro: {
        title: "Pro",
        text: "The road to the champion.",
        items: [
          "Knockout phase with a bracket for up to 32 teams",
          "Two modes: with byes or best vs worst",
          "Enter results directly in the bracket",
          "Plus all Pro analysis in Pong Stats",
        ],
      },
    },
    faq: [
      {
        question: "What is Pong League?",
        answer:
          "Pong League is the tournament platform from BeerPongSportsTec. You set up a beer pong tournament with groups, enter results and see tables, schedule and knockout bracket live. Teams invite themselves with a link or QR code.",
      },
      {
        question: "How much does Pong League cost?",
        answer:
          "Tournaments with a group stage, tables and schedule are free. The knockout phase with a bracket is part of Pro. That costs {price} once, with no subscription, and also unlocks all Pro statistics in Pong Stats.",
      },
      {
        question: "How many teams and groups are possible?",
        answer:
          "A tournament can have 2 to 64 teams, which you spread across as many groups as you like. The knockout phase supports up to 32 teams.",
      },
      {
        question: "How are the tables calculated?",
        answer:
          "A win is worth three points. The table is sorted by points, and Pong League also shows the hit ratio and the difference. In every group, everyone plays everyone, optionally with first and second legs.",
      },
      {
        question: "How does the knockout phase work?",
        answer:
          "After the group stage you decide how many teams advance, either per group or overall. In the mode with byes any number of teams works, and the top seeds get a bye where needed. In the \"best vs worst\" mode the seeding is redone before every round, which works with 2, 4, 8, 16 or 32 teams.",
      },
      {
        question: "Do my friends need an account?",
        answer:
          "To follow the tournament, the link is enough. Anyone who wants to link their profile to a team signs in, and the tournament then also appears in their Pong Stats. The organiser enters the results.",
      },
      {
        question: "Do I need to install anything?",
        answer:
          "No. Pong League runs in your browser, on your phone just like on a computer.",
      },
    ],
    imageNote: "Example data: all names and results are made up.",
  };
}

/* --------------------------------------------------------------------------
 * Zugriff
 * -------------------------------------------------------------------------- */

export function getProductContent(slug: ProductSlug, locale: ProductLocale): ProductContent {
  if (slug === "stats") {
    return locale === "en" ? statsEn() : statsDe();
  }

  return locale === "en" ? leagueEn() : leagueDe();
}

export function getProductUi(locale: ProductLocale): ProductUi {
  return PRODUCT_UI[locale === "en" ? "en" : "de"];
}
