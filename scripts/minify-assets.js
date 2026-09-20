#!/usr/bin/env node
/**
 * Write a minified twin of every first-party stylesheet and script, and point
 * the pages at it.
 *
 * The site has no build step: what is in public/ is what is served. That keeps
 * the project simple, but it also meant every page shipped its CSS and its
 * JavaScript with the indentation and the comments still in them, which the
 * site audit counts as an issue once per file per page, and which a visitor on
 * a phone pays for in bytes.
 *
 * So the readable file stays the file you edit, and this writes foo.min.css
 * beside foo.css and rewrites the references. Because the name changes, the
 * year-long immutable cache on /css and /js is bypassed for free: returning
 * visitors ask for a URL they have never seen.
 *
 * The minification is deliberately timid. CSS goes through clean-css at level
 * one, which removes whitespace and comments and does not reorder or merge
 * anything. JavaScript goes through terser with compress and mangle both off,
 * so no name changes and no code motion: the output is the same program with
 * the spaces taken out. Nothing here can change behaviour.
 *
 * Run it after editing any stylesheet or script:  npm run minify
 */

const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const { minify } = require("terser");

const PUBLIC = path.join(__dirname, "..", "public");

/** Files that are already minified, generated, or not ours to touch. */
const SKIP = [
  /\.min\.(css|js)$/,
  /^css\/critical-/,        // generated from the page stylesheets, already dense
  /^css\/page\//,           // extracted from the pages and minified on the way out
  /^css\/plugins\.css$/,    // template bundle, already minified
  /^css\/fonts\.css$/,      // already dense
  /\.map$/,
];

const isSkipped = (rel) => SKIP.some((re) => re.test(rel.replace(/\\/g, "/")));

/** Every css/ and js/ file under public/, as a path relative to public/. */
function assets() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(css|js)$/.test(entry.name)) continue;
      out.push(path.relative(PUBLIC, full).replace(/\\/g, "/"));
    }
  };
  walk(path.join(PUBLIC, "css"));
  walk(path.join(PUBLIC, "js"));
  return out;
}

/** A file already written without spaces does not need a twin. */
function looksMinified(text) {
  const lines = text.split("\n");
  return text.length / Math.max(1, lines.length) > 200;
}

async function main() {
  const written = [];
  const failed = [];

  for (const rel of assets()) {
    if (isSkipped(rel)) continue;
    const full = path.join(PUBLIC, rel);
    const source = fs.readFileSync(full, "utf8");
    if (looksMinified(source)) continue;

    const target = rel.replace(/\.(css|js)$/, ".min.$1");
    const targetFull = path.join(PUBLIC, target);

    try {
      let output;
      if (rel.endsWith(".css")) {
        const result = new CleanCSS({ level: 1, rebaseTo: path.dirname(targetFull) }).minify(source);
        if (result.errors.length) throw new Error(result.errors.join("; "));
        output = result.styles;
      } else {
        const result = await minify(source, {
          compress: false,
          mangle: false,
          format: { comments: false },
          sourceMap: false,
        });
        // a file that is entirely commented out minifies to nothing, which is
        // correct and not a failure; it simply has no twin worth writing
        if (!result.code) continue;
        output = result.code;
      }

      fs.writeFileSync(targetFull, output);
      written.push({ rel, target, from: source.length, to: output.length });
    } catch (err) {
      failed.push({ rel, message: err.message });
    }
  }

  const saved = written.reduce((n, w) => n + (w.from - w.to), 0);
  for (const w of written.sort((a, b) => b.from - a.from)) {
    const pct = Math.round((1 - w.to / w.from) * 100);
    console.log(`  ${String(pct).padStart(3)}%  ${(w.from / 1024).toFixed(0).padStart(5)}K -> ${(w.to / 1024).toFixed(0).padStart(5)}K  ${w.target}`);
  }
  console.log(`\nwrote ${written.length} minified files, ${(saved / 1024).toFixed(0)}K smaller in total`);
  if (failed.length) {
    console.log("\ncould not minify:");
    for (const f of failed) console.log(`  ${f.rel}: ${f.message}`);
    process.exitCode = 1;
  }
}

main();
