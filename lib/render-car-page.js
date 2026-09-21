/**
 * Build the page for one car, on the server, from the record in the database.
 *
 * Every car page used to be car-single.html with ?id= on the end: one title,
 * one canonical, and content that only appeared once JavaScript had called an
 * API that robots.txt closes to crawlers. So no car had a page of its own that
 * anyone could find, and the page was marked noindex.
 *
 * This takes the same template and fills in the parts a search engine reads
 * before running any script: the title, the description, the canonical, the
 * language alternates and a block of real content with the specs and the full
 * price ladder. The car's own JavaScript still runs afterwards and takes over
 * the interactive parts, so nothing in the booking flow changes.
 *
 * Because it renders per request, adding a car in the dashboard is all it takes
 * for its page to exist, correctly titled, and for the sitemap to list it.
 */

const { LANGS, SEGMENT, ORIGIN, pathFor, urlFor, primaryFor, isPrimary } = require("./car-slug");

// "Rent a Audi" reads wrong; the article follows the sound of the make.
function article(name) {
  return /^[aeiou]/i.test(String(name).trim()) ? "an" : "a";
}

const T = {
  ro: {
    htmlLang: "ro",
    ogLocale: "ro_RO",
    title: (n, y) => `Chirie ${n}${y ? " " + y : ""} în Chișinău: preț pe zi | PlusRent`,
    desc: (n, price, seats, gear) =>
      `Închiriază ${n} în Chișinău de la €${price} pe zi. ${seats} locuri, cutie ${gear}, RCA și 200 km pe zi incluse, fără avans. Livrare la aeroport, rezervare în câteva minute.`,
    h: "Despre această mașină",
    specs: "Caracteristici",
    prices: "Tarif pe zi, în funcție de durată",
    year: "An", type: "Tip", gear: "Cutie de viteze", fuel: "Combustibil",
    seats: "Locuri", doors: "Uși", drive: "Tracțiune", luggage: "Bagaje",
    engine: "Motor", ac: "Aer condiționat", yes: "Da", no: "Nu",
    days: (a) => a, perday: "pe zi", from: "de la",
    included: "Incluse în preț: RCA, 200 km pe zi, asistență 24/7. Fără avans.",
    busy: "Momentan rezervată. Sună la +373 60 000 500 pentru o dată liberă sau o mașină similară.",
    breadcrumbHome: "Acasă", breadcrumbCars: "Mașini în chirie",
    also: "Alte mașini disponibile", alsoIntro: "Același contract, aceleași condiții: RCA și 200 km pe zi incluse, fără avans.", allCars: "Vezi toate mașinile",
    d: { "1-2": "1 la 2 zile", "3-7": "3 la 7 zile", "8-20": "8 la 20 zile", "21-45": "21 la 45 zile", "46+": "46 zile și peste" },
    auto: "automată", manual: "manuală",
    nav: { home: "Acasă", cars: "Mașini", about: "Despre Noi", contact: "Contact", services: "Servicii", top: "Înapoi sus" },
    mega: ["Chirie Auto", "Șofer Treaz", "Transfer Aeroport KIV", "Transfer Aeroport IAS", "Șofer Personal"],
  },
  ru: {
    htmlLang: "ru",
    ogLocale: "ru_RU",
    title: (n, y) => `Аренда ${n}${y ? " " + y : ""} в Кишиневе: цена за сутки | PlusRent`,
    desc: (n, price, seats, gear) =>
      `Возьмите ${n} в аренду в Кишиневе от €${price} в сутки. ${seats} мест, коробка ${gear}, страховка RCA и 200 км в сутки включены, без предоплаты. Доставка в аэропорт.`,
    h: "Об этой машине",
    specs: "Характеристики",
    prices: "Цена за сутки в зависимости от срока",
    year: "Год", type: "Тип", gear: "Коробка передач", fuel: "Топливо",
    seats: "Мест", doors: "Дверей", drive: "Привод", luggage: "Багаж",
    engine: "Двигатель", ac: "Кондиционер", yes: "Да", no: "Нет",
    days: (a) => a, perday: "в сутки", from: "от",
    included: "В цену входят: страховка RCA, 200 км в сутки, поддержка 24/7. Без предоплаты.",
    busy: "Сейчас занята. Позвоните на +373 60 000 500, подберем свободную дату или похожую машину.",
    breadcrumbHome: "Главная", breadcrumbCars: "Машины в аренду",
    also: "Другие машины в аренду", alsoIntro: "Те же условия: страховка RCA и 200 км в сутки включены, без предоплаты.", allCars: "Смотреть все машины",
    d: { "1-2": "1 до 2 суток", "3-7": "3 до 7 суток", "8-20": "8 до 20 суток", "21-45": "21 до 45 суток", "46+": "46 суток и больше" },
    auto: "автомат", manual: "механика",
    nav: { home: "Главная", cars: "Автомобили", about: "О нас", contact: "Контакты", services: "Услуги", top: "Наверх" },
    mega: ["Аренда авто", "Трезвый водитель", "Трансфер аэропорт Кишинев", "Трансфер аэропорт Яссы", "Личный водитель"],
  },
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    title: (n, y) => `Rent ${article(n)} ${n}${y ? " " + y : ""} in Chisinau: price per day | PlusRent`,
    desc: (n, price, seats, gear) =>
      `Rent ${article(n)} ${n} in Chisinau from €${price} a day. ${seats} seats, ${gear} gearbox, insurance and 200 km a day included, nothing to pay up front. Airport delivery available.`,
    h: "About this car",
    specs: "Specification",
    prices: "Daily rate by length of rental",
    year: "Year", type: "Type", gear: "Gearbox", fuel: "Fuel",
    seats: "Seats", doors: "Doors", drive: "Drive", luggage: "Luggage",
    engine: "Engine", ac: "Air conditioning", yes: "Yes", no: "No",
    days: (a) => a, perday: "per day", from: "from",
    included: "Included: insurance, 200 km a day, support around the clock. Nothing up front.",
    busy: "Booked at the moment. Call +373 60 000 500 for a free date or a similar car.",
    breadcrumbHome: "Home", breadcrumbCars: "Cars for rent",
    also: "Other cars available", alsoIntro: "The same terms throughout: insurance and 200 km a day included, nothing up front.", allCars: "See every car",
    d: { "1-2": "1 to 2 days", "3-7": "3 to 7 days", "8-20": "8 to 20 days", "21-45": "21 to 45 days", "46+": "46 days and over" },
    auto: "automatic", manual: "manual",
    nav: { home: "Home", cars: "Cars", about: "About", contact: "Contact", services: "Services", top: "Back to top" },
    mega: ["Car Rental", "Sober Driver", "Airport Transfer Chisinau", "Airport Transfer Iasi", "Personal Driver"],
  },
};

const TIERS = ["1-2", "3-7", "8-20", "21-45", "46+"];

const CARS_PATH = { ro: "/ro/cars", ru: "/ru/cars", en: "/en/cars" };

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function policy(car) {
  let p = car.price_policy;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch { p = {}; } }
  return p && typeof p === "object" ? p : {};
}

function lowest(car) {
  const vals = Object.values(policy(car)).map(parseFloat).filter(Number.isFinite);
  return vals.length ? Math.min(...vals) : null;
}

function carName(car) {
  return `${car.make_name || ""} ${car.model_name || ""}`.trim();
}

function imageUrl(car) {
  const img = car.head_image;
  if (!img) return ORIGIN + "/images/LOGO-5-demo.png";
  return img.startsWith("http") ? img : ORIGIN + img;
}

function gearWord(car, t) {
  const g = String(car.gear_type || "").toLowerCase();
  if (g.startsWith("auto")) return t.auto;
  if (g.startsWith("man")) return t.manual;
  return car.gear_type || "";
}

/** The block of real content, the part a crawler can read without scripts. */
function facts(car, lang) {
  const t = T[lang];
  const p = policy(car);
  const name = carName(car);

  const rows = [
    [t.year, car.production_year],
    [t.type, car.car_type],
    [t.gear, gearWord(car, t)],
    [t.fuel, car.fuel_type],
    [t.seats, car.num_passengers],
    [t.doors, car.num_doors],
    [t.drive, car.drive],
    [t.luggage, car.luggage],
    [t.engine, car.engine_capacity],
    [t.ac, car.air_conditioning == null ? null : (car.air_conditioning ? t.yes : t.no)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const priceRows = TIERS
    .map((k) => [t.d[k], parseFloat(p[k])])
    .filter(([, v]) => Number.isFinite(v));

  return `
      <section class="pr-car-facts" aria-labelledby="pr-car-facts-h">
        <h2 id="pr-car-facts-h">${esc(t.h)}: ${esc(name)}</h2>
        ${car.booked ? `<p class="pr-car-busy">${esc(t.busy)}</p>` : ""}
        <div class="pr-car-facts-grid">
          <div>
            <h3>${esc(t.specs)}</h3>
            <dl class="pr-car-specs">
              ${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n              ")}
            </dl>
          </div>
          <div>
            <h3>${esc(t.prices)}</h3>
            <table class="pr-car-prices">
              <tbody>
                ${priceRows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>&euro;${v} ${esc(t.perday)}</td></tr>`).join("\n                ")}
              </tbody>
            </table>
            <p class="pr-car-included">${esc(t.included)}</p>
          </div>
        </div>
      </section>`;
}

/**
 * The rest of the fleet, linked from every car's page.
 *
 * Each car page was reachable from exactly one place, the catalogue, which an
 * audit reports as a page hanging off a single thread and which is also a dead
 * end for a reader: someone who lands on the X5 from a search and wants
 * something cheaper has to go back the way they came. The cars link to each
 * other now, with the price on the link so the choice can be made before the
 * click.
 *
 * A car that duplicates another is left out, for the same reason its page
 * points its canonical at the original rather than competing with it.
 */
function alsoAvailable(car, lang, cars, overrides) {
  const t = T[lang];
  if (!Array.isArray(cars) || cars.length < 2) return "";

  const others = cars
    .filter((other) => String(other.id) !== String(car.id))
    .filter((other) => isPrimary(other, cars, overrides))
    .sort((a, b) => (lowest(a) ?? 1e9) - (lowest(b) ?? 1e9));

  if (!others.length) return "";

  const items = others.map((other) => {
    const low = lowest(other);
    const price = low === null ? "" :
      `<span class="pr-car-also-price">${esc(t.from)} &euro;${low} ${esc(t.perday)}</span>`;
    return `<li><a href="${pathFor(other, lang, cars)}">
            <span class="pr-car-also-name">${esc(carName(other))}${other.production_year ? " " + esc(other.production_year) : ""}</span>
            ${price}
          </a></li>`;
  }).join("\n          ");

  return `
      <section class="pr-car-also" aria-labelledby="pr-car-also-h">
        <h2 id="pr-car-also-h">${esc(t.also)}</h2>
        <p class="pr-car-also-intro">${esc(t.alsoIntro)}</p>
        <ul class="pr-car-also-list">
          ${items}
        </ul>
        <p class="pr-car-also-all"><a href="${CARS_PATH[lang]}">${esc(t.allCars)}</a></p>
      </section>`;
}

/**
 * The machine-readable copy of the page.
 *
 * It used to describe each car as schema.org Car. Google reads a Car as a
 * vehicle listing, which is markup for a car that is for sale: it asks for the
 * VIN, the condition and the odometer reading, none of which a rental fleet
 * publishes and none of which sit in the database. Every car therefore failed
 * validation and no car was eligible for anything.
 *
 * A rental car is a product with a daily price, so that is what it says now.
 * Product carries the brand, the model, the condition and the price ladder that
 * Google does want, the specifications ride along as additionalProperty, and
 * additionalType keeps the "this is a car" meaning for anything reading deeper.
 */
/** Today, as a plain date, for the offer's validity window. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * How long the price is stated to hold.
 *
 * Google treats a priceValidUntil in the past as a price it can no longer
 * show, so this is always a year ahead of whenever the page is rendered. A
 * car page is rendered per request, so it can never go stale.
 */
function aYearFromToday() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function jsonLd(car, lang, cars) {
  const t = T[lang];
  const name = carName(car);
  const low = lowest(car);
  const url = urlFor(car, lang, cars);

  const spec = (label, value) =>
    value === null || value === undefined || value === ""
      ? null
      : { "@type": "PropertyValue", name: label, value: String(value) };

  const properties = [
    spec(t.year, car.production_year),
    spec(t.type, car.car_type),
    spec(t.gear, gearWord(car, t)),
    spec(t.fuel, car.fuel_type),
    spec(t.seats, car.num_passengers),
    spec(t.doors, car.num_doors),
    spec(t.drive, car.drive),
    spec(t.luggage, car.luggage),
    spec(t.engine, car.engine_capacity),
    spec(t.ac, car.air_conditioning == null ? null : car.air_conditioning ? t.yes : t.no),
  ].filter(Boolean);

  const vehicle = {
    "@type": "Product",
    additionalType: "https://schema.org/Car",
    "@id": url + "#car",
    name,
    url,
    // The same sentence the page's own meta description carries. The Product
    // had no description at all, which Search Console reports as a missing
    // field on every car.
    description: t.desc(
      name,
      low === null ? "15" : low,
      car.num_passengers || "5",
      gearWord(car, t)
    ),
    image: imageUrl(car),
    sku: "plusrent-car-" + car.id,
    brand: { "@type": "Brand", name: car.make_name || "" },
    model: car.model_name || undefined,
    itemCondition: "https://schema.org/UsedCondition",
    category: t.breadcrumbCars,
    productionDate: car.production_year ? String(car.production_year) : undefined,
    additionalProperty: properties.length ? properties : undefined,
  };

  if (low !== null) {
    vehicle.offers = {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: String(low),
      availability: car.booked ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
      url,
      // Worked out on every render rather than written down. The hand-written
      // date this replaces said 2025-12-31 and had been in the past for nine
      // months, which is how Search Console came to report the price as no
      // longer valid on every car.
      validFrom: today(),
      priceValidUntil: aYearFromToday(),
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(low),
        priceCurrency: "EUR",
        unitCode: "DAY",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" },
      },
      seller: { "@id": ORIGIN + "/#business" },

      // Google asks a Product offer for shipping and returns, because it
      // assumes goods in a box. A rental car is neither shipped nor returned
      // for a refund, so both say what is actually true rather than being
      // left out and reported as missing on every car.
      //
      // The car is handed over in Chisinau at no charge. Airport delivery and
      // delivery to another city cost extra and are priced on the page, not
      // here, because this field cannot express a price that depends on how
      // long the rental is.
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "EUR" },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "MD",
          addressRegion: "Chișinău",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
        },
      },

      // A rented car goes back at the end of the rental; it is not returned
      // for a refund the way a purchase is.
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "MD",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      },
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      vehicle,
      {
        "@type": "BreadcrumbList",
        "@id": url + "#breadcrumb",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: `${ORIGIN}/${lang}/` },
          { "@type": "ListItem", position: 2, name: t.breadcrumbCars, item: ORIGIN + CARS_PATH[lang] },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
      {
        "@type": "WebPage",
        "@id": url + "#webpage",
        url,
        name: t.title(name, car.production_year),
        inLanguage: lang === "ro" ? "ro-MD" : lang === "ru" ? "ru-MD" : "en",
        isPartOf: { "@id": ORIGIN + "/#website" },
        about: { "@id": url + "#car" },
        primaryImageOfPage: imageUrl(car),
      },
    ],
  };
}

/**
 * car-single.html links its assets relatively, which worked at /car-single.html
 * and would break one directory down at /ro/chirie-auto/<slug>.
 */
function absolutiseAssets(html) {
  return html.replace(
    /(\s(?:href|src)=")(css|js|images|fonts)\//g,
    "$1/$2/"
  );
}

/**
 * The shared header links to /cars, /about and the rest without a language, and
 * the edge middleware then works one out from the browser's Accept-Language and
 * redirects. On a page that is already unambiguously Romanian or Russian that is
 * both a wasted redirect on every link and a chance to throw the visitor into
 * the wrong language, so the links are pointed straight at the right ones.
 */
const NAV_PATHS = [
  "/", "/cars", "/sofer-treaz", "/sofer-personal",
  "/transfer-chisinau", "/transfer-iasi", "/about", "/contact",
];

/**
 * Fill the template's translated strings on the server.
 *
 * Every label in the template is an empty or English placeholder with a
 * data-i18n key, filled in by i18next once the page is running. A crawler that
 * does not execute scripts therefore read a Romanian car page whose form, whose
 * buttons and whose reassurances were all in English, and judged the page's
 * language accordingly. The translations already exist as JSON; this writes
 * them into the HTML before it leaves the server, and i18next then sets the
 * same values again with nothing to correct.
 */
const LOCALES = {
  ro: require("../public/js/locales/ro.json"),
  ru: require("../public/js/locales/ru.json"),
  en: require("../public/js/locales/en.json"),
};

const VOID_TAGS = new Set(["input", "img", "br", "hr", "meta", "link", "source", "area"]);

const escText = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The index of the tag that closes the element opened before `from`.
 *
 * The word boundary is doubled because this pattern is built from a string:
 * inside a string literal a single backslash-b is the backspace character, and
 * the expression then matches nothing at all.
 */
function findClose(html, name, from) {
  const re = new RegExp("<(/?)" + name + "\\b[^>]*?(/?)>", "gi");
  re.lastIndex = from;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] === "/") {
      if (depth === 0) return m.index;
      depth--;
    } else if (m[2] !== "/") {
      depth++;
    }
  }
  return -1;
}

function translateInto(html, lang) {
  const dict = LOCALES[lang];
  if (!dict) return html;
  const lookup = (key) => {
    const v = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
    return typeof v === "string" ? v : undefined;
  };

  // placeholders live in an attribute, so they are a straight swap
  html = html.replace(
    /<([a-z0-9]+)\b([^>]*\bdata-i18n-placeholder="([^"]+)"[^>]*)>/gi,
    (tag, name, attrs, key) => {
      const value = lookup(key);
      if (value === undefined) return tag;
      const written = `placeholder="${esc(value)}"`;
      const updated = /\bplaceholder="[^"]*"/i.test(attrs)
        ? attrs.replace(/\bplaceholder="[^"]*"/i, written)
        : attrs + " " + written;
      return `<${name}${updated}>`;
    }
  );

  const re = /<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>/gi;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(html))) {
    const openTag = m[0];
    const tagName = m[1].toLowerCase();
    const value = lookup(m[2]);
    if (value === undefined || VOID_TAGS.has(tagName) || openTag.endsWith("/>")) continue;

    const contentStart = m.index + openTag.length;
    const closeIdx = findClose(html, tagName, contentStart);
    if (closeIdx === -1) continue;

    const inner = html.slice(contentStart, closeIdx);
    let replacement;
    if (!inner.includes("<")) {
      replacement = escText(value);
    } else {
      // something like "Pickup Date<span>*</span>": only the words are ours
      const firstTag = inner.indexOf("<");
      if (inner.slice(0, firstTag).trim() === "") continue;
      replacement = escText(value) + inner.slice(firstTag);
    }

    out += html.slice(last, contentStart) + replacement;
    last = closeIdx;
    re.lastIndex = closeIdx;
  }
  return out + html.slice(last);
}

/**
 * The template carries the header in Romanian, because Romanian is the site's
 * first language and a template has to say something. On a Russian or English
 * car page those words are both wrong and, once a crawler reads them, a link
 * whose anchor text describes the wrong page. This swaps them.
 */
function localiseLabels(html, lang) {
  const t = T[lang] || T.ro;
  const ro = T.ro;
  if (lang !== "ro") {
    for (const key of ["home", "cars", "about", "contact"]) {
      html = html.split(`data-i18n="menu.${key}">${ro.nav[key]}</a>`)
                 .join(`data-i18n="menu.${key}">${t.nav[key]}</a>`);
    }
    html = html.split(`<b class="pr-services-label">${ro.nav.services}</b>`)
               .join(`<b class="pr-services-label">${t.nav.services}</b>`);
    ro.mega.forEach((label, i) => {
      html = html.split(`>${label}</a>`).join(`>${t.mega[i]}</a>`);
    });
    html = html.split(`aria-label="${ro.nav.top}"`).join(`aria-label="${t.nav.top}"`)
               .split(`>${ro.nav.top}</span>`).join(`>${t.nav.top}</span>`);
  }
  return html;
}

function localiseNav(html, lang) {
  for (const p of NAV_PATHS) {
    const target = p === "/" ? `/${lang}/` : `/${lang}${p}`;
    html = html.split(`href="${p}"`).join(`href="${target}"`);
  }
  // the footer spells these out in Romanian whatever page it is on
  for (const p of ["terms", "privacy"]) {
    html = html.split(`href="/ro/${p}"`).join(`href="/${lang}/${p}"`);
  }
  return html;
}

/** A trail the visitor can see, matching the BreadcrumbList in the markup. */
function breadcrumb(car, lang, cars) {
  const t = T[lang];
  const name = carName(car);
  return `
      <nav class="pr-car-crumbs" aria-label="${esc(t.breadcrumbCars)}">
        <a href="/${lang}/">${esc(t.breadcrumbHome)}</a>
        <span aria-hidden="true">›</span>
        <a href="${CARS_PATH[lang]}">${esc(t.breadcrumbCars)}</a>
        <span aria-hidden="true">›</span>
        <span>${esc(name)}</span>
      </nav>`;
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function render(template, car, lang, cars, overrides) {
  const t = T[lang] || T.ro;
  const name = carName(car);
  const low = lowest(car);
  const url = urlFor(car, lang, cars);
  const title = t.title(name, car.production_year);
  const desc = t.desc(
    name,
    low === null ? "15" : low,
    car.num_passengers || "5",
    gearWord(car, t)
  );
  const img = imageUrl(car);

  let html = translateInto(localiseLabels(localiseNav(absolutiseAssets(template), lang), lang), lang);

  html = html.replace(/<html[^>]*>/i, `<html lang="${t.htmlLang}">`);
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = replaceTag(
    html,
    /<meta name="description" content="[^"]*">/i,
    `<meta name="description" content="${esc(desc)}">`
  );

  // The template is noindex because on its own it is an empty shell; a real car
  // page is not. A second copy of a car that already has a page is a different
  // case: it stays reachable but points at the first one instead of competing
  // with it.
  const primary = primaryFor(car, cars, overrides);
  const duplicate = String(primary.id) !== String(car.id);
  const canonicalUrl = duplicate ? urlFor(primary, lang, cars) : url;
  const robots = duplicate
    ? "noindex, follow"
    : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

  html = html.replace(
    /<meta name="robots" content="[^"]*">/i,
    `<meta name="robots" content="${robots}">`
  );
  html = html.replace(
    /<meta name="googlebot" content="[^"]*">/i,
    `<meta name="googlebot" content="${robots}">`
  );

  html = html.replace(
    /<link rel="canonical" href="[^"]*">/i,
    `<link rel="canonical" href="${canonicalUrl}">`
  );

  // A duplicate points at the primary in every language, so the switcher and
  // the alternates agree with the canonical rather than fighting it.
  const altCar = duplicate ? primary : car;
  const alternates = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${l === "ro" ? "ro-MD" : l === "ru" ? "ru-MD" : "en"}" href="${urlFor(altCar, l, cars)}">`
  ).join("\n  ");
  html = html.replace(
    /<link rel="canonical"[^>]*>/i,
    (m) =>
      `${m}\n  ${alternates}\n  <link rel="alternate" hreflang="x-default" href="${urlFor(altCar, "ro", cars)}">`
  );

  const og = {
    "og:title": title,
    "og:description": desc,
    "og:image": img,
    "og:url": url,
    "og:locale": t.ogLocale,
  };
  for (const [prop, val] of Object.entries(og)) {
    const re = new RegExp(`<meta property="${prop}" content="[^"]*">`, "i");
    html = html.replace(re, `<meta property="${prop}" content="${esc(val)}">`);
  }
  for (const [nm, val] of Object.entries({
    "twitter:title": title,
    "twitter:description": desc,
    "twitter:image": img,
  })) {
    const re = new RegExp(`<meta name="${nm}" content="[^"]*">`, "i");
    html = html.replace(re, `<meta name="${nm}" content="${esc(val)}">`);
  }

  // the client script reads ?id=; on a clean address it reads this instead
  const bootstrap =
    `<script>window.__PR_CAR__=${JSON.stringify({ id: car.id, slug: url.split("/").pop(), lang })};</script>`;
  const ld = `<script type="application/ld+json">${JSON.stringify(jsonLd(car, lang, cars), null, 2)}</script>`;
  html = html.replace("</head>", `  ${bootstrap}\n  ${ld}\n</head>`);

  // a readable title before any script runs
  html = html.replace(
    /<h1 id="car-title"><\/h1>/i,
    `${breadcrumb(car, lang, cars)}
                <h1 id="car-title">${esc(name)}${car.production_year ? " " + esc(car.production_year) : ""}</h1>`
  );

  // and the content itself, right after the form section
  html = html.replace(
    /<!-- Compact Quick Specs Section -->/i,
    `${facts(car, lang)}\n${alsoAvailable(car, lang, cars, overrides)}\n\n              <!-- Compact Quick Specs Section -->`
  );

  return html;
}

module.exports = { render, carName, lowest, policy, imageUrl, T, TIERS };
