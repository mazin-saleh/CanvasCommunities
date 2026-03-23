import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function createUser(username: string, password: string) {
  // Hasing of user password before storing in DB
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      username,
      password: hashedPassword
    }
  });
}

// Verifies user credentials
export async function verifyUser(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return user;
}

export async function getUsers() {
  return prisma.user.findMany({
    include: {
      interests: true,
      memberships: true
    }
  });
}

export async function addInterest(userId: number, tagName: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      interests: {
        connectOrCreate: {
          where: { name: tagName },
          create: { name: tagName }
        }
      }
    }
  });
}

export async function joinCommunity(userId: number, communityId: number) {
  return prisma.membership.create({
    data: {
      userId,
      communityId
    }
  });
}

export async function getUserCommunities(userId: number) {
  return prisma.membership.findMany({
    where: { userId },
    include: {
      community: true
    }
  });
}

//Tag based reccomendations
export async function recommendCommunities(userId: number) {
  return prisma.community.findMany({
    where: {
      tags: {
        some: {
          users: {
            some: { id: userId }
          }
        }
      }
    },
    include: {
      tags: true
    }
  });
}