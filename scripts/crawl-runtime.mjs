// Runtime reachability crawl: BFS every internal link from the running app,
// record HTTP status, flag errors. Complements audit-links.mjs (which proves
// links point at real routes); this proves those routes actually render.
// Usage: BASE=http://localhost:3000 node scripts/crawl-runtime.mjs
const BASE = process.env.BASE ?? "http://localhost:3000";

// Public seed routes (some aren't linked from the home page).
const SEEDS = [
  "/", "/students", "/teachers", "/schedule", "/guide",
  "/terms", "/privacy", "/waiver", "/login", "/signup",
  "/subscribe", "/subscribe/success",
];

const AUTH_GATED = /\/dashboard(\/|$)/; // redirect to sign-in is expected

const queue = [...SEEDS];
const seen = new Set(queue);
const results = [];

function internal(href) {
  if (!href) return null;
  if (href.startsWith("#")) return null;
  if (/^(mailto:|tel:|https?:\/\/(?!localhost))/i.test(href)) return null;
  try {
    const u = new URL(href, BASE);
    if (u.origin !== new URL(BASE).origin) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

function extractLinks(html) {
  const out = [];
  for (const m of html.matchAll(/href="([^"]+)"/g)) out.push(m[1]);
  return out;
}

const ERROR_MARKERS = [
  "Application error",
  "Internal Server Error",
  "This page could not be found",
  "Unhandled Runtime Error",
  "500",
];

while (queue.length) {
  const p = queue.shift();
  const url = BASE + p;
  let status = 0;
  let note = "";
  let html = "";
  try {
    const res = await fetch(url, { redirect: "manual" });
    status = res.status;
    if (status >= 300 && status < 400) {
      const loc = res.headers.get("location") ?? "";
      note = `→ ${loc.replace(BASE, "")}`;
      if (AUTH_GATED.test(p)) note += " (auth-gated, ok)";
    } else if (status === 200) {
      const ctype = res.headers.get("content-type") ?? "";
      const body = await res.text();
      // Only scan actual HTML documents for error markers — minified JS/CSS
      // assets legitimately contain strings like "500" and would false-positive.
      if (ctype.includes("text/html")) {
        html = body;
        const isNextError = html.includes("__next_error__");
        const marker = ERROR_MARKERS.find((mk) => html.includes(mk));
        if (isNextError || (marker && html.length < 4000)) {
          note = `rendered but shows error text (${marker ?? "next_error"})`;
          status = -1; // treat as broken
        }
      }
    }
  } catch (e) {
    note = `FETCH FAILED: ${e.message}`;
    status = -2;
  }
  results.push({ p, status, note });

  // Enqueue newly-discovered internal links from 200 HTML pages.
  if (html) {
    for (const href of extractLinks(html)) {
      const ip = internal(href);
      if (ip && !seen.has(ip) && !ip.startsWith("/api/")) {
        seen.add(ip);
        queue.push(ip);
      }
    }
  }
}

results.sort((a, b) => a.p.localeCompare(b.p));
const broken = results.filter(
  (r) => r.status === -1 || r.status === -2 || r.status === 404 || r.status >= 500,
);

console.log(`Crawled ${results.length} internal URLs from ${BASE}\n`);
for (const r of results) {
  const flag =
    r.status === 200 ? "✅" :
    r.status >= 300 && r.status < 400 ? "↪️ " :
    "❌";
  console.log(`${flag} ${String(r.status).padStart(4)}  ${r.p}${r.note ? "  " + r.note : ""}`);
}
console.log("");
if (broken.length === 0) {
  console.log("✅ No broken pages — every reachable route renders or redirects cleanly.");
} else {
  console.log(`❌ ${broken.length} problem URL(s):`);
  for (const b of broken) console.log(`   ${b.p}  [${b.status}] ${b.note}`);
  process.exitCode = 1;
}
