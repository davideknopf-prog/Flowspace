// Deterministic link audit: every internal navigation target in the source
// (href=, redirect(), NextResponse.redirect) is resolved against the actual
// Next.js route tree. Anything that can't resolve to a real route is a broken
// link. No network — pure static analysis, rerunnable in CI. Run:
//   node scripts/audit-links.mjs
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(__dirname, "../src/app");
const SRC = path.join(__dirname, "../src");

// ---- 1. Build the set of valid route patterns from the file tree ----------
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name === "page.tsx" || name === "route.ts") out.push(full);
  }
  return out;
}

function toPattern(file) {
  let rel = file.slice(APP.length).replace(/\\/g, "/");
  rel = rel.replace(/\/(page\.tsx|route\.ts)$/, "");
  // Drop route groups like (auth) — they don't add a URL segment.
  rel = rel
    .split("/")
    .filter((seg) => !(seg.startsWith("(") && seg.endsWith(")")))
    .join("/");
  if (rel === "") rel = "/";
  // Dynamic segments [x] / [...x] → wildcard.
  const regex = rel
    .split("/")
    .map((seg) =>
      /^\[\.\.\..+\]$/.test(seg) ? ".+" : /^\[.+\]$/.test(seg) ? "[^/]+" : seg,
    )
    .join("/");
  return { route: rel, re: new RegExp(`^${regex === "/" ? "/" : regex}/?$`) };
}

const routes = walk(APP).map(toPattern);
// Static assets that live in /public are also valid targets.
const publicFiles = new Set();
(function walkPublic(dir, base = "") {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    const rel = `${base}/${name}`;
    if (statSync(full).isDirectory()) walkPublic(full, rel);
    else publicFiles.add(rel);
  }
})(path.join(__dirname, "../public"));

function resolves(target) {
  // Strip query + hash for route matching.
  let p = target.split("#")[0].split("?")[0];
  if (p === "") return true; // pure #anchor or ?query on current page
  if (publicFiles.has(p)) return true;
  return routes.some((r) => r.re.test(p));
}

// ---- 2. Collect every internal navigation target from the source ----------
function walkSrc(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkSrc(full));
    else if (/\.(tsx?|jsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

// Replace ${...} interpolations with a placeholder path segment so template
// hrefs like `/t/${slug}/book/${id}` become `/t/X/book/X` for matching.
function normalizeTemplate(s) {
  return s.replace(/\$\{[^}]*\}/g, "X");
}

const patterns = [
  /href=\{`([^`]+)`\}/g, // href={`...`}
  /href=\{"([^"]+)"\}/g, // href={"..."}
  /href="([^"]+)"/g, // href="..."
  /redirect\(\s*`([^`]+)`/g, // redirect(`...`)
  /redirect\(\s*"([^"]+)"/g, // redirect("...")
  /\.redirect\(\s*`([^`]+)`/g, // NextResponse.redirect(`...`)
];

const findings = [];
const seen = new Set();

for (const file of walkSrc(SRC)) {
  const text = readFileSync(file, "utf8");
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      let target = normalizeTemplate(m[1]).trim();
      // Only internal, navigable targets.
      if (
        !target.startsWith("/") ||
        target.startsWith("//") // protocol-relative external
      )
        continue;
      // Strip a leading ${origin} style already handled; strip origin prefixes.
      const key = `${file}::${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!resolves(target)) {
        findings.push({
          file: file.slice(SRC.length + 1),
          target: m[1],
          normalized: target,
        });
      }
    }
  }
}

// ---- 3. Report -------------------------------------------------------------
console.log(`Routes discovered: ${routes.length}`);
console.log(routes.map((r) => "  " + r.route).sort().join("\n"));
console.log("");
if (findings.length === 0) {
  console.log("✅ No broken internal links — every href/redirect resolves to a real route.");
} else {
  console.log(`❌ ${findings.length} unresolved internal target(s):\n`);
  for (const f of findings) {
    console.log(`  ${f.normalized}`);
    console.log(`      in ${f.file}  (source: ${f.target})`);
  }
  process.exitCode = 1;
}
