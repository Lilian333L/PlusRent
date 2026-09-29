#!/usr/bin/env node
/**
 * Copy hand-written stylesheets into the critical stylesheets that need them.
 *
 * The first screen is painted from css/critical-*.css alone; everything else
 * arrives later (css/deferred-css.js). Rules that must be right on the first
 * paint therefore have to live inside the critical files. They are kept in
 * their own readable source files and copied in between two marker comments,
 * so running this again replaces the block and the source stays the one place
 * to edit:
 *
 *   css/menu-button.css   -> every critical-*.css (the burger is on every page)
 *   css/cars-catalog.css  -> critical-cars.css    (the /cars catalogue)
 *   css/premium-badge.css -> critical-home.css    (picked cars on the home page)
 *   css/home-perf.css     -> critical-home.css    (below-the-fold sections skipped)
 *
 * Afterwards the ?v= of each changed critical stylesheet has to change on the
 * pages that link it (the /css folder is cached for a year): this script does
 * that too, with the same 8-character sha1 fingerprint as scripts/use-minified.js.
 *
 *   node scripts/sync-critical-css.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const CleanCSS = require("clean-css");

const PUBLIC = path.join(__dirname, "..", "public");
const CSS = path.join(PUBLIC, "css");

const BLOCKS = [
  { source: "menu-button.css", marker: "menu-button", targets: (name) => /^critical-.+\.css$/.test(name) },
  { source: "cars-catalog.css", marker: "cars-catalog", targets: (name) => name === "critical-cars.css" },
  { source: "premium-badge.css", marker: "premium-badge", targets: (name) => name === "critical-home.css" },
  { source: "home-perf.css", marker: "home-perf", targets: (name) => name === "critical-home.css" },
];

const fingerprint = (buf) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);

function withBlock(css, marker, body) {
  const start = `/* ${marker}:start */`;
  const end = `/* ${marker}:end */`;
  const block = start + body + end;
  const s = css.indexOf(start);
  const e = css.indexOf(end);
  return s >= 0 && e > s
    ? css.slice(0, s) + block + css.slice(e + end.length)
    : css.replace(/\s*$/, "\n") + block + "\n";
}

const minified = new Map();
for (const b of BLOCKS) {
  const out = new CleanCSS({ level: 1 }).minify(fs.readFileSync(path.join(CSS, b.source), "utf8"));
  if (out.errors.length) throw new Error(b.source + ": " + out.errors.join("; "));
  minified.set(b.marker, out.styles);
}

const changed = new Map(); // critical file name -> new fingerprint
for (const name of fs.readdirSync(CSS)) {
  const blocks = BLOCKS.filter((b) => b.targets(name));
  if (!blocks.length) continue;
  const file = path.join(CSS, name);
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  for (const b of blocks) after = withBlock(after, b.marker, minified.get(b.marker));
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed.set(name, fingerprint(after));
  }
}

// every html page, including the car page template that lib/render-car-page.js fills in
const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) pages.push(full);
  }
})(PUBLIC);

let refs = 0;
for (const page of pages) {
  let html = fs.readFileSync(page, "utf8");
  let touched = false;
  for (const [name, v] of changed) {
    const re = new RegExp("(css/" + name.replace(/[.]/g, "\\.") + ")(\\?v=[0-9a-z]+)?", "g");
    html = html.replace(re, (m, p) => { touched = true; refs++; return p + "?v=" + v; });
  }
  if (touched) fs.writeFileSync(page, html);
}

console.log(`${changed.size} critical stylesheets updated, ${refs} references restamped`);
