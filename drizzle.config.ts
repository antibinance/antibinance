import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

let databaseUrl = process.env.DATABASE_URL;
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    const match = envFile.match(/^DATABASE_URL\s*=\s*["']?(.*?)["']?$/m);
    if (match && match[1]) {
      databaseUrl = match[1].trim();
    }
  }
} catch (e) {
  console.error("Failed to load .env manually in drizzle config", e);
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl || "postgres://postgres:postgres@localhost:5432/antibinance",
  },
});
