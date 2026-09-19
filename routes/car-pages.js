/**
 * The per-car pages, the fleet table on /cars, and the sitemap that lists them.
 *
 * All three are produced from the cars table at request time. That is the whole
 * point: a car added in the dashboard gets its page, its title and its sitemap
 * entry with no file to edit and no script to run, and a car that is deleted
 * stops having a page.
 *
 * Vercel sends these paths here through rewrites in vercel.json, which pass
 * what was asked for as query parameters so the route does not have to guess
 * at the original URL.
 */

const fs = require("fs");
const path = require("path");
const express = require("express");

const { supabase } = require("../lib/supabaseClient");
const slugs = require("../lib/car-slug");
const { render } = require("../lib/render-car-page");

const router = express.Router();

const PUBLIC = path.join(__dirname, "..", "public");
const ORIGIN = slugs.ORIGIN;
const LANGS = slugs.LANGS;

// Reading the same two files off disk on every request is wasteful on a warm
// function, and they only change on deploy.
const fileCache = new Map();
function template(relPath) {
  if (!fileCache.has(relPath)) {
    fileCache.set(relPath, fs.readFileSync(path.join(PUBLIC, relPath), "utf8"));
  }
  return fileCache.get(relPath);
}

// The fleet changes rarely compared with how often these pages are hit.
let carsCache = { at: 0, rows: null, overrides: null };
const CARS_TTL_MS = 60 * 1000;

async function allCars() {
  const now = Date.now();
  if (carsCache.rows && now - carsCache.at < CARS_TTL_MS) return carsCache.rows;
  const { data, error } = await supabase.from("cars").select("*");
  if (error) throw error;
  const rows = (data || []).filter((c) => c && c.id != null);
  carsCache = { at: now, rows, overrides: carsCache.overrides };
  return rows;
}

/** Which car of a duplicate group the owner picked to be the indexed one. */
async function seoPrimaryOverrides() {
  const now = Date.now();
  if (carsCache.overrides && now - carsCache.at < CARS_TTL_MS) return carsCache.overrides;
  let overrides = {};
  try {
    overrides = await require("./cars").readSeoPrimary();
  } catch (e) {
    overrides = {};
  }
  carsCache.overrides = overrides;
  return overrides;
}

function langOf(req, fallback) {
  const l = String(req.query.lang || fallback || "ro").toLowerCase();
  return LANGS.includes(l) ? l : "ro";
}

/**
 * The rewrites tag each request with __prpage so the handler is chosen from the
 * query rather than from a path this function may or may not still see.
 */
router.use((req, res, next) => {
  const which = req.query && req.query.__prpage;
  if (!which) return next();
  const target =
    which === "car" ? "/__page/car"
    : which === "legacy-car" ? "/__page/legacy-car"
    : which === "cars" ? "/__page/cars"
    : which === "sitemap-cars" ? "/__page/sitemap-cars"
    : null;
  if (!target) return next();
  const qs = req.url.indexOf("?");
  req.url = target + (qs === -1 ? "" : req.url.slice(qs));
  next();
});

/**
 * These routes sit on the API app, so the API's CSP middleware has already run
 * and stamped its policy on the response. That policy ends in
 * `script-src-attr 'none'`, which is right for a JSON API and fatal for a page:
 * it silently kills every onclick and onchange attribute in the markup. The
 * catalogue has 17 of them and a car page 14, which is how the mobile filter
 * button came to light up and do nothing.
 *
 * A page served here is the same page that would be served as a static file, so
 * it gets the same header those get from vercel.json.
 */
function pageSecurityHeaders(res) {
  res.set("Content-Security-Policy", "frame-ancestors 'self'");
  res.removeHeader("Content-Security-Policy-Report-Only");
}

function noStoreHtml(res, seconds) {
  res.set("Content-Type", "text/html; charset=utf-8");
  pageSecurityHeaders(res);
  // short shared cache so a price change shows up quickly but the function is
  // not hit for every visitor
  res.set("Cache-Control", `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=600`);
}

/* ---------------------------------------------------------------- car page */

/**
 * A rewrite can reach this function either with the original path still on
 * req.url or with the destination's query string, depending on how the platform
 * routes it. Both forms are accepted so the page does not depend on that.
 */
const SEG_PATTERN = Object.values(slugs.SEGMENT).join("|");

const carPage = async (req, res, next) => {
  try {
    const lang = langOf(req, req.params && req.params.lang);
    const slug = String(
      (req.params && req.params.slug) || req.query.slug || ""
    ).trim().toLowerCase();
    if (!slug) return next();

    const cars = await allCars();
    const car = slugs.matchCar(slug, cars);

    if (!car) {
      // The car is gone, or the address was never real. Send the visitor to the
      // catalogue rather than showing them nothing.
      return res.redirect(301, `/${lang}/cars`);
    }

    const canonical = slugs.pathFor(car, lang, cars);
    const asked = `/${lang}/${slugs.SEGMENT[lang]}/${slug}`;
    if (asked !== canonical) {
      // an older or hand-typed address for a car that still exists
      return res.redirect(301, canonical);
    }

    const overrides = await seoPrimaryOverrides();
    const html = render(template("car-template.html"), car, lang, cars, overrides);
    noStoreHtml(res, 300);
    return res.status(200).send(html);
  } catch (err) {
    return next(err);
  }
};

router.get("/__page/car", carPage);
router.get(`/:lang(ro|ru|en)/:seg(${SEG_PATTERN})/:slug`, carPage);

/**
 * Links already shared as /car-single.html?id=7 keep working and hand their
 * authority to the car's real address.
 */
const legacyCar = async (req, res, next) => {
  try {
    const id = String(req.query.id || "").trim();
    const lang = langOf(req);
    if (!id) return res.redirect(301, `/${lang}/cars`);
    const cars = await allCars();
    const car = cars.find((c) => String(c.id) === id);
    if (!car) return res.redirect(301, `/${lang}/cars`);
    return res.redirect(301, slugs.pathFor(car, lang, cars));
  } catch (err) {
    return next(err);
  }
};

router.get("/__page/legacy-car", legacyCar);
router.get("/car-single", legacyCar);
router.get("/car-single.html", legacyCar);

/* ------------------------------------------------------------- fleet table */

const FLEET_START = "<!-- FLEET-TABLE:START (generated by scripts/render-fleet.js, do not edit by hand) -->";
const FLEET_END = "<!-- FLEET-TABLE:END -->";

const carsPage = async (req, res, next) => {
  try {
    const lang = langOf(req);
    const cars = await allCars();
    const { fleetSection, fleetItemList } = require("../lib/render-fleet-table");

    let html = template(`${lang}/cars.html`);
    const s = html.indexOf(FLEET_START);
    const e = html.indexOf(FLEET_END);
    if (s !== -1 && e !== -1) {
      html =
        html.slice(0, s) +
        FLEET_START +
        fleetSection(cars, lang) +
        "\n      " +
        FLEET_END +
        html.slice(e + FLEET_END.length);
    }

    const ldOpen = '<script type="application/ld+json" id="fleet-itemlist">';
    const li = html.indexOf(ldOpen);
    if (li !== -1) {
      const le = html.indexOf("</script>", li) + "</script>".length;
      html =
        html.slice(0, li) +
        ldOpen +
        "\n" +
        JSON.stringify(fleetItemList(cars, lang), null, 2) +
        "\n</script>" +
        html.slice(le);
    }

    noStoreHtml(res, 300);
    return res.status(200).send(html);
  } catch (err) {
    return next(err);
  }
};

router.get("/__page/cars", carsPage);
router.get("/:lang(ro|ru|en)/cars", carsPage);

/* ----------------------------------------------------------------- sitemap */

const sitemapCars = async (req, res, next) => {
  try {
    const cars = await allCars();
    const overrides = await seoPrimaryOverrides();
    const map = slugs.slugMap(cars);
    const today = new Date().toISOString().slice(0, 10);

    const urls = cars
      // only the page each duplicate group points at; the copies are noindex
      .filter((c) => map.get(String(c.id)) && slugs.isPrimary(c, cars, overrides))
      .map((car) => {
        const alt = LANGS.map(
          (l) =>
            `    <xhtml:link rel="alternate" hreflang="${l === "ro" ? "ro-MD" : l === "ru" ? "ru-MD" : "en"}" href="${slugs.urlFor(car, l, cars)}"/>`
        ).join("\n");
        return LANGS.map(
          (l) => `  <url>
    <loc>${slugs.urlFor(car, l, cars)}</loc>
    <lastmod>${(car.updated_at || car.created_at || today).slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
${alt}
    <xhtml:link rel="alternate" hreflang="x-default" href="${slugs.urlFor(car, "ro", cars)}"/>
  </url>`
        ).join("\n");
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=0, s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).send(xml);
  } catch (err) {
    return next(err);
  }
};

router.get("/__page/sitemap-cars", sitemapCars);
router.get("/sitemap-cars.xml", sitemapCars);

module.exports = router;
module.exports.allCars = allCars;
