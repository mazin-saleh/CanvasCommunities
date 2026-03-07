import { NextRequest, NextResponse } from "next/server";
import { getUserCommunities } from "@/services/userService";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const communities = await getUserCommunities(userId);
    return NextResponse.json(communities);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}