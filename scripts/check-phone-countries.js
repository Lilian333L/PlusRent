#!/usr/bin/env node
/**
 * The country table exists twice: once for the browser, in
 * public/js/phone-input.js, and once for the server, in lib/phone-countries.js.
 * The browser copy has to be a plain script with no imports, and the server
 * copy has to be requireable, so neither can borrow the other's.
 *
 * This checks they still agree. Run it after touching either:  npm run phones
 */

const fs = require("fs");
const path = require("path");

const widgetSource = fs.readFileSync(
  path.join(__dirname, "..", "public", "js", "phone-input.js"),
  "utf8"
);

const at = widgetSource.indexOf("var RAW");
if (at === -1) {
  console.error("could not find the country table in phone-input.js");
  process.exit(1);
}
const block = widgetSource.slice(at, widgetSource.indexOf("\n\n", at));
const widgetRaw = [...block.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("");

const widget = new Map(
  widgetRaw.split("|").filter(Boolean).map((row) => {
    const bits = row.split(",");
    return [bits[0], { dial: bits[1], name: bits.slice(2).join(",") }];
  })
);

const { COUNTRIES } = require("../lib/phone-countries");
const server = new Map(COUNTRIES.map((c) => [c.iso, { dial: c.dial, name: c.name }]));

const problems = [];
for (const [iso, c] of widget) {
  const s = server.get(iso);
  if (!s) { problems.push("missing on the server: " + iso); continue; }
  if (s.dial !== c.dial) problems.push(iso + " dial " + c.dial + " vs " + s.dial);
  if (s.name !== c.name) problems.push(iso + " name " + c.name + " vs " + s.name);
}
for (const iso of server.keys()) {
  if (!widget.has(iso)) problems.push("missing in the widget: " + iso);
}

console.log("widget: " + widget.size + " countries, server: " + server.size);
if (problems.length) {
  console.log("\nthe two tables disagree:");
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
} else {
  console.log("the two tables agree");
}
