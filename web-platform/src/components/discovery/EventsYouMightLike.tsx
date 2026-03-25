"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Props = {
  maxHeight?: number | undefined;
};

export default function EventsYouMightLike({ maxHeight }: Props) {
  const { user, hydrated } = useAuth();
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    if (!hydrated || !user) return;
    api.community
      .getRecommended(Number(user.id))
      .then((data) => setClubs(data.slice(0, 5)))
      .catch(() => {});
  }, [hydrated, user]);

  const style = maxHeight ? { maxHeight: `${maxHeight}px` } : undefined;

  return (
    <div
      className="sticky top-8 overflow-y-auto space-y-4 rounded-2xl bg-white p-5 shadow-sm"
      style={style}
    >
      <h3 className="text-sm font-semibold text-slate-900">Top picks for you</h3>

      {clubs.length === 0 ? (
        <p className="text-xs text-slate-400">No recommendations yet</p>
      ) : (
        clubs.map((c: any) => (
          <div
            key={c.id}
            className="rounded-xl border p-3 text-xs hover:bg-slate-50 transition"
          >
            <p className="font-semibold">{c.name}</p>
            <p className="text-slate-500 line-clamp-1">
              {c.description || "No description"}
            </p>
            {c.tags && (
              <p className="mt-1 text-orange-500 font-medium">
                {c.tags
                  .slice(0, 3)
                  .map((t: any) => t.name || t)
                  .join(" · ")}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
