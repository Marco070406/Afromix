import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../lib/prisma.ts");
  const { getOverview, getPlaysSeries, getAudience, getTopContent } = await import("../services/analytics/index.ts");
  const users = await prisma.user.findMany({
    where: { role: "ARTIST" },
    select: { id: true, email: true, role: true, artistProfile: { select: { id: true, stageName: true } } },
  });
  console.log("Artist users in DB:", JSON.stringify(users, null, 2));

  if (users.length === 0) {
    console.log("No artist users found!");
    return;
  }

  const user = users[0];
  console.log("\nTesting with user:", user.email, user.id);

  try {
    console.log("\n1. Testing getOverview...");
    const overview = await getOverview(user.id, "30d");
    console.log("Overview success:", overview);
  } catch (err) {
    console.error("Overview failed:", err);
  }

  try {
    console.log("\n2. Testing getPlaysSeries...");
    const plays = await getPlaysSeries(user.id, "30d", "day");
    console.log("Plays success, items:", plays.length);
  } catch (err) {
    console.error("Plays failed:", err);
  }

  try {
    console.log("\n3. Testing getAudience...");
    const audience = await getAudience(user.id, "30d");
    console.log("Audience success:", audience);
  } catch (err) {
    console.error("Audience failed:", err);
  }

  try {
    console.log("\n4. Testing getTopContent...");
    const top = await getTopContent(user.id, "playCount", 15);
    console.log("TopContent success:", top);
  } catch (err) {
    console.error("TopContent failed:", err);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
