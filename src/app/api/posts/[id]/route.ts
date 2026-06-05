import { NextRequest, NextResponse } from "next/server";
import { db, posts, users, likes } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/jwt";

// GET /api/posts/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const result = await db
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
      .where(eq(posts.id, id));

    if (result.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = {
      ...result[0],
      isLiked: session ? !!(result[0] as any).isLiked : false,
    };

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch post" },
      { status: 500 }
    );
  }
}
