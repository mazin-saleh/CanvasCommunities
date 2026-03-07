import { NextRequest, NextResponse } from "next/server";
import { addCommunityTag } from "@/services/communityService";

export async function PATCH(req: NextRequest) {
  try {
    const { communityId, tagName } = await req.json();
    if (!communityId || !tagName) return NextResponse.json({ error: "communityId and tagName required" }, { status: 400 });

    const updatedCommunity = await addCommunityTag(communityId, tagName);
    return NextResponse.json(updatedCommunity);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}