/**
 * The address of a car's page, worked out in the browser.
 *
 * This is the same rule as lib/car-slug.js on the server: make, model and year,
 * with the car id appended only when two cars would otherwise share an address.
 * The catalogue and the home page grid both link with it, so a card and the
 * page it opens always agree, and the link is the one in the sitemap.
 *
 * Keep the two in step. If the rule changes here it changes there.
 */
(function (root) {
  "use strict";

  var SEGMENT = { ro: "chirie-auto", ru: "arenda-avto", en: "car-rental" };

  var MAP = {
    "ă": "a", "â": "a", "î": "i", "ș": "s", "ş": "s", "ț": "t", "ţ": "t",
    "á": "a", "à": "a", "ä": "a", "é": "e", "è": "e", "ë": "e", "í": "i",
    "ï": "i", "ó": "o", "ò": "o", "ö": "o", "ú": "u", "ù": "u", "ü": "u",
    "ñ": "n", "ç": "c", "ß": "ss",
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
  };

  function slugify(value) {
    var s = String(value == null ? "" : value).toLowerCase().trim();
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      out += MAP[ch] !== undefined ? MAP[ch] : ch;
    }
    if (out.normalize) out = out.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return out.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }

  function baseSlug(car) {
    var parts = [car.make_name, car.model_name, car.production_year]
      .map(slugify)
      .filter(Boolean);
    return parts.join("-") || "masina-" + car.id;
  }

  /** Whichever car was created first keeps the clean address. */
  function slugMap(cars) {
    var ordered = (cars || []).slice().sort(function (a, b) {
      var ta = Date.parse(a.created_at || "") || 0;
      var tb = Date.parse(b.created_at || "") || 0;
      if (ta !== tb) return ta - tb;
      return Number(a.id) - Number(b.id);
    });
    var counts = {};
    var out = {};
    ordered.forEach(function (car) {
      var base = baseSlug(car);
      var seen = counts[base] || 0;
      counts[base] = seen + 1;
      out[String(car.id)] = seen === 0 ? base : base + "-" + car.id;
    });
    return out;
  }

  function currentLang() {
    var m = /^\/(ro|ru|en)(\/|$)/.exec(window.location.pathname);
    if (m) return m[1];
    var l = (document.documentElement.lang || "ro").slice(0, 2);
    return SEGMENT[l] ? l : "ro";
  }

  function pathFor(car, cars, lang) {
    var l = lang || currentLang();
    var slug;
    if (cars && cars.length) {
      slug = slugMap(cars)[String(car.id)];
    }
    if (!slug) slug = baseSlug(car);
    return "/" + l + "/" + (SEGMENT[l] || SEGMENT.ro) + "/" + slug;
  }

  root.CarUrl = {
    SEGMENT: SEGMENT,
    slugify: slugify,
    baseSlug: baseSlug,
    slugMap: slugMap,
    currentLang: currentLang,
    pathFor: pathFor,
  };
})(typeof window !== "undefined" ? window : globalThis);
