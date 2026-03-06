import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from "bcrypt";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

async function main() {

  console.log("Resetting tables...");

  // Delete child tables first
  await prisma.membership.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.community.deleteMany({});

  // Reset sequences
  await prisma.$executeRaw`ALTER SEQUENCE "User_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE "Community_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE "Tag_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE "Membership_id_seq" RESTART WITH 1;`;

  console.log("Tables cleared, seeding new data...");

  // Create users
  const usersData = [
    { username: "alice", password: "alice123" },
    { username: "bob", password: "bob123" },
    { username: "carol", password: "carol123" },
  ];

  const users = [];
  for (const u of usersData) {
    const hashedPassword = await bcrypt.hash(u.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { username: u.username, password: hashedPassword },
    });
    users.push(user);
  }
  console.log("Created users:", users.map(u => u.username));

  // Create communities
  const communitiesData = [
    { name: "Next.js Devs", tags: ["javascript", "react"] },
    { name: "Python Enthusiasts", tags: ["python", "ml"] },
    { name: "Gamers Hub", tags: ["gaming", "community"] },
  ];

  const communities = [];
  for (const c of communitiesData) {
    const community = await prisma.community.create({
      data: {
        name: c.name,
        tags: {
          create: c.tags.map(tag => ({ name: tag })),
        },
      },
      include: { tags: true },
    });
    communities.push(community);
  }
  console.log("Created communities:", communities.map(c => c.name));

  // Add interests to users
  await prisma.user.update({
    where: { id: users[0].id },
    data: {
      interests: {
        connectOrCreate: [
          { where: { name: "javascript" }, create: { name: "javascript" } },
          { where: { name: "ml" }, create: { name: "ml" } },
        ],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[1].id },
    data: {
      interests: {
        connectOrCreate: [
          { where: { name: "gaming" }, create: { name: "gaming" } },
          { where: { name: "react" }, create: { name: "react" } },
        ],
      },
    },
  });

  await prisma.user.update({
    where: { id: users[2].id },
    data: {
      interests: {
        connectOrCreate: [
          { where: { name: "python" }, create: { name: "python" } },
          { where: { name: "ml" }, create: { name: "ml" } },
        ],
      },
    },
  });

  // Users join communities
  await prisma.membership.createMany({
    data: [
      { userId: users[0].id, communityId: communities[0].id },
      { userId: users[0].id, communityId: communities[1].id },
      { userId: users[1].id, communityId: communities[2].id },
      { userId: users[2].id, communityId: communities[1].id },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });