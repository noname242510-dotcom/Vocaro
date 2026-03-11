# Vocaro Design System

Dieses Dokument ist die **Single Source of Truth** für alle UI-Entscheidungen in der Vocaro App. Es basiert auf dem Premium-Design der Startseite und der Statistiken-Seite.

## 1. Border Radius (Rundungen)
Konsequente Nutzung extrem abgerundeter Ecken für einen freundlichen, modernen Look.
- **Große Container / Haupt-Cards:** `rounded-[3rem]` (48px)
- **Standard Cards / Sections:** `rounded-[2.5rem]` (40px) oder `rounded-[2rem]` (32px)
- **Buttons / Inputs / Kleine Cards:** `rounded-2xl` (16px) oder `rounded-xl` (12px)
- **Tags / Badges:** `rounded-full`

## 2. Schatten (Shadows)
Schatten werden großzügig aber subtil eingesetzt, oft mit einem Farbstich der Primärfarbe.
- **Basis-Schatten (Karten):** `shadow-xl shadow-primary/5`
- **Hover-Schatten (Interaktive Karten):** `hover:shadow-2xl hover:shadow-primary/10` oder `hover:shadow-primary/20`
- **Buttons / Aktive Elemente:** `shadow-md` oder `shadow-lg` für primäre Aktionen

## 3. Typografie (Fonts)
Zwei Hauptschriftarten, kombiniert für klare Hierarchie:
- **Überschriften (Display / Titles):** Outfit
  - Tailwind-Klassen: `font-headline`, `font-creative`
  - Font-Gewicht: `font-bold` (700) oder `font-black` (900)
- **Fließtext (Body / Labels):** Inter
  - Tailwind-Klasse: `font-body` oder Standard (sans)
  - Layout-Klassen: `text-muted-foreground`, `tracking-tight` für große Texte, `tracking-widest uppercase` für kleine Sublabels.

## 4. Farben (Colors)
Die App nutzt CSS-Variablen für konsistentes Light/Dark Mode Theming.
- **Background:** `bg-background`
- **Foreground:** `text-foreground`
- **Card Background:** `bg-card` oder `bg-white` (im Dark Mode durch `dark:bg-gray-800` bzw. CSS-Variable übersetzt)
- **Primary:** `bg-primary`, `text-primary`
- **Secondary:** `bg-secondary`, `text-secondary`
- **Text-Muted:** `text-muted-foreground`

## 5. UI-Komponenten Struktur
### **Cards**
Alle Cards sollten folgenden Aufbau haben:
```tsx
<Card className="bg-white dark:bg-card border-none shadow-xl shadow-primary/5 rounded-[2rem] p-8 hover:shadow-2xl transition-all duration-300">
  {content}
</Card>
```

### **Buttons**
- **Primary:** `rounded-2xl font-bold h-12 px-6 bg-primary text-primary-foreground hover:opacity-90 transition-opacity`
- **Secondary/Outline:** `rounded-2xl font-bold h-12 px-6 border-2 hover:bg-secondary transition-colors`
- **Ghost/Icon:** `rounded-2xl hover:bg-secondary transition-colors`

### **Inputs**
- `h-14 rounded-2xl text-lg px-6 border-2 focus:border-primary transition-all bg-background`

## 6. Layout & Spacing
- **Seitenabstände:** Großzügiges Padding (`p-8`, `p-12`), Abstände zwischen Sektionen (`space-y-12`, `space-y-8`).
- **Gitter (Grid):** Karten in Grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` oder `gap-8`)

## 7. Dark Mode Richtlinie
Der Wechsel zwischen Hell- und Dunkelmodus erfolgt via `.dark` Klasse auf dem `<html>` Element. Alle hardcodierten `bg-white` Klassen müssen durch `bg-card` oder responsive `dark:bg-gray-800` (bzw. entsprechende Variablen) ersetzt oder ergänzt werden.
