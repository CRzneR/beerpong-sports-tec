#!/bin/bash
#
# Schritt 1 der Zweisprachigkeit: Seiten-Ordner nach app/[locale]/ verschieben.
#
# Aufruf im Projektstamm (dort, wo package.json liegt):
#
#   bash schritt1-umzug.sh
#
# Vorher alles committen, damit du jede Änderung mit "git diff" prüfen oder mit
# "git checkout ." zurücknehmen kannst. Ob du die neuen Dateien aus diesem Paket
# vor oder nach dem Skript ins Projekt kopierst, ist egal (siehe LIESMICH.md).

set -e

if [ ! -f package.json ] || [ ! -d app ]; then
  echo "Bitte im Projektstamm ausführen (dort, wo package.json und app/ liegen)."
  exit 1
fi

if [ -d "app/[locale]/spieler" ]; then
  echo "Der Umzug ist schon gemacht (app/[locale]/spieler existiert)."
  exit 0
fi

mover() {
  if git ls-files --error-unmatch "$1" >/dev/null 2>&1; then
    git mv "$1" "$2"
  else
    mv "$1" "$2"
  fi
}

mkdir -p "app/[locale]"

for d in about datenschutz impressum kontakt login regeln spieler turniere; do
  if [ -d "app/$d" ]; then
    # Von den neuen Dateien schon angelegte Ordner (about, regeln) zusammenführen:
    # die NEUEN Fassungen bleiben, die alten Seiten werden ersetzt.
    if [ -d "app/[locale]/$d" ]; then
      echo "Ersetze app/$d durch die neue Fassung in app/[locale]/$d"
      rm -rf "app/$d"
    else
      mover "app/$d" "app/[locale]/$d"
    fi
  fi
done

# Alte Startseite, altes Layout, alte Middleware werden durch die neuen ersetzt.
rm -f app/page.tsx app/layout.tsx middleware.ts

# Importpfade: "@/app/spieler/..." wird zu "@/app/[locale]/spieler/..."
# und die Next-Typen "PageProps<"/turniere/...">" zu "PageProps<"/[locale]/turniere/...">".
FILES=$(grep -rlE '@/app/(spieler|turniere|about|kontakt|login|regeln|impressum|datenschutz)|(LayoutProps|PageProps)<"/[a-z]' app components lib --include=*.ts --include=*.tsx 2>/dev/null || true)

if [ -n "$FILES" ]; then
  echo "$FILES" | while read -r f; do
    perl -pi -e 's#\@/app/(spieler|turniere|about|kontakt|login|regeln|impressum|datenschutz)/#\@/app/[locale]/$1/#g; s#(LayoutProps|PageProps)<"/(?=[a-z])#$1<"/[locale]/#g' "$f"
    echo "angepasst: $f"
  done
fi

echo
echo "Fertig. Jetzt:"
echo "  npm install next-intl"
echo "  npm run build      (Fehler bitte hier einfügen)"
