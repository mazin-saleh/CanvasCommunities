"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { DiscoveryClub } from "@/mocks/discovery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function DiscoveryClubCard({ club }: { club: DiscoveryClub }) {
  const router = useRouter();
  const { user } = useAuth();
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    if (!user || joined || joining) return;
    setJoining(true);
    try {
      await api.user.joinCommunity(Number(user.id), Number(club.id));
      setJoined(true);
    } catch (err) {
      console.error("Failed to join:", err);
    } finally {
      setJoining(false);
    }
  }

  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      className="flex h-full flex-col rounded-2xl bg-white shadow-md hover:shadow-lg transition-all overflow-hidden"
    >
      {/* Banner area */}
      <div className="relative w-full flex-shrink-0" style={{ height: "32%" }}>
        <div className="absolute inset-0 bg-orange-400">
          {club.bannerSrc && (
            <Image src={club.bannerSrc} alt="" fill className="object-cover opacity-80" />
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 flex-shrink-0 rounded-full overflow-hidden border bg-white">
            <Image
              src={club.logoSrc || "/gator-hero.png"}
              alt=""
              width={48}
              height={48}
              className="object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{club.name}</h3>
            <p className="mt-1 text-xs text-slate-600 line-clamp-3">{club.description}</p>
          </div>
        </div>

        {/* Tags */}
        {club.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {club.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Score indicator */}
        {club.score != null && (
          <div className="mt-2 text-[10px] text-slate-400">
            {Math.round(club.score * 100)}% match
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex justify-between items-center pt-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/club/${club.id}`)}>
            View
          </Button>
          <Button
            size="sm"
            className={joined ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}
            onClick={handleJoin}
            disabled={joined || joining}
          >
            {joined ? "Joined" : joining ? "Joining..." : "Join"}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
