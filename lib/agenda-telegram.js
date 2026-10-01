/**
 * Tomorrow's agenda to the owner's Telegram (1 Oct 2026): the agenda entries
 * that are still planned and the site bookings handed over or returned that
 * day, each with a "Confirmare WhatsApp" button holding the ready text for the
 * client (lib/confirm-message.js). Sent by the daily cron and by the "send now"
 * button in the admin agenda. Same bot and chat as the booking notifications.
 */
const axios = require("axios");
const { supabaseAdmin } = require("./supabaseClient");
const { confirmation, TZ } = require("./confirm-message");

const SERVICE = {
  transfer_iasi: "Transfer Chișinău-Iași",
  transfer_kiv: "Transfer aeroport KIV",
  sofer_personal: "Șofer personal",
  sofer_treaz: "Șofer treaz",
  rental: "Închiriere (telefon)",
  task: "Sarcină",
  other: "Altele",
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
/** YYYY-MM-DD of a moment in Chișinău. */
function localDay(d) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function localTime(d) {
  return new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}
function addDaysYmd(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return x.toISOString().slice(0, 10);
}

async function tomorrowAgenda(now = new Date()) {
  const today = localDay(now);
  const day = addDaysYmd(today, 1);
  const [orders, bookings, cars] = await Promise.all([
    supabaseAdmin
      .from("service_orders")
      .select("*")
      .gte("starts_at", addDaysYmd(day, -1) + "T12:00:00Z")
      .lte("starts_at", addDaysYmd(day, 1) + "T12:00:00Z")
      .eq("status", "planned")
      .order("starts_at"),
    supabaseAdmin
      .from("bookings")
      .select("id, car_id, pickup_date, return_date, pickup_time, return_time, status, customer_name, customer_phone, pickup_location, dropoff_location, total_price")
      .in("status", ["pending", "confirmed"])
      .or(`pickup_date.eq.${day},return_date.eq.${day}`),
    supabaseAdmin.from("cars").select("id, make_name, model_name, production_year"),
  ]);
  if (orders.error) throw orders.error;
  if (bookings.error) throw bookings.error;
  const carList = cars.data || [];
  const name = (id) => {
    const c = carList.find((x) => x.id === id);
    return c ? `${c.make_name || ""} ${c.model_name || ""}`.trim() : "mașină";
  };
  const items = [];
  (orders.data || []).forEach((o) => {
    const d = new Date(o.starts_at);
    if (localDay(d) !== day) return;
    items.push({ time: localTime(d), order: o });
  });
  (bookings.data || []).forEach((b) => {
    if (String(b.pickup_date).slice(0, 10) === day) items.push({ time: (b.pickup_time || "").slice(0, 5), booking: b, kind: "Predare", car: name(b.car_id) });
    if (String(b.return_date).slice(0, 10) === day && b.status === "confirmed") items.push({ time: (b.return_time || "").slice(0, 5), booking: b, kind: "Returnare", car: name(b.car_id) });
  });
  items.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  return { day, items, cars: carList };
}

function format({ day, items, cars }) {
  const [y, m, d] = day.split("-").map(Number);
  const title = new Intl.DateTimeFormat("ro-RO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(y, m - 1, d)));
  if (!items.length) return { text: `📅 <b>Mâine, ${esc(title)}</b>\nNimic programat. O seară liniștită!`, buttons: [] };
  const lines = [`📅 <b>Mâine, ${esc(title)}</b> · ${items.length}`];
  const buttons = [];
  items.forEach((it) => {
    if (it.order) {
      const o = it.order;
      const head = o.service === "task" ? `📝 ${esc(o.title || "Sarcină")}` : `🚘 ${esc(SERVICE[o.service] || o.service)}${o.tier ? " · " + esc({ standard: "Standard", business: "Business", vip: "VIP" }[o.tier] || o.tier) : ""}`;
      const route = [o.route_from, o.route_to].filter(Boolean).join(" → ");
      const who = [o.client_name, o.client_phone].filter(Boolean).join(" · ");
      const money = o.service === "task" || !Number(o.price) ? "" : ` · ${Math.round(o.price)} ${o.currency === "MDL" ? "MDL" : "€"}`;
      lines.push(`\n<b>${esc(it.time)}</b> ${head}${money}` + (route ? `\n${esc(route)}` : "") + (who ? `\n👤 ${esc(who)}` : "") + (o.notes ? `\n🗒 ${esc(o.notes)}` : ""));
      const c = confirmation(o, cars);
      if (c) buttons.push([{ text: `✅ Confirmare WhatsApp: ${(o.client_name || o.client_phone).slice(0, 30)}`, url: c.waUrl }]);
    } else {
      const b = it.booking;
      const who = [b.customer_name && !/^not provided$/i.test(b.customer_name) ? b.customer_name : "", b.customer_phone].filter(Boolean).join(" · ");
      const place = it.kind === "Predare" ? b.pickup_location : b.dropoff_location;
      lines.push(`\n<b>${esc(it.time || "–")}</b> 🔑 ${it.kind}: ${esc(it.car)} (rezervare #${b.id}${b.status === "pending" ? ", neconfirmată" : ""})` + (place ? `\n${esc(place)}` : "") + (who ? `\n👤 ${esc(who)}` : ""));
    }
  });
  let text = lines.join("\n");
  if (text.length > 3900) text = text.slice(0, 3880) + "\n…";
  return { text, buttons: buttons.slice(0, 40) };
}

async function sendTomorrow(now) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) throw new Error("Telegram is not configured");
  const agenda = await tomorrowAgenda(now);
  const { text, buttons } = format(agenda);
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chat,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(buttons.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
  return { day: agenda.day, items: agenda.items.length };
}

module.exports = { sendTomorrow, tomorrowAgenda, format };
