import { NextRequest, NextResponse } from "next/server";
import { db, posts, users } from "@/db";
import { eq, and, gt, asc, sql } from "drizzle-orm";
import { getSession } from "@/lib/jwt";

// GET /api/posts/[id]/replies?cursor=...&limit=20
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // ISO string of last reply's createdAt
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const session = await getSession();

    const conditions = [eq(posts.replyToId, postId)];
    if (cursor) {
      conditions.push(gt(posts.createdAt, new Date(cursor)));
    }

    const results = await db
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
      .where(and(...conditions))
      .orderBy(asc(posts.createdAt))
      .limit(limit + 1); // Fetch one extra to determine if there's a next page

    const hasMore = results.length > limit;
    const replies = results.slice(0, limit).map((r) => ({
      ...r,
      isLiked: session ? !!(r as any).isLiked : false,
    }));

    const nextCursor = hasMore
      ? replies[replies.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({ replies, nextCursor });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch replies" },
      { status: 500 }
    );
  }
}
