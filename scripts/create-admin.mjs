// Crée ou met à jour le compte administrateur.
// Usage : ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/create-admin.mjs
// Le mot de passe n'est jamais écrit dans le code : un mot de passe versionné
// donnerait l'accès admin à quiconque lit le dépôt.
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

dotenv.config({ path: ".env.local", quiet: true });

const email = (process.env.ADMIN_EMAIL ?? "admin@afromix.io").toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";

const strong = password.length >= 14 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
if (!strong) {
  console.error("ADMIN_PASSWORD requis : 14 caractères minimum, avec majuscule, minuscule et chiffre.");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter, log: [] });

const hash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
  where: { email },
  update: { role: "ADMIN", passwordHash: hash, deletedAt: null },
  create: {
    email,
    passwordHash: hash,
    role: "ADMIN",
    profile: { create: { displayName: "Admin AfroMix" } },
  },
});
console.log("Admin :", user.id, user.email, user.role);
await prisma.$disconnect();
