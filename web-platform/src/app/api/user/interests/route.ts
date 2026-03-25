import { NextRequest, NextResponse } from "next/server";
import { getUserInterests } from "@/services/userService";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const interests = await getUserInterests(Number(userId));
    return NextResponse.json(interests);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
