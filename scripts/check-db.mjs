import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter, log: [] });

async function main() {
  const [users, artists, mixes, tracks, events, playlists] = await Promise.all([
    prisma.user.count(),
    prisma.artistProfile.count(),
    prisma.mix.count(),
    prisma.track.count(),
    prisma.event.count(),
    prisma.playlist.count(),
  ]);

  console.log({ users, artists, mixes, tracks, events, playlists });

  if (artists > 0) {
    const sampleArtists = await prisma.artistProfile.findMany({ take: 3, select: { stageName: true, country: true, slug: true } });
    console.log("Sample artists:", sampleArtists);
  }

  if (mixes > 0) {
    const sampleMixes = await prisma.mix.findMany({ take: 3, select: { title: true, genre: true, slug: true } });
    console.log("Sample mixes:", sampleMixes);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
