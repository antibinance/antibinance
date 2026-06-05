import { NextResponse } from "next/server";
import { getSession } from "@/lib/jwt";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.address, session.address.toLowerCase()),
  });

  return NextResponse.json({ user: user || null });
}
