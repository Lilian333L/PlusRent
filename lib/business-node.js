/**
 * The business and the website, for pages that only point at them.
 *
 * A car page names PlusRent as the seller of its offer and the site as the
 * thing it belongs to, both by @id, and defined neither. A crawler does not
 * follow an @id to another page, so the page that carries the most buying
 * intent on the site described a car, a price and a return policy and could
 * not say who was renting it, where they were, or how to reach them. That is
 * exactly the page an AI search lands on when someone asks for a specific car.
 *
 * The definitions already exist, in full, on each language's home page. They
 * are read from there rather than copied here, so there is one place to edit
 * and the two can never disagree about the address, the hours or the phone.
 */

const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(__dirname, "..", "public");
const BUSINESS_ID = "https://plusrent.md/#business";
const WEBSITE_ID = "https://plusrent.md/#website";

const cache = new Map();

/** Every JSON-LD node in a page, flattened out of any @graph. */
function nodesOf(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch (err) {
      continue;
    }
    for (const n of Array.isArray(data) ? data : [data]) {
      if (n && typeof n === "object") out.push(...(n["@graph"] || [n]));
    }
  }
  return out;
}

/**
 * [business, website] as defined on the home page of this language, or an
 * empty list if the page cannot be read. A car page without them is what it
 * was yesterday, so a failure here must never take the page down with it.
 */
function businessNodes(lang) {
  if (cache.has(lang)) return cache.get(lang);
  let found = [];
  try {
    const html = fs.readFileSync(path.join(PUBLIC, lang, "index.html"), "utf8");
    const all = nodesOf(html);
    const business = all.find((n) => n["@id"] === BUSINESS_ID);
    const website = all.find((n) => n["@id"] === WEBSITE_ID);
    found = [business, website].filter(Boolean);
  } catch (err) {
    found = [];
  }
  cache.set(lang, found);
  return found;
}

module.exports = { businessNodes, BUSINESS_ID, WEBSITE_ID };
