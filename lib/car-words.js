/**
 * The car fields the database stores in English, said in the page's language.
 *
 * The fleet table on /cars translated these and the car pages did not, so the
 * Romanian page for an Audi said "Combustibil Gasoline" and "Motor 2" while the
 * table one click away said "Benzină". Both read from here now.
 */

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

/** The translated word, or the stored value as it is when there is none. */
function word(group, value, lang) {
  if (value === null || value === undefined || value === "") return value;
  const hit = WORDS[group][String(value).toLowerCase().trim()];
  return hit ? hit[lang] : value;
}

const LITRE = { ro: "L", ru: "л", en: "L" };

/** "2" is stored for a two-litre engine; the page says "2.0 L". */
function engine(value, lang) {
  if (value === null || value === undefined || value === "") return value;
  const s = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return value;
  return parseFloat(s).toFixed(1) + " " + (LITRE[lang] || "L");
}

module.exports = { WORDS, word, engine };
