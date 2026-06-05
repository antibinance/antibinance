import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMessage } from "viem";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { address, signature } = await req.json();

    if (!address || !signature) {
      return NextResponse.json({ error: "Address and signature are required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const nonce = cookieStore.get("auth_nonce")?.value;

    if (!nonce) {
      return NextResponse.json({ error: "Nonce expired or not found. Please refresh nonce." }, { status: 400 });
    }

    // Verify the message signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: nonce,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Clear the nonce cookie
    cookieStore.delete("auth_nonce");

    // Fetch user or create if new
    const cleanAddress = address.toLowerCase();
    let user = await db.query.users.findFirst({
      where: eq(users.address, cleanAddress),
    });

    if (!user) {
      const defaultUsername = `Victim_${cleanAddress.slice(2, 8)}`;
      const newUsers = await db.insert(users).values({
        address: cleanAddress,
        username: defaultUsername,
      }).returning();
      user = newUsers[0];
    }

    // Encrypt session JWT
    const token = await encrypt({
      address: user.address,
      username: user.username,
    });

    // Set cookie
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: error.message || "Authentication failed" }, { status: 500 });
  }
}
