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
  await prisma.recommendation.deleteMany({});
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
  await prisma.$executeRaw`ALTER SEQUENCE "Recommendation_id_seq" RESTART WITH 1;`;

  console.log("Tables cleared, seeding new data...");

  // ---------------------------------------------------------------------------
  // Tags
  // ---------------------------------------------------------------------------
  const tagData = [
    // Tech
    { name: 'Computer Science' },
    { name: 'Engineering' },
    { name: 'Robotics' },
    { name: 'AI & Machine Learning' },
    { name: 'Cybersecurity' },
    { name: 'Data Science' },
    { name: 'Web Development' },
    { name: 'Mobile Development' },
    { name: 'Game Development' },
    { name: 'Open Source' },
    // Science & Health
    { name: 'Pre-Med' },
    { name: 'Biology' },
    { name: 'Chemistry' },
    { name: 'Physics' },
    { name: 'Environmental Science' },
    { name: 'Public Health' },
    { name: 'Neuroscience' },
    // Social & Leadership
    { name: 'Social' },
    { name: 'Networking' },
    { name: 'Leadership' },
    { name: 'Community Service' },
    { name: 'Volunteering' },
    { name: 'Mentorship' },
    // Creative
    { name: 'Music' },
    { name: 'Art' },
    { name: 'Dance' },
    { name: 'Photography' },
    { name: 'Film & Media' },
    { name: 'Creative Writing' },
    { name: 'Theater' },
    // Athletic & Outdoors
    { name: 'Sports' },
    { name: 'Fitness' },
    { name: 'Outdoors' },
    { name: 'Martial Arts' },
    { name: 'Yoga & Wellness' },
    // Professional & Academic
    { name: 'Business' },
    { name: 'Finance' },
    { name: 'Entrepreneurship' },
    { name: 'Law' },
    { name: 'Research' },
    { name: 'Academic' },
    // Culture & Identity
    { name: 'Cultural' },
    { name: 'International' },
    { name: 'Diversity' },
    { name: 'Language' },
    // Lifestyle
    { name: 'Food' },
    { name: 'Gaming' },
    { name: 'Sustainability' },
    { name: 'Mental Health' },
  ];

  const tags: { [name: string]: { id: number; name: string } } = {};
  for (const t of tagData) {
    const tag = await prisma.tag.create({ data: t });
    tags[tag.name] = tag;
  }
  console.log(`Seeded ${Object.keys(tags).length} tags`);

  // ---------------------------------------------------------------------------
  // Communities — 50 diverse communities
  // ---------------------------------------------------------------------------
  const communityData = [
    // ── Tech ──
    { name: 'Gator Robotics', description: 'Build, compete, and innovate with autonomous robots at UF.', avatarUrl: 'https://picsum.photos/seed/robotics/200', tagNames: ['Robotics', 'Engineering', 'Computer Science'] },
    { name: 'AI Society', description: 'Explore machine learning, NLP, and AI research together.', avatarUrl: 'https://picsum.photos/seed/ai/200', tagNames: ['AI & Machine Learning', 'Computer Science', 'Data Science'] },
    { name: 'Cybersecurity Club', description: 'CTF competitions, red team labs, and security workshops.', avatarUrl: 'https://picsum.photos/seed/cyber/200', tagNames: ['Cybersecurity', 'Computer Science'] },
    { name: 'Open Source Gators', description: 'Contribute to open source projects and learn collaborative development.', avatarUrl: 'https://picsum.photos/seed/opensource/200', tagNames: ['Open Source', 'Web Development', 'Computer Science'] },
    { name: 'UF ACM Chapter', description: 'Talks, coding nights, and career panels for CS students.', avatarUrl: 'https://picsum.photos/seed/acm/200', tagNames: ['Computer Science', 'Academic', 'Networking'] },
    { name: 'Mobile App Builders', description: 'Build iOS and Android apps from scratch in weekly workshops.', avatarUrl: 'https://picsum.photos/seed/mobile/200', tagNames: ['Mobile Development', 'Computer Science', 'Engineering'] },
    { name: 'Data Science Society', description: 'Kaggle competitions, data viz workshops, and industry talks.', avatarUrl: 'https://picsum.photos/seed/datasci/200', tagNames: ['Data Science', 'AI & Machine Learning', 'Research'] },
    { name: 'Game Dev Club', description: 'Build games with Unity and Unreal — weekly game jams and showcases.', avatarUrl: 'https://picsum.photos/seed/gamedev/200', tagNames: ['Game Development', 'Computer Science', 'Art'] },
    { name: 'Web Dev Workshop', description: 'Learn modern web development: React, Next.js, APIs, and deployment.', avatarUrl: 'https://picsum.photos/seed/webdev/200', tagNames: ['Web Development', 'Computer Science', 'Open Source'] },
    { name: 'Gator Hardware Lab', description: 'Arduino, Raspberry Pi, and embedded systems projects.', avatarUrl: 'https://picsum.photos/seed/hardware/200', tagNames: ['Engineering', 'Robotics', 'Computer Science'] },

    // ── Science & Health ──
    { name: 'Pre-Med Alliance', description: 'Support network and resources for pre-medical students.', avatarUrl: 'https://picsum.photos/seed/premed/200', tagNames: ['Pre-Med', 'Networking', 'Mentorship'] },
    { name: 'Biomedical Engineering Society', description: 'Bridging engineering and medicine through design challenges.', avatarUrl: 'https://picsum.photos/seed/biomed/200', tagNames: ['Engineering', 'Biology', 'Pre-Med'] },
    { name: 'Chemistry Club', description: 'Lab demos, study groups, and chemistry career exploration.', avatarUrl: 'https://picsum.photos/seed/chem/200', tagNames: ['Chemistry', 'Academic', 'Research'] },
    { name: 'Physics Society', description: 'Stargazing nights, physics demos, and research talks.', avatarUrl: 'https://picsum.photos/seed/physics/200', tagNames: ['Physics', 'Academic', 'Research'] },
    { name: 'Environmental Action Coalition', description: 'Campus sustainability campaigns and conservation projects.', avatarUrl: 'https://picsum.photos/seed/enviro/200', tagNames: ['Environmental Science', 'Sustainability', 'Volunteering'] },
    { name: 'Neuroscience Explorers', description: 'Brain-related research discussions and lab tours.', avatarUrl: 'https://picsum.photos/seed/neuro/200', tagNames: ['Neuroscience', 'Biology', 'Research'] },
    { name: 'Public Health Brigade', description: 'Health education, screenings, and community outreach.', avatarUrl: 'https://picsum.photos/seed/pubhealth/200', tagNames: ['Public Health', 'Community Service', 'Volunteering'] },
    { name: 'Pre-Dental Society', description: 'DAT prep, shadowing opportunities, and dental school mentorship.', avatarUrl: 'https://picsum.photos/seed/predent/200', tagNames: ['Pre-Med', 'Academic', 'Mentorship'] },

    // ── Social & Leadership ──
    { name: 'Student Leadership Forum', description: 'Develop leadership skills through workshops and mentorship.', avatarUrl: 'https://picsum.photos/seed/leadership/200', tagNames: ['Leadership', 'Networking', 'Social'] },
    { name: 'Gators Give Back', description: 'Weekly service projects focused on food insecurity and education.', avatarUrl: 'https://picsum.photos/seed/giveback/200', tagNames: ['Community Service', 'Volunteering', 'Social'] },
    { name: 'Peer Mentorship Network', description: 'Upperclassmen mentoring freshmen through the college transition.', avatarUrl: 'https://picsum.photos/seed/mentors/200', tagNames: ['Mentorship', 'Leadership', 'Social'] },
    { name: 'Mental Health Advocates', description: 'Promoting mental wellness, peer support, and stress management.', avatarUrl: 'https://picsum.photos/seed/mentalhealth/200', tagNames: ['Mental Health', 'Community Service', 'Social'] },
    { name: 'Debate Society', description: 'Competitive debate, public speaking practice, and argument workshops.', avatarUrl: 'https://picsum.photos/seed/debate/200', tagNames: ['Academic', 'Leadership', 'Social'] },

    // ── Creative Arts ──
    { name: 'Music Collective', description: 'Live sessions, open mics, and music production workshops.', avatarUrl: 'https://picsum.photos/seed/music/200', tagNames: ['Music', 'Art', 'Social'] },
    { name: 'Gator Dance Collective', description: 'Competitive and recreational dance — all styles welcome.', avatarUrl: 'https://picsum.photos/seed/dance/200', tagNames: ['Dance', 'Social', 'Fitness'] },
    { name: 'Photography Guild', description: 'Photo walks, editing workshops, and gallery exhibitions.', avatarUrl: 'https://picsum.photos/seed/photo/200', tagNames: ['Photography', 'Art', 'Social'] },
    { name: 'Film & Documentary Club', description: 'Short film production, screenings, and filmmaker Q&As.', avatarUrl: 'https://picsum.photos/seed/film/200', tagNames: ['Film & Media', 'Art', 'Creative Writing'] },
    { name: 'Creative Writing Circle', description: 'Poetry slams, fiction workshops, and campus literary magazine.', avatarUrl: 'https://picsum.photos/seed/writing/200', tagNames: ['Creative Writing', 'Art', 'Social'] },
    { name: 'Theater Troupe', description: 'Semester productions, improv nights, and acting workshops.', avatarUrl: 'https://picsum.photos/seed/theater/200', tagNames: ['Theater', 'Art', 'Social'] },
    { name: 'Digital Art & Design', description: 'UI/UX, illustration, 3D modeling, and design critiques.', avatarUrl: 'https://picsum.photos/seed/digitalart/200', tagNames: ['Art', 'Web Development', 'Game Development'] },
    { name: 'A Cappella Ensemble', description: 'Auditioned vocal group performing pop, jazz, and originals.', avatarUrl: 'https://picsum.photos/seed/acappella/200', tagNames: ['Music', 'Social'] },

    // ── Athletic & Outdoors ──
    { name: 'Outdoor Adventure Club', description: 'Hiking, kayaking, camping, and everything in between.', avatarUrl: 'https://picsum.photos/seed/outdoor/200', tagNames: ['Outdoors', 'Fitness', 'Social'] },
    { name: 'Intramural Soccer League', description: 'Join or form a team for friendly intramural soccer.', avatarUrl: 'https://picsum.photos/seed/soccer/200', tagNames: ['Sports', 'Fitness', 'Social'] },
    { name: 'UF Tennis Club', description: 'Casual hitting sessions and ladder matches for all levels.', avatarUrl: 'https://picsum.photos/seed/tennis/200', tagNames: ['Sports', 'Fitness'] },
    { name: 'Rock Climbing Crew', description: 'Indoor bouldering sessions and weekend outdoor climbing trips.', avatarUrl: 'https://picsum.photos/seed/climbing/200', tagNames: ['Fitness', 'Outdoors', 'Social'] },
    { name: 'Yoga & Mindfulness', description: 'Free yoga sessions, meditation workshops, and wellness retreats.', avatarUrl: 'https://picsum.photos/seed/yoga/200', tagNames: ['Yoga & Wellness', 'Mental Health', 'Fitness'] },
    { name: 'Martial Arts Federation', description: 'Training in karate, jiu-jitsu, taekwondo, and self-defense.', avatarUrl: 'https://picsum.photos/seed/martialarts/200', tagNames: ['Martial Arts', 'Fitness', 'Sports'] },
    { name: 'Running & Track Club', description: 'Group runs, 5K training plans, and race day meetups.', avatarUrl: 'https://picsum.photos/seed/running/200', tagNames: ['Fitness', 'Sports', 'Social'] },
    { name: 'Gator Surf Club', description: 'Weekend surf trips, beach meetups, and coastal cleanups.', avatarUrl: 'https://picsum.photos/seed/surf/200', tagNames: ['Outdoors', 'Sports', 'Social'] },
    { name: 'Ultimate Frisbee', description: 'Pickup games and tournament travel team — all skill levels.', avatarUrl: 'https://picsum.photos/seed/frisbee/200', tagNames: ['Sports', 'Fitness', 'Social'] },

    // ── Professional & Business ──
    { name: 'Entrepreneurship Club', description: 'Startup pitch nights, founder talks, and venture building.', avatarUrl: 'https://picsum.photos/seed/startup/200', tagNames: ['Entrepreneurship', 'Business', 'Networking'] },
    { name: 'Finance & Investment Society', description: 'Stock market simulations, portfolio workshops, and Wall Street prep.', avatarUrl: 'https://picsum.photos/seed/finance/200', tagNames: ['Finance', 'Business', 'Academic'] },
    { name: 'Pre-Law Society', description: 'LSAT prep, law school panels, and mock trial practice.', avatarUrl: 'https://picsum.photos/seed/prelaw/200', tagNames: ['Law', 'Academic', 'Networking'] },
    { name: 'Women in STEM', description: 'Mentorship, networking, and advocacy for women in technical fields.', avatarUrl: 'https://picsum.photos/seed/wistem/200', tagNames: ['Engineering', 'Leadership', 'Diversity'] },
    { name: 'Consulting Club', description: 'Case study workshops, mock interviews, and firm networking.', avatarUrl: 'https://picsum.photos/seed/consulting/200', tagNames: ['Business', 'Networking', 'Leadership'] },

    // ── Cultural & International ──
    { name: 'International Student Association', description: 'Cultural showcases, language tables, and global networking.', avatarUrl: 'https://picsum.photos/seed/intl/200', tagNames: ['International', 'Cultural', 'Social'] },
    { name: 'Hispanic-Latinx Student Assembly', description: 'Cultural celebrations, academic support, and community building.', avatarUrl: 'https://picsum.photos/seed/latinx/200', tagNames: ['Cultural', 'Diversity', 'Social'] },
    { name: 'Asian Pacific Islander Alliance', description: 'Heritage events, advocacy, and social gatherings for AAPI students.', avatarUrl: 'https://picsum.photos/seed/aapi/200', tagNames: ['Cultural', 'Diversity', 'Social'] },
    { name: 'Language Exchange Club', description: 'Practice languages with native speakers over coffee and activities.', avatarUrl: 'https://picsum.photos/seed/language/200', tagNames: ['Language', 'International', 'Social'] },

    // ── Lifestyle ──
    { name: 'Gator Grilling Club', description: 'Fire up the grill, learn recipes, and host campus cookouts.', avatarUrl: 'https://picsum.photos/seed/grilling/200', tagNames: ['Food', 'Social'] },
    { name: 'Board Game Society', description: 'Weekly game nights: strategy, party, and tabletop RPGs.', avatarUrl: 'https://picsum.photos/seed/boardgames/200', tagNames: ['Gaming', 'Social'] },
    { name: 'Esports & Competitive Gaming', description: 'Competitive teams in League, Valorant, and Smash Bros.', avatarUrl: 'https://picsum.photos/seed/esports/200', tagNames: ['Gaming', 'Computer Science', 'Social'] },
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
  // Users — diverse profiles for testing recommendations
  // ---------------------------------------------------------------------------
  const userData = [
    {
      username: 'alice',
      password: 'alice123',
      interestTags: ['Computer Science', 'AI & Machine Learning', 'Web Development', 'Open Source'],
    },
    {
      username: 'bob',
      password: 'bob123',
      interestTags: ['Gaming', 'Music', 'Social'],
    },
    {
      username: 'carol',
      password: 'carol123',
      interestTags: ['Pre-Med', 'Biology', 'Neuroscience', 'Research'],
    },
    {
      username: 'alice_tech',
      password: 'alice123',
      interestTags: ['Engineering', 'Robotics', 'AI & Machine Learning', 'Computer Science', 'Data Science'],
    },
    {
      username: 'bob_creative',
      password: 'bob123',
      interestTags: ['Music', 'Dance', 'Art', 'Photography', 'Theater'],
    },
    {
      username: 'carol_mixed',
      password: 'carol123',
      interestTags: ['Leadership', 'Networking', 'Computer Science', 'Entrepreneurship'],
    },
    {
      username: 'dave_outdoor',
      password: 'dave123',
      interestTags: ['Outdoors', 'Fitness', 'Sports', 'Social', 'Martial Arts'],
    },
    {
      username: 'eve_blank',
      password: 'eve123',
      interestTags: [], // no interests — tests popularity baseline
    },
    {
      username: 'frank_science',
      password: 'frank123',
      interestTags: ['Physics', 'Chemistry', 'Environmental Science', 'Research', 'Academic'],
    },
    {
      username: 'grace_social',
      password: 'grace123',
      interestTags: ['Community Service', 'Volunteering', 'Mental Health', 'Social', 'Cultural'],
    },
    {
      username: 'henry_business',
      password: 'henry123',
      interestTags: ['Business', 'Finance', 'Entrepreneurship', 'Leadership', 'Networking'],
    },
    {
      username: 'iris_creative',
      password: 'iris123',
      interestTags: ['Art', 'Creative Writing', 'Film & Media', 'Photography', 'Music'],
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
  // Memberships — spread across communities
  // ---------------------------------------------------------------------------
  const membershipData = [
    // alice — tech clubs
    { username: 'alice', communityName: 'UF ACM Chapter' },
    { username: 'alice', communityName: 'Open Source Gators' },
    { username: 'alice', communityName: 'Web Dev Workshop' },
    // bob — gaming & social
    { username: 'bob', communityName: 'Esports & Competitive Gaming' },
    { username: 'bob', communityName: 'Board Game Society' },
    { username: 'bob', communityName: 'Music Collective' },
    // carol — pre-med
    { username: 'carol', communityName: 'Pre-Med Alliance' },
    { username: 'carol', communityName: 'Neuroscience Explorers' },
    // alice_tech — engineering heavy
    { username: 'alice_tech', communityName: 'Gator Robotics' },
    { username: 'alice_tech', communityName: 'AI Society' },
    { username: 'alice_tech', communityName: 'Data Science Society' },
    // bob_creative — arts
    { username: 'bob_creative', communityName: 'Gator Dance Collective' },
    { username: 'bob_creative', communityName: 'Photography Guild' },
    { username: 'bob_creative', communityName: 'Theater Troupe' },
    // carol_mixed — leadership + tech
    { username: 'carol_mixed', communityName: 'Student Leadership Forum' },
    { username: 'carol_mixed', communityName: 'Consulting Club' },
    { username: 'carol_mixed', communityName: 'Entrepreneurship Club' },
    // dave_outdoor — outdoor & fitness
    { username: 'dave_outdoor', communityName: 'Outdoor Adventure Club' },
    { username: 'dave_outdoor', communityName: 'Rock Climbing Crew' },
    { username: 'dave_outdoor', communityName: 'Martial Arts Federation' },
    // frank_science
    { username: 'frank_science', communityName: 'Physics Society' },
    { username: 'frank_science', communityName: 'Chemistry Club' },
    { username: 'frank_science', communityName: 'Environmental Action Coalition' },
    // grace_social
    { username: 'grace_social', communityName: 'Gators Give Back' },
    { username: 'grace_social', communityName: 'Mental Health Advocates' },
    { username: 'grace_social', communityName: 'International Student Association' },
    // henry_business
    { username: 'henry_business', communityName: 'Finance & Investment Society' },
    { username: 'henry_business', communityName: 'Entrepreneurship Club' },
    { username: 'henry_business', communityName: 'Consulting Club' },
    // iris_creative
    { username: 'iris_creative', communityName: 'Film & Documentary Club' },
    { username: 'iris_creative', communityName: 'Creative Writing Circle' },
    { username: 'iris_creative', communityName: 'A Cappella Ensemble' },
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
  // Interactions — simulate realistic user behavior
  // ---------------------------------------------------------------------------
  type InteractionType = 'view' | 'click' | 'rsvp' | 'join';
  const weightMap: Record<InteractionType, number> = {
    view: 0.5,
    click: 1.0,
    rsvp: 2.0,
    join: 3.0,
  };

  const interactionData: { username: string; communityName: string; type: InteractionType }[] = [
    // alice — exploring more tech
    { username: 'alice', communityName: 'AI Society', type: 'view' },
    { username: 'alice', communityName: 'AI Society', type: 'click' },
    { username: 'alice', communityName: 'Cybersecurity Club', type: 'view' },
    { username: 'alice', communityName: 'Data Science Society', type: 'view' },
    { username: 'alice', communityName: 'Data Science Society', type: 'click' },
    { username: 'alice', communityName: 'Mobile App Builders', type: 'view' },
    { username: 'alice', communityName: 'Game Dev Club', type: 'view' },

    // alice_tech — deep into engineering
    { username: 'alice_tech', communityName: 'Cybersecurity Club', type: 'view' },
    { username: 'alice_tech', communityName: 'Cybersecurity Club', type: 'click' },
    { username: 'alice_tech', communityName: 'Cybersecurity Club', type: 'rsvp' },
    { username: 'alice_tech', communityName: 'Gator Hardware Lab', type: 'view' },
    { username: 'alice_tech', communityName: 'Gator Hardware Lab', type: 'click' },
    { username: 'alice_tech', communityName: 'Women in STEM', type: 'view' },

    // bob — gaming and music
    { username: 'bob', communityName: 'Game Dev Club', type: 'view' },
    { username: 'bob', communityName: 'Game Dev Club', type: 'click' },
    { username: 'bob', communityName: 'A Cappella Ensemble', type: 'view' },
    { username: 'bob', communityName: 'Gator Grilling Club', type: 'view' },

    // carol — med school track
    { username: 'carol', communityName: 'Biomedical Engineering Society', type: 'view' },
    { username: 'carol', communityName: 'Biomedical Engineering Society', type: 'click' },
    { username: 'carol', communityName: 'Public Health Brigade', type: 'view' },
    { username: 'carol', communityName: 'Public Health Brigade', type: 'rsvp' },
    { username: 'carol', communityName: 'Pre-Dental Society', type: 'view' },
    { username: 'carol', communityName: 'Chemistry Club', type: 'view' },

    // carol_mixed — leadership pipeline
    { username: 'carol_mixed', communityName: 'AI Society', type: 'view' },
    { username: 'carol_mixed', communityName: 'AI Society', type: 'click' },
    { username: 'carol_mixed', communityName: 'Women in STEM', type: 'view' },
    { username: 'carol_mixed', communityName: 'Pre-Law Society', type: 'view' },
    { username: 'carol_mixed', communityName: 'Debate Society', type: 'view' },
    { username: 'carol_mixed', communityName: 'Debate Society', type: 'click' },

    // dave_outdoor — fitness & adventure
    { username: 'dave_outdoor', communityName: 'Running & Track Club', type: 'view' },
    { username: 'dave_outdoor', communityName: 'Running & Track Club', type: 'click' },
    { username: 'dave_outdoor', communityName: 'Gator Surf Club', type: 'view' },
    { username: 'dave_outdoor', communityName: 'Ultimate Frisbee', type: 'view' },
    { username: 'dave_outdoor', communityName: 'Yoga & Mindfulness', type: 'view' },
    { username: 'dave_outdoor', communityName: 'Intramural Soccer League', type: 'view' },
    { username: 'dave_outdoor', communityName: 'Intramural Soccer League', type: 'click' },

    // bob_creative — browsing art scene
    { username: 'bob_creative', communityName: 'Film & Documentary Club', type: 'view' },
    { username: 'bob_creative', communityName: 'Film & Documentary Club', type: 'click' },
    { username: 'bob_creative', communityName: 'Creative Writing Circle', type: 'view' },
    { username: 'bob_creative', communityName: 'Digital Art & Design', type: 'view' },
    { username: 'bob_creative', communityName: 'A Cappella Ensemble', type: 'view' },
    { username: 'bob_creative', communityName: 'Music Collective', type: 'view' },
    { username: 'bob_creative', communityName: 'Music Collective', type: 'click' },

    // grace_social — community building
    { username: 'grace_social', communityName: 'Peer Mentorship Network', type: 'view' },
    { username: 'grace_social', communityName: 'Peer Mentorship Network', type: 'click' },
    { username: 'grace_social', communityName: 'Hispanic-Latinx Student Assembly', type: 'view' },
    { username: 'grace_social', communityName: 'Language Exchange Club', type: 'view' },
    { username: 'grace_social', communityName: 'Public Health Brigade', type: 'view' },

    // henry_business — professional development
    { username: 'henry_business', communityName: 'Pre-Law Society', type: 'view' },
    { username: 'henry_business', communityName: 'Pre-Law Society', type: 'click' },
    { username: 'henry_business', communityName: 'Student Leadership Forum', type: 'view' },
    { username: 'henry_business', communityName: 'Women in STEM', type: 'view' },
    { username: 'henry_business', communityName: 'Debate Society', type: 'view' },

    // iris_creative — art & media exploration
    { username: 'iris_creative', communityName: 'Photography Guild', type: 'view' },
    { username: 'iris_creative', communityName: 'Photography Guild', type: 'click' },
    { username: 'iris_creative', communityName: 'Digital Art & Design', type: 'view' },
    { username: 'iris_creative', communityName: 'Digital Art & Design', type: 'click' },
    { username: 'iris_creative', communityName: 'Theater Troupe', type: 'view' },
    { username: 'iris_creative', communityName: 'Music Collective', type: 'view' },
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
