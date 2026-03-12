# Aufgabenplan

## 0. Vorbereitung
- [x] Alle relevanten Seiten und Komponenten analysiert
- [x] Firebase-Collections (`backend.json`) und Sicherheitsregeln (`firestore.rules`) analysiert
- [x] Navigationskomponenten (Desktop-Sidebar in `layout.tsx`, Mobile-Navbar in `nav-bar.tsx`) identifiziert
- [x] UI-Komponenten (Buttons, Cards, etc.) und Design-System (`globals.css`, `tailwind.config.ts`) analysiert

## 1. Allgemeines – Sprache
- [x] Alle UI-Texte auf Deutsch umgestellt.
- [x] Liste der geänderten Texte (mental notiert): "Lernen", "Lern-Statistiken", "Fächer", "Einstellungen", "Abbrechen", "Speichern", etc. auf fast allen Seiten.

## 2. Home-Seite (`/dashboard/page.tsx`, `_components/subject-card.tsx`)
- [x] Beschreibende Texte und "Active"-Badge aus den Fach-Kacheln entfernt.
- [x] Label "Cards" zu "Vokabeln" geändert.
- [x] Hover-Effekt für Desktop mit Löschen/Umbenennen-Buttons implementiert.

## 3. Community-Seite (`/dashboard/community/*`)
- [x] Tabs zu Unterseiten refaktorisiert: `/dashboard/community` (jetzt Gruppen), `/dashboard/community/freunde`, `/dashboard/community/entdecken`.
- [x] "Übersicht" zu "Gruppen" umbenannt.
- [x] Beschreibende Texte und "New"-Badge aus Gruppen-Kacheln entfernt.
- [x] "Beitreten"-Button durch Pfeil-Icon ersetzt.
- [x] "See All Friends"-Button zu "Neue Gruppe erstellen" geändert.
- [x] "Social Feed"-UI und -Logik entfernt.

## 4. Fächer-Seite (`/dashboard/facher/page.tsx`)
- [x] Route von `/stacks` zu `/dashboard/facher` umbenannt.
- [x] Navigation und Titel auf "Fächer" aktualisiert.
- [x] UI der Fächer-Liste vereinfacht: Expand-Button entfernt, Aktionen (Löschen, Umbenennen, Navigieren) als Icon-Buttons hinzugefügt.

## 5. Statistiken-Seite (`/dashboard/overview/page.tsx`)
- [x] Layout-Überlappung mit der Sidebar behoben.
- [x] Top-Bereich mit neuen Metrik-Kacheln für Gesamt-Vokabeln, Streak, Lerntage und Genauigkeit implementiert (mit echten Daten).
- [x] Diagramm für wöchentliche Aktivität mit korrekten Abständen und Y-Achse versehen.
- [x] "Fehler-Radar"-Abschnitt umgebaut, um Top-5-Fehler pro Fach anzuzeigen.
- [x] "KI-Fix"-Button mit Flow (Generieren, Auswählen, Speichern) implementiert. Neue Firestore-Collection `vokabelTipps` hinzugefügt und Regeln angepasst.
- [x] "Focus Now"-Button entfernt.

## 6. Seitenleiste (`/dashboard/layout.tsx`)
- [x] Hover-Zustand für aktive Menüpunkte korrigiert, sodass Textfarbe weiß bleibt.

## 7. Fach-Detailseite (`/dashboard/subjects/[subjectId]/page.tsx`)
- [x] "Neue Verben"-Button von der Vokabeln-Seite entfernt.
- [x] "Vokabeln hinzufügen"-Button neu positioniert.
- [x] Verben-Karten als vertikale Liste (wie Vokabel-Stapel) angeordnet.
- [x] Löschen-Icon neben dem Fachnamen vergrößert.

## 8. Mobile Ansicht
- [x] Mobile Bottom-Navigation als `position: fixed` implementiert und `padding-bottom` auf allen Seiten sichergestellt.
- [x] Mobilen Header (Logo + UserNav) entfernt.

## 9. Qualitätsprüfung
- [ ] Alle Punkte aus dem Anforderungsdokument im Localhost überprüft.
- [ ] Sichergestellt, dass keine neuen Fehler eingeführt wurden.
- [ ] Dark Mode auf allen überarbeiteten Seiten verifiziert.
- [ ] Alle Checkboxen hier abgehakt.
