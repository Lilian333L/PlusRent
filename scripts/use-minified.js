#!/usr/bin/env node
/**
 * Point every page at the minified twin of each stylesheet and script.
 *
 * Run after scripts/minify-assets.js. It only ever rewrites a reference when
 * the minified file actually exists on disk, and it finishes by checking that
 * every asset any page now asks for is really there, so a typo cannot ship as
 * a 404.
 *
 * Two scripts load other scripts by name at runtime rather than through a tag;
 * those strings are rewritten too.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

/** Every html file under public/, plus the two loaders that name scripts. */
function targets() {
  const html = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (entry.name.endsWith(".html")) html.push(full);
    }
  };
  walk(PUBLIC);
  return html.concat([
    path.join(PUBLIC, "js", "master-include.js"),
    path.join(PUBLIC, "js", "universal-include.js"),
  ]);
}

const hasMin = (rel) => fs.existsSync(path.join(PUBLIC, rel.replace(/\.(css|js)$/, ".min.$1")));

function rewrite(text) {
  let changes = 0;
  // css/foo.css or /css/foo.css, with or without a ?v= after it
  const out = text.replace(
    /(["'(])(\/?)((?:css|js)\/(?:[a-z0-9._-]+\/)*[a-z0-9._-]+)\.(css|js)((?:\?[^"')]*)?)(["')])/gi,
    (whole, open, slash, stem, ext, query, close) => {
      const rel = stem + "." + ext;
      if (/\.min$/.test(stem)) return whole;
      if (!hasMin(rel)) return whole;
      changes++;
      return open + slash + stem + ".min." + ext + query + close;
    }
  );
  return { out, changes };
}

let files = 0;
let total = 0;
for (const file of targets()) {
  const text = fs.readFileSync(file, "utf8");
  const { out, changes } = rewrite(text);
  if (!changes) continue;
  fs.writeFileSync(file, out);
  files++;
  total += changes;
}
console.log(`rewrote ${total} references across ${files} files`);

// ---- every reference must resolve to a file that exists ----
const missing = new Map();
for (const file of targets()) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/(["'(])\/?((?:css|js)\/(?:[a-z0-9._-]+\/)*[a-z0-9._-]+\.(?:css|js))(?:\?[^"')]*)?(["')])/gi)) {
    const rel = m[2];
    if (fs.existsSync(path.join(PUBLIC, rel))) continue;
    if (!missing.has(rel)) missing.set(rel, new Set());
    missing.get(rel).add(path.relative(ROOT, file));
  }
}
if (missing.size) {
  console.log("\nreferences with no file behind them:");
  for (const [rel, where] of missing)
    console.log(`  ${rel}\n     ${[...where].slice(0, 4).join("\n     ")}`);
  process.exitCode = 1;
} else {
  console.log("every referenced stylesheet and script exists");
}
