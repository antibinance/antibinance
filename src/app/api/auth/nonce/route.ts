import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const nonce = `Sign this message to authenticate with AntiBinance. Challenges are one-time use.\n\nNonce: ${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  
  const cookieStore = await cookies();
  cookieStore.set("auth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes validity
  });

  return NextResponse.json({ nonce });
}
