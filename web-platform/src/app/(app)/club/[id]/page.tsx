"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { mockClubs } from "@/mocks/clubs";
import { mockEvents } from "@/mocks/events";

const ClubPageClient = dynamic(() => import("./ClubPageClient"), {
  ssr: false,
});

export default function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const club = mockClubs.find((c) => c.id === id) || mockClubs[0];
  const events = mockEvents.filter((e) => e.clubId === club.id);

  return <ClubPageClient club={club} events={events} />;
}
