// One-off schema setup. Run with: npm run db:migrate
// Reads schema.sql and executes it against DATABASE_URL (loaded from .env.local).
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found — run `vercel env pull .env.local` first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(path.join(__dirname, "../src/lib/schema.sql"), "utf8");

// Neon's HTTP driver executes one statement per call, so split on semicolons.
const statements = schema
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
  console.log("OK:", statement.split("\n")[0].slice(0, 60));
}

console.log(`\nDone — ${statements.length} statements applied.`);
