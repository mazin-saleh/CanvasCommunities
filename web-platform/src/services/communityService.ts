import { prisma } from "../lib/prisma";

export async function createCommunity(name: string) {
  return prisma.community.create({
    data: {
      name
    }
  });
}

export async function addCommunityTag(communityId: number, tagName: string) {
  return prisma.community.update({
    where: { id: communityId },
    data: {
      tags: {
        connectOrCreate: {
          where: { name: tagName },
          create: { name: tagName }
        }
      }
    }
  });
}