# Chantier 4 — Menu dropdown header + affichage avatar ✅

> Build : `npm run build` → ✓ sans erreur TypeScript

---

## Fichiers modifiés

| Fichier | Nature des changements |
|---|---|
| `app/(frontend)/components/layout/header.tsx` | Affichage avatar réel, dropdown Radix UI, menu mobile enrichi |

---

## Tâche 4.1 — Afficher l'avatar réel dans le header

### Composant `AvatarImage` (interne à `header.tsx`)

Un sous-composant `AvatarImage` a été créé pour éviter la duplication de la logique entre le bouton desktop et le menu mobile. Il reçoit `avatarUrl`, `displayName` et `size`, et gère un état local `imgErr` :

```tsx
function AvatarImage({ avatarUrl, displayName, size = 36 }) {
  const [imgErr, setImgErr] = useState(false);
  if (avatarUrl && !imgErr) {
    return <Image … onError={() => setImgErr(true)} />;
  }
  return <span className="…gradient…">{displayName?.[0]?.toUpperCase() ?? "?"}</span>;
}
```

- Si `user.profile?.avatarUrl` est défini et que le chargement réussit → photo affichée en `object-cover`.
- Si l'URL est absente ou échoue (`onError`) → fallback initiale sur fond dégradé `from-purple-600 to-pink-600`.
- Même composant réutilisé dans le bouton trigger (desktop, 36×36) et dans la ligne profil du drawer mobile (32×32).

---

## Tâche 4.2 — Dropdown Radix UI (Desktop)

### Imports ajoutés

```tsx
import Image from "next/image";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, Library, LogOut, Mic2, Settings, Star, User, … } from "lucide-react";
```

`@radix-ui/react-dropdown-menu` était déjà installé (version 2.1.24).

### Structure du menu

Le `<Link href="/profile">` initial a été remplacé par `<DropdownMenu.Root>` :

```
DropdownMenu.Root
  DropdownMenu.Trigger  →  bouton 36×36 rounded-full (avatar ou initiale)
  DropdownMenu.Portal
    DropdownMenu.Content  →  bg-[#111318] border border-white/[0.08] shadow-2xl p-1.5
      [header]  nom + email
      Item → /profile         (icône User)
      Item → /library         (icône Library)
      Item → /settings        (icône Settings)
      Item → /dashboard       (icône Mic2)    si isArtist
      Item → /register?role=artist  (icône Star, violet)  si !isArtist
      Separator
      Item → logout()         (icône LogOut, rouge)
```

### Comportements Radix

- **Fermeture au clic extérieur** : natif Radix (pas de `useRef`/`addEventListener` manuel nécessaire).
- **Fermeture sur Escape** : natif Radix.
- **Focus accessible** : `data-[highlighted]` utilisé dans la classe CSS pour le style focus au clavier.
- **Animation** : classe `animate-slide-down` existante dans `globals.css` (keyframe `slideDown` 0.2s ease-out).
- **Alignement** : `align="end"` + `sideOffset={8}` pour positionner sous l'avatar à droite.
- **Focus ring** : `focus-visible:ring-2 focus-visible:ring-purple-500` sur le trigger.

### Items conditionnels selon le rôle

| Rôle | Item affiché |
|---|---|
| `ARTIST` ou `ADMIN` (`isArtist === true`) | "Espace Studio" → `/dashboard` |
| `USER` (`isArtist === false`) | "Devenir DJ" → `/register?role=artist` (en violet) |

`isArtist` vient directement de `useAuth()` (déjà calculé dans `AuthContext` : `user?.role === "ARTIST"`).

### Déconnexion

```tsx
<DropdownMenu.Item onSelect={() => logout()}>
  <LogOut /> Déconnexion
</DropdownMenu.Item>
```

`logout()` vient de `useAuth()` → appelle `authApi.logout()` puis `queryClient.clear()` → le composant réagit automatiquement au changement de `user` (devient `null`).

---

## Tâche 4.3 — Enrichissement du drawer mobile

Le drawer mobile (`mobileMenuOpen`) a été enrichi :

- **Ligne profil** : affiche le vrai avatar via `AvatarImage` (32×32) + nom + email (tronqués).
- **Liens ajoutés** :
  - Bibliothèque (`/library`) avec icône `Library`
  - Paramètres (`/settings`) avec icône `Settings`
  - Espace Studio (`/dashboard`) si `isArtist`, sinon Devenir DJ (`/register?role=artist`) avec icône `Star` violet
- **Bouton Déconnexion** : rouge (`text-red-400`), ferme le drawer et appelle `logout()`.
- Toutes les icônes lucide-react sont cohérentes avec le dropdown desktop.

---

## Classe CSS partagée pour les items

```tsx
const menuItemCls =
  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer outline-none data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white";
```

Cette constante est utilisée à la fois pour les `DropdownMenu.Item` (via `asChild` + `Link`) et comme base pour les variantes colorées (violet "Devenir DJ", rouge "Déconnexion").

---

## Points d'attention

- Aucune nouvelle librairie installée : `@radix-ui/react-dropdown-menu` et `lucide-react` étaient déjà présents.
- `next/image` importé pour `AvatarImage` — `Image` n'était pas importé dans le header avant cette modification.
- La route `/register?role=artist` existe (la page `/register` est présente) mais le query param `role=artist` n'est pas encore traité côté frontend. Le lien est valide et peut être enrichi dans un chantier futur.
- Le build passe sans aucun avertissement TypeScript.
