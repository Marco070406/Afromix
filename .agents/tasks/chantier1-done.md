# Chantier 1 — Persistance & synchronisation des Likes ✅

> Commit : `feat: global like persistence, optimistic updates, image fallbacks`  
> Build : `npm run build` → ✓ sans erreur TypeScript

---

## Fichiers modifiés

| Fichier | Nature des changements |
|---|---|
| `types/api.ts` | Ajout de `isLiked?: boolean` dans `MixDetail` |
| `services/mixes/index.ts` | `getMixBySlug(slug, userId?)` vérifie la table `Like` de Prisma et injecte `isLiked` |
| `app/(backend)/api/v1/mixes/[id]/route.ts` | Récupère la session utilisateur et transmet `userId` à `getMixBySlug` |
| `app/(frontend)/hooks/use-liked-mix-ids.ts` | Création du hook TanStack Query avec gestion du cache, optimistic update et rollback |
| `app/(frontend)/components/cards/mix-card.tsx` | Migration de `useState(false)` vers `useLikedMixIds`, optimistic update, fallback image `onError` |
| `app/(frontend)/(public)/mixes/[slug]/page.tsx` | Initialisation via `data?.data?.isLiked`, synchronisation avec `useLikedMixIds`, optimistic update |
| `app/(frontend)/components/player/player-bar.tsx` | Dérivation de l'état `liked` via `useLikedMixIds`, suppression du reset local, fallback cover image |
| `app/(frontend)/components/player/fullscreen-player.tsx` | Like synchronisé via `useLikedMixIds`, fallback image de cover |
| `app/(frontend)/components/cards/track-row.tsx` | Migration du bouton like de piste vers `useLikedMixIds` pour la persistance |

---

## Tâche 1a — API backend et typage

- Ajout de la propriété optionnelle `isLiked?: boolean` sur `MixDetail` dans `types/api.ts`.
- `services/mixes/index.ts` : vérification optimisée de l'existence d'un enregistrement `Like` associé au `userId` et `mixId`. Exclut `isLiked` du cache public partagé pour garantir l'isolation des utilisateurs.
- Route GET `/api/v1/mixes/[id]` : extraction du token/session utilisateur et passage transparent de `userId` au service de mix.

---

## Tâche 1b — Hook global `useLikedMixIds`

- Clé de requête : `["liked-mix-ids", user?.id]` avec `staleTime: 5 * 60 * 1000`.
- Requête paginée (`pageSize: 200`) vers l'API des likes utilisateur, conversion en `Set<string>`.
- Mutation avec Optimistic Update :
  - `onMutate` : clone du `Set` en mémoire et inversion instantanée de l'ID du mix.
  - `onError` : restauration du snapshot précédent en cas d'échec réseau.
  - `onSettled` : invalidation de la query pour garantir la cohérence serveur.

---

## Tâche 1c — Intégration sur les composants UI

- **`MixCard`** : lecture directe depuis `likedIds.has(mix.id)`. La prop `isLiked` est marquée `@deprecated` pour compatibilité ascendante.
- **`mixes/[slug]/page.tsx`** : synchronisé au montage avec les données serveur puis piloté par la mutation optimiste.
- **`PlayerBar` & `FullscreenPlayer`** : le like reflète en temps réel la piste ou le mix en cours d'écoute.
- **`TrackRow`** : connecté à `useLikedMixIds` pour assurer la persistance et la réactivité du like sur chaque morceau.

---

## Tâche 1d — Fallbacks d'images (`onError`)

- Gestion des erreurs de chargement d'image sur `MixCard`, `PlayerBar`, `FullscreenPlayer` et les pochettes de pistes pour afficher un placeholder avec gradient sans casser le layout.
