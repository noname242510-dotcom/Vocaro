# Vocaro Design System

Dieses Dokument ist die **Single Source of Truth** für alle UI-Entscheidungen in der Vocaro App.

---

## 1. Typografie-Hierarchie (Verbindlich auf ALLEN Seiten)

| Ebene | Tailwind-Klassen | Verwendung |
|-------|-----------------|------------|
| **H1 (Seitentitel)** | `text-5xl font-bold font-creative tracking-tight text-foreground` | Jeder Seitentitel (`<h1>`) |
| **H2 (Abschnittsüberschrift)** | `text-2xl font-bold font-headline text-foreground` | Abschnitte, Gruppen-Titel |
| **H3 (Card-Titel / Unterüberschrift)** | `text-xl font-semibold font-headline text-foreground` | Card-Titel, Modul-Überschriften |
| **Body-Text** | `text-base font-medium text-foreground leading-relaxed` | Standard-Fließtext |
| **Body Large** | `text-lg font-medium text-muted-foreground` | Seiten-Beschreibungen, Untertitel |
| **Label / Helper** | `text-sm font-semibold text-muted-foreground` | Formular-Labels, Helper-Text |
| **Caption / Badge-Text** | `text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60` | Tags, Sublabels, Zähler |

> **Regel**: Kein Heading darf in Schriftgröße, Gewicht oder Schriftfamilie abweichen. Font-Familien nur über `font-creative` (Outfit, für Display), `font-headline` (Outfit, für Überschriften) und den Standard sans-serif (Inter für Body) verwenden.

---

## 2. Border Radius (Rundungen)

| Verwendung | Wert |
|-----------|------|
| Seiten-Container / Große Cards | `rounded-[3rem]` (48px) |
| Standard Cards / Abschnitte | `rounded-[2rem]` (32px) |
| Buttons / Inputs / Kleine Cards | `rounded-2xl` (16px) |
| Sidebar-Buttons | `rounded-xl` (12px) |
| Tags / Badges | `rounded-full` |

---

## 3. Schatten (Shadows)

| Verwendung | Klassen |
|-----------|---------|
| Standard Cards | `shadow-xl shadow-primary/5` |
| Interaktive Cards (Hover) | `hover:shadow-2xl hover:shadow-primary/10` |
| Primäre Buttons | `shadow-md shadow-primary/20` |
| Aktive Sidebar-Einträge | `shadow-lg shadow-primary/20` |

---

## 4. Farb-Palette (CSS-Variablen)

Alle Farben werden über CSS-Custom-Properties definiert und unterstützen Light/Dark Mode.

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `0 0% 100%` | `222.2 84% 4.9%` |
| `--foreground` | `0 0% 3.9%` | `210 40% 98%` |
| `--card` | `0 0% 97.3%` | `222.2 47.4% 8%` |
| `--primary` | `0 0% 9%` | `210 40% 98%` |
| `--secondary` | `0 0% 96.1%` | `217.2 32.6% 17.5%` |
| `--muted-foreground` | `0 0% 45.1%` | `215 20.2% 65.1%` |
| `--destructive` | `0 0% 15%` | `0 62.8% 30.6%` |

---

## 5. UI-Komponenten Struktur

### Cards (Standard)
```tsx
<Card className="bg-card border-none shadow-xl shadow-primary/5 rounded-[2rem] p-8 hover:shadow-2xl transition-all duration-300">
  {content}
</Card>
```

### Buttons
- **Primary:** `rounded-2xl font-bold h-12 px-6 bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all`
- **Secondary/Outline:** `rounded-2xl font-bold h-12 px-6 border-2 hover:bg-secondary transition-colors`
- **Ghost/Icon:** `rounded-2xl hover:bg-secondary transition-colors`

### Inputs
```
h-14 rounded-2xl text-lg px-6 border-2 border-input bg-background focus-visible:border-primary transition-all
```

---

## 6. Layout & Spacing

- **Seiten-Padding:** `space-y-12` für Sektionen, `p-8` bis `p-12` für Page-Container
- **Card-Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8` für Card-Grids
- **Seitenbreite:** `max-w-7xl mx-auto`
- **Mobile Bottom-Nav:** Immer `pb-24` (oder `pb-28`) auf Mobile-Seiten hinzufügen, damit Bottom-Nav-Bar Inhalte nicht verdeckt

---

## 7. Dark Mode Richtlinie

- Dark Mode wird via `.dark` Klasse am `<html>`-Element gesteuert.
- Niemals `bg-white` oder `text-black` verwenden. Stattdessen:
  - Hintergrund: `bg-background` oder `bg-card`
  - Text: `text-foreground` oder `text-muted-foreground`
  - Overlay/Panel: `bg-secondary`
- `dark:` Tailwind-Varianten sind erlaubt für spezifische Übersteuerungen.

---

## 8. Navigation

### Desktop-Sidebar (Reihenfolge, von oben nach unten)
1. Home (`/dashboard`) — Icon: `Home`
2. Community (`/dashboard/community`) — Icon: `Users`
3. Sprachen (`/dashboard/stacks`) — Icon: `BookOpen`
4. Statistiken (`/dashboard/overview`) — Icon: `BarChart2`
5. Einstellungen (`/dashboard/settings`) — Icon: `Settings`

### Mobile-Bottom-Navigation (Reihenfolge, von links nach rechts)
1. Home — Icon: `Home`
2. Community — Icon: `Users`
3. Sprachen — Icon: `BookOpen`
4. Statistiken — Icon: `BarChart2`
5. Einstellungen — Icon: `Settings`

> **Regel**: Beide Navigationen müssen in Reihenfolge und Icons synchron sein. Aktiver Tab muss immer eindeutig hervorgehoben werden.
