# Gefrierschrank Tracker - PWA Implementierungsplan

## Kontext

Ziel ist eine Progressive Web App (PWA) zur Inventarverwaltung eines Gefrierschranks. Die App soll visuell Laden/Fächer darstellen, das Hinzufügen/Entfernen von Artikeln ermöglichen und sich wie eine native iOS-App anfühlen. Sie wird auf GitHub Pages gehostet und muss offline funktionieren — besonders auf dem iPhone, wo PWAs historisch eingeschränkt waren.

**Entscheidungen aus Rücksprache:**
- UI komplett auf Deutsch
- Startet mit einem Gefrierschrank, Datenmodell erlaubt spätere Erweiterung auf mehrere
- Benutzerdefinierte Kategorien/Tags (keine festen Kategorien)
- Einfrier-Datum (automatisch) + optionales MHD mit Ablauf-Warnung

---

## 1. Technologie-Stack

| Schicht | Technologie | Begründung |
|---|---|---|
| **UI-Framework** | React 19 | Erstklassige Konsta UI Unterstützung, größtes Ökosystem |
| **UI-Komponenten** | Konsta UI | Pixel-perfekte iOS-native Komponenten auf Tailwind-Basis |
| **Styling** | Tailwind CSS v4 | Utility-first, von Konsta UI vorausgesetzt |
| **Build-Tool** | Vite 6 | Schnellster Bundler, erstklassiges PWA-Plugin |
| **PWA** | vite-plugin-pwa + Workbox | Zero-Config PWA mit iOS-Support |
| **Datenbank** | Dexie.js v4 (IndexedDB) | Schema-Versionierung, reaktive Queries, großes Speicherlimit |
| **State** | Zustand | Leichtgewichtig (~1 KB), nur für UI-State |
| **Routing** | react-router-dom v7 (HashRouter) | GitHub Pages kompatibel ohne Workarounds |
| **Animation** | Framer Motion (motion) | Spring-Physik für native Lade-Animationen |
| **Sprache** | TypeScript 5.x | Typsicherheit für Datenmodell |

### Warum diese Kombination?

- **React + Konsta UI**: Konsta UI liefert fertige iOS-Komponenten (Navbar, List, Sheet, Swipeout) — das spart enorme Entwicklungszeit und sieht authentisch aus
- **Dexie.js statt localStorage**: localStorage hat 5 MB Limit und kann von iOS bei Speicherdruck gelöscht werden. IndexedDB hat ~1 GB Quota für PWAs auf dem Homescreen
- **HashRouter statt BrowserRouter**: GitHub Pages unterstützt kein serverseitiges Routing. HashRouter (`/#/drawer/123`) funktioniert ohne 404.html-Tricks
- **Vite + vite-plugin-pwa**: Generiert automatisch Service Worker, Manifest und Precaching

---

## 2. iOS PWA — Spezifische Maßnahmen

### 2.1 Apple Meta-Tags in `index.html`

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Freezer" />
<meta name="format-detection" content="telephone=no" />
<link rel="apple-touch-icon" href="/gefrierschrank-tracker/apple-touch-icon-180x180.png" />
```

- `viewport-fit=cover` — Content erstreckt sich hinter Notch/Dynamic Island
- `maximum-scale=1.0, user-scalable=no` — verhindert Doppeltipp-Zoom (native App-Gefühl)
- `black-translucent` — Status-Bar zeigt App-Hintergrund durch (modernes iOS-Pattern)

### 2.2 Splash Screens

Generierung aller benötigten iOS Splash-Screen-Größen mit `pwa-asset-generator`. Jedes iPhone-Modell braucht eine eigene Auflösung (ca. 10-15 Varianten).

```bash
npx pwa-asset-generator ./src/assets/logo.svg ./public/splash \
  --background "#F2F2F7" \
  --splash-only \
  --portrait-only \
  --type png
```

### 2.3 iOS-Quirks behandeln

| Problem | Lösung |
|---|---|
| Kein Back-Gesture im Standalone-Mode | Immer sichtbarer Zurück-Button in der Navbar |
| Safe Areas (Notch, Home Indicator) | Konsta UI `safeAreas={true}` + CSS `env(safe-area-inset-*)` |
| State-Verlust beim App-Wechsel | Alle Daten in IndexedDB persistiert, Zustand wird neu geladen |
| Service Worker wird nach Schließen terminiert | Precached Assets bleiben in CacheStorage, sofort verfügbar |
| Externe Links brechen Standalone-Modus | Interne Navigation über Router, externe via `window.open()` |

### 2.4 Offline-Strategie

Die App hat **kein Server-Backend** — alle Daten liegen lokal in IndexedDB. Nach dem ersten Laden werden alle statischen Assets (JS, CSS, HTML, Bilder, Fonts) vom Service Worker gecacht. Danach funktioniert die App zu 100% offline.

- **Precache**: Alle Build-Assets via Workbox `generateSW`
- **Runtime-Cache**: Google Fonts (CacheFirst, 1 Jahr)
- **Daten**: Ausschließlich in IndexedDB (nicht im Service Worker Cache)

---

## 3. Datenmodell

### Schema (Dexie.js)

```typescript
// src/db/database.ts
import Dexie, { type EntityTable } from 'dexie';

interface Freezer {
  id: string;        // UUID
  name: string;      // z.B. "Küche Gefrierschrank"
  order: number;     // Anzeigereihenfolge
  createdAt: Date;
}

interface Drawer {
  id: string;        // UUID
  freezerId: string; // FK zu Freezer
  name: string;      // z.B. "Schublade 1" oder "Oberes Fach"
  order: number;     // Position von oben (0 = oben)
  color: string;     // Hex-Farbe zur visuellen Unterscheidung
  createdAt: Date;
}

interface Item {
  id: string;        // UUID
  drawerId: string;  // FK zu Drawer
  name: string;      // z.B. "Hackfleisch"
  quantity: number;  // Standard: 1
  unit: string;      // "Stück", "g", "kg", "Packung"
  tags: string[];    // Benutzerdefinierte Tags, z.B. ["Fleisch", "Bio"]
  notes: string;     // Optionale Notizen
  dateAdded: Date;   // Automatisch beim Anlegen
  expiryDate?: Date; // Optionales MHD
}

interface Tag {
  id: string;        // UUID
  name: string;      // z.B. "Fleisch", "Gemüse"
  color: string;     // Chip-Farbe
}
```

### Indexierung

```typescript
db.version(1).stores({
  freezers: 'id, order',
  drawers:  'id, freezerId, order',
  items:    'id, drawerId, *tags, dateAdded, expiryDate',
  tags:     'id, &name',
});
```

- Multi-Entry-Index auf `tags` ermöglicht effiziente Suche nach Tag
- `expiryDate`-Index für MHD-Ablauf-Abfragen
- `&name` auf Tags = unique constraint

### Datenzugriff (Hooks)

```typescript
// src/hooks/useFreezerData.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export function useDrawers(freezerId: string) {
  return useLiveQuery(
    () => db.drawers.where('freezerId').equals(freezerId).sortBy('order'),
    [freezerId]
  );
}

export function useItems(drawerId: string) {
  return useLiveQuery(
    () => db.items.where('drawerId').equals(drawerId).sortBy('dateAdded'),
    [drawerId]
  );
}

export function useItemCount(drawerId: string) {
  return useLiveQuery(
    () => db.items.where('drawerId').equals(drawerId).count(),
    [drawerId]
  );
}

export function useExpiredItems(drawerId: string) {
  const now = new Date();
  return useLiveQuery(
    () => db.items.where('drawerId').equals(drawerId)
      .and(item => item.expiryDate !== undefined && item.expiryDate < now)
      .toArray(),
    [drawerId]
  );
}
```

Verwendung von `dexie-react-hooks` mit `useLiveQuery` — Komponenten re-rendern automatisch wenn sich IndexedDB-Daten ändern. Kein manuelles Sync nötig.

### Erstes Starten (Seed Data)

Beim allerersten Start wird automatisch erstellt:
- Ein Standard-Gefrierschrank "Mein Gefrierschrank" mit 4 leeren Laden ("Fach 1" bis "Fach 4")
- Ein Set Standard-Tags: Fleisch, Gemüse, Brot, Fertiggerichte, Eis, Sonstiges (jeweils mit Farbe)

---

## 4. State Management (Zustand)

```typescript
// src/store/useAppStore.ts
import { create } from 'zustand';

interface AppState {
  // Navigation
  activeFreezer: Freezer | null;
  activeDrawer: Drawer | null;

  // UI State
  isAddItemSheetOpen: boolean;
  isAddDrawerSheetOpen: boolean;
  searchQuery: string;

  // Actions
  setActiveFreezer: (freezer: Freezer | null) => void;
  setActiveDrawer: (drawer: Drawer | null) => void;
  setAddItemSheetOpen: (open: boolean) => void;
  setAddDrawerSheetOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}
```

**Wichtig:** Zustand verwaltet nur UI-State (welches Sheet offen ist, aktive Navigation). Alle persistenten Daten liegen in Dexie/IndexedDB und werden über `useLiveQuery` Hooks gelesen.

---

## 5. UI/UX Design

### 5.1 Seitenstruktur

```
FreezerViewPage (Hauptseite — visueller Gefrierschrank mit Laden)
  └── DrawerViewPage (Artikelliste in einer Lade)
        └── AddItemSheet (Bottom Sheet: Artikel hinzufügen)
SettingsPage (Gefrierschrank verwalten, Tags bearbeiten, Daten exportieren)
```

Da die App mit einem Gefrierschrank startet, öffnet sie direkt die **FreezerViewPage**.

### 5.2 Hauptseite: Visueller Gefrierschrank

```
+------------------------------------+
|  [❄️]  Mein Gefrierschrank    [⚙]  |  ← Navbar
+------------------------------------+
|                                    |
|  ╔════════════════════════════╗    |
|  ║  ┌────────────────────┐   ║    |  ← Gefrierschrank-Körper
|  ║  │ ═══ Fach 1    (3)  │   ║    |  ← Lade (antippbar)
|  ║  └────────────────────┘   ║    |
|  ║  ┌────────────────────┐   ║    |
|  ║  │ ═══ Fach 2    (7)  │   ║    |
|  ║  └────────────────────┘   ║    |
|  ║  ┌────────────────────┐   ║    |
|  ║  │ ═══ Fach 3    (0)  │   ║    |  ← Leere Lade
|  ║  └────────────────────┘   ║    |
|  ║  ┌────────────────────┐   ║    |
|  ║  │ ═══ Fach 4    (5)  │   ║    |
|  ║  └────────────────────┘   ║    |
|  ╚════════════════════════════╝    |
|                                    |
|                            [＋]    |  ← FAB: Lade hinzufügen
+------------------------------------+
```

**Visuelles Design:**
- **Gefrierschrank-Körper**: Abgerundetes Rechteck mit Gradient (hellgrau → mittelgrau), innerer Schatten für Tiefe
- **Jede Lade**: Weißer Card mit:
  - Griff-Grafik (horizontale Linien) links
  - Name der Lade
  - Artikelanzahl-Badge rechts
  - Farbiger linker Rand (Lade-Farbe)
  - Subtiler Schatten
- **Tap-Feedback**: `scale(0.97)` beim Antippen via Framer Motion
- **MHD-Warnung**: Laden mit abgelaufenen Artikeln bekommen einen orangen/roten Indikator-Punkt

**CSS für Gefrierschrank-Körper:**

```css
.freezer-body {
  background: linear-gradient(180deg, #E8E8ED 0%, #D1D1D6 100%);
  border-radius: 16px;
  padding: 12px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.drawer-slot {
  background: white;
  border-radius: 10px;
  margin-bottom: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.drawer-slot:active {
  transform: scale(0.98);
  background: #F2F2F7;
}
```

### 5.3 Laden-Ansicht (DrawerViewPage)

```
+------------------------------------+
|  [←]  Fach 1               [＋]   |  ← Navbar mit Zurück + Hinzufügen
+------------------------------------+
|                                    |
|  ┌──────────────────────────────┐  |
|  │ 🥩 Hackfleisch    500g      │  |  ← Swipe links → Löschen
|  │    12.01.2026  MHD: 12.04   │  |
|  │    [Fleisch]                 │  |  ← Tag-Chips
|  ├──────────────────────────────┤  |
|  │ 🍞 Baguette       2 Stück   │  |
|  │    08.02.2026                │  |
|  │    [Brot] [Bio]             │  |
|  ├──────────────────────────────┤  |
|  │ ⚠️ Fischstäbchen  1 Packung │  |  ← MHD abgelaufen!
|  │    01.11.2025  MHD: 01.02 ⚠️│  |
|  │    [Fertiggerichte]         │  |
|  └──────────────────────────────┘  |
|                                    |
+------------------------------------+
```

**Funktionalität:**
- **Konsta UI `List` mit `SwipeoutActions`**: Nach links wischen zeigt roten "Löschen"-Button
- **Bestätigungs-Dialog** vor dem Löschen (Konsta UI `Dialog`)
- **MHD-Warnung**: Artikel mit abgelaufenem MHD werden visuell hervorgehoben (roter Text, Warn-Icon)
- **Sortierung**: Abgelaufene MHDs ganz oben (Warnung), dann neueste zuerst
- **FAB oder Navbar-Button** zum Hinzufügen neuer Artikel

### 5.4 Artikel hinzufügen (AddItemSheet)

Konsta UI **Sheet** (Bottom Sheet) — das iOS-native Pattern für modale Eingaben:

```
+------------------------------------+
|  [Abbrechen]  Neuer Artikel  [OK] |  ← Sheet Toolbar
+------------------------------------+
|                                    |
|  Name *                            |
|  [Hackfleisch________________]     |  ← Text-Input (Pflichtfeld)
|                                    |
|  Menge           Einheit           |
|  [1___]          [Stück ▼]         |  ← Number + Select
|                                    |
|  MHD (optional)                    |
|  [TT.MM.JJJJ_______________]      |  ← Date-Picker (nativ)
|                                    |
|  Tags                              |
|  [Fleisch] [Bio] [+ Neuer Tag]    |  ← Chip-Auswahl
|                                    |
|  Notiz (optional)                  |
|  [________________________]        |  ← Textarea
|                                    |
+------------------------------------+
```

**Details:**
- **Einfrier-Datum** wird automatisch auf `new Date()` gesetzt (nicht editierbar)
- **MHD** ist optional, öffnet den nativen iOS Date-Picker (`<input type="date">`)
- **Tags**: Chips aus vorhandenen Tags zum Antippen + "Neuer Tag" Button (inline-Eingabe)
- **Einheit**: Dropdown/Select mit Stück, g, kg, Packung
- **Validierung**: Name ist Pflichtfeld, Menge muss > 0 sein

### 5.5 Lade hinzufügen/bearbeiten (AddDrawerSheet)

Bottom Sheet mit:
- **Name** der Lade (Text-Input)
- **Farbe** wählen (8-10 vordefinierte Farben als antippbare Kreise)
- **Löschen-Button** (nur beim Bearbeiten, mit Warnung wenn Artikel drin sind)

### 5.6 Einstellungen (SettingsPage)

- Gefrierschrank umbenennen
- Tags verwalten (hinzufügen, umbenennen, löschen, Farbe ändern)
- Daten exportieren (JSON-Download als Backup)
- Daten importieren (JSON-Upload)
- App-Info und Version
- "Alle Daten löschen" mit doppelter Bestätigung

### 5.7 Konsta UI Komponenten-Nutzung

| Konsta UI Komponente | Verwendung |
|---|---|
| `App` | Root-Wrapper (iOS Theme, Safe Areas) |
| `Page`, `Navbar`, `NavbarBackLink` | Seitenstruktur und Navigation |
| `List`, `ListItem`, `ListInput` | Artikellisten und Formulare |
| `Sheet`, `Toolbar` | Bottom Sheets (Hinzufügen-Formulare) |
| `Swipeout`, `SwipeoutActions`, `SwipeoutButton` | Swipe-to-Delete |
| `Dialog` | Bestätigungs-Dialoge |
| `Fab` | Floating Action Button |
| `Chip` | Tag-Anzeige und -Auswahl |
| `Button` | Aktions-Buttons |
| `Block`, `BlockTitle` | Content-Sektionen |
| `Segmented`, `SegmentedButton` | Einheiten-Auswahl |

---

## 6. Projektstruktur

```
gefrierschrank-tracker/
├── .github/
│   └── workflows/
│       └── deploy.yml                  # GitHub Actions: Build + Deploy
├── public/
│   ├── favicon.ico
│   ├── favicon.svg                     # SVG Favicon (Schneeflocke/Gefrierschrank)
│   ├── apple-touch-icon-180x180.png    # iOS Home Screen Icon
│   ├── pwa-192x192.png                 # Android/PWA Icon
│   ├── pwa-512x512.png                 # Android/PWA Icon (groß)
│   └── splash/                         # Generierte iOS Splash Screens
│       ├── apple-splash-1170-2532.png
│       ├── apple-splash-1179-2556.png
│       ├── apple-splash-1290-2796.png
│       └── ...                         # (alle Gerätegrößen)
├── src/
│   ├── main.tsx                        # Einstiegspunkt: ReactDOM.render
│   ├── App.tsx                         # KonstaApp + HashRouter + Routes
│   ├── app.css                         # Globale Styles + Tailwind @import
│   ├── vite-env.d.ts                   # Vite TypeScript Deklarationen
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppNavbar.tsx           # Wiederverwendbare Navbar
│   │   │   └── PageWrapper.tsx         # Seiten-Wrapper mit Safe Areas
│   │   ├── freezer/
│   │   │   ├── FreezerBody.tsx         # Visueller Gefrierschrank-Container
│   │   │   ├── FreezerDrawer.tsx       # Einzelne Lade (antippbar, animiert)
│   │   │   ├── DrawerList.tsx          # Vertikaler Laden-Stapel
│   │   │   └── AddDrawerSheet.tsx      # Bottom Sheet: Lade hinzufügen/bearbeiten
│   │   ├── items/
│   │   │   ├── ItemList.tsx            # Artikelliste mit Swipe-to-Delete
│   │   │   ├── ItemRow.tsx             # Einzelner Artikel-Eintrag
│   │   │   ├── AddItemSheet.tsx        # Bottom Sheet: Artikel hinzufügen
│   │   │   └── TagPicker.tsx           # Chip-basierte Tag-Auswahl
│   │   └── common/
│   │       ├── EmptyState.tsx          # "Keine Artikel" / "Keine Laden" Platzhalter
│   │       ├── ConfirmDialog.tsx       # Lösch-Bestätigung
│   │       ├── ExpiryBadge.tsx         # MHD-Warnung Badge/Indikator
│   │       └── ReloadPrompt.tsx        # PWA Update-Benachrichtigung
│   │
│   ├── pages/
│   │   ├── FreezerViewPage.tsx         # Hauptseite: Gefrierschrank mit Laden
│   │   ├── DrawerViewPage.tsx          # Artikelansicht einer Lade
│   │   └── SettingsPage.tsx            # Einstellungen
│   │
│   ├── db/
│   │   ├── database.ts                # Dexie Schema + DB-Instanz
│   │   └── seed.ts                    # Standard-Daten beim ersten Start
│   │
│   ├── store/
│   │   └── useAppStore.ts             # Zustand Store (nur UI-State)
│   │
│   ├── hooks/
│   │   ├── useFreezerData.ts          # Dexie Live-Queries (alle CRUD-Hooks)
│   │   └── useExpiryCheck.ts          # MHD-Ablauf Prüfung
│   │
│   ├── utils/
│   │   ├── dates.ts                   # Datumsformatierung (dd.MM.yyyy, deutsches Locale)
│   │   ├── defaultTags.ts             # Standard-Tag Definitionen + Farben
│   │   └── export.ts                  # JSON Export/Import Logik
│   │
│   └── assets/
│       └── logo.svg                   # App-Logo (Quelle für Icon-Generierung)
│
├── index.html                         # Entry HTML mit Apple Meta-Tags
├── vite.config.ts                     # Vite + PWA + Tailwind Konfiguration
├── tsconfig.json                      # TypeScript Konfiguration
├── tsconfig.app.json                  # App-spezifische TS Config
├── tsconfig.node.json                 # Node/Vite TS Config
├── package.json                       # Dependencies + Scripts
├── .gitignore                         # node_modules, dist, etc.
└── PLAN.md                            # Dieser Plan
```

---

## 7. Vite Konfiguration

**Datei: `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/gefrierschrank-tracker/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon-180x180.png',
      ],
      manifest: {
        name: 'Gefrierschrank Tracker',
        short_name: 'Freezer',
        description: 'Gefrierschrank Inventar verwalten',
        theme_color: '#007AFF',
        background_color: '#F2F2F7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/gefrierschrank-tracker/',
        start_url: '/gefrierschrank-tracker/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
```

---

## 8. GitHub Actions Deployment

**Datei: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Voraussetzung:** Im GitHub Repository unter Settings → Pages → Source → "GitHub Actions" auswählen.

---

## 9. App-Root Komponente

**Datei: `src/App.tsx`**

```typescript
import { HashRouter, Routes, Route } from 'react-router-dom';
import { App as KonstaApp } from 'konsta/react';
import FreezerViewPage from './pages/FreezerViewPage';
import DrawerViewPage from './pages/DrawerViewPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <KonstaApp theme="ios" safeAreas>
      <HashRouter>
        <Routes>
          <Route path="/" element={<FreezerViewPage />} />
          <Route path="/drawer/:drawerId" element={<DrawerViewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </HashRouter>
    </KonstaApp>
  );
}

export default App;
```

---

## 10. Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "konsta": "^5.0.0",
    "dexie": "^4.0.0",
    "dexie-react-hooks": "^1.1.0",
    "zustand": "^5.0.0",
    "motion": "^12.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "pwa-asset-generator": "^6.4.0"
  }
}
```

---

## 11. Implementierungs-Reihenfolge

### Phase 1: Projekt-Gerüst
1. Vite + React + TypeScript Projekt initialisieren
2. Alle Dependencies installieren
3. `vite.config.ts` mit PWA-Plugin und Base-Path konfigurieren
4. `index.html` mit allen Apple Meta-Tags einrichten
5. Tailwind CSS v4 mit Konsta UI konfigurieren
6. `.gitignore` erstellen
7. GitHub Actions Workflow erstellen
8. Einfache App-Shell (KonstaApp + Router) deployen und testen

### Phase 2: Datenschicht
1. Dexie Schema definieren (`database.ts`)
2. Seed-Daten für ersten Start implementieren (`seed.ts`)
3. Datenzugriffs-Hooks mit `useLiveQuery` erstellen (`useFreezerData.ts`)
4. Zustand Store für UI-State (`useAppStore.ts`)

### Phase 3: Hauptseite — Gefrierschrank-Ansicht
1. `FreezerViewPage` mit visuellem Gefrierschrank-Körper bauen
2. `FreezerDrawer` Komponente mit Tap-Animation
3. `AddDrawerSheet` — Laden hinzufügen und bearbeiten
4. `EmptyState` für leeren Gefrierschrank
5. MHD-Warnung-Indikator auf Ladenebene (roter Punkt bei abgelaufenen Artikeln)

### Phase 4: Laden-Ansicht — Artikelverwaltung
1. `DrawerViewPage` mit Konsta UI Navbar und Zurück-Button
2. `ItemList` mit Konsta UI Swipeout (Swipe-to-Delete)
3. `AddItemSheet` mit Formular (Name, Menge, Einheit, MHD, Tags)
4. `TagPicker` — Chip-Auswahl mit "Neuer Tag" Option
5. `ExpiryBadge` — MHD-Ablauf Warnung (rot für abgelaufen, orange für bald)
6. `ConfirmDialog` für Löschaktionen
7. `EmptyState` für leere Lade

### Phase 5: Polish und PWA-Assets
1. App-Logo erstellen (SVG Schneeflocke/Gefrierschrank-Icon)
2. Icons und Splash Screens generieren mit `pwa-asset-generator`
3. `ReloadPrompt` Komponente für PWA-Updates
4. Einstellungsseite implementieren (Tags verwalten, Export/Import)
5. Seitenübergangs-Animationen mit Framer Motion
6. Deutsches Datumsformat durchgehend (dd.MM.yyyy)
7. Farbschema finalisieren (iOS System-Farben: #007AFF blau, #F2F2F7 hintergrund)

### Phase 6: Test und Deployment
1. Finaler Production Build
2. Deploy auf GitHub Pages
3. Lighthouse Audit durchführen
4. Test auf physischem iPhone (Safari → Home Screen → Offline)

---

## 12. Verifikation / Testplan

### Funktionstest (manuell)
- [ ] Lade hinzufügen → wird visuell im Gefrierschrank angezeigt
- [ ] Lade bearbeiten (Name, Farbe ändern)
- [ ] Lade löschen (mit und ohne Artikel darin)
- [ ] Lade antippen → Artikelliste öffnet sich mit Animation
- [ ] Artikel hinzufügen → erscheint mit korrektem Einfrier-Datum
- [ ] Artikel mit MHD hinzufügen → MHD wird angezeigt
- [ ] Artikel wischen → Löschen-Button → Bestätigung → Artikel entfernt
- [ ] Abgelaufenes MHD → visuell hervorgehoben
- [ ] Tags erstellen, Artikeln zuweisen, wieder entfernen
- [ ] Zurück-Navigation funktioniert durchgehend
- [ ] Daten bleiben nach App-Neustart erhalten
- [ ] Daten exportieren und importieren funktioniert

### PWA-Test auf iPhone
1. App in Safari öffnen → sieht korrekt aus
2. "Zum Home-Bildschirm" hinzufügen → Icon und Name korrekt
3. Von Home Screen öffnen → Splash Screen erscheint
4. Standalone-Modus → kein Safari-UI sichtbar
5. Status-Bar Stil korrekt (black-translucent)
6. Safe Areas → kein Content hinter Notch/Dynamic Island verdeckt
7. Daten hinzufügen → App schließen (wegwischen) → wieder öffnen → Daten vorhanden
8. Flugmodus aktivieren → App öffnen → muss voll funktionieren
9. Flugmodus deaktivieren → Code-Update pushen → App öffnen → Auto-Update

### Lighthouse Zielwerte
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- PWA: Alle Checks bestanden

---

## Kritische Dateien (Übersicht)

| Datei | Bedeutung |
|---|---|
| `vite.config.ts` | Zentrale Konfiguration: PWA, Base-Path, Plugins |
| `index.html` | Apple Meta-Tags, Viewport, Splash Screen Links |
| `src/db/database.ts` | Dexie Schema — Fundament aller Daten |
| `src/db/seed.ts` | Standard-Daten beim ersten Start |
| `src/App.tsx` | KonstaApp (iOS-Theme, Safe Areas) + Router |
| `src/pages/FreezerViewPage.tsx` | Hauptbildschirm — visueller Gefrierschrank |
| `src/pages/DrawerViewPage.tsx` | Artikelverwaltung in einer Lade |
| `src/components/items/AddItemSheet.tsx` | Artikel-Eingabeformular |
| `src/components/items/TagPicker.tsx` | Benutzerdefinierte Tag-Auswahl |
| `src/hooks/useFreezerData.ts` | Alle Dexie Live-Queries |
| `.github/workflows/deploy.yml` | Automatisches Deployment |
