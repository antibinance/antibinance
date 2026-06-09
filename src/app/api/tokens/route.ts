import { NextRequest, NextResponse } from "next/server";
import { db, tokens, losses, posts } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/jwt";

const ADMIN_ADDRESS = "0x0eb91e88f17d1c000a94fa2bb0db72830a265a23";

// GET /api/tokens
export async function GET() {
  try {
    const list = await db
      .select({
        symbol: tokens.symbol,
        name: tokens.name,
        iconUrl: tokens.iconUrl,
        binanceUrl: tokens.binanceUrl,
        description: tokens.description,
        listedAt: tokens.listedAt,
        totalLossUsd: sql<number>`COALESCE(SUM(${losses.amountUsd}), 0)::int`,
        victimCount: sql<number>`COUNT(DISTINCT ${losses.userAddress})::int`,
        postCount: sql<number>`COUNT(DISTINCT ${posts.id})::int`,
      })
      .from(tokens)
      .leftJoin(losses, eq(tokens.symbol, losses.tokenSymbol))
      .leftJoin(posts, eq(tokens.symbol, posts.tokenSymbol))
      .groupBy(tokens.symbol)
      .orderBy(sql`COALESCE(SUM(${losses.amountUsd}), 0) DESC`);

    return NextResponse.json({ tokens: list });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to fetch tokens" }, { status: 500 });
  }
}

// POST /api/tokens
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please connect wallet first." }, { status: 401 });
  }

  // Check if admin
  if (session.address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    return NextResponse.json(
      { error: "Forbidden. Only the administrator can track new tokens." },
      { status: 403 }
    );
  }

  try {
    const { symbol, name, description, binanceUrl, listedAt } = await req.json();

    if (!symbol || !name) {
      return NextResponse.json({ error: "Symbol and Name are required" }, { status: 400 });
    }

    const cleanSymbol = symbol.toUpperCase().trim();
    
    // Check if exists
    const existing = await db.query.tokens.findFirst({
      where: eq(tokens.symbol, cleanSymbol),
    });

    if (existing) {
      return NextResponse.json({ error: "Token already exists" }, { status: 400 });
    }

    const newToken = await db
      .insert(tokens)
      .values({
        symbol: cleanSymbol,
        name: name.trim(),
        description: description || "",
        binanceUrl: binanceUrl || "",
        listedAt: listedAt ? new Date(listedAt) : null,
      })
      .returning();

    return NextResponse.json({ success: true, token: newToken[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create token" }, { status: 500 });
  }
}
