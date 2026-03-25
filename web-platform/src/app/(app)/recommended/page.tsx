"use client";

import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ClubCard from "@/components/ClubCard";
import { Club } from "@/mocks/clubs";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function RecommendedPage() {
  const { user, hydrated } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to hydrate and user to be available
    if (!hydrated || !user) return;

    async function fetchRecommendations() {
      try {
        const [data, memberships] = await Promise.all([
          api.community.getRecommended(Number(user!.id)),
          api.user.getCommunities(Number(user!.id)),
        ]);

        const joinedCommunityIds = new Set(
          memberships.map((m: any) => m.communityId ?? m.community?.id)
        );

        // Transform API response to match Club type expected by ClubCard
        const transformed: Club[] = data.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          description: c.description || "No description available",
          avatarUrl: c.avatarUrl,
          tags: c.tags?.map((t: any) => t.name) || [],
          joined: joinedCommunityIds.has(c.id),
        }));

        setClubs(transformed);
      } catch (err: any) {
        setError(err.message || "Failed to fetch recommendations");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [hydrated, user]);

  // Show loading while auth hydrates
  if (!hydrated || loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Your Personalized Recommendations"
          subtitle="Loading your recommendations..."
        />
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // No user logged in
  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Your Personalized Recommendations"
          subtitle="Please log in to see your recommendations"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Your Personalized Recommendations"
          subtitle="Something went wrong"
        />
        <div className="text-center py-8 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Personalized Recommendations"
        subtitle="We've hand-picked these clubs just for you based on your interests."
      />

      {clubs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No recommendations yet. Try adding some interests!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((c) => (
            <ClubCard key={c.id} club={c} />
          ))}
        </div>
      )}
    </div>
  );
}
