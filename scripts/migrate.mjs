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

// Neon's HTTP driver executes one statement per call, so we split on `;`.
// A naive `schema.split(";")` breaks the moment a comment or string literal
// contains a semicolon (it did — see the 'flexible' comment). This scanner
// splits on top-level semicolons only: it skips `--` line comments, `/* */`
// block comments, and single-quoted string literals (respecting '' escapes),
// so semicolons inside any of those never split a statement.
function splitStatements(input) {
  const out = [];
  let buf = "";
  let inLine = false; // inside -- comment
  let inBlock = false; // inside /* */ comment
  let inStr = false; // inside '...' literal
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const next = input[i + 1];
    if (inLine) {
      if (c === "\n") inLine = false;
      continue;
    }
    if (inBlock) {
      if (c === "*" && next === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      buf += c;
      if (c === "'") {
        if (next === "'") {
          buf += next;
          i++;
        } else {
          inStr = false;
        }
      }
      continue;
    }
    if (c === "-" && next === "-") {
      inLine = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlock = true;
      i++;
      continue;
    }
    if (c === "'") {
      inStr = true;
      buf += c;
      continue;
    }
    if (c === ";") {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = "";
      continue;
    }
    buf += c;
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

const statements = splitStatements(schema);

for (const statement of statements) {
  await sql.query(statement);
  console.log("OK:", statement.split("\n")[0].slice(0, 60));
}

console.log(`\nDone — ${statements.length} statements applied.`);
