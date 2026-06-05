import { NextRequest, NextResponse } from "next/server";
import { db, tokens, losses, posts } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/jwt";

// GET /api/tokens
export async function GET() {
  try {
    // We want to query tokens and aggregate their total losses and post counts
    // Let's do raw SQL or query builder.
    let list = await db
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

    if (list.length === 0) {
      const defaultTokens = [
        { symbol: "LUNA", name: "Terra Classic", description: "The classic algorithmic stablecoin collapse that wiped out $40B in days.", binanceUrl: "https://www.binance.com/en/trade/LUNC_USDT", listedAt: new Date("2020-08-19") },
        { symbol: "FTT", name: "FTX Token", description: "Exchange utility token of bankrupt FTX, listed and traded right up to bankruptcy.", binanceUrl: "https://www.binance.com/en/trade/FTT_USDT", listedAt: new Date("2021-06-03") },
        { symbol: "PEPE", name: "Pepe Coin", description: "High-flying meme token listed by Binance during peak FOMO, causing extreme retail losses.", binanceUrl: "https://www.binance.com/en/trade/PEPE_USDT", listedAt: new Date("2023-05-05") },
        { symbol: "WIF", name: "Dogwifhat", description: "Popular Solana meme listed at multi-billion valuation, leading to instant dump.", binanceUrl: "https://www.binance.com/en/trade/WIF_USDT", listedAt: new Date("2024-03-05") },
        { symbol: "NEIRO", name: "Neiro Solana", description: "Highly controversial double meme-listing confusion causing heavy retail distribution.", binanceUrl: "https://www.binance.com/en/trade/NEIRO_USDT", listedAt: new Date("2024-09-16") },
      ];
      await db.insert(tokens).values(defaultTokens);

      list = await db
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
    }

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
