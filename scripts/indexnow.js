#!/usr/bin/env node
/**
 * Tell Bing and the other IndexNow engines that pages changed.
 *
 * The key file has been published at /<key>.txt for a while and nothing ever
 * used it, so the engines that read IndexNow learned about a change only when
 * they next happened to crawl. That is how an AI answer came to quote a price
 * and an order count that the site had stopped showing weeks earlier: the page
 * was right and the index was not.
 *
 * Run it after a deploy that changes content:   npm run indexnow
 * See what it would send without sending:       npm run indexnow -- --dry
 *
 * It sends every URL in sitemap.xml and in sitemap-cars.xml. That is a few
 * dozen addresses, well under the 10,000 IndexNow allows in one request, so
 * there is nothing to batch and nothing to track between runs.
 */

const fs = require("fs");
const path = require("path");

const HOST = "plusrent.md";
const KEY = "b45f64e4b9bb4df49fa5823ad5b7bce7";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const dry = process.argv.includes("--dry");

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

async function main() {
  const staticXml = fs.readFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), "utf8");
  let urls = locs(staticXml);

  // The car pages are generated from the database, so their list lives on the
  // live site rather than in a file.
  try {
    const res = await fetch(`https://${HOST}/sitemap-cars.xml`);
    if (res.ok) urls = urls.concat(locs(await res.text()));
    else console.warn(`sitemap-cars.xml answered ${res.status}, sending the static pages only`);
  } catch (err) {
    console.warn(`could not read sitemap-cars.xml (${err.message}), sending the static pages only`);
  }

  urls = [...new Set(urls)].filter((u) => u.startsWith(`https://${HOST}/`));
  console.log(`${urls.length} URLs`);

  // Refuse to send a key the site does not actually serve: IndexNow verifies
  // it, and a wrong one is answered with a 403 that says nothing useful.
  const keyCheck = await fetch(KEY_LOCATION).then((r) => (r.ok ? r.text() : ""));
  if (keyCheck.trim() !== KEY) {
    console.error(`the key file at ${KEY_LOCATION} does not contain the key, not sending`);
    process.exit(1);
  }

  if (dry) {
    urls.forEach((u) => console.log("  " + u));
    console.log("dry run, nothing sent");
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
  });
  // 200 and 202 both mean accepted; 202 means the key is still being verified
  console.log(`IndexNow answered ${res.status} ${res.statusText}`);
  if (![200, 202].includes(res.status)) {
    console.error(await res.text());
    process.exit(1);
  }
}

main();
