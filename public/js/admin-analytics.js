/**
 * PlusRent admin: "Prezentare" (statistics) and "Jurnal servicii" (the log of
 * transfers and driver jobs added by hand), 1 Oct 2026.
 *
 * Data comes from /api/admin-dashboard/* (admin token) and /api/bookings.
 * Rules agreed with the owner:
 *   - rental revenue counts on the pickup date, only confirmed / completed /
 *     finished bookings;
 *   - a service order earns when it is marked done; planned ones are shown
 *     apart; trip costs (lei) give the net profit;
 *   - test bookings are cancelled through the existing cancel route, never
 *     deleted.
 * Charts are plain SVG (no library, nothing from a CDN). Styles: css/admin-analytics.css.
 */
(function () {
  "use strict";

  var OV = document.getElementById("aaOverview");
  var JR = document.getElementById("aaJournal");
  if (!OV || !JR) return;

  var API = (window.API_BASE_URL || "") + "/api";
  var EARNING = ["confirmed", "completed", "finished"];
  var SERVICES = [
    { key: "rental", label: "Închirieri auto", color: "var(--s1)" },
    { key: "transfer_kiv", label: "Transfer aeroport KIV", color: "var(--s2)" },
    { key: "transfer_iasi", label: "Transfer Chișinău-Iași", color: "var(--s3)" },
    { key: "sofer_personal", label: "Șofer personal", color: "var(--s4)" },
    { key: "sofer_treaz", label: "Șofer treaz", color: "var(--s5)" },
    { key: "other", label: "Altele", color: "#a8a29e" },
  ];
  // agenda entries that are not a service the business sells
  var TASK = { key: "task", label: "Sarcină", color: "#57534e" };
  var SVC = {};
  SERVICES.forEach(function (s) { SVC[s.key] = s; });
  // what can be added by hand: a rental taken by phone, the services, a free task
  var ORDER_SERVICES = SERVICES.filter(function (s) { return s.key !== "rental" && s.key !== "other"; })
    .concat([{ key: "rental", label: "Închiriere auto", color: "var(--s1)" }, TASK]);
  SVC.task = TASK;
  var PRICES = {
    transfer_iasi: { standard: 180, business: 220, vip: 280, currency: "EUR" },
    transfer_kiv: { standard: 45, business: 65, vip: 85, currency: "EUR" },
    sofer_personal: { standard: 175, business: 275, vip: 425, currency: "EUR" },
    sofer_treaz: { standard: 500, business: 500, vip: 500, currency: "MDL" },
  };
  var ROUTES = {
    transfer_iasi: ["Chișinău", "Aeroport Iași (IAS)"],
    transfer_kiv: ["Aeroport Chișinău (KIV)", "Chișinău, centru"],
    sofer_personal: ["Chișinău", "Chișinău"],
    sofer_treaz: ["", ""],
  };
  // the owner's own figures for a Chișinău-Iași round trip (30 Sep 2026)
  var COSTS = { transfer_iasi: { cost_fuel: 1000, cost_docs: 770, cost_wash: 400, cost_other: 0 } };
  var PLACES = ["Chișinău, centru", "Botanica", "Buiucani", "Râșcani", "Ciocana", "Aeroport Chișinău (KIV)", "Iași, oraș", "Aeroport Iași (IAS)", "Gara Iași", "Castel Mimi", "Cricova", "Mileștii Mici", "Orhei", "Bălți"];
  var ORDER_STATUS = { planned: "Planificat", done: "Efectuat", cancelled: "Anulat" };
  var BOOKING_STATUS = { pending: "În așteptare", confirmed: "Confirmată", completed: "Finalizată", finished: "Finalizată", cancelled: "Anulată", rejected: "Respinsă" };
  var PAY = { cash: "Numerar", card: "Card", transfer: "Transfer bancar" };
  var TIER = { standard: "Standard", business: "Business", vip: "VIP" };

  // ── small helpers ─────────────────────────────────────────────────────
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(s) { var p = String(s).slice(0, 10).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  var fmtDay = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long" });
  var fmtShort = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" });
  var fmtMonth = new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" });
  var fmtMonthShort = new Intl.DateTimeFormat("ro-RO", { month: "short", year: "2-digit" });
  var fmtTime = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function eur(n) { return Math.round(n).toLocaleString("ro-RO") + " €"; }
  function lei(n) { return Math.round(n).toLocaleString("ro-RO") + " lei"; }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function digits(p) { return String(p || "").replace(/\D/g, "").slice(-8); }

  function rate() {
    var r = 19.5;
    try { r = parseFloat(localStorage.getItem("prAdminRate")) || 19.5; } catch (e) {}
    return r > 1 ? r : 19.5;
  }
  function toEur(amount, currency) { return currency === "MDL" ? num(amount) / rate() : num(amount); }
  function orderCostsLei(o) { return num(o.cost_fuel) + num(o.cost_docs) + num(o.cost_wash) + num(o.cost_other); }
  function orderPriceLei(o) { return o.currency === "MDL" ? num(o.price) : num(o.price) * rate(); }
  function orderProfitLei(o) { return orderPriceLei(o) - orderCostsLei(o); }

  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "aa aa-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  function api(path, opts) {
    opts = opts || {};
    var token = "";
    try { token = localStorage.getItem("adminToken") || ""; } catch (e) {}
    opts.headers = Object.assign({ "Content-Type": "application/json", Authorization: "Bearer " + token }, opts.headers || {});
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (r.status === 401 || r.status === 403) {
          var e = new Error("Sesiunea a expirat. Autentifică-te din nou.");
          e.auth = true;
          throw e;
        }
        if (!r.ok) { var err = new Error(body.error || "Eroare " + r.status); err.code = body.error; throw err; }
        return body;
      });
    });
  }

  var ICON = {
    up: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2 10 8H2z" fill="currentColor"/></svg>',
    down: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10 2 4h8z" fill="currentColor"/></svg>',
    flat: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" stroke-width="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  };

  function errorBox(e) {
    if (e && e.auth) return '<div class="aa-setup"><strong>' + esc(e.message) + '</strong> <a href="/login.html">Autentificare</a></div>';
    return '<div class="aa-setup"><strong>Nu s-au putut încărca datele.</strong> ' + esc(e && e.message) + "</div>";
  }

  // ══════════════════════════════════════════════════════════════════════
  // PREZENTARE
  // ══════════════════════════════════════════════════════════════════════
  var ov = { period: "month", gran: null, view: "chart", from: null, to: null, data: null, prev: null, pending: [] };

  function periodRange(key) {
    var t = today();
    if (key === "today") return { from: ymd(t), to: ymd(t) };
    if (key === "7d") return { from: ymd(addDays(t, -6)), to: ymd(t) };
    if (key === "month") return { from: ymd(new Date(t.getFullYear(), t.getMonth(), 1)), to: ymd(new Date(t.getFullYear(), t.getMonth() + 1, 0)) };
    if (key === "prevMonth") return { from: ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: ymd(new Date(t.getFullYear(), t.getMonth(), 0)) };
    if (key === "year") return { from: t.getFullYear() + "-01-01", to: t.getFullYear() + "-12-31" };
    return { from: ov.from || ymd(addDays(t, -29)), to: ov.to || ymd(t) };
  }
  function previousRange(r) {
    var t = ymd(today());
    if (r.to > t && r.from <= t) {
      // the period is still running: compare with the same number of days before it
      if (ov.period === "month") { var f = parseYmd(r.from), pf = new Date(f.getFullYear(), f.getMonth() - 1, 1), pt = addDays(pf, daysBetween(r.from, t)); return { from: ymd(pf), to: ymd(pt) }; }
      if (ov.period === "year") { var y = today().getFullYear() - 1; return { from: y + "-01-01", to: y + t.slice(4) }; }
    }
    var len = daysBetween(r.from, r.to) + 1;
    var to = addDays(parseYmd(r.from), -1);
    return { from: ymd(addDays(to, -(len - 1))), to: ymd(to) };
  }

  function overviewShell() {
    OV.innerHTML =
      '<div class="aa-head"><div><h2>Prezentare</h2><p>Venituri, mașini predate și clienți pentru perioada aleasă.</p></div>' +
      '<div><div class="aa-seg" role="group" aria-label="Perioada">' +
      [["today", "Azi"], ["7d", "7 zile"], ["month", "Luna aceasta"], ["prevMonth", "Luna trecută"], ["year", "Anul acesta"], ["custom", "Interval"]]
        .map(function (p) { return '<button type="button" data-period="' + p[0] + '" aria-pressed="' + (ov.period === p[0]) + '">' + p[1] + "</button>"; }).join("") +
      '</div><div class="aa-range" id="aaRange"><input type="date" id="aaFrom" aria-label="De la"> <span>–</span> <input type="date" id="aaTo" aria-label="Până la"> <button type="button" class="aa-btn aa-btn-sm" id="aaApply">Aplică</button></div></div></div>' +
      '<div id="aaOvBody"><div class="aa-empty">Se încarcă…</div></div>';
    OV.querySelectorAll("[data-period]").forEach(function (b) {
      b.addEventListener("click", function () {
        ov.period = b.dataset.period;
        ov.gran = null;
        OV.querySelectorAll("[data-period]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        document.getElementById("aaRange").classList.toggle("is-on", ov.period === "custom");
        if (ov.period !== "custom") loadOverview();
        else {
          var r = periodRange("custom");
          document.getElementById("aaFrom").value = r.from;
          document.getElementById("aaTo").value = r.to;
        }
      });
    });
    document.getElementById("aaApply").addEventListener("click", function () {
      var f = document.getElementById("aaFrom").value, t = document.getElementById("aaTo").value;
      if (!f || !t || f > t) { toast("Alege un interval valid."); return; }
      ov.from = f; ov.to = t;
      loadOverview();
    });
  }

  function loadOverview() {
    var body = document.getElementById("aaOvBody");
    var r = periodRange(ov.period);
    var p = previousRange(r);
    var tom = ymd(addDays(today(), 1));
    body.innerHTML = '<div class="aa-empty">Se încarcă…</div>';
    Promise.all([
      api("/admin-dashboard/data?from=" + r.from + "&to=" + r.to),
      api("/admin-dashboard/data?from=" + p.from + "&to=" + p.to),
      api("/admin-dashboard/data?from=" + tom + "&to=" + tom),
      api("/bookings"),
    ]).then(function (res) {
      ov.range = r;
      ov.data = res[0];
      ov.prev = res[1];
      ov.tomorrow = res[2];
      ov.pending = (res[3] || []).filter(function (b) { return b.status === "pending"; });
      renderOverview();
    }).catch(function (e) { body.innerHTML = errorBox(e); });
  }

  function metrics(data, r) {
    var cars = data.cars || [];
    var m = { revenue: 0, planned: 0, rentals: 0, rentalDays: 0, rentalRevenue: 0, clients: {}, svc: {}, svcProfitLei: 0, occupiedDays: 0, orders: 0 };
    SERVICES.forEach(function (s) { m.svc[s.key] = 0; });
    (data.bookings || []).forEach(function (b) {
      if (EARNING.indexOf(b.status) === -1) return;
      var pick = String(b.pickup_date).slice(0, 10), ret = String(b.return_date || b.pickup_date).slice(0, 10);
      // occupancy: the days of this rental that fall inside the period
      var s = pick > r.from ? pick : r.from, e = ret < r.to ? ret : r.to;
      if (s <= e) m.occupiedDays += Math.max(1, daysBetween(s, e));
      if (pick < r.from || pick > r.to) return;
      m.rentals += 1;
      m.rentalDays += Math.max(1, daysBetween(pick, ret));
      m.rentalRevenue += num(b.total_price);
      m.svc.rental += num(b.total_price);
      if (b.customer_phone) m.clients[digits(b.customer_phone)] = 1;
    });
    (data.orders || []).forEach(function (o) {
      var d = ymd(new Date(o.starts_at));
      if (d < r.from || d > r.to || o.status === "cancelled" || o.service === "task") return;
      var key = SVC[o.service] ? o.service : "other";
      if (o.status === "planned") { m.planned += toEur(o.price, o.currency); return; }
      if (key === "rental") {
        // a rental taken by phone counts like one booked on the site
        m.rentals += 1;
        m.rentalDays += o.ends_on ? Math.max(1, daysBetween(d, o.ends_on)) : 1;
        m.rentalRevenue += toEur(o.price, o.currency);
      } else {
        m.orders += 1;
        m.svcProfitLei += orderProfitLei(o);
      }
      m.svc[key] += toEur(o.price, o.currency);
      if (o.client_phone) m.clients[digits(o.client_phone)] = 1;
    });
    SERVICES.forEach(function (s) { m.revenue += m.svc[s.key]; });
    m.clientCount = Object.keys(m.clients).length;
    var periodDays = daysBetween(r.from, r.to) + 1;
    m.occupancy = cars.length ? Math.min(100, (m.occupiedDays / (cars.length * periodDays)) * 100) : 0;
    m.avg = m.rentals + m.orders ? m.revenue / (m.rentals + m.orders) : 0;
    return m;
  }

  function delta(cur, prev) {
    if (!prev && !cur) return '<span class="aa-delta is-flat">' + ICON.flat + " fără schimbare</span>";
    if (!prev) return '<span class="aa-delta is-up">' + ICON.up + " nou</span>";
    var d = ((cur - prev) / prev) * 100;
    if (Math.abs(d) < 0.5) return '<span class="aa-delta is-flat">' + ICON.flat + " la fel ca înainte</span>";
    return '<span class="aa-delta ' + (d > 0 ? "is-up" : "is-down") + '">' + (d > 0 ? ICON.up : ICON.down) + " " + (d > 0 ? "+" : "") + Math.round(d) + "% față de " + (ov.range && ov.range.to > ymd(today()) && ov.range.from <= ymd(today()) && (ov.period === "month" || ov.period === "year") ? "aceeași perioadă anterior" : "perioada anterioară") + "</span>";
  }

  function kpi(label, value, sub, d) {
    return '<div class="aa-card aa-kpi"><span class="aa-kpi-label">' + label + '</span><span class="aa-kpi-value aa-num">' + value + "</span>" +
      (d ? d : "") + (sub ? '<span class="aa-kpi-sub">' + sub + "</span>" : "") + "</div>";
  }

  function renderOverview() {
    var body = document.getElementById("aaOvBody");
    var r = ov.range;
    var m = metrics(ov.data, r), pr = previousRange(r), pm = metrics(ov.prev, pr);
    var label = fmtShort.format(parseYmd(r.from)) + (r.from === r.to ? "" : " – " + fmtShort.format(parseYmd(r.to)));
    var html = "";
    if (!ov.data.ordersReady) html += setupNotice();
    html += '<div class="aa-kpis">' +
      kpi("Venit total · " + esc(label), eur(m.revenue), m.planned ? "+ " + eur(m.planned) + " planificat în jurnal" : "", delta(m.revenue, pm.revenue)) +
      kpi("Mașini predate (închirieri)", m.rentals, m.rentalDays + " zile de închiriere · " + eur(m.rentalRevenue), delta(m.rentals, pm.rentals)) +
      kpi("Clienți", m.clientCount, "număr de telefoane diferite", delta(m.clientCount, pm.clientCount)) +
      kpi("Curse și servicii efectuate", m.orders, "profit net " + lei(m.svcProfitLei) + " (" + eur(m.svcProfitLei / rate()) + ")", delta(m.orders, pm.orders)) +
      kpi("Valoare medie comandă", eur(m.avg), "închirieri și servicii", delta(m.avg, pm.avg)) +
      kpi("Ocupare flotă", Math.round(m.occupancy) + "%", (ov.data.cars || []).length + " mașini în flotă", delta(m.occupancy, pm.occupancy)) +
      "</div>";
    html += '<section class="aa-card aa-panel" aria-labelledby="aaChartH"><div class="aa-panel-head"><div><h3 id="aaChartH">Venit pe perioadă</h3><p>Pe servicii, în euro. Închirierile intră la data predării.</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="aa-tabs-mini" role="group" aria-label="Pas">' +
      [["day", "Zi"], ["week", "Săptămână"], ["month", "Lună"]].map(function (g) { return '<button type="button" data-gran="' + g[0] + '" aria-pressed="' + (granularity(r) === g[0]) + '">' + g[1] + "</button>"; }).join("") +
      '</div><div class="aa-tabs-mini" role="group" aria-label="Vizualizare"><button type="button" data-view="chart" aria-pressed="' + (ov.view === "chart") + '">Grafic</button><button type="button" data-view="table" aria-pressed="' + (ov.view === "table") + '">Tabel</button></div></div></div>' +
      '<div id="aaChart"></div></section>';
    html += '<div class="aa-grid2"><section class="aa-card aa-panel" aria-labelledby="aaCarsH"><div class="aa-panel-head"><div><h3 id="aaCarsH">Mașinile perioadei</h3><p>Zile în chirie și venitul adus.</p></div></div><div id="aaTopCars"></div></section>' +
      '<section class="aa-card aa-panel" aria-labelledby="aaTomH"><div class="aa-panel-head"><div><h3 id="aaTomH">Mâine</h3><p>' + esc(cap(fmtDay.format(addDays(today(), 1)))) + '</p></div></div><div id="aaTomorrow"></div></section></div>';
    html += '<section class="aa-card aa-panel" aria-labelledby="aaPendH"><div class="aa-panel-head"><div><h3 id="aaPendH">Rezervări în așteptare</h3><p>Cereri de închiriere neconfirmate. Testele se anulează aici, nu se șterg.</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="aa-btn aa-btn-sm" id="aaSelAll">Selectează toate</button><button type="button" class="aa-btn aa-btn-sm aa-btn-danger" id="aaCancelSel" disabled>Anulează selectate</button></div></div>' +
      '<div class="aa-confirm" id="aaConfirm" role="alert"><span id="aaConfirmText"></span><button type="button" class="aa-btn aa-btn-sm aa-btn-danger" id="aaConfirmYes">Da, anulează</button><button type="button" class="aa-btn aa-btn-sm" id="aaConfirmNo">Renunță</button></div>' +
      '<div id="aaPending"></div></section>';
    html += '<p class="aa-rate"><label for="aaRateIn">Curs pentru lei:</label> 1 € = <input id="aaRateIn" type="number" step="0.01" min="1" value="' + rate() + '"> lei</p>';
    body.innerHTML = html;

    body.querySelectorAll("[data-gran]").forEach(function (b) {
      b.addEventListener("click", function () { ov.gran = b.dataset.gran; renderOverview(); });
    });
    body.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () { ov.view = b.dataset.view; renderOverview(); });
    });
    document.getElementById("aaRateIn").addEventListener("change", function (e) {
      var v = parseFloat(e.target.value);
      if (v > 1) { try { localStorage.setItem("prAdminRate", String(v)); } catch (x) {} renderOverview(); }
    });
    renderChart(m, r);
    renderTopCars(r);
    renderTomorrow();
    renderPending();
  }

  function setupNotice() {
    return '<div class="aa-setup" style="margin-bottom:16px"><strong>Jurnalul de servicii nu este activat încă.</strong> Statisticile de închiriere funcționează; pentru transferuri și șoferi trebuie creat tabelul o singură dată:' +
      '<ol><li>Supabase → <b>SQL Editor</b> → <b>New query</b></li><li>lipește conținutul fișierului <code>database/2026-10-01-service-orders.sql</code> și apasă <b>Run</b></li><li>reîncarcă pagina</li></ol></div>';
  }

  function granularity(r) {
    if (ov.gran) return ov.gran;
    var span = daysBetween(r.from, r.to) + 1;
    return span <= 35 ? "day" : span <= 190 ? "week" : "month";
  }
  function bucketKey(d, g) {
    if (g === "day") return ymd(d);
    if (g === "month") return d.getFullYear() + "-" + pad(d.getMonth() + 1);
    var mon = addDays(d, -((d.getDay() + 6) % 7));
    return ymd(mon);
  }
  function buckets(r, g) {
    var out = [], seen = {}, d = parseYmd(r.from), end = parseYmd(r.to);
    while (d <= end) {
      var k = bucketKey(d, g);
      if (!seen[k]) {
        seen[k] = true;
        var lbl = g === "day" ? fmtShort.format(d) : g === "month" ? fmtMonthShort.format(d) : "săpt. " + fmtShort.format(parseYmd(k));
        out.push({ key: k, label: lbl, values: {} });
      }
      d = addDays(d, 1);
    }
    return out;
  }

  function renderChart(m, r) {
    var el = document.getElementById("aaChart");
    var g = granularity(r);
    var list = buckets(r, g), byKey = {};
    list.forEach(function (b) { byKey[b.key] = b; SERVICES.forEach(function (s) { b.values[s.key] = 0; }); });
    (ov.data.bookings || []).forEach(function (b) {
      if (EARNING.indexOf(b.status) === -1) return;
      var pick = String(b.pickup_date).slice(0, 10);
      if (pick < r.from || pick > r.to) return;
      var bk = byKey[bucketKey(parseYmd(pick), g)];
      if (bk) bk.values.rental += num(b.total_price);
    });
    (ov.data.orders || []).forEach(function (o) {
      if (o.status !== "done" || o.service === "task") return;
      var d = new Date(o.starts_at), k = ymd(d);
      if (k < r.from || k > r.to) return;
      var bk = byKey[bucketKey(d, g)];
      if (bk) bk.values[SVC[o.service] ? o.service : "other"] += toEur(o.price, o.currency);
    });
    var used = SERVICES.filter(function (s) { return list.some(function (b) { return b.values[s.key] > 0; }); });
    if (!used.length) { el.innerHTML = '<div class="aa-empty">Niciun venit în această perioadă.</div>'; return; }

    var legend = used.length > 1 ? '<ul class="aa-legend">' + used.map(function (s) { return '<li><i style="background:' + s.color + '"></i>' + s.label + "</li>"; }).join("") + "</ul>" : "";
    if (ov.view === "table") {
      el.innerHTML = legend + '<div class="aa-scroll"><table class="aa-table"><thead><tr><th scope="col">Perioada</th>' +
        used.map(function (s) { return '<th scope="col">' + s.label + "</th>"; }).join("") + '<th scope="col">Total</th></tr></thead><tbody>' +
        list.map(function (b) {
          var tot = 0;
          return "<tr><td>" + esc(b.label) + "</td>" + used.map(function (s) { tot += b.values[s.key]; return '<td class="aa-num">' + (b.values[s.key] ? eur(b.values[s.key]) : "–") + "</td>"; }).join("") + '<td class="aa-num"><b>' + eur(tot) + "</b></td></tr>";
        }).join("") + "</tbody></table></div>";
      return;
    }

    var W = Math.max(320, el.clientWidth || 800), H = 260, L = 56, R = 8, T = 10, B = 28;
    var max = 0;
    list.forEach(function (b) { var t = 0; used.forEach(function (s) { t += b.values[s.key]; }); b.total = t; if (t > max) max = t; });
    var step = niceStep(max / 4), top = Math.max(step * 4, step * Math.ceil(max / step));
    var band = (W - L - R) / list.length, bw = Math.max(3, Math.min(36, band * 0.62));
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Venit pe perioadă, pe servicii">';
    svg += '<g class="aa-grid">';
    for (var v = 0; v <= top + 0.001; v += step) svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>';
    svg += '</g><g class="aa-axis">';
    for (var v2 = 0; v2 <= top + 0.001; v2 += step) svg += '<text x="' + (L - 8) + '" y="' + (y(v2) + 4) + '" text-anchor="end">' + Math.round(v2).toLocaleString("ro-RO") + " €</text>";
    var every = Math.ceil(list.length / Math.max(1, Math.floor((W - L) / 70)));
    list.forEach(function (b, i) {
      if (i % every === 0) svg += '<text x="' + (L + band * i + band / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(b.label) + "</text>";
    });
    svg += "</g>";
    list.forEach(function (b, i) {
      var x = L + band * i + (band - bw) / 2, acc = 0, segs = [];
      used.forEach(function (s) { if (b.values[s.key] > 0) segs.push(s); });
      svg += '<rect class="aa-col-hl" x="' + (L + band * i) + '" y="' + T + '" width="' + band + '" height="' + (H - T - B) + '"/>';
      segs.forEach(function (s, si) {
        var v0 = acc, v1 = acc + b.values[s.key];
        acc = v1;
        var yTop = y(v1), yBot = y(v0), h = yBot - yTop;
        var gap = si > 0 ? 2 : 0;
        h = Math.max(1, h - gap);
        if (si === segs.length - 1) svg += '<path d="' + roundTop(x, yTop, bw, h, Math.min(4, h, bw / 2)) + '" fill="' + s.color + '"/>';
        else svg += '<rect x="' + x + '" y="' + yTop + '" width="' + bw + '" height="' + h + '" fill="' + s.color + '"/>';
      });
      svg += '<rect class="aa-hit" data-i="' + i + '" x="' + (L + band * i) + '" y="' + T + '" width="' + band + '" height="' + (H - T - B) + '"/>';
    });
    svg += "</svg>";
    el.innerHTML = legend + '<div class="aa-chart">' + svg + '<div class="aa-tip" hidden></div></div>';
    var tip = el.querySelector(".aa-tip"), box = el.querySelector(".aa-chart");
    el.querySelectorAll(".aa-hit").forEach(function (h) {
      function show() {
        var b = list[+h.dataset.i];
        el.querySelectorAll(".aa-col-hl").forEach(function (c, ci) { c.classList.toggle("is-on", ci === +h.dataset.i); });
        tip.innerHTML = "<strong>" + esc(b.label) + "</strong>" +
          used.filter(function (s) { return b.values[s.key] > 0; }).map(function (s) { return '<div><span><i style="background:' + s.color + '"></i>' + s.label + '</span><b class="aa-num">' + eur(b.values[s.key]) + "</b></div>"; }).join("") +
          '<div class="aa-tip-total"><span>Total</span><span class="aa-num">' + eur(b.total) + "</span></div>";
        tip.hidden = false;
        var rect = h.getBoundingClientRect(), pr = box.getBoundingClientRect();
        var left = rect.left - pr.left + rect.width / 2 + 12;
        if (left + 190 > pr.width) left = rect.left - pr.left - 190;
        tip.style.left = Math.max(0, left) + "px";
        tip.style.top = "8px";
      }
      h.addEventListener("mouseenter", show);
      h.addEventListener("click", show);
      h.addEventListener("mouseleave", function () { tip.hidden = true; el.querySelectorAll(".aa-col-hl").forEach(function (c) { c.classList.remove("is-on"); }); });
    });
  }
  function niceStep(raw) {
    if (raw <= 0) return 10;
    var p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  function roundTop(x, y, w, h, r) {
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }

  function carName(cars, id) {
    var c = (cars || []).find(function (x) { return x.id === id; });
    return c ? (c.make_name || "") + " " + (c.model_name || "") + (c.production_year ? " " + c.production_year : "") : "Mașina #" + id;
  }

  function renderTopCars(r) {
    var el = document.getElementById("aaTopCars"), per = {};
    (ov.data.bookings || []).forEach(function (b) {
      if (EARNING.indexOf(b.status) === -1) return;
      var pick = String(b.pickup_date).slice(0, 10), ret = String(b.return_date || pick).slice(0, 10);
      var s = pick > r.from ? pick : r.from, e = ret < r.to ? ret : r.to;
      if (s > e) return;
      var x = per[b.car_id] || (per[b.car_id] = { days: 0, rev: 0 });
      x.days += Math.max(1, daysBetween(s, e));
      if (pick >= r.from && pick <= r.to) x.rev += num(b.total_price);
    });
    var rows = Object.keys(per).map(function (id) { return { id: +id, days: per[id].days, rev: per[id].rev }; }).sort(function (a, b) { return b.days - a.days; }).slice(0, 7);
    if (!rows.length) { el.innerHTML = '<div class="aa-empty">Nicio mașină în chirie în această perioadă.</div>'; return; }
    var max = rows[0].days;
    el.innerHTML = '<ul class="aa-bars">' + rows.map(function (x) {
      return "<li><span>" + esc(carName(ov.data.cars, x.id)) + '</span><em class="aa-num">' + x.days + " zile · " + eur(x.rev) + '</em><span class="aa-bar" style="width:' + Math.max(4, (x.days / max) * 100) + '%" aria-hidden="true"></span></li>';
    }).join("") + "</ul>";
  }

  function renderTomorrow() {
    var el = document.getElementById("aaTomorrow"), tom = ymd(addDays(today(), 1)), items = [];
    var d = ov.tomorrow || {};
    (d.bookings || []).forEach(function (b) {
      if (["pending", "confirmed"].indexOf(b.status) === -1) return;
      var name = carName(d.cars, b.car_id);
      if (String(b.pickup_date).slice(0, 10) === tom) items.push({ t: (b.pickup_time || "").slice(0, 5), title: "Predare · " + name, sub: (b.customer_name || "") + " · " + (b.pickup_location || ""), side: b.status === "pending" ? BOOKING_STATUS.pending : "" });
      if (String(b.return_date).slice(0, 10) === tom && b.status === "confirmed") items.push({ t: (b.return_time || "").slice(0, 5), title: "Returnare · " + name, sub: (b.customer_name || "") + " · " + (b.dropoff_location || ""), side: "" });
    });
    (d.orders || []).forEach(function (o) {
      if (o.status === "cancelled" || ymd(new Date(o.starts_at)) !== tom) return;
      var title = o.service === "task" ? (o.title || "Sarcină")
        : o.service === "rental" ? "Închiriere: " + (o.car_id ? carName(d.cars, o.car_id) : "mașină")
        : (SVC[o.service] || SVC.other).label + (o.tier ? " · " + TIER[o.tier] : "");
      items.push({ t: fmtTime.format(new Date(o.starts_at)), title: title, sub: [o.route_from, o.route_to].filter(Boolean).join(" → ") + (o.client_name ? " · " + o.client_name : "") + (o.service === "task" && o.notes ? o.notes : ""), side: "" });
    });
    items.sort(function (a, b) { return (a.t || "99").localeCompare(b.t || "99"); });
    el.innerHTML = items.length ? '<ul class="aa-list">' + items.map(function (i) {
      return '<li class="aa-item"><span class="aa-item-time">' + esc(i.t || "–") + '</span><div class="aa-item-main"><strong>' + esc(i.title) + "</strong><span>" + esc(i.sub) + '</span></div><div class="aa-item-side"><small>' + esc(i.side) + "</small></div></li>";
    }).join("") + "</ul>" : '<div class="aa-empty">Nimic programat pentru mâine.</div>';
  }

  function renderPending() {
    var el = document.getElementById("aaPending"), sel = document.getElementById("aaSelAll"), btn = document.getElementById("aaCancelSel");
    if (!ov.pending.length) { el.innerHTML = '<div class="aa-empty">Nicio rezervare în așteptare.</div>'; sel.disabled = true; return; }
    el.innerHTML = '<ul class="aa-list">' + ov.pending.map(function (b) {
      var car = b.cars ? (b.cars.make_name || "") + " " + (b.cars.model_name || "") : "Mașina #" + b.car_id;
      var who = b.customer_name && !/^not provided$/i.test(b.customer_name) ? b.customer_name : "fără nume";
      return '<li class="aa-item' + (ov.pending.indexOf(b) >= 8 && !ov.showAll ? '" hidden data-more="1' : "") + '"><label class="aa-check"><input type="checkbox" value="' + esc(b.id) + '" aria-label="Selectează rezervarea #' + esc(b.id) + '"></label>' +
        '<div class="aa-item-main"><strong>#' + esc(b.id) + " · " + esc(car) + "</strong><span>" + esc(who) + " · " + esc(b.customer_phone || "") + " · " +
        esc(fmtShort.format(parseYmd(b.pickup_date))) + " – " + esc(fmtShort.format(parseYmd(b.return_date || b.pickup_date))) + '</span></div><div class="aa-item-side"><b>' + eur(num(b.total_price)) + "</b><small>trimisă " + esc(fmtShort.format(new Date(b.created_at))) + "</small></div></li>";
    }).join("") + "</ul>" + (ov.pending.length > 8 && !ov.showAll ? '<div class="aa-more"><button type="button" class="aa-btn aa-btn-sm" id="aaShowAll">Arată toate (' + ov.pending.length + ")</button></div>" : "");
    var more = document.getElementById("aaShowAll");
    if (more) more.onclick = function () { ov.showAll = true; el.querySelectorAll("[data-more]").forEach(function (li) { li.hidden = false; }); more.parentNode.remove(); };
    function count() { return el.querySelectorAll("input:checked").length; }
    function sync() { var n = count(); btn.disabled = !n; btn.textContent = n ? "Anulează selectate (" + n + ")" : "Anulează selectate"; }
    el.addEventListener("change", sync);
    sel.onclick = function () {
      if (!ov.showAll && more) more.click();
      var boxes = el.querySelectorAll("input[type=checkbox]"), all = count() < boxes.length;
      boxes.forEach(function (b) { b.checked = all; });
      sel.textContent = all ? "Deselectează" : "Selectează toate";
      sync();
    };
    var conf = document.getElementById("aaConfirm");
    btn.onclick = function () {
      document.getElementById("aaConfirmText").textContent = "Anulezi " + count() + " rezervări? Clienții nu primesc niciun mesaj.";
      conf.classList.add("is-on");
    };
    document.getElementById("aaConfirmNo").onclick = function () { conf.classList.remove("is-on"); };
    document.getElementById("aaConfirmYes").onclick = function () {
      var ids = Array.prototype.map.call(el.querySelectorAll("input:checked"), function (b) { return b.value; });
      conf.classList.remove("is-on");
      btn.disabled = true;
      var done = 0, failed = 0;
      ids.reduce(function (p, id) {
        return p.then(function () { return api("/bookings/" + id + "/cancel", { method: "PUT" }).then(function () { done++; }, function () { failed++; }); });
      }, Promise.resolve()).then(function () {
        toast("Anulate: " + done + (failed ? " · eșuate: " + failed : ""));
        if (typeof window.loadAllBookings === "function") { try { window.loadAllBookings(); } catch (e) {} }
        loadOverview();
      });
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // AGENDĂ: everything planned, day by day (own entries + site bookings)
  // ══════════════════════════════════════════════════════════════════════
  var jr = { mode: "week", anchor: today(), status: "all", service: "all", orders: [], ready: true, requests: [], bookings: [], cars: [] };

  function jrRange() {
    var a = jr.anchor;
    if (jr.mode === "day") return { from: ymd(a), to: ymd(a) };
    if (jr.mode === "week") { var mon = addDays(a, -((a.getDay() + 6) % 7)); return { from: ymd(mon), to: ymd(addDays(mon, 6)) }; }
    return { from: ymd(new Date(a.getFullYear(), a.getMonth(), 1)), to: ymd(new Date(a.getFullYear(), a.getMonth() + 1, 0)) };
  }
  function jrLabel(r) {
    if (jr.mode === "day") return cap(fmtDay.format(parseYmd(r.from)));
    if (jr.mode === "month") return cap(fmtMonth.format(parseYmd(r.from)));
    return fmtShort.format(parseYmd(r.from)) + " – " + fmtShort.format(parseYmd(r.to));
  }
  function shift(dir) {
    var a = jr.anchor;
    jr.anchor = jr.mode === "day" ? addDays(a, dir) : jr.mode === "week" ? addDays(a, 7 * dir) : new Date(a.getFullYear(), a.getMonth() + dir, 1);
    loadJournal();
  }

  function journalShell() {
    JR.innerHTML =
      '<div class="aa-head"><div><h2>Agendă</h2><p>Transferuri, închirieri luate la telefon, șoferi și orice sarcină, pe zile. Rezervările de pe site apar singure.</p></div>' +
      '<button type="button" class="aa-btn aa-btn-amber" id="aaNew">' + ICON.plus + " Adaugă</button></div>" +
      '<div id="aaJrBody"><div class="aa-empty">Se încarcă…</div></div>';
    document.getElementById("aaNew").addEventListener("click", function () { openSheet(null, null, ymd(jr.mode === "day" ? jr.anchor : addDays(today(), 1))); });
  }

  function loadJournal() {
    var body = document.getElementById("aaJrBody");
    var r = jrRange();
    var from = ymd(addDays(parseYmd(r.from), -1)), to = ymd(addDays(parseYmd(r.to), 1));
    Promise.all([
      api("/admin-dashboard/data?from=" + r.from + "&to=" + r.to),
      api("/admin-dashboard/site-requests"),
      api("/admin-dashboard/service-orders?from=" + from + "&to=" + to).then(function (d) { jr.ready = true; return d; }, function (e) {
        if (e.code === "service_orders_missing") { jr.ready = false; return []; }
        throw e;
      }),
    ]).then(function (res) {
      jr.range = r;
      jr.bookings = res[0].bookings || [];
      jr.cars = res[0].cars || [];
      jr.requests = res[1] || [];
      jr.orders = (res[2] || []).filter(function (o) { var d = ymd(new Date(o.starts_at)); return d >= r.from && d <= r.to; });
      renderJournal();
    }).catch(function (e) { body.innerHTML = errorBox(e); });
  }

  /** Site bookings as agenda events: a pickup and a return, read-only. */
  function bookingEvents(r) {
    var ev = [];
    jr.bookings.forEach(function (b) {
      if (["pending", "confirmed", "completed", "finished"].indexOf(b.status) === -1) return;
      var car = carName(jr.cars, b.car_id), pick = String(b.pickup_date).slice(0, 10), ret = String(b.return_date || "").slice(0, 10);
      var who = [/^not provided$/i.test(b.customer_name || "") ? "" : b.customer_name, b.customer_phone].filter(Boolean).join(" · ");
      if (pick >= r.from && pick <= r.to) ev.push({ day: pick, time: (b.pickup_time || "").slice(0, 5), title: "Predare: " + car, sub: who + (b.pickup_location ? " · " + b.pickup_location : ""), booking: b });
      if (ret && ret >= r.from && ret <= r.to && b.status !== "pending") ev.push({ day: ret, time: (b.return_time || "").slice(0, 5), title: "Returnare: " + car, sub: who + (b.dropoff_location ? " · " + b.dropoff_location : ""), booking: b });
    });
    return ev;
  }

  function orderTitle(o) {
    if (o.service === "task") return o.title || "Sarcină";
    if (o.service === "rental") return "Închiriere: " + (o.car_id ? carName(jr.cars, o.car_id) : "mașină") + (o.ends_on ? " până " + fmtShort.format(parseYmd(o.ends_on)) : "");
    return [o.route_from, o.route_to].filter(Boolean).join(" → ") || (SVC[o.service] || SVC.other).label;
  }

  function renderJournal() {
    var body = document.getElementById("aaJrBody"), r = jr.range;
    var live = jr.orders.filter(function (o) { return o.status !== "cancelled" && o.service !== "task"; });
    var done = live.filter(function (o) { return o.status === "done"; });
    var revLei = 0, costLei = 0;
    done.forEach(function (o) { revLei += orderPriceLei(o); costLei += orderCostsLei(o); });
    var html = "";
    if (!jr.ready) html += setupNotice();
    html += '<div class="aa-toolbar"><div class="aa-seg" role="group" aria-label="Perioada">' +
      [["today", "Azi"], ["tomorrow", "Mâine"], ["week", "Săptămâna"], ["month", "Luna"]].map(function (p) {
        var on = p[0] === "today" ? jr.mode === "day" && ymd(jr.anchor) === ymd(today()) : p[0] === "tomorrow" ? jr.mode === "day" && ymd(jr.anchor) === ymd(addDays(today(), 1)) : jr.mode === p[0];
        return '<button type="button" data-jm="' + p[0] + '" aria-pressed="' + on + '">' + p[1] + "</button>";
      }).join("") + "</div>" +
      '<span class="aa-month"><button type="button" class="aa-btn aa-btn-sm" id="aaPrevM" aria-label="Înapoi">' + ICON.left + "</button><b>" + esc(jrLabel(r)) + '</b><button type="button" class="aa-btn aa-btn-sm" id="aaNextM" aria-label="Înainte">' + ICON.right + "</button></span>" +
      '<select id="aaSvcFilter" aria-label="Tip"><option value="all">Tot</option><option value="bookings"' + (jr.service === "bookings" ? " selected" : "") + ">Rezervări de pe site</option>" +
      ORDER_SERVICES.map(function (s) { return '<option value="' + s.key + '"' + (jr.service === s.key ? " selected" : "") + ">" + s.label + "</option>"; }).join("") + "</select>" +
      '<div class="aa-tabs-mini" role="group" aria-label="Status">' + [["all", "Toate"], ["planned", "De făcut"], ["done", "Efectuate"], ["cancelled", "Anulate"]].map(function (s) { return '<button type="button" data-st="' + s[0] + '" aria-pressed="' + (jr.status === s[0]) + '">' + s[1] + "</button>"; }).join("") + "</div></div>";
    html += '<div class="aa-strip">' +
      kpi("Înregistrări", live.length + jr.orders.filter(function (o) { return o.service === "task" && o.status !== "cancelled"; }).length, done.length + " efectuate · " + (live.length - done.length) + " de făcut") +
      kpi("Venit efectuat", eur(revLei / rate()), lei(revLei)) +
      kpi("Cheltuieli", lei(costLei), "combustibil, acte, spălare, altele") +
      kpi("Profit net", lei(revLei - costLei), eur((revLei - costLei) / rate())) + "</div>";

    // one list of the period: own entries + site bookings, grouped by day
    var items = [];
    if (jr.service === "all" || jr.service !== "bookings") {
      jr.orders.forEach(function (o) {
        if (jr.status !== "all" && o.status !== jr.status) return;
        if (jr.service !== "all" && o.service !== jr.service) return;
        var dt = new Date(o.starts_at);
        items.push({ day: ymd(dt), time: fmtTime.format(dt), order: o });
      });
    }
    if ((jr.service === "all" || jr.service === "bookings") && (jr.status === "all" || jr.status === "planned")) {
      bookingEvents(r).forEach(function (e) { items.push(e); });
    }
    items.sort(function (a, b) { return a.day === b.day ? (a.time || "99").localeCompare(b.time || "99") : a.day < b.day ? -1 : 1; });

    if (!items.length) html += '<div class="aa-card aa-empty">Nimic în această perioadă. Apasă „Adaugă”.</div>';
    else {
      html += '<div id="aaOrders">';
      var lastDay = "";
      items.forEach(function (it) {
        if (it.day !== lastDay) {
          var n = items.filter(function (x) { return x.day === it.day; }).length;
          html += '<p class="aa-day">' + esc(cap(fmtDay.format(parseYmd(it.day)))) + (it.day === ymd(today()) ? " · azi" : "") + " · " + n + "</p>";
          lastDay = it.day;
        }
        if (it.booking) {
          html += '<div class="aa-item"><span class="aa-item-time">' + esc(it.time || "–") + '</span><div class="aa-item-main"><strong>' + esc(it.title) + '</strong><span><span class="aa-badge"><i style="background:var(--s1)"></i>Rezervare de pe site #' + esc(it.booking.id) + "</span> " + esc(it.sub) +
            '</span></div><div class="aa-item-side"><b>' + eur(num(it.booking.total_price)) + '</b><span class="aa-badge">' + esc(BOOKING_STATUS[it.booking.status] || it.booking.status) + "</span></div></div>";
          return;
        }
        var o = it.order, s = SVC[o.service] || SVC.other, dt = new Date(o.starts_at), overdue = o.status === "planned" && dt < new Date();
        var who = [o.client_name, o.client_phone ? '<a href="tel:' + esc(o.client_phone) + '">' + esc(o.client_phone) + "</a>" : ""].filter(Boolean);
        var side = o.service === "task" ? "" : "<b>" + (o.currency === "MDL" ? lei(o.price) : eur(num(o.price))) + "</b>" + (orderCostsLei(o) ? "<small>profit " + lei(orderProfitLei(o)) + "</small><br>" : "<br>");
        html += '<div class="aa-item" data-id="' + o.id + '"><span class="aa-item-time">' + esc(it.time) + "</span>" +
          '<div class="aa-item-main"><strong>' + esc(orderTitle(o)) + "</strong><span>" +
          '<span class="aa-badge"><i style="background:' + s.color + '"></i>' + esc(s.label) + (o.tier && o.service !== "task" && o.service !== "rental" ? " · " + TIER[o.tier] : "") + "</span> " +
          who.map(function (w, i) { return i === 0 && !/^<a/.test(w) ? esc(w) : w; }).join(" · ") + (o.service === "task" && o.notes ? " " + esc(o.notes) : "") + "</span></div>" +
          '<div class="aa-item-side">' + side + '<span class="aa-badge aa-status-' + o.status + '">' + (o.service === "task" && o.status === "planned" ? "De făcut" : ORDER_STATUS[o.status]) + "</span></div>" +
          '<div class="aa-item-actions">' + (o.status === "planned" ? '<button type="button" class="aa-btn aa-btn-sm' + (overdue ? " aa-btn-amber" : "") + '" data-act="done">' + (o.service === "task" ? "Gata" : overdue ? "A avut loc? Marchează efectuat" : "Marchează efectuat") + "</button>" : "") +
          '<button type="button" class="aa-btn aa-btn-sm" data-act="edit">Editează</button>' +
          (o.status !== "cancelled" ? '<button type="button" class="aa-btn aa-btn-sm aa-btn-danger" data-act="cancel">Anulează</button>' : '<button type="button" class="aa-btn aa-btn-sm" data-act="restore">Restabilește</button>') + "</div></div>";
      });
      html += "</div>";
    }

    var reqs = jr.requests.filter(function (q) { return q.status === "pending" || q.status === "contacted"; });
    html += '<section class="aa-card aa-panel" style="margin-top:16px" aria-labelledby="aaReqH"><div class="aa-panel-head"><div><h3 id="aaReqH">Cereri de pe site</h3><p>Transferuri și șoferi cerute din formularele site-ului. Adaugă-le în agendă cu un clic.</p></div></div>' +
      (reqs.length ? '<ul class="aa-list">' + reqs.map(function (q) {
        var svc = q.service_type === "transfer_chisinau" ? "transfer_kiv" : q.service_type;
        var s = SVC[svc] || SVC.other;
        return '<li class="aa-item"><span class="aa-item-time">' + esc(fmtShort.format(new Date(q.created_at))) + '</span><div class="aa-item-main"><strong>' + esc(s.label) + (q.tier ? " · " + esc(q.tier) : "") + "</strong><span>" +
          esc([q.pickup_location, q.destination].filter(Boolean).join(" → ")) + (q.phone_number ? ' · <a href="tel:' + esc(q.phone_number) + '">' + esc(q.phone_number) + "</a>" : "") + '</span></div><div class="aa-item-side"><span class="aa-badge">' + (q.status === "contacted" ? "Contactat" : "Nou") + "</span></div>" +
          '<div class="aa-item-actions"><button type="button" class="aa-btn aa-btn-sm aa-btn-primary" data-req="' + q.id + '" data-act="toOrder">Adaugă în agendă</button>' +
          (q.status === "pending" ? '<button type="button" class="aa-btn aa-btn-sm" data-req="' + q.id + '" data-act="contacted">Marchează contactat</button>' : "") +
          '<button type="button" class="aa-btn aa-btn-sm aa-btn-danger" data-req="' + q.id + '" data-act="reqCancel">Nu e relevantă</button></div></li>';
      }).join("") + "</ul>" : '<div class="aa-empty">Nicio cerere nouă.</div>') + "</section>";
    body.innerHTML = html;

    body.querySelectorAll("[data-jm]").forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.jm;
        if (k === "today") { jr.mode = "day"; jr.anchor = today(); }
        else if (k === "tomorrow") { jr.mode = "day"; jr.anchor = addDays(today(), 1); }
        else { jr.mode = k; jr.anchor = today(); }
        loadJournal();
      };
    });
    document.getElementById("aaPrevM").onclick = function () { shift(-1); };
    document.getElementById("aaNextM").onclick = function () { shift(1); };
    body.querySelectorAll("[data-st]").forEach(function (b) { b.onclick = function () { jr.status = b.dataset.st; renderJournal(); }; });
    document.getElementById("aaSvcFilter").onchange = function (e) { jr.service = e.target.value; renderJournal(); };
    body.querySelectorAll("[data-id] [data-act]").forEach(function (b) {
      b.onclick = function () {
        var id = +b.closest("[data-id]").dataset.id, o = jr.orders.find(function (x) { return x.id === id; }), act = b.dataset.act;
        if (act === "edit") return openSheet(o);
        var status = act === "done" ? "done" : act === "cancel" ? "cancelled" : "planned";
        b.disabled = true;
        api("/admin-dashboard/service-orders/" + id, { method: "PUT", body: JSON.stringify({ status: status }) }).then(function () {
          toast(status === "done" ? "Marcat efectuat" : status === "cancelled" ? "Anulat" : "Restabilit");
          loadJournal();
          if (ov.data) loadOverview();
        }, function (e) { b.disabled = false; toast(e.message); });
      };
    });
    body.querySelectorAll("[data-req]").forEach(function (b) {
      b.onclick = function () {
        var q = jr.requests.find(function (x) { return x.id === +b.dataset.req; });
        if (b.dataset.act === "toOrder") return openSheet(null, q);
        var st = b.dataset.act === "contacted" ? "contacted" : "cancelled";
        api("/admin-dashboard/site-requests/" + q.id, { method: "PUT", body: JSON.stringify({ status: st }) }).then(function () { toast("Cererea a fost actualizată"); loadJournal(); }, function (e) { toast(e.message); });
      };
    });
  }

  // ── the add / edit sheet: its fields follow the type of entry ─────────
  var sheet, backdrop, editing = null, fromRequest = null, costsTouched = false;
  function chip(name, value, label, checked, color) {
    return '<label><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") + "><span>" + (color ? '<i style="background:' + color + '"></i>' : "") + label + "</span></label>";
  }
  // which blocks each type shows (data-for on the wrappers)
  var SHOW = {
    task: ["title"],
    rental: ["car", "client", "price", "pay", "status"],
    transfer_iasi: ["route", "client", "tier", "price", "pay", "status", "costs"],
    transfer_kiv: ["route", "client", "tier", "price", "pay", "status", "costs"],
    sofer_personal: ["route", "client", "tier", "price", "pay", "status", "costs"],
    sofer_treaz: ["route", "client", "price", "pay", "status", "costs"],
  };
  function buildSheet() {
    backdrop = document.createElement("div");
    backdrop.className = "aa-sheet-backdrop";
    sheet = document.createElement("div");
    sheet.className = "aa aa-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "aaSheetH");
    sheet.innerHTML =
      '<div class="aa-sheet-head"><h3 id="aaSheetH">Adaugă</h3><button type="button" class="aa-close" id="aaSheetX" aria-label="Închide">' + ICON.close + "</button></div>" +
      '<form class="aa-sheet-body" id="aaForm" novalidate>' +
      '<p class="aa-error" id="aaFormErr" hidden></p>' +
      '<fieldset class="aa-fieldset"><legend>Ce adaugi</legend><div class="aa-chips">' + ORDER_SERVICES.map(function (s) { return chip("service", s.key, s.label, s.key === "transfer_iasi", s.color); }).join("") + "</div></fieldset>" +
      '<div data-for="title"><label class="aa-field"><span>Sarcina</span><input name="title" maxlength="200" placeholder="ex. Schimb ulei Audi A4, plata asigurării"></label></div>' +
      '<div class="aa-row2"><label class="aa-field"><span>Data</span><input type="date" name="date" required></label><label class="aa-field"><span>Ora</span><input type="time" name="time" required></label></div>' +
      '<div data-for="car"><div class="aa-row2"><label class="aa-field"><span>Mașina</span><select name="car_id"><option value="">Alege mașina</option></select></label><label class="aa-field"><span>Returnare</span><input type="date" name="ends_on"></label></div></div>' +
      '<div data-for="route"><div class="aa-row2"><label class="aa-field"><span>De la</span><input name="route_from" list="aaPlaces" autocomplete="off"></label><label class="aa-field"><span>Până la</span><input name="route_to" list="aaPlaces" autocomplete="off"></label></div></div>' +
      '<datalist id="aaPlaces">' + PLACES.map(function (p) { return '<option value="' + esc(p) + '">'; }).join("") + "</datalist>" +
      '<div data-for="client"><div class="aa-row2"><label class="aa-field"><span>Client</span><input name="client_name" autocomplete="off"></label><label class="aa-field"><span>Telefon</span><input name="client_phone" type="tel" autocomplete="off"></label></div></div>' +
      '<div data-for="tier"><fieldset class="aa-fieldset"><legend>Clasa</legend><div class="aa-chips">' + chip("tier", "standard", "Standard", true) + chip("tier", "business", "Business") + chip("tier", "vip", "VIP") + "</div></fieldset></div>" +
      '<div data-for="price"><div class="aa-row2"><label class="aa-field"><span>Preț</span><input name="price" type="number" min="0" step="1" inputmode="decimal"></label><label class="aa-field"><span>Valuta</span><select name="currency"><option value="EUR">€ euro</option><option value="MDL">lei</option></select></label></div></div>' +
      '<div data-for="pay"><div class="aa-row2"><label class="aa-field"><span>Pasageri</span><input name="passengers" type="number" min="1" max="20" inputmode="numeric"></label><fieldset class="aa-fieldset"><legend>Plată</legend><div class="aa-chips">' + chip("payment", "cash", "Numerar", true) + chip("payment", "card", "Card") + "</div></fieldset></div></div>" +
      '<div data-for="status"><fieldset class="aa-fieldset"><legend>Status</legend><div class="aa-chips">' + chip("status", "planned", "Planificat", true) + chip("status", "done", "Efectuat") + chip("status", "cancelled", "Anulat") + "</div></fieldset></div>" +
      '<div data-for="costs"><details class="aa-costs" id="aaCosts"><summary>Cheltuieli (lei)</summary>' +
      '<div class="aa-row2"><label class="aa-field"><span>Combustibil</span><input name="cost_fuel" type="number" min="0" step="1" inputmode="decimal"></label><label class="aa-field"><span>Carte Verde + rovinietă</span><input name="cost_docs" type="number" min="0" step="1" inputmode="decimal"></label></div>' +
      '<div class="aa-row2"><label class="aa-field"><span>Spălare</span><input name="cost_wash" type="number" min="0" step="1" inputmode="decimal"></label><label class="aa-field"><span>Altele</span><input name="cost_other" type="number" min="0" step="1" inputmode="decimal"></label></div></details></div>' +
      '<label class="aa-field"><span>Note</span><textarea name="notes" placeholder="orice detaliu: zbor, bagaje, adresă exactă"></textarea></label>' +
      "</form>" +
      '<div class="aa-sheet-foot"><span class="aa-profit" id="aaProfit" aria-live="polite"></span><button type="submit" form="aaForm" class="aa-btn aa-btn-primary" id="aaSave">Salvează</button></div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    var f = document.getElementById("aaForm");
    document.getElementById("aaSheetX").onclick = closeSheet;
    backdrop.onclick = closeSheet;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet.classList.contains("is-on")) closeSheet(); });
    f.addEventListener("change", function (e) {
      var n = e.target.name;
      if (/^cost_/.test(n)) costsTouched = true;
      if (n === "service") toggleFields();
      if ((n === "service" || n === "tier") && !editing) applyPreset(n === "service");
      updateProfit();
    });
    f.addEventListener("input", updateProfit);
    f.addEventListener("submit", function (e) { e.preventDefault(); save(); });
  }
  function form() { return document.getElementById("aaForm"); }
  function val(n) { var el = form().elements[n]; if (!el) return ""; if (el.length && !el.tagName) { var c = Array.prototype.find.call(el, function (x) { return x.checked; }); return c ? c.value : ""; } return el.value; }
  function setVal(n, v) {
    var el = form().elements[n];
    if (!el) return;
    if (el.length && !el.tagName) Array.prototype.forEach.call(el, function (x) { x.checked = x.value === v; });
    else el.value = v == null ? "" : v;
  }
  function toggleFields() {
    var show = SHOW[val("service")] || SHOW.transfer_iasi;
    form().querySelectorAll("[data-for]").forEach(function (w) { w.hidden = show.indexOf(w.dataset.for) === -1; });
    var hasMoney = show.indexOf("price") !== -1;
    document.getElementById("aaProfit").hidden = !hasMoney;
  }
  function fillCars() {
    var sel = form().elements.car_id, cur = sel.value;
    sel.innerHTML = '<option value="">Alege mașina</option>' + (jr.cars.length ? jr.cars : (ov.data && ov.data.cars) || []).map(function (c) {
      return '<option value="' + c.id + '">' + esc((c.make_name || "") + " " + (c.model_name || "") + (c.production_year ? " " + c.production_year : "")) + "</option>";
    }).join("");
    sel.value = cur;
  }
  function applyPreset(serviceChanged) {
    var svc = val("service"), tier = val("tier") || "standard", p = PRICES[svc];
    if (p) { setVal("price", p[tier]); setVal("currency", p.currency); }
    else if (serviceChanged) { setVal("price", ""); setVal("currency", "EUR"); }
    if (serviceChanged) {
      if (ROUTES[svc]) { setVal("route_from", ROUTES[svc][0]); setVal("route_to", ROUTES[svc][1]); }
      else { setVal("route_from", ""); setVal("route_to", ""); }
    }
    if (!costsTouched) {
      var c = COSTS[svc] || { cost_fuel: "", cost_docs: "", cost_wash: "", cost_other: "" };
      Object.keys(c).forEach(function (k) { setVal(k, c[k] || ""); });
      document.getElementById("aaCosts").open = !!COSTS[svc];
    }
  }
  function updateProfit() {
    var o = { price: val("price"), currency: val("currency"), cost_fuel: val("cost_fuel"), cost_docs: val("cost_docs"), cost_wash: val("cost_wash"), cost_other: val("cost_other") };
    var p = orderProfitLei(o);
    document.getElementById("aaProfit").innerHTML = "Profit estimat: <b>" + lei(p) + "</b> (" + eur(p / rate()) + ")";
  }
  function openSheet(order, request, dateDefault) {
    if (!jr.ready) { toast("Activează mai întâi agenda (vezi instrucțiunea de sus)."); return; }
    if (!sheet) buildSheet();
    editing = order || null;
    fromRequest = request || null;
    costsTouched = !!order;
    form().reset();
    fillCars();
    document.getElementById("aaFormErr").hidden = true;
    document.getElementById("aaSheetH").textContent = order ? "Editează" : "Adaugă";
    if (order) {
      var dt = new Date(order.starts_at);
      setVal("service", order.service); setVal("date", ymd(dt)); setVal("time", pad(dt.getHours()) + ":" + pad(dt.getMinutes()));
      ["title", "ends_on", "route_from", "route_to", "client_name", "client_phone", "price", "currency", "passengers", "notes", "cost_fuel", "cost_docs", "cost_wash", "cost_other"].forEach(function (k) { setVal(k, order[k]); });
      setVal("car_id", order.car_id ? String(order.car_id) : "");
      setVal("tier", order.tier || "standard"); setVal("payment", order.payment || "cash"); setVal("status", order.status);
      document.getElementById("aaCosts").open = orderCostsLei(order) > 0;
    } else {
      var svc = "transfer_iasi", tier = "standard";
      if (request) {
        svc = request.service_type === "transfer_chisinau" ? "transfer_kiv" : PRICES[request.service_type] ? request.service_type : "transfer_iasi";
        tier = /business/i.test(request.tier || "") ? "business" : /vip/i.test(request.tier || "") ? "vip" : "standard";
      }
      setVal("service", svc); setVal("tier", tier);
      setVal("date", request && request.pickup_date ? String(request.pickup_date).slice(0, 10) : dateDefault || ymd(addDays(today(), 1)));
      setVal("time", request && request.pickup_time ? String(request.pickup_time).slice(0, 5) : "09:00");
      applyPreset(true);
      if (request) {
        if (request.pickup_location) setVal("route_from", request.pickup_location);
        if (request.destination) setVal("route_to", request.destination);
        setVal("client_name", request.customer_name || ""); setVal("client_phone", request.phone_number || "");
        setVal("notes", request.special_instructions || "");
      }
    }
    toggleFields();
    updateProfit();
    backdrop.classList.add("is-on");
    sheet.classList.add("is-on");
    setTimeout(function () { var first = form().querySelector("input:checked") || form().querySelector("input"); if (first) first.focus(); }, 30);
  }
  function closeSheet() { sheet.classList.remove("is-on"); backdrop.classList.remove("is-on"); }
  function save() {
    var err = document.getElementById("aaFormErr");
    var svc = val("service"), date = val("date"), time = val("time") || "09:00";
    if (!date) { err.textContent = "Alege data."; err.hidden = false; return; }
    if (svc === "task" && !val("title").trim()) { err.textContent = "Scrie ce trebuie făcut."; err.hidden = false; return; }
    if (svc === "rental" && val("ends_on") && val("ends_on") < date) { err.textContent = "Returnarea nu poate fi înainte de predare."; err.hidden = false; return; }
    var show = SHOW[svc] || [];
    var on = function (k) { return show.indexOf(k) !== -1; };
    var payload = {
      service: svc,
      starts_at: new Date(date + "T" + time).toISOString(),
      title: on("title") ? val("title") : null,
      car_id: on("car") && val("car_id") ? +val("car_id") : null,
      ends_on: on("car") && val("ends_on") ? val("ends_on") : null,
      route_from: on("route") ? val("route_from") : null, route_to: on("route") ? val("route_to") : null,
      client_name: on("client") ? val("client_name") : null, client_phone: on("client") ? val("client_phone") : null,
      tier: on("tier") ? val("tier") || null : null,
      passengers: on("pay") && val("passengers") ? +val("passengers") : null,
      price: on("price") ? num(val("price")) : 0, currency: on("price") ? val("currency") || "EUR" : "EUR",
      payment: on("pay") ? val("payment") || null : null,
      status: on("status") ? val("status") || "planned" : editing ? editing.status : "planned",
      cost_fuel: on("costs") ? num(val("cost_fuel")) : 0, cost_docs: on("costs") ? num(val("cost_docs")) : 0,
      cost_wash: on("costs") ? num(val("cost_wash")) : 0, cost_other: on("costs") ? num(val("cost_other")) : 0,
      notes: val("notes"),
    };
    if (fromRequest) payload.source_request_id = fromRequest.id;
    var btn = document.getElementById("aaSave");
    btn.disabled = true;
    var req = editing
      ? api("/admin-dashboard/service-orders/" + editing.id, { method: "PUT", body: JSON.stringify(payload) })
      : api("/admin-dashboard/service-orders", { method: "POST", body: JSON.stringify(payload) });
    req.then(function () {
      var after = fromRequest ? api("/admin-dashboard/site-requests/" + fromRequest.id, { method: "PUT", body: JSON.stringify({ status: "confirmed" }) }).catch(function () {}) : Promise.resolve();
      return after.then(function () {
        btn.disabled = false;
        closeSheet();
        toast(editing ? "Salvat" : "Adăugat");
        // show the period that holds the new entry
        var d = parseYmd(date), r = jrRange();
        if (date < r.from || date > r.to) { jr.anchor = d; }
        loadJournal();
        if (ov.data) loadOverview();
      });
    }).catch(function (e) {
      btn.disabled = false;
      err.textContent = e.message;
      err.hidden = false;
    });
  }

  // ── start: load a tab the first time it is shown ──────────────────────
  var started = { overview: false, journal: false };
  function show(tab) {
    if (tab === "overview" && !started.overview) { started.overview = true; overviewShell(); loadOverview(); }
    if (tab === "journal" && !started.journal) { started.journal = true; journalShell(); loadJournal(); }
  }
  document.querySelectorAll('.admin-tab-btn[data-tab="overview"], .admin-tab-btn[data-tab="journal"]').forEach(function (b) {
    b.addEventListener("click", function () { show(b.dataset.tab); });
  });
  if (document.getElementById("overview-tab").classList.contains("active")) show("overview");
  var resizeT;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { if (ov.data && document.getElementById("aaChart")) renderOverview(); }, 250);
  });
})();
