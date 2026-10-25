// Migre vers R2/S3 les fichiers uploadés en local (public/uploads) et met à jour leurs URL en base.
// Usage :
//   node scripts/migrate-uploads-to-r2.mjs           → simulation : liste ce qui serait migré
//   node scripts/migrate-uploads-to-r2.mjs --apply   → envoie les fichiers et réécrit les URL
// Prérequis : variables STORAGE_* (dont STORAGE_CDN_URL) et DATABASE_URL dans .env.local.
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

dotenv.config({ path: ".env.local", quiet: true });
const APPLY = process.argv.includes("--apply");

const { STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_BUCKET, STORAGE_CDN_URL } = process.env;
if (!STORAGE_ACCESS_KEY_ID || !STORAGE_SECRET_ACCESS_KEY || !STORAGE_BUCKET || !STORAGE_CDN_URL) {
  console.error("Variables STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_BUCKET et STORAGE_CDN_URL requises dans .env.local.");
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.STORAGE_REGION ?? "auto",
  endpoint: STORAGE_ENDPOINT,
  credentials: { accessKeyId: STORAGE_ACCESS_KEY_ID, secretAccessKey: STORAGE_SECRET_ACCESS_KEY },
  forcePathStyle: !!STORAGE_ENDPOINT,
});
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }), log: [] });
const CDN = STORAGE_CDN_URL.replace(/\/$/, "");

const MIME = {
  mp3: "audio/mpeg", wav: "audio/wav", aiff: "audio/aiff", flac: "audio/flac", ogg: "audio/ogg",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
};

// Champs d'URL susceptibles de pointer vers /uploads/
const TARGETS = [
  ["mix", ["coverUrl", "audioUrl"]],
  ["track", ["coverUrl", "audioUrl"]],
  ["album", ["coverUrl"]],
  ["artistProfile", ["avatarUrl", "bannerUrl"]],
  ["profile", ["avatarUrl"]],
  ["event", ["coverUrl"]],
  ["playlist", ["coverUrl"]],
];

let migrated = 0, missing = 0;
for (const [model, fields] of TARGETS) {
  const rows = await prisma[model].findMany({
    where: { OR: fields.map((f) => ({ [f]: { startsWith: "/uploads/" } })) },
    select: Object.fromEntries([["id", true], ...fields.map((f) => [f, true])]),
  });
  for (const row of rows) {
    const data = {};
    for (const field of fields) {
      const url = row[field];
      if (!url?.startsWith("/uploads/")) continue;
      const key = url.slice("/uploads/".length);
      const file = path.join("public", "uploads", ...key.split("/"));
      if (!fs.existsSync(file)) {
        console.log(`absent   ${model}.${field} ${url}`);
        missing++;
        continue;
      }
      const ext = key.split(".").pop().toLowerCase();
      console.log(`${APPLY ? "envoi   " : "à migrer"} ${model}.${field} ${key} (${(fs.statSync(file).size / 1024 / 1024).toFixed(1)} Mo)`);
      if (APPLY) {
        await s3.send(new PutObjectCommand({
          Bucket: STORAGE_BUCKET,
          Key: key,
          Body: fs.readFileSync(file),
          ContentType: MIME[ext] ?? "application/octet-stream",
          CacheControl: "public, max-age=31536000, immutable",
        }));
        data[field] = `${CDN}/${key}`;
        if (field === "audioUrl" && (model === "mix" || model === "track")) data.audioKey = key;
      }
      migrated++;
    }
    if (APPLY && Object.keys(data).length) await prisma[model].update({ where: { id: row.id }, data });
  }
}

console.log(`\n${migrated} fichier(s) ${APPLY ? "migré(s)" : "à migrer"}, ${missing} introuvable(s) en local.`);
if (!APPLY && migrated) console.log("Relancez avec --apply pour effectuer la migration.");
await prisma.$disconnect();
