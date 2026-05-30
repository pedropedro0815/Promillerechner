# Promille-Rechner (Pfadfinder Webapp)

Diese App ist eine statische Browser-Anwendung im selben Stil wie die bestehende Pfadfinder-Vorlage.

## Enthaltene Funktionen

- Eingabe von Geschlecht, Größe, Gewicht und Alter
- Zeitangaben für Start, letzter Drink und Berechnungszeit
- Getränkeerfassung über großes Plus
- Kategorien: Bier, Schnaps, Likör
- Untertypen:
  - Bier: Alt, Pils, Radler
  - Schnaps: Wodka, Rum, Korn
  - Likör: Kräuter, Frucht, Sahne, Bitter, Nuss
- Mengenwahl pro Getränk und Plus/Minus pro Eintrag
- Ausgabe der Getränkeliste (aggregiert) und Promille-Schätzung
- Kopieren des Ergebnisses
- Lokale Speicherung der Eingaben im Browser

## Berechnung

- Grundlage: Widmark-Logik mit stündlichem Abbau
- Reiner Alkohol: Volumen x Vol-% x 0.789
- Personalisierter Verteilungsfaktor über Watson-Formel (abhängig von Geschlecht, Alter, Größe, Gewicht)
- Abbau: 0.15 ‰ pro Stunde seit letztem Drink

Hinweis: Das Ergebnis ist nur eine Schätzung.

## Start

`index.html` im Browser öffnen. Kein Build-System notwendig.