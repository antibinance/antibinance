import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/jwt";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username } = await req.json();
    if (!username || username.trim().length < 3 || username.trim().length > 20) {
      return NextResponse.json({ error: "Username must be between 3 and 20 characters" }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set({ username: username.trim() })
      .where(eq(users.address, session.address.toLowerCase()))
      .returning();

    return NextResponse.json({ success: true, user: updated[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update username" }, { status: 500 });
  }
}
