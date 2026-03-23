import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/services/userService";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });

    const user = await createUser(username, password);
    return NextResponse.json({ id: user.id, username: user.username });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}