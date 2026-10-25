import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

async function main() {
  console.log("🌱 Starting real AfroMix database seed...");

  const defaultPasswordHash = await bcrypt.hash("AfroMix2026!", 10);

  const artistsData = [
    {
      email: "dj.kairo@afromix.io",
      displayName: "DJ Kairo",
      stageName: "DJ Kairo",
      slug: "dj-kairo",
      country: "TG",
      city: "Lomé",
      bio: "Pionnier de l'Afrobeats et de l'Amapiano au Togo. Résident des plus grands clubs de Lomé et producteur certifié.",
      genres: ["AFROBEATS", "AMAPIANO"],
      followerCount: 14200,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      bannerUrl: "/images/hero.jpg",
    },
    {
      email: "dj.mansa@afromix.io",
      displayName: "DJ Mansa",
      stageName: "DJ Mansa",
      slug: "dj-mansa",
      country: "GH",
      city: "Accra",
      bio: "L'artisan des nuits chaudes d'Osu. Fusion unique entre Highlife traditionnel et rythmes afro contemporains.",
      genres: ["HIGHLIFE", "AFROBEATS"],
      followerCount: 28500,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
      bannerUrl: "/images/hero.jpg",
    },
    {
      email: "dj.zina@afromix.io",
      displayName: "DJ Zina",
      stageName: "DJ Zina",
      slug: "dj-zina",
      country: "CI",
      city: "Abidjan",
      bio: "Reine de l'Afro House et du Coupé-Décalé futuriste à Abidjan. Ambassadrice de la créativité ivoirienne.",
      genres: ["AFRO_HOUSE", "KUDURO"],
      followerCount: 34100,
      avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80",
      bannerUrl: "/images/hero.jpg",
    },
    {
      email: "dj.lagos@afromix.io",
      displayName: "DJ Lagos",
      stageName: "DJ Lagos",
      slug: "dj-lagos",
      country: "NG",
      city: "Lagos",
      bio: "Le son brut et frénétique des nuits de Victoria Island. Top DJ nigérian aux millions de streams cumulés.",
      genres: ["AFROBEATS", "DANCEHALL"],
      followerCount: 52000,
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
      bannerUrl: "/images/hero.jpg",
    },
    {
      email: "dj.amara@afromix.io",
      displayName: "DJ Amara",
      stageName: "DJ Amara",
      slug: "dj-amara",
      country: "SN",
      city: "Dakar",
      bio: "Groove profond de la corniche dakaroise. Spécialiste Afro Soul, Sabar et sonorités sahéliennes.",
      genres: ["AFRO_SOUL", "RUMBA"],
      followerCount: 19800,
      avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
      bannerUrl: "/images/hero.jpg",
    },
    {
      email: "dj.naya@afromix.io",
      displayName: "DJ Naya",
      stageName: "DJ Naya",
      slug: "dj-naya",
      country: "CM",
      city: "Douala",
      bio: "Énergie pure du Cameroun, fusionnant Ndombolo, Makossa et beats afro contemporains.",
      genres: ["AFROBEATS", "NDOMBOLO"],
      followerCount: 22400,
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
      bannerUrl: "/images/hero.jpg",
    },
    {
      email: "dj.jozi@afromix.io",
      displayName: "DJ Jozi",
      stageName: "DJ Jozi",
      slug: "dj-jozi",
      country: "ZA",
      city: "Johannesburg",
      bio: "Maître absolu des log-drums amapiano de Soweto. En tournée permanente à travers le continent.",
      genres: ["AMAPIANO", "AFRO_HOUSE"],
      followerCount: 41200,
      avatarUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&auto=format&fit=crop&q=80",
      bannerUrl: "/images/hero.jpg",
    },
  ];

  const createdArtists = {};

  for (const art of artistsData) {
    const user = await prisma.user.upsert({
      where: { email: art.email },
      update: {
        role: "ARTIST",
        profile: {
          upsert: {
            create: { displayName: art.displayName, country: art.country, city: art.city, bio: art.bio, avatarUrl: art.avatarUrl },
            update: { displayName: art.displayName, country: art.country, city: art.city, bio: art.bio, avatarUrl: art.avatarUrl },
          },
        },
      },
      create: {
        email: art.email,
        passwordHash: defaultPasswordHash,
        role: "ARTIST",
        profile: {
          create: { displayName: art.displayName, country: art.country, city: art.city, bio: art.bio, avatarUrl: art.avatarUrl },
        },
      },
    });

    const artistProfile = await prisma.artistProfile.upsert({
      where: { slug: art.slug },
      update: {
        stageName: art.stageName,
        bio: art.bio,
        country: art.country,
        city: art.city,
        genres: art.genres,
        avatarUrl: art.avatarUrl,
        bannerUrl: art.bannerUrl,
        verified: true,
        verificationStatus: "VERIFIED",
        followerCount: art.followerCount,
      },
      create: {
        userId: user.id,
        slug: art.slug,
        stageName: art.stageName,
        bio: art.bio,
        country: art.country,
        city: art.city,
        genres: art.genres,
        avatarUrl: art.avatarUrl,
        bannerUrl: art.bannerUrl,
        verified: true,
        verificationStatus: "VERIFIED",
        followerCount: art.followerCount,
      },
    });

    createdArtists[art.slug] = artistProfile;
    console.log(`✅ DJ/Artist: ${art.stageName} (${art.country})`);
  }

  // Real Mixes with audio preview & realistic play metrics
  const mixesData = [
    {
      slug: "afro-sunset-session-12",
      title: "Afro Sunset Session #12",
      description: "Une odyssée chaleureuse mêlant Afrobeats langoureux, percussions organiques et mélodies solaires pour accompagner le coucher du soleil.",
      artistSlug: "dj-kairo",
      genre: "AFROBEATS",
      mixType: "DJ_MIX",
      coverUrl: "/images/cover-sunset.jpg",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      durationSec: 3720,
      playCount: 284500,
      likeCount: 19200,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      tags: ["Afrobeats", "Sunset", "Lomé", "Chill", "Vibes"],
    },
    {
      slug: "accra-after-dark",
      title: "Accra After Dark",
      description: "La vibration nocturne d'Osu et d'Airport City. Highlife boosté à la basse 808 et afro-fusion percutante.",
      artistSlug: "dj-mansa",
      genre: "HIGHLIFE",
      mixType: "LIVE_SET",
      coverUrl: "/images/hero.jpg",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      durationSec: 4210,
      playCount: 154200,
      likeCount: 11400,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      tags: ["Highlife", "Nightlife", "Accra", "Club"],
    },
    {
      slug: "jozi-piano-ritual",
      title: "Jozi Piano Ritual",
      description: "Les log-drums les plus profonds de Johannesburg. Une immersion totale de 60 minutes dans la culture Amapiano pure.",
      artistSlug: "dj-jozi",
      genre: "AMAPIANO",
      mixType: "DJ_MIX",
      coverUrl: "/images/cover-amapiano.jpg",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      durationSec: 3600,
      playCount: 322400,
      likeCount: 26800,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
      tags: ["Amapiano", "Jozi", "LogDrum", "DeepHouse"],
    },
    {
      slug: "no-sleep-in-lagos",
      title: "No Sleep in Lagos",
      description: "L'énergie brute des clubs d'Ikoyi et d'Ikeja. BPM soutenu, transitions millimétrées et hymnes afrobeats de l'année.",
      artistSlug: "dj-lagos",
      genre: "AFROBEATS",
      mixType: "DJ_SET",
      coverUrl: "/images/cover-lagos.jpg",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      durationSec: 4890,
      playCount: 298100,
      likeCount: 24100,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      tags: ["Lagos", "Party", "Afrobeats", "Banger"],
    },
    {
      slug: "abidjan-minuit",
      title: "Abidjan Minuit",
      description: "Atmosphère électrique des nuits ivoiriennes. Percussions d'Afrique de l'Ouest et basse Afro House envoutante.",
      artistSlug: "dj-zina",
      genre: "AFRO_HOUSE",
      mixType: "DJ_MIX",
      coverUrl: "/images/cover-sunset.jpg",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      durationSec: 3450,
      playCount: 187600,
      likeCount: 14900,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      tags: ["AfroHouse", "Abidjan", "Dance", "Groove"],
    },
    {
      slug: "onde-dakaroise",
      title: "Onde Dakaroise",
      description: "Une balade sonore entre tradition et modernité avec la brise de l'Océan Atlantique et les voix d'or du Sénégal.",
      artistSlug: "dj-amara",
      genre: "AFRO_SOUL",
      mixType: "DJ_MIX",
      coverUrl: "/images/cover-amapiano.jpg",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
      durationSec: 3120,
      playCount: 96800,
      likeCount: 7800,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      tags: ["AfroSoul", "Dakar", "Sabar", "Chill"],
    },
    {
      slug: "douala-fever-mix",
      title: "Douala Fever Mix",
      description: "Rythmes Makossa et Ndombolo survoltés pour faire trembler les enceintes de Bonanjo jusqu'à Akwa.",
      artistSlug: "dj-naya",
      genre: "NDOMBOLO",
      mixType: "DJ_SET",
      coverUrl: "/images/cover-lagos.jpg",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
      durationSec: 3340,
      playCount: 112000,
      likeCount: 8900,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
      tags: ["Ndombolo", "Cameroun", "Douala", "Party"],
    },
  ];

  for (const mix of mixesData) {
    const artist = createdArtists[mix.artistSlug];
    if (!artist) continue;

    await prisma.mix.upsert({
      where: { slug: mix.slug },
      update: {
        title: mix.title,
        description: mix.description,
        genre: mix.genre,
        mixType: mix.mixType,
        coverUrl: mix.coverUrl,
        audioUrl: mix.audioUrl,
        durationSec: mix.durationSec,
        playCount: mix.playCount,
        likeCount: mix.likeCount,
        status: mix.status,
        publishedAt: mix.publishedAt,
        tags: mix.tags,
      },
      create: {
        slug: mix.slug,
        title: mix.title,
        description: mix.description,
        genre: mix.genre,
        mixType: mix.mixType,
        coverUrl: mix.coverUrl,
        audioUrl: mix.audioUrl,
        durationSec: mix.durationSec,
        playCount: mix.playCount,
        likeCount: mix.likeCount,
        status: mix.status,
        publishedAt: mix.publishedAt,
        tags: mix.tags,
        artistId: artist.id,
      },
    });

    console.log(`🎵 Mix seeded: ${mix.title} (${mix.genre})`);
  }

  // 3 Events
  const eventsData = [
    {
      title: "Lomé Night Pulse",
      description: "La grande soirée Afrobeats & Amapiano au cœur de la capitale togolaise avec DJ Kairo et invités internationaux.",
      venue: "Le Patio Lounge & Garden",
      city: "Lomé",
      country: "Togo",
      startAt: new Date("2026-10-15T21:00:00Z"),
      endAt: new Date("2026-10-16T05:00:00Z"),
      ticketUrl: "https://tickets.afromix.io/lome-pulse",
      coverUrl: "/images/hero.jpg",
      artistSlug: "dj-kairo",
    },
    {
      title: "Accra Music Week",
      description: "Le festival annuel célébrant l'afro-fusion, le highlife et les nouveaux talents ghanéens sur 3 scènes géantes.",
      venue: "Black Star Square",
      city: "Accra",
      country: "Ghana",
      startAt: new Date("2026-10-24T18:00:00Z"),
      endAt: new Date("2026-10-25T04:00:00Z"),
      ticketUrl: "https://tickets.afromix.io/accra-music-week",
      coverUrl: "/images/cover-sunset.jpg",
      artistSlug: "dj-mansa",
    },
    {
      title: "Amapiano Fields",
      description: "Immersion sonore en plein air avec les plus grands DJs d'Afrique du Sud et 10 000 passionnés de danse.",
      venue: "Zone 6 Venue",
      city: "Johannesburg",
      country: "Afrique du Sud",
      startAt: new Date("2026-11-05T16:00:00Z"),
      endAt: new Date("2026-11-06T06:00:00Z"),
      ticketUrl: "https://tickets.afromix.io/amapiano-fields",
      coverUrl: "/images/cover-amapiano.jpg",
      artistSlug: "dj-jozi",
    },
  ];

  // Delete existing events and re-create to keep clean
  await prisma.event.deleteMany({});

  for (const evt of eventsData) {
    const artist = createdArtists[evt.artistSlug];
    if (!artist) continue;

    await prisma.event.create({
      data: {
        title: evt.title,
        description: evt.description,
        venue: evt.venue,
        city: evt.city,
        country: evt.country,
        startAt: evt.startAt,
        endAt: evt.endAt,
        ticketUrl: evt.ticketUrl,
        coverUrl: evt.coverUrl,
        artistId: artist.id,
      },
    });

    console.log(`🎟️ Event seeded: ${evt.title} (${evt.city})`);
  }

  console.log("✨ Seed successfully finished!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
});
