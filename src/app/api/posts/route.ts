import { NextRequest, NextResponse } from "next/server";
import { db, posts, users, likes } from "@/db";
import { desc, eq, and, isNull, lt, sql } from "drizzle-orm";
import { getSession } from "@/lib/jwt";

// GET /api/posts?tokenSymbol=LUNA&cursor=2024-01-01T00:00:00Z&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenSymbol = searchParams.get("tokenSymbol");
    const cursor = searchParams.get("cursor"); // ISO string of last post's createdAt
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const session = await getSession();

    // Build WHERE conditions: always filter to top-level posts only
    const conditions: ReturnType<typeof eq>[] = [isNull(posts.replyToId)];

    if (tokenSymbol) {
      conditions.push(eq(posts.tokenSymbol, tokenSymbol.toUpperCase()));
    }

    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)));
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
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1); // Fetch one extra to check for next page

    const hasMore = results.length > limit;
    const page = results.slice(0, limit).map((r) => ({
      ...r,
      isLiked: session ? !!(r as any).isLiked : false,
    }));

    const nextCursor = hasMore
      ? page[page.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({ posts: page, nextCursor });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST /api/posts
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please connect MetaMask." },
      { status: 401 }
    );
  }

  try {
    const { content, tokenSymbol, proofUrl, replyToId, mediaUrl, mediaType } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Post content cannot be empty" },
        { status: 400 }
      );
    }

    // If replying, verify parent post exists
    if (replyToId) {
      const parent = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.id, replyToId));

      if (parent.length === 0) {
        return NextResponse.json(
          { error: "Parent post not found" },
          { status: 404 }
        );
      }
    }

    const postId = crypto.randomUUID();
    const cleanAddress = session.address.toLowerCase();

    await db.insert(posts).values({
      id: postId,
      tokenSymbol: tokenSymbol ? tokenSymbol.toUpperCase().trim() : null,
      userAddress: cleanAddress,
      content: content.trim(),
      proofUrl: proofUrl || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      replyToId: replyToId || null,
    });

    // If this is a reply, increment parent's repliesCount
    if (replyToId) {
      await db
        .update(posts)
        .set({ repliesCount: sql`${posts.repliesCount} + 1` })
        .where(eq(posts.id, replyToId));
    }

    // Fetch the inserted post with author info
    const fullPost = await db
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
      })
      .from(posts)
      .innerJoin(users, eq(posts.userAddress, users.address))
      .where(eq(posts.id, postId));

    return NextResponse.json({ success: true, post: fullPost[0] });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to create post" },
      { status: 500 }
    );
  }
}
