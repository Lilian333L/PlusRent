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

const { LANGS, SEGMENT, ORIGIN, pathFor, urlFor } = require("./car-slug");

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
    d: { "1-2": "1 la 2 zile", "3-7": "3 la 7 zile", "8-20": "8 la 20 zile", "21-45": "21 la 45 zile", "46+": "46 zile și peste" },
    auto: "automată", manual: "manuală",
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
    d: { "1-2": "1 до 2 суток", "3-7": "3 до 7 суток", "8-20": "8 до 20 суток", "21-45": "21 до 45 суток", "46+": "46 суток и больше" },
    auto: "автомат", manual: "механика",
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
    d: { "1-2": "1 to 2 days", "3-7": "3 to 7 days", "8-20": "8 to 20 days", "21-45": "21 to 45 days", "46+": "46 days and over" },
    auto: "automatic", manual: "manual",
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

function jsonLd(car, lang, cars) {
  const t = T[lang];
  const name = carName(car);
  const low = lowest(car);
  const url = urlFor(car, lang, cars);

  const vehicle = {
    "@type": "Car",
    "@id": url + "#car",
    name,
    url,
    image: imageUrl(car),
    brand: { "@type": "Brand", name: car.make_name || "" },
    model: car.model_name || undefined,
    vehicleModelDate: car.production_year ? String(car.production_year) : undefined,
    bodyType: car.car_type || undefined,
    fuelType: car.fuel_type || undefined,
    vehicleTransmission: car.gear_type || undefined,
    seatingCapacity: car.num_passengers || undefined,
    numberOfDoors: car.num_doors || undefined,
    driveWheelConfiguration: car.drive || undefined,
  };

  if (low !== null) {
    vehicle.offers = {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: String(low),
      availability: car.booked ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(low),
        priceCurrency: "EUR",
        unitCode: "DAY",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" },
      },
      seller: { "@id": ORIGIN + "/#business" },
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

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function render(template, car, lang, cars) {
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

  let html = absolutiseAssets(template);

  html = html.replace(/<html[^>]*>/i, `<html lang="${t.htmlLang}">`);
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = replaceTag(
    html,
    /<meta name="description" content="[^"]*">/i,
    `<meta name="description" content="${esc(desc)}">`
  );

  // the template is noindex because on its own it is an empty shell; a real car
  // page is not
  html = html.replace(
    /<meta name="robots" content="[^"]*">/i,
    `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">`
  );
  html = html.replace(
    /<meta name="googlebot" content="[^"]*">/i,
    `<meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">`
  );

  html = html.replace(
    /<link rel="canonical" href="[^"]*">/i,
    `<link rel="canonical" href="${url}">`
  );

  const alternates = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${l === "ro" ? "ro-MD" : l === "ru" ? "ru-MD" : "en"}" href="${urlFor(car, l, cars)}">`
  ).join("\n  ");
  html = html.replace(
    /<link rel="canonical"[^>]*>/i,
    (m) =>
      `${m}\n  ${alternates}\n  <link rel="alternate" hreflang="x-default" href="${urlFor(car, "ro", cars)}">`
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
    `<h1 id="car-title">${esc(name)}${car.production_year ? " " + esc(car.production_year) : ""}</h1>`
  );

  // and the content itself, right after the form section
  html = html.replace(
    /<!-- Compact Quick Specs Section -->/i,
    `${facts(car, lang)}\n\n              <!-- Compact Quick Specs Section -->`
  );

  return html;
}

module.exports = { render, carName, lowest, policy, imageUrl, T, TIERS };
