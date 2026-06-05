import { NextRequest, NextResponse } from "next/server";
import { db, losses, users, tokens } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/jwt";

// GET /api/losses: fetches recent losses
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenSymbol = searchParams.get("tokenSymbol");

    let query = db
      .select({
        id: losses.id,
        tokenSymbol: losses.tokenSymbol,
        amountUsd: losses.amountUsd,
        entryPrice: losses.entryPrice,
        exitPrice: losses.exitPrice,
        proofUrl: losses.proofUrl,
        createdAt: losses.createdAt,
        user: {
          address: users.address,
          username: users.username,
        },
      })
      .from(losses)
      .innerJoin(users, eq(losses.userAddress, users.address))
      .orderBy(desc(losses.createdAt));

    if (tokenSymbol) {
      query = db
        .select({
          id: losses.id,
          tokenSymbol: losses.tokenSymbol,
          amountUsd: losses.amountUsd,
          entryPrice: losses.entryPrice,
          exitPrice: losses.exitPrice,
          proofUrl: losses.proofUrl,
          createdAt: losses.createdAt,
          user: {
            address: users.address,
            username: users.username,
          },
        })
        .from(losses)
        .innerJoin(users, eq(losses.userAddress, users.address))
        .where(eq(losses.tokenSymbol, tokenSymbol.toUpperCase()))
        .orderBy(desc(losses.createdAt)) as any;
    }

    const results = await query;
    return NextResponse.json({ losses: results });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to fetch losses" }, { status: 500 });
  }
}

// POST /api/losses
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please connect MetaMask." }, { status: 401 });
  }

  try {
    const { tokenSymbol, amountUsd, entryPrice, exitPrice, proofUrl } = await req.json();

    if (!tokenSymbol || !amountUsd) {
      return NextResponse.json({ error: "Token symbol and loss amount are required" }, { status: 400 });
    }

    const cleanSymbol = tokenSymbol.toUpperCase().trim();

    // Check if token exists
    const tokenExists = await db.query.tokens.findFirst({
      where: eq(tokens.symbol, cleanSymbol),
    });

    if (!tokenExists) {
      return NextResponse.json({ error: `Token ${cleanSymbol} not tracked yet. Add it first.` }, { status: 400 });
    }

    const lossId = crypto.randomUUID();
    const cleanAddress = session.address.toLowerCase();

    const newLoss = await db
      .insert(losses)
      .values({
        id: lossId,
        tokenSymbol: cleanSymbol,
        userAddress: cleanAddress,
        amountUsd: parseInt(amountUsd, 10),
        entryPrice: entryPrice ? entryPrice.toString() : null,
        exitPrice: exitPrice ? exitPrice.toString() : null,
        proofUrl: proofUrl || null,
      })
      .returning();

    return NextResponse.json({ success: true, loss: newLoss[0] });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to submit loss report" }, { status: 500 });
  }
}
