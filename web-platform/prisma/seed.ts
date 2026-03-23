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

  // Delete child tables first (to avoid foreign key constraints)
  await prisma.interaction.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.$executeRaw`DELETE FROM "_UserInterests";`;
  await prisma.$executeRaw`DELETE FROM "_CommunityTags";`;
  await prisma.tag.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.community.deleteMany({});

  // Reset sequences so IDs start from 1
  await prisma.$executeRaw`ALTER SEQUENCE "User_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE "Community_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE "Tag_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE "Membership_id_seq" RESTART WITH 1;`;
  await prisma.$executeRaw`ALTER SEQUENCE "Interaction_id_seq" RESTART WITH 1;`;

  console.log("Tables cleared, seeding new data...");

  // ---------------------------------------------------------------------------
  // Tags — Combined from both versions
  // ---------------------------------------------------------------------------
  const tagData = [
    // From teammate's version
    { name: 'javascript' },
    { name: 'react' },
    { name: 'python' },
    { name: 'ml' },
    { name: 'gaming' },
    { name: 'community' },
    // From ML version - Academic
    { name: 'Engineering' },
    { name: 'Computer Science' },
    { name: 'Pre-Med' },
    // Social
    { name: 'Social' },
    { name: 'Networking' },
    { name: 'Leadership' },
    // Athletic
    { name: 'Sports' },
    { name: 'Fitness' },
    { name: 'Outdoors' },
    // Creative
    { name: 'Music' },
    { name: 'Art' },
    { name: 'Dance' },
    // Tech
    { name: 'Robotics' },
    { name: 'AI & Machine Learning' },
    { name: 'Cybersecurity' },
  ];

  const tags: { [name: string]: { id: number; name: string } } = {};
  for (const t of tagData) {
    const tag = await prisma.tag.create({ data: t });
    tags[tag.name] = tag;
  }
  console.log(`Seeded ${Object.keys(tags).length} tags`);

  // ---------------------------------------------------------------------------
  // Communities — Combined from both versions
  // ---------------------------------------------------------------------------
  const communityData = [
    // From teammate's version
    {
      name: 'Next.js Devs',
      description: 'Next.js development community',
      avatarUrl: 'https://picsum.photos/seed/nextjs/200',
      tagNames: ['javascript', 'react'],
    },
    {
      name: 'Python Enthusiasts',
      description: 'Python programming and machine learning',
      avatarUrl: 'https://picsum.photos/seed/python/200',
      tagNames: ['python', 'ml'],
    },
    {
      name: 'Gamers Hub',
      description: 'Gaming community for all platforms',
      avatarUrl: 'https://picsum.photos/seed/gaming/200',
      tagNames: ['gaming', 'community'],
    },
    // From ML version
    {
      name: 'Gator Robotics',
      description: 'Build, compete, and innovate with autonomous robots at UF.',
      avatarUrl: 'https://picsum.photos/seed/robotics/200',
      tagNames: ['Robotics', 'Engineering', 'Computer Science'],
    },
    {
      name: 'AI Society',
      description: 'Explore machine learning, NLP, and AI research together.',
      avatarUrl: 'https://picsum.photos/seed/ai/200',
      tagNames: ['AI & Machine Learning', 'Computer Science', 'Engineering'],
    },
    {
      name: 'Pre-Med Alliance',
      description: 'Support network and resources for pre-medical students.',
      avatarUrl: 'https://picsum.photos/seed/premed/200',
      tagNames: ['Pre-Med', 'Networking', 'Leadership'],
    },
    {
      name: 'Gator Dance Collective',
      description: 'Competitive and recreational dance — all styles welcome.',
      avatarUrl: 'https://picsum.photos/seed/dance/200',
      tagNames: ['Dance', 'Social', 'Fitness'],
    },
    {
      name: 'Outdoor Adventure Club',
      description: 'Hiking, kayaking, camping, and everything in between.',
      avatarUrl: 'https://picsum.photos/seed/outdoor/200',
      tagNames: ['Outdoors', 'Fitness', 'Social'],
    },
    {
      name: 'Cybersecurity Club',
      description: 'CTF competitions, red team labs, and security workshops.',
      avatarUrl: 'https://picsum.photos/seed/cyber/200',
      tagNames: ['Cybersecurity', 'Computer Science', 'AI & Machine Learning'],
    },
    {
      name: 'Music Collective',
      description: 'Live sessions, open mics, and music production workshops.',
      avatarUrl: 'https://picsum.photos/seed/music/200',
      tagNames: ['Music', 'Art', 'Social'],
    },
    {
      name: 'Student Leadership Forum',
      description: 'Develop leadership skills through workshops and mentorship.',
      avatarUrl: 'https://picsum.photos/seed/leadership/200',
      tagNames: ['Leadership', 'Networking', 'Social'],
    },
  ];

  const communities: { [name: string]: { id: number; name: string } } = {};
  for (const c of communityData) {
    const community = await prisma.community.create({
      data: {
        name: c.name,
        description: c.description,
        avatarUrl: c.avatarUrl,
        tags: {
          connect: c.tagNames.map((n) => ({ name: n })),
        },
      },
    });
    communities[community.name] = community;
  }
  console.log(`Seeded ${Object.keys(communities).length} communities`);

  // ---------------------------------------------------------------------------
  // Users — Combined from both versions
  // ---------------------------------------------------------------------------
  const userData = [
    // From teammate's version
    {
      username: 'alice',
      password: 'alice123',
      interestTags: ['javascript', 'ml'],
    },
    {
      username: 'bob',
      password: 'bob123',
      interestTags: ['gaming', 'react'],
    },
    {
      username: 'carol',
      password: 'carol123',
      interestTags: ['python', 'ml'],
    },
    // From ML version
    {
      username: 'alice_tech',
      password: 'alice123',
      interestTags: ['Engineering', 'Robotics', 'AI & Machine Learning', 'Computer Science'],
    },
    {
      username: 'bob_creative',
      password: 'bob123',
      interestTags: ['Music', 'Dance', 'Art', 'Social'],
    },
    {
      username: 'carol_mixed',
      password: 'carol123',
      interestTags: ['Leadership', 'Networking', 'Computer Science'],
    },
    {
      username: 'dave_outdoor',
      password: 'dave123',
      interestTags: ['Outdoors', 'Fitness', 'Sports', 'Social'],
    },
    {
      username: 'eve_blank',
      password: 'eve123',
      interestTags: [], // no interests, no interactions — tests popularity baseline
    },
  ];

  const users: { [username: string]: { id: number; username: string } } = {};
  for (const u of userData) {
    const hashedPassword = await bcrypt.hash(u.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        username: u.username,
        password: hashedPassword,
        interests: {
          connect: u.interestTags.map((n) => ({ name: n })),
        },
      },
    });
    users[user.username] = user;
  }
  console.log(`Seeded ${Object.keys(users).length} users`);

  // ---------------------------------------------------------------------------
  // Memberships — Combined from both versions
  // ---------------------------------------------------------------------------
  const membershipData = [
    // From teammate's version
    { username: 'alice', communityName: 'Next.js Devs' },
    { username: 'alice', communityName: 'Python Enthusiasts' },
    { username: 'bob', communityName: 'Gamers Hub' },
    { username: 'carol', communityName: 'Python Enthusiasts' },
    // From ML version
    { username: 'alice_tech', communityName: 'Gator Robotics' },
    { username: 'alice_tech', communityName: 'AI Society' },
    { username: 'carol_mixed', communityName: 'Student Leadership Forum' },
    { username: 'dave_outdoor', communityName: 'Outdoor Adventure Club' },
  ];

  await prisma.membership.createMany({
    data: membershipData.map((m) => ({
      userId: users[m.username].id,
      communityId: communities[m.communityName].id,
    })),
    skipDuplicates: true,
  });
  console.log(`Seeded ${membershipData.length} memberships`);

  // ---------------------------------------------------------------------------
  // Interactions — From ML version (teammate's version didn't have this)
  // ---------------------------------------------------------------------------
  type InteractionType = 'view' | 'click' | 'rsvp' | 'join';
  const weightMap: Record<InteractionType, number> = {
    view: 0.5,
    click: 1.0,
    rsvp: 2.0,
    join: 3.0,
  };

  const interactionData: {
    username: string;
    communityName: string;
    type: InteractionType;
  }[] = [
    // alice_tech — heavy interactions across tech clubs
    { username: 'alice_tech', communityName: 'Cybersecurity Club', type: 'view' },
    { username: 'alice_tech', communityName: 'Cybersecurity Club', type: 'click' },
    { username: 'alice_tech', communityName: 'Cybersecurity Club', type: 'rsvp' },
    { username: 'alice_tech', communityName: 'AI Society', type: 'join' },
    { username: 'alice_tech', communityName: 'Gator Robotics', type: 'join' },
    { username: 'alice_tech', communityName: 'Student Leadership Forum', type: 'view' },

    // carol_mixed — moderate interactions
    { username: 'carol_mixed', communityName: 'AI Society', type: 'view' },
    { username: 'carol_mixed', communityName: 'AI Society', type: 'click' },
    { username: 'carol_mixed', communityName: 'Cybersecurity Club', type: 'view' },
    { username: 'carol_mixed', communityName: 'Student Leadership Forum', type: 'join' },
    { username: 'carol_mixed', communityName: 'Pre-Med Alliance', type: 'view' },

    // dave_outdoor — a few interactions outside memberships
    { username: 'dave_outdoor', communityName: 'Music Collective', type: 'view' },
    { username: 'dave_outdoor', communityName: 'Outdoor Adventure Club', type: 'join' },
    { username: 'dave_outdoor', communityName: 'Gator Dance Collective', type: 'click' },
  ];

  await prisma.interaction.createMany({
    data: interactionData.map((i) => ({
      userId: users[i.username].id,
      communityId: communities[i.communityName].id,
      type: i.type,
      weight: weightMap[i.type],
    })),
  });
  console.log(`Seeded ${interactionData.length} interactions`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
