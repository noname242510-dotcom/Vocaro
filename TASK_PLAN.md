# Aufgabenplan

## 0. Vorbereitung
- [ ] Alle relevanten Seiten und Komponenten analysiert
- [ ] Firebase-Collections (`backend.json`) und Sicherheitsregeln (`firestore.rules`) analysiert
- [ ] Navigationskomponenten (Desktop-Sidebar in `layout.tsx`, Mobile-Navbar in `nav-bar.tsx`) identifiziert
- [ ] UI-Komponenten (Buttons, Cards, etc.) und Design-System (`globals.css`, `tailwind.config.ts`) analysiert

## 1. Allgemeines – Sprache
- [ ] Alle UI-Texte auf Deutsch umgestellt.
- [ ] Liste der geänderten Texte (mental notiert): "Lernen", "Lern-Statistiken", "Fächer", "Einstellungen", "Abbrechen", "Speichern", etc. auf fast allen Seiten.

## 2. Home-Seite (`/dashboard/page.tsx`, `_components/subject-card.tsx`)
- [ ] Beschreibende Texte und "Active"-Badge aus den Fach-Kacheln entfernt.
- [ ] Label "Cards" zu "Vokabeln" geändert.
- [ ] Hover-Effekt für Desktop mit Löschen/Umbenennen-Buttons implementiert.

## 3. Community-Seite (`/dashboard/community/*`)
- [ ] Tabs zu Unterseiten refaktorisiert: `/dashboard/community` (jetzt Gruppen), `/dashboard/community/freunde`, `/dashboard/community/entdecken`.
- [ ] "Übersicht" zu "Gruppen" umbenannt.
- [ ] Beschreibende Texte und "New"-Badge aus Gruppen-Kacheln entfernt.
- [ ] "Beitreten"-Button durch Pfeil-Icon ersetzt.
- [ ] "See All Friends"-Button zu "Neue Gruppe erstellen" geändert.
- [ ] "Social Feed"-UI und -Logik entfernt.

## 4. Fächer-Seite (`/dashboard/stacks/page.tsx`)
- [ ] Route von `/stacks` zu `/dashboard/facher` umbenannt.
- [ ] Navigation und Titel auf "Fächer" aktualisiert.
- [ ] UI der Fächer-Liste vereinfacht: Expand-Button entfernt, Aktionen (Löschen, Umbenennen, Navigieren) als Icon-Buttons hinzugefügt.

## 5. Statistiken-Seite (`/dashboard/overview/page.tsx`)
- [ ] Layout-Überlappung mit der Sidebar behoben.
- [ ] Top-Bereich mit neuen Metrik-Kacheln für Gesamt-Vokabeln, Streak, Lerntage und Genauigkeit implementiert (mit echten Daten).
- [ ] Diagramm für wöchentliche Aktivität mit korrekten Abständen und Y-Achse versehen.
- [ ] "Fehler-Radar"-Abschnitt umgebaut, um Top-5-Fehler pro Fach anzuzeigen.
- [ ] "KI-Fix"-Button mit Flow (Generieren, Auswählen, Speichern) implementiert. Neue Firestore-Collection `vokabelTipps` hinzugefügt und Regeln angepasst.
- [ ] "Focus Now"-Button entfernt.

## 6. Seitenleiste (`/dashboard/layout.tsx`)
- [ ] Hover-Zustand für aktive Menüpunkte korrigiert, sodass Textfarbe weiß bleibt.

## 7. Fach-Detailseite (`/dashboard/subjects/[subjectId]/page.tsx`)
- [ ] "Neue Verben"-Button von der Vokabeln-Seite entfernt.
- [ ] "Vokabeln hinzufügen"-Button neu positioniert.
- [ ] Verben-Karten als vertikale Liste (wie Vokabel-Stapel) angeordnet.
- [ ] Löschen-Icon neben dem Fachnamen vergrößert.

## 8. Mobile Ansicht
- [ ] Mobile Bottom-Navigation als `position: fixed` implementiert und `padding-bottom` auf allen Seiten sichergestellt.
- [ ] Mobilen Header (Logo + UserNav) entfernt.

## 9. Qualitätsprüfung
- [ ] Alle Punkte aus dem Anforderungsdokument im Localhost überprüft.
- [ ] Sichergestellt, dass keine neuen Fehler eingeführt wurden.
- [ ] Dark Mode auf allen überarbeiteten Seiten verifiziert.
- [ ] Alle Checkboxen hier abgehakt.
