import { NextRequest, NextResponse } from "next/server";
import { db, posts, likes } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/jwt";

// POST /api/posts/[id]/like
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please connect MetaMask." },
      { status: 401 }
    );
  }

  try {
    const { id: postId } = await params;
    const userAddress = session.address.toLowerCase();

    // Check if already liked
    const existing = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userAddress, userAddress)));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "You already liked this post" },
        { status: 409 }
      );
    }

    const likeId = crypto.randomUUID();

    // Insert like and increment counter
    await db.insert(likes).values({
      id: likeId,
      userAddress,
      postId,
    });

    await db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} + 1` })
      .where(eq(posts.id, postId));

    return NextResponse.json({ success: true, liked: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to like post" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id]/like
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please connect MetaMask." },
      { status: 401 }
    );
  }

  try {
    const { id: postId } = await params;
    const userAddress = session.address.toLowerCase();

    // Delete the like
    const deleted = await db
      .delete(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userAddress, userAddress)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "You have not liked this post" },
        { status: 404 }
      );
    }

    // Decrement counter
    await db
      .update(posts)
      .set({ likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)` })
      .where(eq(posts.id, postId));

    return NextResponse.json({ success: true, liked: false });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to unlike post" },
      { status: 500 }
    );
  }
}
