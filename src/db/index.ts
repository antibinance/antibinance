import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/antibinance";

// For edge environments / serverless we can reuse the client or make a new one
export const client = postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 10 : 1,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(client, { schema });
export type DbType = typeof db;
export * from "./schema";
