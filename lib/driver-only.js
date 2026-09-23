/**
 * Cars that are rented only together with a PlusRent driver, never self-drive.
 *
 * The owner confirmed on 23 September 2026 that the BMW M8 Competition goes out
 * only with a driver, while the catalogue listed it like any other rental car.
 * There is no column for this in the cars table, so the rule lives here and is
 * matched on make and model rather than on the id, which changes if the car is
 * ever added again.
 */

const MODELS = [/^bmw\s+m8\b/i];

const NOTE = {
  ro: "doar cu șofer",
  ru: "только с водителем",
  en: "with a driver only",
};

const NOTICE = {
  ro: "Această mașină se închiriază doar cu șofer personal PlusRent. Pentru detalii sună la +373 60 000 500.",
  ru: "Этот автомобиль сдаётся только с личным водителем PlusRent. Подробности по телефону +373 60 000 500.",
  en: "This car is rented only with a PlusRent personal driver. For details call +373 60 000 500.",
};

function isDriverOnly(car) {
  const name = `${(car && car.make_name) || ""} ${(car && car.model_name) || ""}`.trim();
  return MODELS.some((re) => re.test(name));
}

module.exports = { isDriverOnly, NOTE, NOTICE };
