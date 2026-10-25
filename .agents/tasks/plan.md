# Plan d'implémentation — 4 Chantiers AfroMix

> **Build :** `npm run build`  
> **Dev :** `npm run dev`  
> **Lint :** `npm run lint`  
> **Framework :** Next.js 16.3.6 App Router · React 19 · TailwindCSS v4 · TanStack Query v5 · Radix UI · Zustand absent (state via Context/Provider)

---

## Chantier 1 — Persistance & synchronisation des Likes

### Analyse de l'existant

| Fichier | Problème constaté |
|---|---|
| `app/(frontend)/components/player/player-bar.tsx` ligne 36 | `const [liked, setLiked] = useState(false)` local, remis à `false` à chaque changement de piste (ligne 39 `useEffect`) |
| `app/(frontend)/(public)/mixes/[slug]/page.tsx` ligne 35 | `const [liked, setLiked] = useState(false)` — jamais initialisé depuis l'API |
| `app/(frontend)/components/cards/mix-card.tsx` ligne 44 | `const [liked, setLiked] = useState(initialLiked)` — dépend de la prop `isLiked` passée par le parent, mais les parents ne passent jamais `isLiked` |
| `services/mixes/index.ts` → `getMixBySlug` | Ne renvoie pas `isLiked: boolean` pour l'utilisateur connecté |
| `types/api.ts` → `MixDetail` | Pas de champ `isLiked` |
| `app/(frontend)/lib/api/social.ts` | `getUserLikes()` existe (`/users/[id]/likes`) mais pas de hook TanStack Query dédié |

**Patterns à reproduire :** `ArtistDetail.isFollowing` (renvoyé par `GET /api/v1/artists/[slug]`) et le `useEffect` qui sync le state local sur `data?.data?.isFollowing` dans `artists/[slug]/page.tsx` ligne 43–47.

**Mises à jour optimistes :** pattern standard TanStack Query v5 : `onMutate` → snapshot → update cache → retour en `onError`.

**Images sans fallback :** `MixCard` cover, `PlayerBar` cover desktop+mobile, `FullscreenPlayer` cover, `artists/[slug]/page.tsx` banner+avatar — tous utilisent `next/image` sans `onError`.

---

### Étapes d'implémentation

- [ ] **1.1 — Ajouter `isLiked` à l'API backend**

  Modifier `getMixBySlug` pour accepter un `userId` optionnel et interroger la table `Like`. Ajouter `isLiked` dans le type `MixDetail`. Modifier la route GET pour extraire l'utilisateur de la session et le passer au service.

  **Fichiers à modifier :**
  - `types/api.ts` → ajouter `isLiked?: boolean` dans `MixDetail`
  - `services/mixes/index.ts` → `getMixBySlug(slug, userId?: string)` : ajoute `prisma.like.findFirst({ where: { userId, mixId: mix.id } })` en parallèle, injecte `isLiked` dans `serializeMixDetail`
  - `app/(backend)/api/v1/mixes/[id]/route.ts` → dans `GET`, appelle `getSession()` et passe `session?.sub` à `getMixBySlug`

  **Vérification :** `npm run build` passe sans erreur TypeScript.

- [ ] **1.2 — Créer `useLikedMixIds` hook (TanStack Query)**

  Crée un hook qui charge tous les `mixId` likés par l'utilisateur connecté via `socialApi.getUserLikes(user.id, "MIX")` et retourne un `Set<string>`. Utilise `enabled: !!user` et `staleTime: 5 * 60 * 1000`. Exporter depuis `app/(frontend)/hooks/`.

  **Fichiers à créer :**
  - `app/(frontend)/hooks/use-liked-mix-ids.ts`

  ```ts
  // Résumé de la logique :
  // queryKey: ["liked-mix-ids", user.id]
  // queryFn: socialApi.getUserLikes(user.id, "MIX") → extraire les mix.id dans un Set<string>
  // enabled: !!user
  // staleTime: 5 * 60 * 1000
  // Retourne: { likedIds: Set<string>, isLoading }
  ```

  **Vérification :** `npm run build` passe.

- [ ] **1.3 — Synchroniser `MixCard` avec `useLikedMixIds` + optimistic update**

  Supprimer la dépendance à la prop `isLiked` (la garder comme fallback initial uniquement). Lire l'état réel depuis `useLikedMixIds`. Implémenter l'optimistic update dans `likeMutation` : `onMutate` inverse immédiatement le cache `["liked-mix-ids", user.id]`, `onError` restaure le snapshot.

  **Fichiers à modifier :**
  - `app/(frontend)/components/cards/mix-card.tsx`
    - Importer `useLikedMixIds`
    - `const { likedIds } = useLikedMixIds()`
    - `const liked = likedIds.has(mix.id)`  (remplace le `useState`)
    - Ajouter `onMutate` / `onError` / `onSettled` dans `likeMutation`

  **Vérification :** `npm run build` passe. Sur le navigateur : liker depuis la grille, naviguer vers une autre page et revenir → le cœur reste rose.

- [ ] **1.4 — Synchroniser la page détail mix avec `isLiked` + optimistic update**

  Initialiser l'état liked depuis `data.data.isLiked` retourné par l'API (step 1.1). Ajouter optimistic update identique à 1.3 + invalider `["liked-mix-ids"]`.

  **Fichiers à modifier :**
  - `app/(frontend)/(public)/mixes/[slug]/page.tsx`
    - Remplacer `useState(false)` par `useState(data?.data?.isLiked ?? false)`
    - Ajouter `useEffect(() => { setLiked(data?.data?.isLiked ?? false); }, [data?.data?.isLiked])`
    - Dans `likeMutation.onMutate` : flip optimiste local + invalider `["liked-mix-ids"]` dans `onSettled`

  **Vérification :** `npm run build` passe. Recharger la page d'un mix aimé → le cœur est déjà rose au premier rendu.

- [ ] **1.5 — Synchroniser `PlayerBar` et `FullscreenPlayer` avec `useLikedMixIds`**

  Supprimer le `useState(false)` du PlayerBar pour le like et le `useEffect` qui le reset. Lire l'état depuis `useLikedMixIds`. Le `FullscreenPlayer` reçoit déjà `liked` en prop depuis `PlayerBar` : la prop reste, seule la source change. Ajouter optimistic update dans `PlayerBar.likeMutation`.

  **Fichiers à modifier :**
  - `app/(frontend)/components/player/player-bar.tsx`
    - Supprimer lignes 36 (`useState(false)`) et 39–41 (`useEffect reset`)
    - Importer `useLikedMixIds`, dériver `const liked = likedIds.has(track?.id ?? "")`
    - Ajouter `onMutate`/`onError`/`onSettled` à `likeMutation`

  **Vérification :** `npm run build` passe. Écouter un mix aimé, recharger → cœur toujours rose dans le player.

- [ ] **1.6 — Fallbacks images (`onError` sur `next/image`)**

  Sur chaque `<Image>` sans `onError`, ajouter un handler `onError` qui bascule sur un placeholder. Utiliser un `useState` local `imgError` par image ; si `imgError`, afficher le `<div>` placeholder déjà présent dans chaque composant (gradient + emoji).

  **Fichiers à modifier :**
  - `app/(frontend)/components/cards/mix-card.tsx` — cover du mix
  - `app/(frontend)/components/player/player-bar.tsx` — cover desktop (ligne ~110) et cover mobile (ligne ~224)
  - `app/(frontend)/components/player/fullscreen-player.tsx` — artwork (ligne ~140)
  - `app/(frontend)/(public)/artists/[slug]/page.tsx` — banner + avatar

  Pattern à appliquer sur chaque `<Image>` concerné :
  ```tsx
  const [imgErr, setImgErr] = useState(false);
  // …
  {coverUrl && !imgErr ? (
    <Image src={coverUrl} … onError={() => setImgErr(true)} />
  ) : (
    <div className="…placeholder…" />
  )}
  ```

  **Vérification :** `npm run build` passe. Remplacer temporairement une URL d'image par une URL cassée → placeholder s'affiche, pas d'erreur console.

---

## Chantier 2 — Media Session API + persistance lecteur (localStorage)

### Analyse de l'existant

| Élément | Constat |
|---|---|
| `app/(frontend)/providers/player-provider.tsx` | Gère `<Audio>` en `useRef`, events `timeupdate`, `durationchange`, `ended`, `canplay`, `waiting`. C'est **l'unique point d'injection** pour `navigator.mediaSession`. |
| `useLocalStorage` | Hook générique existe dans `app/(frontend)/hooks/use-local-storage.ts`. Il gère le SSR (`typeof window === "undefined"`). |
| `PlayerProvider` state | `track`, `queue`, `queueIndex`, `volume`, `currentTime` → tout ce qu'il faut sauvegarder. |
| SSR | Le provider est `"use client"` → pas de problème SSR pour `localStorage`. |
| `navigator.mediaSession` | API browser-only → vérifier `typeof navigator !== "undefined" && "mediaSession" in navigator`. |

---

### Étapes d'implémentation

- [ ] **2.1 — Intégration Media Session API dans `PlayerProvider`**

  Ajouter un `useEffect` qui se déclenche à chaque changement de `track`. Il met à jour `navigator.mediaSession.metadata` (titre, artiste, artwork) et définit les `actionHandlers` (play, pause, nexttrack, previoustrack, seekbackward, seekforward).

  **Fichiers à modifier :**
  - `app/(frontend)/providers/player-provider.tsx`

  Ajouter après le bloc des `useCallback` existants, avant le `return` :

  ```ts
  // Media Session — mise à jour à chaque changement de piste
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist.stageName,
      album: "AfroMix",
      artwork: track.coverUrl
        ? [{ src: track.coverUrl, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
    navigator.mediaSession.setActionHandler("play", () => resume());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    navigator.mediaSession.setActionHandler("seekbackward", (d) => seek(Math.max(0, currentTime - (d.seekOffset ?? 10))));
    navigator.mediaSession.setActionHandler("seekforward", (d) => seek(currentTime + (d.seekOffset ?? 10)));
  }, [track, currentTime, resume, pause, next, prev, seek]);
  ```

  **Vérification :** `npm run build` passe. Sur Android Chrome ou iOS Safari, lancer un mix → titre + pochette visibles sur l'écran de verrouillage.

- [ ] **2.2 — Persistance de l'état du lecteur dans `localStorage`**

  Clé : `afromix_player_state`. Sauvegarder : `{ currentTrackId, queue (PlayerTrack[]), queueIndex, volume }`. Ne **pas** sauvegarder `currentTime` (la position exacte est moins utile et peut devenir stale). À la restauration, charger la piste en **pause** (ne pas auto-play) pour respecter les politiques autoplay des navigateurs.

  **Fichiers à modifier :**
  - `app/(frontend)/providers/player-provider.tsx`

  a) Ajouter un `useEffect` de **sauvegarde** : se déclenche quand `track`, `queue`, `queueIndex` ou `volume` changent ; écrit dans `localStorage` uniquement si `track !== null`.

  ```ts
  useEffect(() => {
    if (!track) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("afromix_player_state", JSON.stringify({
        currentTrackId: track.id,
        queue,
        queueIndex,
        volume,
      }));
    } catch {}
  }, [track, queue, queueIndex, volume]);
  ```

  b) Ajouter un `useEffect` de **restauration** qui s'exécute **une seule fois** au mount (tableau de dépendances vide). Lire le localStorage, valider les champs, appeler `setQueue`, `setQueueIndex`, `setTrack`, `setVolumeState`. Mettre `audio.src` mais **ne pas** appeler `audio.play()` → l'utilisateur reprend manuellement.

  ```ts
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("afromix_player_state");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved.queue?.length || !saved.currentTrackId) return;
      const idx = Math.max(0, Math.min(saved.queueIndex ?? 0, saved.queue.length - 1));
      const t = saved.queue[idx] as PlayerTrack;
      if (!t?.audioUrl) return;
      setQueue(saved.queue);
      setQueueIndex(idx);
      setTrack(t);
      const vol = typeof saved.volume === "number" ? saved.volume : 0.8;
      setVolumeState(vol);
      if (audioRef.current) {
        audioRef.current.src = t.audioUrl;
        audioRef.current.volume = vol;
        // Ne pas appeler .play() → lecture en pause restaurée
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // une seule fois au mount
  ```

  > **Note :** Ce `useEffect` doit se placer **après** le `useEffect` d'init de `<Audio>` (qui crée `audioRef.current`), donc dans le code le placer après le premier `useEffect` du composant.

  **Vérification :** `npm run build` passe. Lancer un mix, recharger la page → le mini-player réapparaît en pause avec la bonne pochette et le bon titre.

- [ ] **2.3 — Raccourcis clavier globaux (Desktop)**

  Ajouter un `useEffect` dans `PlayerBar` (ou dans un nouveau hook `usePlayerKeyboard`) qui écoute `keydown` sur `window`. Conditionner au fait qu'aucun input/textarea n'est focusé (`document.activeElement`).

  **Fichiers à modifier :**
  - `app/(frontend)/components/player/player-bar.tsx`

  ```ts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(Math.max(0, currentTime - 10));
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case "m":
        case "M":
          toggleMute();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seek, setVolume, toggleMute, currentTime, volume]);
  ```

  **Vérification :** `npm run build` passe. Appuyer sur Espace → play/pause. Flèches ← → → seek ±10s. M → mute.

---

## Chantier 3 — Correctif alignement mobile mini-player / BottomNav

### Analyse de l'existant

| Élément | Valeur trouvée |
|---|---|
| Mini-player mobile position | `bottom-14` (= 56px) dans `player-bar.tsx` ligne ~212 |
| `BottomNav` hauteur | `h-15` (= 60px) + `pb-safe` dans `bottom-nav.tsx` ligne ~9 |
| `pb-safe` | Défini dans `globals.css` : `.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }` |
| `bottom-safe` utilitaire | **Absent** du CSS et de Tailwind config |

**Diagnostic :** `bottom-14` = 56px est inférieur à la hauteur réelle de la BottomNav (60px + safe-area). Sur iPhone avec barre de navigation système (env ≈ 34px), la BottomNav mesure effectivement 94px mais le mini-player ne recule que de 56px → chevauchement de ~38px.

**Solution retenue :** Utiliser une valeur CSS calculée avec `env(safe-area-inset-bottom)` via une classe Tailwind arbitraire ou ajouter un utilitaire CSS dans `globals.css`. La solution la plus maintenable est d'ajouter une variable CSS `--bottom-nav-height` dans `:root` et d'utiliser `bottom-[var(--bottom-nav-height)]`.

---

### Étapes d'implémentation

- [ ] **3.1 — Ajouter la variable CSS `--bottom-nav-height`**

  Dans `globals.css`, ajouter dans `:root` :

  ```css
  --bottom-nav-h: calc(3.75rem + env(safe-area-inset-bottom, 0px));
  /* 3.75rem = h-15 = 60px */
  ```

  **Fichiers à modifier :**
  - `app/(frontend)/globals.css` — dans le bloc `:root { … }`

  **Vérification :** La variable est visible dans DevTools sous `:root`.

- [ ] **3.2 — Corriger la position du mini-player**

  Remplacer `bottom-14` par `bottom-[var(--bottom-nav-h)]` dans le conteneur du mini-player mobile.

  **Fichiers à modifier :**
  - `app/(frontend)/components/player/player-bar.tsx`

  Ligne ~212 :
  ```tsx
  // Avant
  <div className="lg:hidden fixed bottom-14 left-0 right-0 z-40">
  // Après
  <div className="lg:hidden fixed bottom-[var(--bottom-nav-h)] left-0 right-0 z-40">
  ```

  **Vérification :** `npm run build` passe. Sur un simulateur iOS 17 ou Android Chrome avec la barre système visible, le mini-player est collé exactement au-dessus de la BottomNav sans chevauchement.

- [ ] **3.3 — Ajuster le padding bas du contenu principal (layout)**

  Le `<main>` a `pb-40 lg:pb-32`. Sur mobile avec safe-area, `pb-40` (160px) peut être insuffisant si le mini-player est actif. Utiliser également `env(safe-area-inset-bottom)` dans le layout.

  **Fichiers à modifier :**
  - `app/(frontend)/layout.tsx`

  ```tsx
  // Avant
  <main className="flex-1 overflow-y-auto pb-40 lg:pb-32">
  // Après
  <main className="flex-1 overflow-y-auto pb-[calc(10rem+env(safe-area-inset-bottom,0px))] lg:pb-32">
  ```

  **Vérification :** `npm run build` passe. Sur iOS, le contenu du bas n'est pas masqué derrière le player ou la barre système.

---

## Chantier 4 — Menu dropdown header + affichage avatar

### Analyse de l'existant

| Élément | Constat |
|---|---|
| Radix `@radix-ui/react-dropdown-menu` | **Déjà installé** (`package.json` ligne `"@radix-ui/react-dropdown-menu": "2.1.24"`) |
| `user.profile.avatarUrl` | Présent dans `MeResponse` (`app/(frontend)/lib/api/auth.ts` ligne 7) mais **jamais utilisé** dans `header.tsx` — seul `user.profile?.displayName?.[0]` est affiché |
| `logout()` | Disponible dans `useAuth()` via `AuthContext` → `authApi.logout()` |
| Routes existantes | `/profile`, `/library`, `/playlists`, `/notifications`, `/settings`, `/dashboard`, `/upload` — toutes confirmées dans `app/(frontend)/` |
| Header actuel | Le `<Link href="/profile">` (ligne ~78) enveloppe directement le cercle avatar |
| `user.role` | `"USER" \| "ARTIST" \| "ADMIN"` disponible dans `MeResponse` |

**Solution retenue :** Remplacer le `<Link>` avatar par un `<DropdownMenu>` Radix UI (déjà installé). Afficher la photo de profil si `avatarUrl` est défini, sinon garder l'initiale. Items du menu dépendent du `user.role`.

---

### Étapes d'implémentation

- [ ] **4.1 — Afficher l'avatar réel dans le header (desktop + mobile menu)**

  Remplacer le cercle initiale par une logique conditionnelle : si `user.profile?.avatarUrl`, afficher `<Image>` avec `onError` fallback sur l'initiale.

  **Fichiers à modifier :**
  - `app/(frontend)/components/layout/header.tsx`

  Pattern pour le bouton avatar (desktop, ligne ~78) :
  ```tsx
  <div className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0 …">
    {user.profile?.avatarUrl && !avatarErr ? (
      <Image
        src={user.profile.avatarUrl}
        alt={user.profile.displayName ?? ""}
        width={36} height={36}
        className="object-cover w-full h-full"
        onError={() => setAvatarErr(true)}
      />
    ) : (
      <span className="…gradient background…">
        {user.profile?.displayName?.[0]?.toUpperCase() ?? "?"}
      </span>
    )}
  </div>
  ```

  Même logique dans le mobile menu drawer (ligne ~110 du même fichier).

  **Vérification :** `npm run build` passe. Utilisateur avec avatar → photo visible. Utilisateur sans avatar → initiale.

- [ ] **4.2 — Transformer l'avatar en `DropdownMenu` Radix UI (Desktop)**

  Remplacer le `<Link href="/profile">` par un `<DropdownMenu.Root>`. Le trigger est le cercle avatar. Le contenu du menu varie selon le rôle :

  **Items communs (tous les rôles) :**
  - Mon Profil → `/profile`
  - Mes Favoris & Playlists → `/library`
  - Paramètres → `/settings`
  - Déconnexion (bouton, appelle `logout()`)

  **Items conditionnels :**
  - Si `isArtist` : "Espace Studio" → `/dashboard`
  - Si `!isArtist && role === "USER"` : "Devenir DJ" → `/register?role=artist` (ou `/settings` si la page settings gère cela)

  **Fichiers à modifier :**
  - `app/(frontend)/components/layout/header.tsx`

  Imports à ajouter :
  ```tsx
  import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
  import { LogOut, User, Library, Settings, Mic2, Star } from "lucide-react";
  ```

  Structure JSX :
  ```tsx
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button className="h-9 w-9 rounded-full … focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500">
        {/* avatar ou initiale */}
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={8}
        className="z-50 min-w-[200px] rounded-2xl bg-[#111318] border border-white/[0.08] shadow-2xl p-1.5 animate-slide-down"
      >
        {/* Header du menu : nom + email */}
        <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
          <p className="text-sm font-semibold text-white">{user.profile?.displayName}</p>
          <p className="text-xs text-zinc-500 truncate">{user.email}</p>
        </div>
        <DropdownMenu.Item asChild>
          <Link href="/profile" className="…">
            <User className="h-4 w-4" /> Mon Profil
          </Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild>
          <Link href="/library" className="…">
            <Library className="h-4 w-4" /> Favoris & Playlists
          </Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild>
          <Link href="/settings" className="…">
            <Settings className="h-4 w-4" /> Paramètres
          </Link>
        </DropdownMenu.Item>
        {isArtist && (
          <DropdownMenu.Item asChild>
            <Link href="/dashboard" className="…">
              <Mic2 className="h-4 w-4" /> Espace Studio
            </Link>
          </DropdownMenu.Item>
        )}
        {!isArtist && (
          <DropdownMenu.Item asChild>
            <Link href="/register?role=artist" className="… text-purple-400">
              <Star className="h-4 w-4" /> Devenir DJ
            </Link>
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Separator className="my-1 h-px bg-white/[0.06]" />
        <DropdownMenu.Item
          className="… text-red-400 hover:text-red-300 cursor-pointer"
          onSelect={() => logout()}
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
  ```

  **Vérification :** `npm run build` passe. Cliquer sur l'avatar → menu s'ouvre. Cliquer en dehors → se ferme. Déconnexion → redirige vers `/`.

- [ ] **4.3 — Conserver et enrichir le mobile menu drawer avec l'avatar**

  Le mobile menu drawer (`mobileMenuOpen`) existe déjà dans `header.tsx`. Mettre à jour le bloc d'affichage du profil (ligne ~110) pour afficher la photo de profil (même logique step 4.1) et ajouter les mêmes liens que dans le dropdown desktop.

  **Fichiers à modifier :**
  - `app/(frontend)/components/layout/header.tsx` — mobile menu section

  Ajouter dans le drawer mobile connecté :
  - Le vrai avatar (photo ou initiale)
  - Lien `/settings`
  - Lien `/dashboard` (si artiste) ou `/register?role=artist` (si USER)
  - Bouton "Déconnexion" qui appelle `logout()` et `setMobileMenuOpen(false)`

  **Vérification :** `npm run build` passe. Sur mobile, ouvrir le menu → bouton déconnexion visible et fonctionnel.

---

## Ordre d'implémentation recommandé

```
Chantier 3 (step 3.1 → 3.2 → 3.3)   ← le plus petit, risque zéro, fix CSS pur
Chantier 1 (step 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6)   ← impact fonctionnel fort
Chantier 2 (step 2.1 → 2.2 → 2.3)   ← enrichissement expérience
Chantier 4 (step 4.1 → 4.2 → 4.3)   ← UI pure, aucun impact backend
```

**Raison :** Le Chantier 3 est indépendant et ne touche qu'à 2 fichiers (CSS + PlayerBar). Les Chantiers 1 et 2 touchent tous deux au `PlayerProvider` et aux hooks — les faire dans cet ordre évite des conflits. Le Chantier 4 est entièrement dans `header.tsx` et peut être fait en dernier sans bloquer les autres.

---

## Points d'attention par chantier

### Chantier 1
- La mutation `getUserLikes` pagine (pageSize 20 par défaut). Si un utilisateur a plus de 20 likes, `useLikedMixIds` ne les récupérera pas tous. Pour un MVP, `pageSize=200` est acceptable. À terme : pagination infinie ou endpoint dédié `/users/me/liked-ids`.
- Le cache Redis de `getMixBySlug` (TTL 300s) stocke la version **sans** `isLiked` (qui est user-specific). Il ne faut **pas** mettre `isLiked` dans le cache Redis — le calculer à chaque requête après lecture du cache, ou exclure `isLiked` du cache.

### Chantier 2
- `navigator.mediaSession` n'est pas supporté sur tous les navigateurs (pas sur Firefox desktop). L'implémentation doit être derrière une vérification `"mediaSession" in navigator`.
- La restauration au mount doit s'exécuter **après** la création de `audioRef.current` (le premier `useEffect`). L'ordre des `useEffect` dans React correspond à l'ordre de déclaration dans le composant → placer le `useEffect` de restauration **après** le bloc init audio.
- Ne jamais appeler `audio.play()` dans la restauration → les navigateurs bloquent l'autoplay sans interaction utilisateur.

### Chantier 3
- `h-15` en TailwindCSS v4 = `height: calc(15 * 0.25rem)` = `3.75rem` = `60px`. Confirmer que `h-15` est bien défini (TailwindCSS v4 génère toutes les valeurs spacing à la demande).
- La classe arbitraire `bottom-[var(--bottom-nav-h)]` fonctionne en TailwindCSS v4 sans configuration supplémentaire.

### Chantier 4
- `@radix-ui/react-dropdown-menu` est déjà dans `package.json` → aucune installation requise.
- Le `logout()` dans le contexte Auth appelle `authApi.logout()` puis `queryClient.clear()` → pas besoin de `router.push("/")` manuellement si la page réagit au changement de `user` (ce qui est le cas via `useAuth`).
- Pas de `next-auth` → pas de `signOut()` à importer. Le logout custom via `authApi` est la seule méthode.
- La route `/register?role=artist` ne traite peut-être pas encore le query param `role`. Si ce n'est pas le cas, pointer vers `/settings` ou créer une page `/become-artist` — laisser cette décision à l'implémenteur selon l'état de la page `/register`.
