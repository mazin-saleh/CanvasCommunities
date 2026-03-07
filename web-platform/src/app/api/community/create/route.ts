import { NextRequest, NextResponse } from "next/server";
import { createCommunity } from "@/services/communityService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) return NextResponse.json({ error: "Community name required" }, { status: 400 });

    const community = await createCommunity(name);
    return NextResponse.json(community);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}