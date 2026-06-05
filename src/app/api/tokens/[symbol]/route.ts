import { NextRequest, NextResponse } from "next/server";
import { db, tokens, losses, posts } from "@/db";
import { eq, sql } from "drizzle-orm";

type RouteParams = {
  params: Promise<{ symbol: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = await params;
    const cleanSymbol = symbol.toUpperCase().trim();

    const tokenDetails = await db.query.tokens.findFirst({
      where: eq(tokens.symbol, cleanSymbol),
    });

    if (!tokenDetails) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const stats = await db
      .select({
        totalLossUsd: sql<number>`COALESCE(SUM(${losses.amountUsd}), 0)::int`,
        victimCount: sql<number>`COUNT(DISTINCT ${losses.userAddress})::int`,
        postCount: sql<number>`COUNT(DISTINCT ${posts.id})::int`,
      })
      .from(tokens)
      .leftJoin(losses, eq(tokens.symbol, losses.tokenSymbol))
      .leftJoin(posts, eq(tokens.symbol, posts.tokenSymbol))
      .where(eq(tokens.symbol, cleanSymbol))
      .groupBy(tokens.symbol);

    const mergedStats = stats[0] || { totalLossUsd: 0, victimCount: 0, postCount: 0 };

    return NextResponse.json({
      token: {
        ...tokenDetails,
        ...mergedStats,
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to fetch token details" }, { status: 500 });
  }
}
