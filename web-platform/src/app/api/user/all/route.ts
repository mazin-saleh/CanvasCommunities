import { NextResponse } from "next/server";
import { getUsers } from "@/services/userService";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json(users);
}