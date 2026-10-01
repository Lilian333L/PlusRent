/**
 * Admin dashboard data (Prezentare + Jurnal servicii tabs, 1 Oct 2026).
 *
 * Everything here is admin only. The statistics are computed in the browser
 * from the rows these routes return (a few hundred rows; no heavy SQL needed):
 *   GET  /admin-dashboard/data?from=YYYY-MM-DD&to=YYYY-MM-DD
 *        bookings (rentals) and service orders for a period, plus the cars
 *   GET  /admin-dashboard/service-orders?from&to
 *   POST /admin-dashboard/service-orders
 *   PUT  /admin-dashboard/service-orders/:id
 *   GET  /admin-dashboard/site-requests          the requests left on the site
 *   PUT  /admin-dashboard/site-requests/:id      { status }
 * Nothing is ever deleted: an order or a request is cancelled instead.
 */
const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { supabaseAdmin } = require("../lib/supabaseClient");
const { authenticateToken } = require("../middleware/auth");

/**
 * Daily cron (vercel.json "crons"): tomorrow's agenda to the owner's Telegram.
 * Vercel calls it with "Authorization: Bearer <CRON_SECRET>"; without that
 * environment variable set, nothing runs.
 */
router.get("/cron/daily-agenda", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });
  try {
    const r = await require("../lib/agenda-telegram").sendTomorrow();
    res.json({ sent: true, ...r });
  } catch (error) {
    console.error("cron daily-agenda:", error.message);
    res.status(500).json({ error: "Failed" });
  }
});

router.use(authenticateToken);

/** "Trimite acum": the same message on demand (admin agenda button). */
router.post("/telegram/tomorrow", async (req, res) => {
  try {
    const r = await require("../lib/agenda-telegram").sendTomorrow();
    res.json({ sent: true, ...r });
  } catch (error) {
    console.error("telegram tomorrow:", error.message);
    res.status(500).json({ error: "Telegram nu a răspuns" });
  }
});

/** The WhatsApp confirmation for one agenda entry (lib/confirm-message.js). */
router.get("/service-orders/:id/confirmation", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const [{ data: o, error }, { data: cars }] = await Promise.all([
    supabaseAdmin.from("service_orders").select("*").eq("id", req.params.id).single(),
    supabaseAdmin.from("cars").select("id, make_name, model_name"),
  ]);
  if (error || !o) return res.status(404).json({ error: "Not found" });
  const c = require("../lib/confirm-message").confirmation(o, cars || []);
  if (!c) return res.status(422).json({ error: "Intrarea nu are telefon" });
  res.json(c);
});

/** Search the whole history: agenda entries and site bookings, by name, phone or text. */
router.get("/search", async (req, res) => {
  const raw = String(req.query.q || "").trim();
  // only letters, digits, spaces and + reach the filter (it is a PostgREST expression)
  const q = raw.replace(/[^\p{L}\p{N} +]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 2) return res.json({ orders: [], bookings: [] });
  const like = `%${q}%`;
  const digits = q.replace(/\D/g, "");
  const orderOr = ["client_name", "client_phone", "title", "notes", "route_from", "route_to"].map((f) => `${f}.ilike.${like}`);
  const bookingOr = ["customer_name", "customer_phone", "customer_email"].map((f) => `${f}.ilike.${like}`);
  if (digits.length >= 4 && digits !== q) {
    orderOr.push(`client_phone.ilike.%${digits}%`);
    bookingOr.push(`customer_phone.ilike.%${digits}%`);
  }
  const [orders, bookings] = await Promise.all([
    supabaseAdmin.from("service_orders").select("*").or(orderOr.join(",")).order("starts_at", { ascending: false }).limit(50),
    supabaseAdmin.from("bookings").select("id, car_id, pickup_date, return_date, pickup_time, total_price, status, customer_name, customer_phone, pickup_location").or(bookingOr.join(",")).order("pickup_date", { ascending: false }).limit(50),
  ]);
  if (bookings.error) return res.status(500).json({ error: "Database error" });
  res.json({ orders: orders.error ? [] : orders.data || [], bookings: bookings.data || [] });
});

/** A client seen before, by phone: the name, how many orders, the last notes (agenda form autofill). */
router.get("/client", async (req, res) => {
  const digits = String(req.query.phone || "").replace(/\D/g, "").slice(-8);
  if (digits.length < 6) return res.json({ found: false });
  const [orders, bookings] = await Promise.all([
    supabaseAdmin.from("service_orders").select("client_name, client_phone, notes, route_from, route_to, starts_at, service").ilike("client_phone", `%${digits}%`).order("starts_at", { ascending: false }).limit(20),
    supabaseAdmin.from("bookings").select("customer_name, customer_phone, pickup_date, status").ilike("customer_phone", `%${digits}%`).order("pickup_date", { ascending: false }).limit(20),
  ]);
  const o = orders.error ? [] : orders.data || [];
  const b = bookings.error ? [] : bookings.data || [];
  if (!o.length && !b.length) return res.json({ found: false });
  const realName = (n) => n && !/^not provided$/i.test(n.trim()) ? n.trim() : "";
  const name = (o.map((x) => realName(x.client_name)).find(Boolean)) || (b.map((x) => realName(x.customer_name)).find(Boolean)) || "";
  const lastOrder = o.find((x) => x.notes) || null;
  const dates = o.map((x) => String(x.starts_at).slice(0, 10)).concat(b.map((x) => String(x.pickup_date).slice(0, 10))).sort();
  res.json({
    found: true,
    name,
    orders: o.length,
    bookings: b.length,
    last: dates[dates.length - 1] || null,
    lastNotes: lastOrder ? lastOrder.notes : "",
  });
});

/** Sign out every device: tokens issued before now stop working (middleware/auth.js). */
router.post("/logout-all", async (req, res) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("global_settings")
    .upsert({ setting_key: "admin_tokens_valid_after", setting_value: now, description: "Admin tokens issued before this moment are refused (logout everywhere)", updated_at: now }, { onConflict: "setting_key" });
  if (error) return res.status(500).json({ error: "Database error" });
  require("../middleware/auth").forgetValidAfter();
  res.json({ ok: true });
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TABLE_MISSING = "service_orders_missing";

function period(req) {
  const { from, to } = req.query;
  if (!DATE.test(from || "") || !DATE.test(to || "")) return null;
  return { from, to };
}

function missingTable(error) {
  return error && /service_orders/.test(error.message || "") && /(schema cache|does not exist)/.test(error.message || "");
}

const orderFields = {
  service: Joi.string().valid("transfer_iasi", "transfer_kiv", "sofer_personal", "sofer_treaz", "rental", "task", "other"),
  ends_on: Joi.string().pattern(DATE).allow("", null),
  title: Joi.string().allow("", null).max(200),
  car_id: Joi.number().integer().allow(null),
  starts_at: Joi.date().iso(),
  route_from: Joi.string().allow("", null).max(200),
  route_to: Joi.string().allow("", null).max(200),
  client_name: Joi.string().allow("", null).max(120),
  client_phone: Joi.string().allow("", null).max(40),
  tier: Joi.string().valid("standard", "business", "vip").allow(null),
  passengers: Joi.number().integer().min(1).max(20).allow(null),
  price: Joi.number().min(0).max(100000),
  currency: Joi.string().valid("EUR", "MDL"),
  payment: Joi.string().valid("cash", "card", "transfer").allow(null),
  status: Joi.string().valid("planned", "done", "cancelled"),
  cost_fuel: Joi.number().min(0).max(100000),
  cost_docs: Joi.number().min(0).max(100000),
  cost_wash: Joi.number().min(0).max(100000),
  cost_other: Joi.number().min(0).max(100000),
  notes: Joi.string().allow("", null).max(2000),
  source_request_id: Joi.number().integer().allow(null),
};
const createSchema = Joi.object(orderFields).fork(["service", "starts_at"], (s) => s.required());
const updateSchema = Joi.object(orderFields).min(1);

/** Rentals and service orders of a period, with the cars, in one call. */
router.get("/data", async (req, res) => {
  const p = period(req);
  if (!p) return res.status(400).json({ error: "from and to (YYYY-MM-DD) are required" });
  try {
    const [bookings, orders, cars] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("id, car_id, pickup_date, return_date, total_price, status, customer_name, customer_phone, pickup_location, dropoff_location, pickup_time, return_time, created_at")
        // every rental that overlaps the period: revenue is counted by pickup date
        // in the browser, the occupancy needs the ones that started earlier too
        .lte("pickup_date", p.to)
        .gte("return_date", p.from),
      supabaseAdmin
        .from("service_orders")
        .select("*")
        .gte("starts_at", p.from + "T00:00:00Z")
        .lte("starts_at", p.to + "T23:59:59Z")
        .order("starts_at"),
      supabaseAdmin.from("cars").select("id, make_name, model_name, production_year"),
    ]);
    if (bookings.error) throw bookings.error;
    if (cars.error) throw cars.error;
    res.json({
      bookings: bookings.data || [],
      orders: orders.error ? [] : orders.data || [],
      ordersReady: !orders.error,
      ordersError: orders.error ? (missingTable(orders.error) ? TABLE_MISSING : orders.error.message) : null,
      cars: cars.data || [],
    });
  } catch (error) {
    console.error("admin-dashboard /data:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/service-orders", async (req, res) => {
  const p = period(req);
  if (!p) return res.status(400).json({ error: "from and to (YYYY-MM-DD) are required" });
  const { data, error } = await supabaseAdmin
    .from("service_orders")
    .select("*")
    .gte("starts_at", p.from + "T00:00:00Z")
    .lte("starts_at", p.to + "T23:59:59Z")
    .order("starts_at");
  if (error) return res.status(missingTable(error) ? 503 : 500).json({ error: missingTable(error) ? TABLE_MISSING : "Database error" });
  res.json(data || []);
});

router.post("/service-orders", async (req, res) => {
  const { error: invalid, value } = createSchema.validate(req.body, { stripUnknown: true });
  if (invalid) return res.status(400).json({ error: invalid.details[0].message });
  const { data, error } = await supabaseAdmin.from("service_orders").insert(value).select().single();
  if (error) {
    console.error("admin-dashboard create order:", error);
    return res.status(missingTable(error) ? 503 : 500).json({ error: missingTable(error) ? TABLE_MISSING : "Database error" });
  }
  res.status(201).json(data);
});

router.put("/service-orders/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const { error: invalid, value } = updateSchema.validate(req.body, { stripUnknown: true });
  if (invalid) return res.status(400).json({ error: invalid.details[0].message });
  value.updated_at = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from("service_orders").update(value).eq("id", req.params.id).select().single();
  if (error) {
    console.error("admin-dashboard update order:", error);
    return res.status(500).json({ error: "Database error" });
  }
  res.json(data);
});

/** Delete an agenda entry for good: only one that is already cancelled (owner, 1 Oct 2026). */
router.delete("/service-orders/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const { data, error } = await supabaseAdmin
    .from("service_orders")
    .delete()
    .eq("id", req.params.id)
    .eq("status", "cancelled")
    .select("id");
  if (error) return res.status(500).json({ error: "Database error" });
  if (!data.length) return res.status(409).json({ error: "Doar intrările anulate pot fi șterse." });
  res.json({ deleted: data.length });
});

router.get("/site-requests", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("service_callbacks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return res.status(500).json({ error: "Database error" });
  res.json(data || []);
});

const REQUEST_STATUSES = ["pending", "contacted", "confirmed", "completed", "cancelled", "rejected"];
router.put("/site-requests/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const { status } = req.body || {};
  if (!REQUEST_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const { data, error } = await supabaseAdmin
    .from("service_callbacks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: "Database error" });
  res.json(data);
});

/**
 * Delete pending bookings for good (owner, 1 Oct 2026: the test requests).
 * Only bookings that are still "pending" are touched: the status is checked
 * again here, so a confirmed or finished booking can never go. A coupon used
 * by one of them is given back first, like a cancellation does.
 * Body: { confirm: "DELETE", ids?: [..] }  (no ids = every pending booking)
 */
router.post("/bookings/delete-pending", async (req, res) => {
  const { confirm, ids } = req.body || {};
  if (confirm !== "DELETE") return res.status(400).json({ error: "confirm must be DELETE" });
  try {
    let q = supabaseAdmin.from("bookings").select("id, discount_code, customer_phone").eq("status", "pending");
    if (Array.isArray(ids) && ids.length) q = q.in("id", ids.map(Number).filter(Number.isInteger));
    const { data: pending, error } = await q;
    if (error) throw error;
    if (!pending.length) return res.json({ deleted: 0 });
    const { restoreCouponToAvailable } = require("./bookings");
    for (const b of pending) {
      if (b.discount_code && typeof restoreCouponToAvailable === "function") {
        await restoreCouponToAvailable(b.discount_code, b.customer_phone);
      }
    }
    const list = pending.map((b) => b.id);
    await supabaseAdmin.from("booked_cars").delete().in("booking_id", list);
    const { data: gone, error: delError } = await supabaseAdmin
      .from("bookings")
      .delete()
      .in("id", list)
      .eq("status", "pending")
      .select("id");
    if (delError) throw delError;
    console.log(`admin-dashboard: deleted ${gone.length} pending bookings by ${req.user && req.user.username}`);
    res.json({ deleted: gone.length });
  } catch (error) {
    console.error("admin-dashboard delete-pending:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
