# AfroMix

Plateforme de streaming de mixes DJ africains : écoute, profils DJ, booking, événements. Application installable (PWA), en français et en anglais.

En ligne : https://afromix.vercel.app

## Stack

- Next.js 16 (App Router), React, Tailwind CSS v4
- Prisma 7 et PostgreSQL (Neon)
- Fichiers : Vercel Blob (Cloudflare R2 ou S3 possibles, disque local en développement)
- Hébergement : Vercel, région Londres (`lhr1`), à côté de la base

## Démarrage

```bash
npm install
cp .env.example .env.local
npx prisma migrate deploy
npm run dev
```

Le site tourne sur http://localhost:3000. Sans service d'e-mail, les codes de vérification s'affichent dans la console du serveur. Sans stockage distant, les fichiers vont dans `public/uploads/`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | Lint |
| `npm run typecheck` | Vérification des types |
| `npx prisma migrate deploy` | Applique les migrations |
| `node scripts/create-admin.mjs` | Crée un compte administrateur |
| `node scripts/seed-database.mjs` | Ajoute les données de démonstration |

## Organisation

- `app/(frontend)` : pages et composants
- `app/(backend)/api/v1` : API
- `services` : logique métier
- `lib` : authentification, stockage, cache, e-mails, validation
- `prisma` : schéma et migrations
- `branding` : logo et vidéos de présentation

## Déploiement

Chaque push sur `main` déclenche un déploiement Vercel. Les migrations ne s'appliquent pas automatiquement : lancez `npx prisma migrate deploy` avant un déploiement qui en dépend. La base de développement est la même que celle de production.
