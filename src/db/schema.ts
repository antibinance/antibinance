import { pgTable, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  address: text("address").primaryKey(), // Lowercase Ethereum address
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokens = pgTable("tokens", {
  symbol: text("symbol").primaryKey(), // e.g. LUNA, FTT, PEPE, WIF (uppercase)
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  binanceUrl: text("binance_url"),
  description: text("description"),
  listedAt: timestamp("listed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: text("id").primaryKey(), // nanoid or uuid
  tokenSymbol: text("token_symbol").references(() => tokens.symbol, { onDelete: "cascade" }), // Nullable means global feed post
  userAddress: text("user_address").notNull().references(() => users.address, { onDelete: "cascade" }),
  content: text("content").notNull(),
  proofUrl: text("proof_url"),
  mediaUrl: text("media_url"), // URL to uploaded image/video
  mediaType: text("media_type"), // 'image' | 'video' | null
  replyToId: text("reply_to_id"), // Self-reference for replies (nullable)
  likesCount: integer("likes_count").notNull().default(0),
  repliesCount: integer("replies_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  id: text("id").primaryKey(), // UUID
  userAddress: text("user_address").notNull().references(() => users.address, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const losses = pgTable("losses", {
  id: text("id").primaryKey(),
  tokenSymbol: text("token_symbol").notNull().references(() => tokens.symbol, { onDelete: "cascade" }),
  userAddress: text("user_address").notNull().references(() => users.address, { onDelete: "cascade" }),
  amountUsd: integer("amount_usd").notNull(), // Loss in USD
  entryPrice: numeric("entry_price"),
  exitPrice: numeric("exit_price"),
  proofUrl: text("proof_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
