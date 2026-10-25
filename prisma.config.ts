import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Charge .env.local (Next.js convention) pour que le CLI Prisma
// ait accès aux variables DATABASE_URL_UNPOOLED et DATABASE_URL.
config({ path: ".env.local" });

// Prisma 7 — l'URL de connexion n'est plus dans schema.prisma.
// On utilise l'URL directe (sans PgBouncer) pour les migrations,
// car Neon pooler ne supporte pas les transactions longues de migration.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
