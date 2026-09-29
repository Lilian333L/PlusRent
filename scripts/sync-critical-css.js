#!/usr/bin/env node
/**
 * Copy css/menu-button.css (the burger button) into every css/critical-*.css.
 *
 * The button is on the first screen of every page, and the first screen is
 * painted from the critical stylesheet alone, so its rules have to live there.
 * They sit between two marker comments at the end of each file; running this
 * again replaces that block, so menu-button.css stays the one place to edit.
 *
 * Afterwards the ?v= of each critical stylesheet has to change on the pages
 * that link it (the /css folder is cached for a year): this script does that
 * too, using the same 8-character sha1 fingerprint as scripts/use-minified.js.
 *
 *   node scripts/sync-menu-button-css.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const CleanCSS = require("clean-css");

const PUBLIC = path.join(__dirname, "..", "public");
const CSS = path.join(PUBLIC, "css");
const START = "/* menu-button:start */";
const END = "/* menu-button:end */";

const source = fs.readFileSync(path.join(CSS, "menu-button.css"), "utf8");
const min = new CleanCSS({ level: 1 }).minify(source);
if (min.errors.length) throw new Error(min.errors.join("; "));
const block = START + min.styles + END;

const fingerprint = (buf) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);

const changed = new Map(); // file name -> new fingerprint
for (const name of fs.readdirSync(CSS)) {
  if (!/^critical-.+\.css$/.test(name)) continue;
  const file = path.join(CSS, name);
  const before = fs.readFileSync(file, "utf8");
  const s = before.indexOf(START);
  const e = before.indexOf(END);
  const after = s >= 0 && e > s
    ? before.slice(0, s) + block + before.slice(e + END.length)
    : before.replace(/\s*$/, "\n") + block + "\n";
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed.set(name, fingerprint(after));
  }
}

// every html page, plus the car page template that lib/render-car-page.js fills in
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
