import { NextRequest, NextResponse } from "next/server";
import { db, posts, users, losses } from "@/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { getSession } from "@/lib/jwt";

// GET /api/users/[address]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const cleanAddress = address.toLowerCase().trim();
    const session = await getSession();

    // Fetch user details
    const userResult = await db
      .select({
        address: users.address,
        username: users.username,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.address, cleanAddress));

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profileUser = userResult[0];

    // Aggregate total loss
    const lossResult = await db
      .select({
        totalLoss: sql<number>`COALESCE(sum(${losses.amountUsd}), 0)`,
      })
      .from(losses)
      .where(eq(losses.userAddress, cleanAddress));
    
    const totalLossUsd = Number(lossResult[0]?.totalLoss || 0);

    // Fetch user's posts (both global posts and replies)
    const userPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        proofUrl: posts.proofUrl,
        mediaUrl: posts.mediaUrl,
        mediaType: posts.mediaType,
        createdAt: posts.createdAt,
        tokenSymbol: posts.tokenSymbol,
        replyToId: posts.replyToId,
        likesCount: posts.likesCount,
        repliesCount: posts.repliesCount,
        user: {
          address: users.address,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
        ...(session
          ? {
              isLiked: sql<boolean>`EXISTS (
                SELECT 1 FROM likes
                WHERE likes.post_id = ${posts.id}
                AND likes.user_address = ${session.address.toLowerCase()}
              )`.as("is_liked"),
            }
          : {}),
      })
      .from(posts)
      .innerJoin(users, eq(posts.userAddress, users.address))
      .where(eq(posts.userAddress, cleanAddress))
      .orderBy(desc(posts.createdAt));

    const formattedPosts = userPosts.map((p) => ({
      ...p,
      isLiked: session ? !!(p as any).isLiked : false,
    }));

    return NextResponse.json({
      success: true,
      user: {
        ...profileUser,
        totalLossUsd,
        postCount: formattedPosts.length,
      },
      posts: formattedPosts,
    });
  } catch (error: any) {
    console.error("Fetch profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
