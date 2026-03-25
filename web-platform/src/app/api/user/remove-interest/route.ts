import { NextRequest, NextResponse } from "next/server";
import { removeInterest } from "@/services/userService";

export async function PATCH(req: NextRequest) {
  try {
    const { userId, tagName } = await req.json();
    if (!userId || !tagName) {
      return NextResponse.json({ error: "userId and tagName required" }, { status: 400 });
    }

    const user = await removeInterest(userId, tagName);
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
