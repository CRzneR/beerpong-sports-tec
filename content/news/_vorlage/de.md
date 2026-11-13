---
# So legst du einen neuen Beitrag an:
#   1. Diesen Ordner _vorlage kopieren und umbenennen, z. B. content/news/neues-skill-rating
#      (nur Kleinbuchstaben, Zahlen und Bindestriche; der Name wird Teil der Adresse)
#   2. Diese Datei (de.md) ausfüllen. Für Englisch dieselbe Struktur in en.md.
#      Gibt es keine en.md, erscheint der Beitrag nur auf Deutsch.
#   3. Bild nach public/images/news/ legen und unten bei "image" eintragen
#   4. Pushen - Vercel baut neu und der Beitrag ist online
#
# Pflicht: title, date (JJJJ-MM-TT). Alles andere ist optional.
# "draft: true" versteckt den Beitrag, bis du es entfernst.
title: Titel des Beitrags
date: 2026-12-01
category: Update
excerpt: Ein bis zwei Sätze, die auf der Karte und unter der Überschrift stehen.
image: /images/news/mein-bild.webp
imageAlt: Kurze Bildbeschreibung
draft: true
---

Einleitungsabsatz mit **fettem** und *kursivem* Text und einem [Link](https://example.com).

## Eine Zwischenüberschrift

Normaler Text. Absätze trennst du mit einer Leerzeile.

- Aufzählungspunkt mit grünem Haken
- Noch ein Punkt

1. Nummerierter Schritt
2. Nächster Schritt

> Ein hervorgehobenes Zitat oder eine wichtige Anmerkung.

![Bildbeschreibung](/images/news/mein-bild.webp)
