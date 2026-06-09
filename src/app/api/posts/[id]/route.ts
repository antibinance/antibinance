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

// DELETE /api/posts/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please connect MetaMask." },
        { status: 401 }
      );
    }

    // Fetch the post to check ownership
    const postResult = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id));

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postResult[0];

    // Verify ownership
    if (post.userAddress.toLowerCase() !== session.address.toLowerCase()) {
      return NextResponse.json(
        { error: "Forbidden. You can only delete your own posts." },
        { status: 403 }
      );
    }

    // If it's a reply, decrement parent's repliesCount
    if (post.replyToId) {
      await db
        .update(posts)
        .set({ repliesCount: sql`GREATEST(0, ${posts.repliesCount} - 1)` })
        .where(eq(posts.id, post.replyToId));
    }

    // Delete replies to this post (cascading deletes)
    await db.delete(posts).where(eq(posts.replyToId, id));

    // Delete the post itself
    await db.delete(posts).where(eq(posts.id, id));

    return NextResponse.json({ success: true, message: "Post deleted successfully" });
  } catch (error: any) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete post" },
      { status: 500 }
    );
  }
}
