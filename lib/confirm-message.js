/**
 * The confirmation a client gets on WhatsApp for an agenda entry (1 Oct 2026).
 * One place for the wording: the Telegram reminder and the "Confirmare
 * WhatsApp" button in the admin agenda both use it. The owner sends it
 * himself after a look: nothing goes to a client automatically.
 *
 * Language by the phone prefix (owner's choice): +373 / a local 0... number
 * -> Romanian, +7 / +380 -> Russian, anything else -> English.
 */
const TZ = "Europe/Chisinau";
const OFFICE_PHONE = "+373 60 000 500";

function language(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (!d) return "ro";
  if (d.startsWith("373") || (String(phone).trim().startsWith("0") && d.length <= 9)) return "ro";
  if (d.startsWith("7") || d.startsWith("380")) return "ru";
  return "en";
}

const LOCALE = { ro: "ro-RO", ru: "ru-RU", en: "en-GB" };
function when(iso, lang) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
  const time = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  return { date, time };
}
function day(ymd, lang) {
  if (!ymd) return "";
  const [y, m, dd] = String(ymd).slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(Date.UTC(y, m - 1, dd)));
}

const TIER = { standard: "Standard", business: "Business", vip: "VIP" };
function price(o) {
  if (!Number(o.price)) return "";
  return o.currency === "MDL" ? `${Math.round(o.price)} MDL` : `${Math.round(o.price)} €`;
}
function carName(cars, id) {
  const c = (cars || []).find((x) => x.id === id);
  return c ? `${c.make_name || ""} ${c.model_name || ""}`.trim() : "";
}

const T = {
  ro: {
    hello: (n) => (n ? `Bună ziua, ${n}!` : "Bună ziua!"),
    transfer: (o, w, p, tier) => `Vă confirmăm transferul PlusRent ${o.route_from || ""} → ${o.route_to || ""}, ${w.date}, ora ${w.time}.${tier ? ` Clasa ${tier}.` : ""}${p ? ` Preț: ${p}, plata la final.` : " Plata la final."}`,
    iasi: " Aveți nevoie de pașaport valabil; la vamă șoferul vă ajută.",
    kiv: " Șoferul urmărește zborul și vă așteaptă la sosiri.",
    driver: (o, w, p, tier) => `Vă confirmăm șoferul personal PlusRent ${w.date}, de la ora ${w.time}${o.route_from ? `, din ${o.route_from}` : ""}.${tier ? ` Pachetul ${tier}.` : ""}${p ? ` Preț: ${p}, plata la final.` : ""}`,
    sober: (o, w, p) => `Vă confirmăm șoferul treaz PlusRent ${w.date}, ora ${w.time}${o.route_from ? `, la ${o.route_from}` : ""}.${p ? ` Preț: ${p}.` : ""}`,
    rental: (o, w, p, car, back) => `Vă confirmăm rezervarea mașinii${car ? ` ${car}` : ""}: predarea ${w.date}, ora ${w.time}${back ? `, returnarea ${back}` : ""}.${p ? ` Preț: ${p}, plata la preluare.` : ""} Vă rugăm să aveți permisul de conducere și buletinul sau pașaportul.`,
    bye: `Pentru orice întrebare: ${OFFICE_PHONE}. Mulțumim că ați ales PlusRent!`,
  },
  ru: {
    hello: (n) => (n ? `Здравствуйте, ${n}!` : "Здравствуйте!"),
    transfer: (o, w, p, tier) => `Подтверждаем трансфер PlusRent ${o.route_from || ""} → ${o.route_to || ""}, ${w.date}, в ${w.time}.${tier ? ` Класс ${tier}.` : ""}${p ? ` Стоимость: ${p}, оплата в конце поездки.` : " Оплата в конце поездки."}`,
    iasi: " Нужен действующий паспорт; на границе водитель поможет.",
    kiv: " Водитель следит за рейсом и встретит вас в зоне прилёта.",
    driver: (o, w, p, tier) => `Подтверждаем личного водителя PlusRent ${w.date}, с ${w.time}${o.route_from ? `, от ${o.route_from}` : ""}.${tier ? ` Пакет ${tier}.` : ""}${p ? ` Стоимость: ${p}, оплата в конце.` : ""}`,
    sober: (o, w, p) => `Подтверждаем трезвого водителя PlusRent ${w.date}, в ${w.time}${o.route_from ? `, адрес: ${o.route_from}` : ""}.${p ? ` Стоимость: ${p}.` : ""}`,
    rental: (o, w, p, car, back) => `Подтверждаем бронь автомобиля${car ? ` ${car}` : ""}: выдача ${w.date}, в ${w.time}${back ? `, возврат ${back}` : ""}.${p ? ` Стоимость: ${p}, оплата при получении.` : ""} Возьмите, пожалуйста, водительское удостоверение и паспорт или удостоверение личности.`,
    bye: `По любым вопросам: ${OFFICE_PHONE}. Спасибо, что выбрали PlusRent!`,
  },
  en: {
    hello: (n) => (n ? `Hello ${n},` : "Hello,"),
    transfer: (o, w, p, tier) => `we confirm your PlusRent transfer ${o.route_from || ""} → ${o.route_to || ""} on ${w.date} at ${w.time}.${tier ? ` Class: ${tier}.` : ""}${p ? ` Price: ${p}, paid at the end.` : " Payment at the end."}`,
    iasi: " Please bring a valid passport; the driver helps at the border.",
    kiv: " The driver tracks your flight and meets you at arrivals.",
    driver: (o, w, p, tier) => `we confirm your PlusRent personal driver on ${w.date} from ${w.time}${o.route_from ? `, starting at ${o.route_from}` : ""}.${tier ? ` Package: ${tier}.` : ""}${p ? ` Price: ${p}, paid at the end.` : ""}`,
    sober: (o, w, p) => `we confirm your PlusRent sober driver on ${w.date} at ${w.time}${o.route_from ? `, at ${o.route_from}` : ""}.${p ? ` Price: ${p}.` : ""}`,
    rental: (o, w, p, car, back) => `we confirm your car rental${car ? ` (${car})` : ""}: pickup on ${w.date} at ${w.time}${back ? `, return on ${back}` : ""}.${p ? ` Price: ${p}, paid at pickup.` : ""} Please bring your driving licence and your ID card or passport.`,
    bye: `Any question: ${OFFICE_PHONE}. Thank you for choosing PlusRent!`,
  },
};

/** { lang, text, phone, waUrl } or null when the entry has no phone / is a task. */
function confirmation(o, cars) {
  if (!o || o.service === "task" || !o.client_phone) return null;
  const lang = language(o.client_phone);
  const t = T[lang];
  const w = when(o.starts_at, lang);
  const p = price(o);
  const tier = o.tier ? TIER[o.tier] : "";
  let body;
  if (o.service === "transfer_iasi") body = t.transfer(o, w, p, tier) + t.iasi;
  else if (o.service === "transfer_kiv") body = t.transfer(o, w, p, tier) + t.kiv;
  else if (o.service === "sofer_personal") body = t.driver(o, w, p, tier);
  else if (o.service === "sofer_treaz") body = t.sober(o, w, p);
  else if (o.service === "rental") body = t.rental(o, w, p, carName(cars, o.car_id), day(o.ends_on, lang));
  else body = t.transfer(o, w, p, tier);
  const name = (o.client_name || "").trim().replace(/\s+/g, " ");
  const text = `${t.hello(name)} ${body}\n\n${t.bye}`;
  const digits = String(o.client_phone).replace(/\D/g, "").replace(/^0/, "373");
  return { lang, text, phone: o.client_phone, waUrl: `https://wa.me/${digits}?text=${encodeURIComponent(text)}` };
}

module.exports = { confirmation, language, when, TZ };
