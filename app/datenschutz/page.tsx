import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#050708] px-5 py-10 text-white sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/30 transition hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Zurück zur Startseite
        </Link>

        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
          Pong Stats
        </div>

        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
          Datenschutzerklärung
        </h1>

        <p className="mt-3 text-xs text-white/30">Stand: [Datum einfügen]</p>

        <div className="mt-8 space-y-10 text-sm leading-relaxed text-white/60">
          {/* 1 VERANTWORTLICHER */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              1. Verantwortlicher
            </h2>
            <p className="mt-2">
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
              <br />
              Christoph Renz
              <br />
              Herzogstandstraße
              <br />
              81539 München
              <br />
              E-Mail: [kontakt@beerpongsportstec.de]
            </p>
            <p className="mt-2">
              Kontaktdaten wie im{" "}
              <Link href="/impressum" className="text-cyan-400 hover:underline">
                Impressum
              </Link>
              .
            </p>
          </section>

          {/* 2 ÜBERSICHT */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              2. Übersicht der Verarbeitungen
            </h2>
            <p className="mt-2">
              Diese App ("Pong Stats") ermöglicht es, Beer-Pong-Matches digital zu erfassen,
              Ergebnisse zu speichern und eigene bzw. gemeinsame Spielstatistiken einzusehen. Dabei
              werden folgende Arten personenbezogener Daten verarbeitet:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Kontodaten (E-Mail-Adresse) bei Registrierung/Login</li>
              <li>Spielerprofil (Name, daraus abgeleitete Initialen)</li>
              <li>
                Spieldaten (Team-Zugehörigkeit, Würfe, Treffer, Trefferarten, Matchergebnisse)
              </li>
            </ul>
          </section>

          {/* 3 RECHTSGRUNDLAGEN */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              3. Maßgebliche Rechtsgrundlagen
            </h2>
            <p className="mt-2">
              Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Erfüllung eines
              Vertrags bzw. vorvertragliche Maßnahmen - hier: die Bereitstellung der Funktionen
              dieser App) sowie, soweit du dich als Gast ohne Konto an einem Match beteiligst, auf
              Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
              funktionierenden, gemeinsam nutzbaren Spielstatistik).
            </p>
          </section>

          {/* 4 SICHERHEIT */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              4. Sicherheitsmaßnahmen
            </h2>
            <p className="mt-2">
              Die Verbindung zu dieser App ist TLS-verschlüsselt. Der Zugriff auf die Datenbank ist
              über Row-Level-Security-Regeln (RLS) auf Tabellenebene eingeschränkt: Löschende und
              verändernde Zugriffe sind auf das technisch notwendige Minimum begrenzt.
            </p>
          </section>

          {/* 5 HOSTING */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              5. Hosting und Backend (Supabase)
            </h2>
            <p className="mt-2">
              Für Datenbank, Authentifizierung und Backend-Infrastruktur nutzen wir den Dienst
              Supabase (Supabase, Inc.). Supabase verarbeitet die in dieser Erklärung genannten
              Daten in unserem Auftrag als Auftragsverarbeiter gemäß Art. 28 DSGVO. Die Daten werden
              in der Supabase-Region EU-Region gespeichert.
            </p>
          </section>

          {/* 6 REGISTRIERUNG */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              6. Registrierung, Login und Nutzerkonto
            </h2>
            <p className="mt-2">
              Der Login erfolgt per E-Mail (Magic Link) über Supabase Auth - ein gesondertes
              Passwort wird dabei nicht gespeichert. Beim Login wird deine E-Mail-Adresse
              verarbeitet, um dir Zugriff auf dein Profil zu ermöglichen.
            </p>
            <p className="mt-2">
              Du kannst die App auch als Gast ohne Konto nutzen. In diesem Fall wird lediglich der
              von dir eingegebene Name gespeichert, ohne Verknüpfung zu einer E-Mail-Adresse oder
              einem Nutzerkonto.
            </p>
            <p className="mt-2">
              Für die Login-Sitzung werden technisch notwendige Cookies bzw. lokaler Speicher
              (localStorage) im Browser verwendet (§ 25 Abs. 2 Nr. 2 TTDSG). Diese sind für den
              Betrieb der Anmeldung erforderlich und bedürfen keiner gesonderten Einwilligung.
              Tracking-, Analyse- oder Werbe-Cookies werden nicht eingesetzt.
            </p>
          </section>

          {/* 7 SPIELERPROFILE UND STATISTIKEN */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              7. Spielerprofile und Match-Statistiken
            </h2>
            <p className="mt-2">
              Beim Anlegen eines Spielerprofils werden dein Name und daraus automatisch abgeleitete
              Initialen gespeichert. Während eines Matches werden deine Würfe, Treffer, Trefferarten
              sowie das Matchergebnis gespeichert und deinem Profil zugeordnet, um dir und den
              Mitspielern eine Spielstatistik anzeigen zu können.
            </p>
            <p className="mt-2">
              Da Beer-Pong-Matches gemeinsam mit anderen Personen gespielt werden, sind einzelne
              Matchdaten (z. B. wer gegen wen gespielt hat) zwangsläufig auch für die anderen an
              diesem Match beteiligten Spieler und in der allgemeinen Match-Historie/Rangliste
              sichtbar.
            </p>
          </section>

          {/* 8 SPEICHERDAUER */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              8. Speicherdauer
            </h2>
            <p className="mt-2">
              Deine Daten werden gespeichert, solange dein Profil bzw. deine Match-Historie besteht,
              und darüber hinaus, bis du eine Löschung gemäß Abschnitt 9 verlangst.
            </p>
            <p className="mt-2">
              Die App bietet eine Funktion "Statistiken zurücksetzen" im Spielerprofil. Diese
              blendet vergangene Matches lediglich aus deiner persönlichen Statistik-Ansicht aus -
              die zugrunde liegenden Match-Datensätze bleiben bestehen, da sie auch Mitspieler
              betreffen, deren Statistiken davon nicht berührt werden sollen. Diese Funktion stellt
              daher KEINE Löschung im Sinne von Art. 17 DSGVO dar. Für eine tatsächliche Löschung
              deiner Daten wende dich bitte gemäß Abschnitt 9 an uns.
            </p>
          </section>

          {/* 9 RECHTE */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              9. Deine Rechte
            </h2>
            <p className="mt-2">Du hast jederzeit das Recht auf:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Auskunft über die zu dir gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">
              Wende dich dazu formlos an die in Abschnitt 1 genannte Kontaktadresse. Außerdem steht
              dir ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde zu, z. B. bei der für
              Bayern zuständigen Aufsichtsbehörde.
            </p>
          </section>

          {/* 10 ÄNDERUNGEN */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              10. Änderungen dieser Erklärung
            </h2>
            <p className="mt-2">
              Wir passen diese Datenschutzerklärung an, sobald sich die Datenverarbeitung in der App
              ändert (z. B. durch neue Funktionen wie ein Profilbild-Upload). Es gilt die jeweils
              aktuelle, auf dieser Seite veröffentlichte Fassung.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
