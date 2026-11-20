"use client";

import { CookieSettingsButton } from "./CookieSettingsButton";
import { ACTIVE_OPTIONAL_CATEGORIES } from "@/lib/consent/consent";
import { CONSENT_CONTENT } from "@/lib/consent/consentContent";

/*
|--------------------------------------------------------------------------
| ABSCHNITT FÜR DIE DATENSCHUTZERKLÄRUNG: COOKIES UND LOKALER SPEICHER
|--------------------------------------------------------------------------
|
| Datei: components/consent/CookieOverview.tsx
|
| Wird in app/[locale]/datenschutz/page.tsx als eigener Abschnitt eingefügt:
|
|   import { CookieOverview } from "@/components/consent/CookieOverview";
|   ...
|   <CookieOverview number="6a" />
|
| Die Tabelle kommt aus lib/consent/consentContent.ts - Banner und
| Datenschutzerklärung zeigen damit immer dieselben Angaben.
|
| Aussehen wie die übrigen Abschnitte deiner Datenschutzseite (dunkel,
| kleine Großbuchstaben-Überschrift).
|
*/

export function CookieOverview({ number = "6a" }: { number?: string }) {
  const content = CONSENT_CONTENT.de;
  const hasOptional = ACTIVE_OPTIONAL_CATEGORIES.length > 0;

  return (
    <section id="cookies">
      <h2 className="text-xs font-black uppercase tracking-wider text-white">
        {number}. Cookies, lokaler Speicher und Einwilligung
      </h2>

      <p className="mt-2">
        Beim Besuch dieser Seite werden Informationen auf deinem Gerät gespeichert bzw. abgerufen
        (Cookies und lokaler Speicher des Browsers, "localStorage"). Technisch notwendige
        Speicherungen erfolgen auf Grundlage von § 25 Abs. 2 Nr. 2 TDDDG, die anschließende
        Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO. Dafür ist keine
        Einwilligung erforderlich. Nicht notwendige Speicherungen und Zugriffe würden wir nur mit
        deiner Einwilligung nach § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO vornehmen.
      </p>

      <p className="mt-2">
        {hasOptional
          ? "Welche optionalen Dienste im Einsatz sind, siehst du in den Cookie-Einstellungen."
          : "Aktuell setzen wir ausschließlich technisch notwendigen Speicher ein. Statistik-, Analyse-, Marketing- und Tracking-Dienste sowie eingebettete Inhalte von Drittanbietern verwenden wir nicht."}
      </p>

      <h3 className="mt-5 text-[11px] font-black uppercase tracking-wider text-white/70">
        Eingesetzter Speicher
      </h3>

      <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-white/[0.04] text-white/70">
              <th className="px-3 py-2 font-bold">Name</th>
              <th className="px-3 py-2 font-bold">Art</th>
              <th className="px-3 py-2 font-bold">Zweck</th>
              <th className="px-3 py-2 font-bold">Speicherdauer</th>
            </tr>
          </thead>
          <tbody>
            {content.essentialItems.map((item) => (
              <tr key={item.name} className="border-t border-white/10 align-top">
                <td className="px-3 py-2 font-mono text-white/80">{item.name}</td>
                <td className="px-3 py-2">{item.type}</td>
                <td className="px-3 py-2">{item.purpose}</td>
                <td className="px-3 py-2">{item.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 text-[11px] font-black uppercase tracking-wider text-white/70">
        Weitere Dienste ohne Cookies auf dieser Seite
      </h3>

      <ul className="mt-2 list-inside list-disc space-y-1">
        {content.dialog.otherServices.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>

      <h3 className="mt-5 text-[11px] font-black uppercase tracking-wider text-white/70">
        Deine Auswahl ändern oder widerrufen
      </h3>

      <p className="mt-2">
        Deine Auswahl wird in einem Cookie ("bst_consent") 6 Monate lang gespeichert. Du kannst sie
        jederzeit ändern oder mit Wirkung für die Zukunft widerrufen: über den Link "Cookie-Einstellungen"
        im Footer oder hier:
      </p>

      <p className="mt-3">
        <CookieSettingsButton className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20" />
      </p>

      <p className="mt-3">
        Cookies und lokalen Speicher kannst du außerdem jederzeit in den Einstellungen deines
        Browsers löschen oder blockieren. Ohne die notwendigen Einträge (z. B. das Login-Cookie)
        funktionieren Anmeldung und Profil dann nicht mehr.
      </p>
    </section>
  );
}
