# Chantier 3 — Correctif alignement mobile mini-player / BottomNav ✅

> Commit : `fix: safe-area mini-player alignment + viewport-fit cover`
> Build : `npm run build` → ✓ sans erreur TypeScript

---

## Fichiers modifiés

| Fichier | Nature des changements |
|---|---|
| `app/(frontend)/globals.css` | Ajout de la variable CSS `--bottom-nav-h` dans `:root` |
| `app/(frontend)/components/player/player-bar.tsx` | Remplacement de `bottom-14` par `bottom-[var(--bottom-nav-h)]` sur le mini-player mobile |
| `app/(frontend)/layout.tsx` | Ajout de l'export `viewport` avec `viewportFit: "cover"` ; remplacement de `pb-40` par `pb-[calc(10rem+env(safe-area-inset-bottom,0px))]` sur le `<main>` |

---

## Tâche 3.1 — Variable CSS `--bottom-nav-h`

**Dans `globals.css`, dans `:root` :**

```css
/* BottomNav height (h-15 = 3.75rem = 60px) + iPhone safe area inset */
--bottom-nav-h: calc(3.75rem + env(safe-area-inset-bottom, 0px));
```

- `3.75rem` correspond exactement à `h-15` utilisé dans `bottom-nav.tsx` (TailwindCSS v4 : 15 × 0.25rem = 3.75rem = 60px).
- `env(safe-area-inset-bottom, 0px)` ajoute la hauteur de la barre système des iPhones récents (environ 34px en mode paysage/portrait avec encoche).
- La valeur de repli `0px` garantit le fonctionnement sur Android et les navigateurs qui ne supportent pas `env()`.

---

## Tâche 3.2 — Correction de la position du mini-player mobile

**Dans `player-bar.tsx` :**

```tsx
// Avant
<div className="lg:hidden fixed bottom-14 left-0 right-0 z-40">
// Après
<div className="lg:hidden fixed bottom-[var(--bottom-nav-h)] left-0 right-0 z-40">
```

- `bottom-14` (56px) était inférieur à la hauteur réelle de la BottomNav (60px + safe-area ≈ 94px sur iPhone avec encoche → chevauchement de ~38px).
- `bottom-[var(--bottom-nav-h)]` utilise la variable CSS calculée dynamiquement, ce qui garantit que le mini-player reste collé juste au-dessus de la BottomNav quelle que soit la hauteur de la zone système.

---

## Tâche 3.3 — Padding bas du `<main>` (layout)

**Dans `layout.tsx` :**

```tsx
// Avant
<main className="flex-1 overflow-y-auto pb-40 lg:pb-32">
// Après
<main className="flex-1 overflow-y-auto pb-[calc(10rem+env(safe-area-inset-bottom,0px))] lg:pb-32">
```

- `10rem` (160px = ancienne valeur `pb-40`) est conservé comme base pour laisser de l'espace sous le mini-player + BottomNav.
- `env(safe-area-inset-bottom, 0px)` s'y ajoute pour éviter que le contenu du bas soit masqué derrière la barre système iPhone.

---

## Tâche 3.4 — Viewport `viewportFit: "cover"`

**Dans `layout.tsx` :**

```tsx
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

- `viewportFit: "cover"` active le rendu plein écran sur les iPhones avec encoche/barre dynamique (Dynamic Island).
- Sans ce paramètre, `env(safe-area-inset-bottom)` retourne toujours `0px` sur iOS — la correction du mini-player aurait été inopérante.
- L'export `viewport` séparé est la convention de Next.js 14+ ; `viewport` dans `metadata` est déprécié.
- La BottomNav avait déjà `pb-safe` (défini dans `globals.css` via `.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }`), ce qui était correct.

---

## Raccourcis clavier globaux

Les raccourcis clavier (Espace, ←, →, ↑, ↓, M) ont été implémentés dans le **Chantier 2** (voir `chantier2-done.md`). Ils sont déjà présents dans `player-bar.tsx` et ne nécessitaient pas de modification supplémentaire.

---

## Points d'attention

- `env(safe-area-inset-bottom)` n'est évalué que si `viewport-fit=cover` est actif dans le `<meta viewport>`. Sans l'export `viewport`, toutes les corrections CSS auraient été ignorées sur iOS.
- La classe Tailwind arbitraire `bottom-[var(--bottom-nav-h)]` fonctionne en TailwindCSS v4 sans configuration supplémentaire.
- Le build compile les classes arbitraires utilisant des variables CSS natives — aucune entrée `safelist` ni plugin n'est nécessaire.
