/**
 * The fleet comparison table and its ItemList, in one place.
 *
 * Two callers need exactly the same markup: scripts/render-fleet.js writes it
 * into the static files, and routes/car-pages.js renders it per request so the
 * table follows the database without anyone running a command.
 */

const { pathFor } = require("./car-slug");
const { carImage, offerValidity, offerTerms } = require("./offer-terms");
// the same sentence the car's own page carries, so the two never drift apart
const { T: CAR_T } = require("./render-car-page");

const T = {
  ro: {
    heading: "Flota și tarifele pe zi",
    intro: "Tarifele scad cu numărul de zile. RCA și 200 km pe zi sunt incluse, fără avans.",
    more: "Tabelul arată mașinile libere acum. Flota are 70 de vehicule, așa că dacă nu vezi modelul căutat, sună la +373 60 000 500 și îți spunem ce este disponibil pe datele tale.",
    car: "Mașina", year: "An", type: "Tip", gear: "Cutie", fuel: "Combustibil",
    seats: "Locuri", d12: "1 la 2 zile", d37: "3 la 7 zile", d820: "8 la 20 zile",
    d2145: "21 la 45 zile", d46: "46+ zile", perday: "pe zi",
    unavailable: "rezervată acum", updated: "Tarife actualizate la",
    cta: "Vezi mașina", auto: "Automată", manual: "Manuală",
  },
  ru: {
    heading: "Автопарк и цены за сутки",
    intro: "Чем больше суток, тем ниже цена. Страховка RCA и 200 км в сутки включены, без предоплаты.",
    more: "В таблице машины, свободные сейчас. Всего в автопарке 70 автомобилей, поэтому если нужной модели нет в списке, позвоните на +373 60 000 500 — подскажем, что свободно на ваши даты.",
    car: "Машина", year: "Год", type: "Тип", gear: "Коробка", fuel: "Топливо",
    seats: "Мест", d12: "1 до 2 суток", d37: "3 до 7 суток", d820: "8 до 20 суток",
    d2145: "21 до 45 суток", d46: "46+ суток", perday: "в сутки",
    unavailable: "сейчас занята", updated: "Цены обновлены",
    cta: "Смотреть", auto: "Автомат", manual: "Механика",
  },
  en: {
    heading: "The fleet and the daily rates",
    intro: "The rate drops with the number of days. Insurance and 200 km a day are included, no deposit up front.",
    more: "The table shows the cars free right now. The fleet is 70 vehicles, so if the model you want is not listed, call +373 60 000 500 and we will tell you what is free on your dates.",
    car: "Car", year: "Year", type: "Type", gear: "Gearbox", fuel: "Fuel",
    seats: "Seats", d12: "1 to 2 days", d37: "3 to 7 days", d820: "8 to 20 days",
    d2145: "21 to 45 days", d46: "46+ days", perday: "per day",
    unavailable: "booked right now", updated: "Rates updated",
    cta: "See the car", auto: "Automatic", manual: "Manual",
  },
};

// The API stores these in English; the page has to read in its own language.
const WORDS = {
  fuel: {
    gasoline: { ro: "Benzină", ru: "Бензин", en: "Petrol" },
    petrol: { ro: "Benzină", ru: "Бензин", en: "Petrol" },
    diesel: { ro: "Motorină", ru: "Дизель", en: "Diesel" },
    hybrid: { ro: "Hibrid", ru: "Гибрид", en: "Hybrid" },
    electric: { ro: "Electric", ru: "Электро", en: "Electric" },
    gas: { ro: "Gaz", ru: "Газ", en: "LPG" },
  },
  type: {
    sedan: { ro: "Sedan", ru: "Седан", en: "Sedan" },
    crossover: { ro: "Crossover", ru: "Кроссовер", en: "Crossover" },
    suv: { ro: "SUV", ru: "Внедорожник", en: "SUV" },
    hatchback: { ro: "Hatchback", ru: "Хэтчбек", en: "Hatchback" },
    minivan: { ro: "Minivan", ru: "Минивэн", en: "Minivan" },
    universal: { ro: "Break", ru: "Универсал", en: "Estate" },
    coupe: { ro: "Coupe", ru: "Купе", en: "Coupe" },
  },
};

function word(group, value, lang) {
  if (!value) return "-";
  const hit = WORDS[group][String(value).toLowerCase().trim()];
  return hit ? hit[lang] : value;
}

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function policy(car) {
  let p = car.price_policy;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch { p = {}; } }
  return p || {};
}

const price = (p, k) => {
  const v = parseFloat(p[k]);
  return isFinite(v) ? v : null;
};

function lowest(car) {
  const vals = Object.values(policy(car)).map(parseFloat).filter(isFinite);
  return vals.length ? Math.min(...vals) : null;
}

function gearLabel(car, t) {
  const g = String(car.gear_type || "").toLowerCase();
  if (g.startsWith("auto")) return t.auto;
  if (g.startsWith("man")) return t.manual;
  return car.gear_type || "-";
}

function table(cars, lang) {
  const t = T[lang];
  const today = new Date().toISOString().slice(0, 10);
  const rows = cars.map((car) => {
    const p = policy(car);
    const name = `${car.make_name || ""} ${car.model_name || ""}`.trim();
    const cell = (k) => {
      const v = price(p, k);
      return v === null ? "<td>-</td>" : `<td>&euro;${v}</td>`;
    };
    return `
        <tr>
          <th scope="row"><a href="${pathFor(car, lang, cars)}">${esc(name)}</a>${car.booked ? ` <span class="pr-fleet-busy">${esc(t.unavailable)}</span>` : ""}</th>
          <td>${esc(car.production_year || "-")}</td>
          <td>${esc(word("type", car.car_type, lang))}</td>
          <td>${esc(gearLabel(car, t))}</td>
          <td>${esc(word("fuel", car.fuel_type, lang))}</td>
          <td>${esc(car.num_passengers || "-")}</td>
          ${cell("1-2")}
          ${cell("3-7")}
          ${cell("8-20")}
          ${cell("21-45")}
          ${cell("46+")}
        </tr>`;
  }).join("");

  return `
      <section class="pr-fleet-table-section" aria-labelledby="pr-fleet-heading">
        <h2 id="pr-fleet-heading">${esc(t.heading)}</h2>
        <p class="pr-fleet-intro">${esc(t.intro)}</p>
        <!-- The table and the ItemList beside it hold the cars that are free
             now, while the pages say the fleet is 70 vehicles. Both are true,
             and read side by side without this line they look like a
             contradiction, which is exactly what an AI summarising the page
             would pick up on. -->
        <p class="pr-fleet-more">${esc(t.more)}</p>
        <div class="pr-fleet-scroll">
          <table class="pr-fleet-table">
            <caption class="pr-fleet-caption">${esc(t.updated)} ${today}</caption>
            <thead>
              <tr>
                <th scope="col">${esc(t.car)}</th>
                <th scope="col">${esc(t.year)}</th>
                <th scope="col">${esc(t.type)}</th>
                <th scope="col">${esc(t.gear)}</th>
                <th scope="col">${esc(t.fuel)}</th>
                <th scope="col">${esc(t.seats)}</th>
                <th scope="col">${esc(t.d12)}</th>
                <th scope="col">${esc(t.d37)}</th>
                <th scope="col">${esc(t.d820)}</th>
                <th scope="col">${esc(t.d2145)}</th>
                <th scope="col">${esc(t.d46)}</th>
              </tr>
            </thead>
            <tbody>${rows}
            </tbody>
          </table>
        </div>
      </section>`;
}

/**
 * The same table, for machines.
 *
 * Each car is a Product rather than a Car: Google reads schema.org Car as a
 * listing for a vehicle that is for sale and demands a VIN, a condition and a
 * model before it will accept one, which is the wrong question to ask a rental
 * fleet. The specifications stay, as additionalProperty.
 */
function itemList(cars, lang) {
  const t = T[lang];
  const spec = (label, value) =>
    value === null || value === undefined || value === "" || value === "-"
      ? null
      : { "@type": "PropertyValue", name: label, value: String(value) };

  const items = cars.map((car, i) => {
    const name = `${car.make_name || ""} ${car.model_name || ""}`.trim();
    const low = lowest(car);
    const properties = [
      spec(t.year, car.production_year),
      spec(t.type, word("type", car.car_type, lang)),
      spec(t.gear, gearLabel(car, t)),
      spec(t.fuel, word("fuel", car.fuel_type, lang)),
      spec(t.seats, car.num_passengers),
    ].filter(Boolean);

    const node = {
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        additionalType: "https://schema.org/Car",
        name,
        url: "https://plusrent.md" + pathFor(car, lang, cars),
        // Without this Google will not show the car at all. Nine cars in this
        // list were rejected outright for having no image, while the same
        // cars on their own pages had one all along.
        image: carImage(car),
        description: CAR_T[lang].desc(
          name,
          low === null ? "15" : low,
          car.num_passengers || "5",
          gearLabel(car, t)
        ),
        sku: "plusrent-car-" + car.id,
        brand: { "@type": "Brand", name: car.make_name || "" },
        model: car.model_name || undefined,
        itemCondition: "https://schema.org/UsedCondition",
        productionDate: car.production_year ? String(car.production_year) : undefined,
        additionalProperty: properties.length ? properties : undefined,
      },
    };
    if (low !== null) {
      node.item.offers = {
        "@type": "Offer",
        price: String(low),
        priceCurrency: "EUR",
        availability: car.booked
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
        itemCondition: "https://schema.org/UsedCondition",
        url: "https://plusrent.md" + pathFor(car, lang, cars),
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: String(low),
          priceCurrency: "EUR",
          unitCode: "DAY",
        },
        seller: { "@id": "https://plusrent.md/#business" },
        ...offerValidity(),
        ...offerTerms(),
      };
    }
    return node;
  });

  const url =
    lang === "ro" ? "https://plusrent.md/ro/cars"
    : lang === "ru" ? "https://plusrent.md/ru/cars"
    : "https://plusrent.md/en/cars";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": url + "#fleet",
    name: T[lang].heading,
    numberOfItems: cars.length,
    itemListElement: items,
  };
}

module.exports = {
  fleetSection: table,
  fleetItemList: itemList,
  fleetWords: T,
  lowestPrice: lowest,
};
