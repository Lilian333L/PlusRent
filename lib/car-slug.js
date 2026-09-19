/**
 * Addresses for the per-car pages.
 *
 * A car's page lives at /ro/chirie-auto/volkswagen-jetta-2019, so the phrase
 * people search for is in the URL itself. The slug is built from what the
 * dashboard already holds, which is why adding a car needs no further work:
 * the page, its title and its sitemap entry all follow from the record.
 *
 * Two cars can be the same make, model and year. When that happens the second
 * one keeps the car id on the end, so an address never points at two cars and
 * the first car's address never changes because a second was added.
 */

const SEGMENT = { ro: "chirie-auto", ru: "arenda-avto", en: "car-rental" };
const LANGS = ["ro", "ru", "en"];
const ORIGIN = "https://plusrent.md";

const DIACRITICS = {
  ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t",
  á: "a", à: "a", ä: "a", é: "e", è: "e", ë: "e", í: "i", ï: "i",
  ó: "o", ò: "o", ö: "o", ú: "u", ù: "u", ü: "u", ñ: "n", ç: "c", ß: "ss",
};

const CYRILLIC = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(value) {
  let s = String(value == null ? "" : value).toLowerCase().trim();
  s = s.replace(/[\s\S]/g, (ch) => {
    if (DIACRITICS[ch] !== undefined) return DIACRITICS[ch];
    if (CYRILLIC[ch] !== undefined) return CYRILLIC[ch];
    return ch;
  });
  s = s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s;
  return s
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function baseSlug(car) {
  const parts = [car.make_name, car.model_name, car.production_year]
    .map((p) => slugify(p))
    .filter(Boolean);
  return parts.join("-") || "masina-" + car.id;
}

/**
 * Slugs for a whole fleet at once, so collisions can be settled consistently:
 * whichever car was created first keeps the clean slug.
 */
function slugMap(cars) {
  const byBase = new Map();
  const ordered = cars.slice().sort((a, b) => {
    const ta = Date.parse(a.created_at || "") || 0;
    const tb = Date.parse(b.created_at || "") || 0;
    if (ta !== tb) return ta - tb;
    return Number(a.id) - Number(b.id);
  });
  const out = new Map();
  for (const car of ordered) {
    const base = baseSlug(car);
    const seen = byBase.get(base) || 0;
    byBase.set(base, seen + 1);
    out.set(String(car.id), seen === 0 ? base : `${base}-${car.id}`);
  }
  return out;
}

/**
 * Five identical Jettas are five bookable cars but one thing to search for.
 * Giving each its own indexable page would put five pages with the same make,
 * model, year and specification against each other, which is the duplicate
 * content that gets a catalogue discounted. So one of them, the one added
 * first, is the page search engines are pointed at; the rest stay reachable
 * and bookable but declare it as their canonical and ask not to be indexed.
 *
 * Cars only count as duplicates when make, model and year all match. A 2019
 * and a 2021 Jetta are genuinely different pages.
 */
function primaryFor(car, cars) {
  if (!Array.isArray(cars) || !cars.length) return car;
  const key = (c) =>
    [c.make_name, c.model_name, c.production_year]
      .map((v) => String(v == null ? "" : v).trim().toLowerCase())
      .join("|");
  const mine = key(car);
  const group = cars.filter((c) => key(c) === mine);
  if (group.length < 2) return car;
  group.sort((a, b) => {
    const ta = Date.parse(a.created_at || "") || 0;
    const tb = Date.parse(b.created_at || "") || 0;
    if (ta !== tb) return ta - tb;
    return Number(a.id) - Number(b.id);
  });
  return group[0];
}

function isPrimary(car, cars) {
  return String(primaryFor(car, cars).id) === String(car.id);
}

function slugFor(car, cars) {
  if (Array.isArray(cars)) {
    const m = slugMap(cars);
    const hit = m.get(String(car.id));
    if (hit) return hit;
  }
  return baseSlug(car);
}

/** Find the car a slug refers to, tolerating a renamed or trailing-id slug. */
function matchCar(slug, cars) {
  const wanted = String(slug || "").toLowerCase();
  const m = slugMap(cars);
  for (const car of cars) {
    if (m.get(String(car.id)) === wanted) return car;
  }
  // an older address, or one with the id appended by hand
  const trailing = /-(\d+)$/.exec(wanted);
  if (trailing) {
    const car = cars.find((c) => String(c.id) === trailing[1]);
    if (car) return car;
  }
  return cars.find((c) => baseSlug(c) === wanted) || null;
}

function pathFor(car, lang, cars) {
  return `/${lang}/${SEGMENT[lang] || SEGMENT.ro}/${slugFor(car, cars)}`;
}

function urlFor(car, lang, cars) {
  return ORIGIN + pathFor(car, lang, cars);
}

module.exports = {
  LANGS,
  SEGMENT,
  ORIGIN,
  slugify,
  baseSlug,
  slugMap,
  slugFor,
  primaryFor,
  isPrimary,
  matchCar,
  pathFor,
  urlFor,
};
