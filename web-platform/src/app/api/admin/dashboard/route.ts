import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/dashboard
 *
 * Returns a full snapshot of the database for quick debugging.
 * Open in browser: http://localhost:3000/api/admin/dashboard
 */
export async function GET() {
  const [users, communities, tags, memberships, recommendations, interactions] =
    await Promise.all([
      // Users with their interests
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          interests: { select: { name: true } },
          _count: { select: { memberships: true, recommendations: true } },
        },
        orderBy: { id: "desc" },
      }),

      // Communities with tags and member count
      prisma.community.findMany({
        select: {
          id: true,
          name: true,
          tags: { select: { name: true } },
          _count: { select: { members: true } },
        },
        orderBy: { name: "asc" },
      }),

      // Tag usage counts
      prisma.tag.findMany({
        select: {
          name: true,
          _count: { select: { communities: true, users: true } },
        },
        orderBy: { name: "asc" },
      }),

      // Recent memberships
      prisma.membership.findMany({
        select: {
          user: { select: { username: true } },
          community: { select: { name: true } },
          joinedAt: true,
        },
        orderBy: { joinedAt: "desc" },
        take: 50,
      }),

      // Recent recommendations (top per user)
      prisma.recommendation.findMany({
        where: { score: { gt: 0 } },
        select: {
          user: { select: { username: true } },
          community: { select: { name: true } },
          score: true,
          contentScore: true,
          collabScore: true,
        },
        orderBy: { score: "desc" },
        take: 100,
      }),

      // Recent interactions
      prisma.interaction.findMany({
        select: {
          user: { select: { username: true } },
          community: { select: { name: true } },
          type: true,
          weight: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  // Format for readability
  const data = {
    summary: {
      users: users.length,
      communities: communities.length,
      tags: tags.length,
      memberships: memberships.length,
      recommendations: recommendations.length,
    },
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      interests: u.interests.map((t) => t.name),
      memberships: u._count.memberships,
      recommendations: u._count.recommendations,
    })),
    communities: communities.map((c) => ({
      id: c.id,
      name: c.name,
      tags: c.tags.map((t) => t.name),
      members: c._count.members,
    })),
    tags: tags.map((t) => ({
      name: t.name,
      communities: t._count.communities,
      users: t._count.users,
    })),
    recentMemberships: memberships.map((m) => ({
      user: m.user.username,
      community: m.community.name,
      joinedAt: m.joinedAt,
    })),
    topRecommendations: recommendations.map((r) => ({
      user: r.user.username,
      community: r.community.name,
      score: Math.round(r.score * 1000) / 1000,
      content: Math.round(r.contentScore * 1000) / 1000,
      collab: Math.round(r.collabScore * 1000) / 1000,
    })),
    recentInteractions: interactions.map((i) => ({
      user: i.user.username,
      community: i.community.name,
      type: i.type,
      weight: i.weight,
      at: i.createdAt,
    })),
  };

  return NextResponse.json(data);
}
