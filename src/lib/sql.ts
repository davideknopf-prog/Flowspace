import { neon } from "@neondatabase/serverless";

// Single shared SQL tagged-template client for the whole app. Neon's serverless
// driver is HTTP-based (no persistent connection to manage), which is what
// makes it safe to use from Vercel's serverless functions.
//
// Usage: await sql`select * from teachers where id = ${id}`
export const sql = neon(process.env.DATABASE_URL!);
