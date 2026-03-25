import { NextResponse } from "next/server";
import { getAllTags } from "@/services/userService";

export async function GET() {
  try {
    const tags = await getAllTags();
    return NextResponse.json(tags);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
