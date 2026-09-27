/* Transfer pages: the arrivals board and the boarding pass.
   Everything the script needs (routes, prices, texts) sits in the page as
   <script type="application/json" id="trData">, so one file serves every
   language and both routes (Chisinau airport, Iasi). The page already shows
   a correct default ticket without this script; the script only recalculates. */
(function () {
  'use strict';
  var dataEl = document.getElementById('trData');
  var form = document.getElementById('trBuilder');
  if (!dataEl || !form) return;
  var D = JSON.parse(dataEl.textContent);
  var T = D.t;
  var CLS = ['standard', 'business', 'vip'];

  var $ = function (id) { return document.getElementById(id); };
  var rowsById = {};
  D.rows.forEach(function (r) { rowsById[r.id] = r; });

  var state = { dir: D.dirs[0].id, cls: 'business', dest: D.rows[0].id, pax: 2, rt: false, seat: false, date: null, time: '', flight: '', other: '' };

  function fmtEur(n) { return (D.lang === 'en' ? '€' + n : n + ' €'); }
  function fmtNum(n) { return n.toLocaleString(D.locale); }
  function clsIndex() { return CLS.indexOf(state.cls); }
  function dirIndex() { return state.dir === D.dirs[1].id ? 1 : 0; }
  function clsObj() { return D.classes[clsIndex()]; }

  /* the Iasi end: airport or city, picked with two buttons */
  function hubInput() { return form.querySelector('input[name="hub"]:checked'); }
  function dirObj() {
    var d = D.dirs[dirIndex()];
    var h = hubInput();
    if (!h) return d;
    return { id: d.id, hubFirst: d.hubFirst, hubCode: h.dataset.code, hubName: h.dataset.name };
  }
  function flightApplies() { var h = hubInput(); return !h || h.dataset.flight === '1'; }

  /* price of the current choice: null means "on request" */
  function price() {
    var r = rowsById[state.dest];
    if (!r || !r.p) return null;
    var one = r.p[clsIndex()];
    if (!one) return null;
    if (!state.rt) return { total: one, one: one, lei: r.lei ? r.lei[clsIndex()] : null };
    if (D.rtMode === 'table') {
      var rt = r.rt ? r.rt[clsIndex()] : null;
      return rt ? { total: rt, one: one, rt: true } : null;
    }
    return { total: Math.round(one * 2 * (1 - D.rtDiscount)), one: one, rt: true };
  }

  function pointName(r) { return r.id === 'other' ? (state.other || T.otherShort) : (r.pname || r.name); }
  function fromTo() {
    var r = rowsById[state.dest], d = dirObj();
    var here = { code: pointName(r), sub: r.id === 'other' ? '' : (r.sub || '') };
    var hub = { code: d.hubCode, sub: d.hubName };
    return d.hubFirst ? { from: hub, to: here } : { from: here, to: hub };
  }
  /* an airport code reads better as its full name in a message */
  function label(end) { return end.code.length <= 4 && end.sub ? end.sub : end.code; }

  /* ── board ─────────────────────────────────────────── */
  var board = $('trBoard');
  function paintBoardPrices() {
    var i = clsIndex();
    board.querySelectorAll('.tr-row').forEach(function (lab) {
      var r = rowsById[lab.dataset.row];
      var el = lab.querySelector('.tr-row-price');
      var v = r && r.p ? r.p[i] : null;
      el.textContent = v ? (r.from ? T.from + ' ' : '') + fmtEur(v) : T.onRequest;
      el.classList.toggle('is-ask', !v);
    });
  }
  function showGroup(g) {
    board.querySelectorAll('.tr-group').forEach(function (b) {
      var on = b.dataset.group === g;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    board.querySelectorAll('.tr-row').forEach(function (lab) { lab.hidden = lab.dataset.group !== g; });
  }
  board.addEventListener('click', function (e) {
    var b = e.target.closest('.tr-group');
    if (b) showGroup(b.dataset.group);
  });
  board.addEventListener('change', function (e) {
    if (e.target.name === 'dest') { state.dest = e.target.value; update(); }
  });
  var otherInput = $('trOther');
  if (otherInput) otherInput.addEventListener('input', function () { state.other = this.value.trim(); update(false); });

  /* ── direction, Iasi end, class, round trip ───────── */
  function syncDir() {
    $('trDir').classList.toggle('is-your', dirIndex() === 1);
    var t = $('trBoardTitle');
    if (t) t.textContent = t.dataset['t' + dirIndex()];
  }
  function syncHub() {
    var hub = $('trHub'), h = hubInput();
    if (hub && h) hub.classList.toggle('is-your', h.dataset.flight !== '1');
    var show = flightApplies();
    $('trFlightW').hidden = !show;
    var row = $('trPassFlightRow'); if (row) row.hidden = !show;
  }
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'dir') { state.dir = t.value; syncDir(); update(); }
    if (t.name === 'hub') { syncHub(); update(); }
    if (t.name === 'cls') { state.cls = t.value; paintBoardPrices(); update(); }
    if (t.name === 'rt') { state.rt = t.checked; update(); }
    if (t.name === 'seat') { state.seat = t.checked; update(false); }
  });

  /* ── passengers ───────────────────────────────────── */
  function setPax(n) {
    state.pax = Math.max(1, Math.min(4, n));
    $('trPax').textContent = state.pax;
    $('trPaxMinus').disabled = state.pax <= 1;
    $('trPaxPlus').disabled = state.pax >= 4;
    update(false);
  }
  $('trPaxMinus').addEventListener('click', function () { setPax(state.pax - 1); });
  $('trPaxPlus').addEventListener('click', function () { setPax(state.pax + 1); });

  /* ── optional details: chips that open a picker, never a form to fill ── */
  function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1); }
  function sameDay(a, b) { return !!(a && b) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function fmtDate(d) { return new Intl.DateTimeFormat(T.dateLocale, { weekday: 'short', day: 'numeric', month: 'long' }).format(d); }
  function dateShort(d) { return new Intl.DateTimeFormat(T.dateLocale, { day: 'numeric', month: 'short' }).format(d); }
  function isoDate(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  var pops = [];
  function closeAll(except) { pops.forEach(function (p) { if (p !== except) p.close(false); }); }

  /* date: the personal driver calendar (Intl names, Monday first, no past days) */
  var cal = $('trCal'), whenBtn = $('trWhenBtn'), viewY, viewM;
  function renderWhen() {
    $('trWhen').classList.toggle('has-date', !!state.date);
    $('trWhenText').textContent = state.date ? fmtDate(state.date) : T.addDate;
  }
  function renderCal(focusDay) {
    var t = today0();
    var first = new Date(viewY, viewM, 1);
    var atStart = viewY === t.getFullYear() && viewM === t.getMonth();
    var title = cap(new Intl.DateTimeFormat(T.dateLocale, { month: 'long', year: 'numeric' }).format(first)).replace(/\s*г\.$/, '');
    var wdFmt = new Intl.DateTimeFormat(T.dateLocale, { weekday: 'short' });
    var longFmt = new Intl.DateTimeFormat(T.dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var html = '<div class="sp-cal-head">' +
      '<button type="button" class="sp-cal-nav is-prev" data-nav="-1" aria-label="' + T.prev + '"' + (atStart ? ' disabled' : '') + '><svg class="sp-ico" aria-hidden="true"><use href="#i-arrow"/></svg></button>' +
      '<span class="sp-cal-title" aria-live="polite">' + title + '</span>' +
      '<button type="button" class="sp-cal-nav" data-nav="1" aria-label="' + T.next + '"><svg class="sp-ico" aria-hidden="true"><use href="#i-arrow"/></svg></button>' +
      '</div><div class="sp-cal-grid">';
    for (var i = 0; i < 7; i++) html += '<span class="sp-cal-wd" aria-hidden="true">' + cap(wdFmt.format(new Date(2024, 0, 1 + i))).replace('.', '') + '</span>';
    var lead = (first.getDay() + 6) % 7;
    for (var k = 0; k < lead; k++) html += '<span></span>';
    var dim = new Date(viewY, viewM + 1, 0).getDate();
    for (var d = 1; d <= dim; d++) {
      var dt = new Date(viewY, viewM, d);
      var sel = sameDay(dt, state.date);
      html += '<button type="button" tabindex="-1" class="sp-cal-day' + (sameDay(dt, t) ? ' is-today' : '') + (sel ? ' is-sel' : '') +
        '" data-day="' + d + '"' + (dt < t ? ' disabled' : '') + (sel ? ' aria-pressed="true"' : '') + ' aria-label="' + longFmt.format(dt) + '">' + d + '</button>';
    }
    html += '</div><p class="sp-cal-foot">' + T.calFoot + '</p>';
    cal.innerHTML = html;
    var want = focusDay || (state.date && state.date.getMonth() === viewM && state.date.getFullYear() === viewY ? state.date.getDate() : (atStart ? t.getDate() : 1));
    var target = cal.querySelector('[data-day="' + want + '"]');
    if (!target || target.disabled) target = cal.querySelector('.sp-cal-day:not(:disabled)');
    if (target) target.tabIndex = 0;
    return target;
  }
  var calPop = {
    open: function () {
      closeAll(calPop);
      var base = state.date || today0();
      viewY = base.getFullYear(); viewM = base.getMonth();
      cal.hidden = false; whenBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('tr-sheet-open');
      var target = renderCal(); if (target) target.focus({ preventScroll: true });
    },
    close: function (back) {
      if (cal.hidden) return;
      cal.hidden = true; whenBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('tr-sheet-open');
      if (back) whenBtn.focus({ preventScroll: true });
    },
    el: $('trWhen')
  };
  pops.push(calPop);
  whenBtn.addEventListener('click', function () { if (cal.hidden) calPop.open(); else calPop.close(false); });
  $('trWhenClear').addEventListener('click', function () { state.date = null; renderWhen(); update(false); whenBtn.focus(); });
  cal.addEventListener('click', function (e) {
    e.stopPropagation();
    var nav = e.target.closest('[data-nav]');
    if (nav) {
      if (nav.disabled) return;
      viewM += parseInt(nav.getAttribute('data-nav'), 10);
      if (viewM < 0) { viewM = 11; viewY--; }
      if (viewM > 11) { viewM = 0; viewY++; }
      renderCal(); return;
    }
    var day = e.target.closest('[data-day]');
    if (day && !day.disabled) {
      state.date = new Date(viewY, viewM, parseInt(day.getAttribute('data-day'), 10));
      renderWhen(); update(false); calPop.close(true);
    }
  });
  cal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); calPop.close(true); return; }
    var cur = document.activeElement;
    if (!cur || !cur.hasAttribute('data-day')) return;
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    var dt = new Date(viewY, viewM, parseInt(cur.getAttribute('data-day'), 10) + step);
    if (dt < today0()) return;
    viewY = dt.getFullYear(); viewM = dt.getMonth();
    var target = renderCal(dt.getDate()); if (target) target.focus();
  });

  /* time: hour first, then the quarter; two taps and it closes */
  var tp = $('trTimePick'), timeBtn = $('trTimeBtn'), pickHour = null;
  function renderWhenTime() {
    $('trTimeW').classList.toggle('has-date', !!state.time);
    $('trTimeText').textContent = state.time || T.addTime;
  }
  function renderTime() {
    var h = '<div class="sp-cal-head"><span class="sp-cal-title">' + T.timeTitle + '</span></div>';
    h += '<p class="tr-tp-label">' + T.hoursL + '</p><div class="tr-tp-grid tr-tp-hours">';
    var curH = state.time ? parseInt(state.time, 10) : null;
    for (var i = 0; i < 24; i++) {
      var on = pickHour === i || (pickHour === null && curH === i);
      h += '<button type="button" class="sp-cal-day' + (on ? ' is-sel' : '') + '" data-h="' + i + '">' + ('0' + i).slice(-2) + '</button>';
    }
    h += '</div><p class="tr-tp-label">' + T.minutesL + '</p><div class="tr-tp-grid tr-tp-min">';
    ['00', '15', '30', '45'].forEach(function (m) {
      h += '<button type="button" class="sp-cal-day" data-m="' + m + '"' + (pickHour === null && curH === null ? ' disabled' : '') + '>:' + m + '</button>';
    });
    h += '</div><p class="sp-cal-foot">' + T.timeFoot + '</p>';
    tp.innerHTML = h;
  }
  var timePop = {
    open: function () {
      closeAll(timePop);
      pickHour = null; renderTime();
      tp.hidden = false; timeBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('tr-sheet-open');
      var f = tp.querySelector('.is-sel') || tp.querySelector('[data-h="12"]'); if (f) f.focus({ preventScroll: true });
    },
    close: function (back) {
      if (tp.hidden) return;
      tp.hidden = true; timeBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('tr-sheet-open');
      if (back) timeBtn.focus({ preventScroll: true });
    },
    el: $('trTimeW')
  };
  pops.push(timePop);
  timeBtn.addEventListener('click', function () { if (tp.hidden) timePop.open(); else timePop.close(false); });
  $('trTimeClear').addEventListener('click', function () { state.time = ''; renderWhenTime(); update(false); timeBtn.focus(); });
  tp.addEventListener('click', function (e) {
    e.stopPropagation();
    var hb = e.target.closest('[data-h]');
    if (hb) { pickHour = parseInt(hb.dataset.h, 10); renderTime(); var m = tp.querySelector('[data-m]'); if (m) m.focus(); return; }
    var mb = e.target.closest('[data-m]');
    if (mb && !mb.disabled) {
      var hour = pickHour !== null ? pickHour : parseInt(state.time, 10);
      state.time = ('0' + hour).slice(-2) + ':' + mb.dataset.m;
      renderWhenTime(); update(false); timePop.close(true);
    }
  });
  tp.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); timePop.close(true); } });

  document.addEventListener('click', function (e) {
    pops.forEach(function (p) { if (!p.el.contains(e.target)) p.close(false); });
  });

  /* flight: the chip turns into a field */
  var fBtn = $('trFlightBtn'), fIn = $('trFlight'), fW = $('trFlightW');
  function renderFlight(editing) {
    var has = !!state.flight;
    fW.classList.toggle('has-date', has);
    fBtn.hidden = editing || has;
    fIn.hidden = !(editing || has);
  }
  fBtn.addEventListener('click', function () { closeAll(); renderFlight(true); fIn.focus(); });
  fIn.addEventListener('input', function () { state.flight = fIn.value.trim().toUpperCase(); update(false); });
  fIn.addEventListener('blur', function () { renderFlight(false); });
  $('trFlightClear').addEventListener('click', function () { state.flight = ''; fIn.value = ''; renderFlight(false); update(false); fBtn.focus(); });

  /* links elsewhere on the page that preset the board */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-pick-class],[data-pick-dest],[data-pick-dir]');
    if (!a) return;
    if (a.dataset.pickClass) { var c = form.querySelector('input[name="cls"][value="' + a.dataset.pickClass + '"]'); if (c) { c.checked = true; state.cls = c.value; paintBoardPrices(); } }
    if (a.dataset.pickDir) { var d = form.querySelector('input[name="dir"][value="' + a.dataset.pickDir + '"]'); if (d) { d.checked = true; state.dir = d.value; syncDir(); } }
    if (a.dataset.pickDest) {
      var inp = board.querySelector('input[name="dest"][value="' + a.dataset.pickDest + '"]');
      if (inp) { inp.checked = true; state.dest = inp.value; showGroup(inp.closest('.tr-row').dataset.group); }
    }
    update();
  });

  /* ── the pass ──────────────────────────────────────── */
  /* a place name is shown large; if its longest word does not fit the half of the pass, one step smaller */
  function fitEnd(el) {
    el.classList.remove('is-long');
    if (el.classList.contains('is-code')) return;
    el.style.whiteSpace = 'nowrap';
    var words = el.textContent.split(/\s+/), wide = false;
    if (el.scrollWidth > el.clientWidth + 1) {
      /* the whole name may wrap; only a single word wider than the box is a problem */
      var probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit';
      el.appendChild(probe);
      words.forEach(function (w) { probe.textContent = w; if (probe.offsetWidth > el.clientWidth + 1) wide = true; });
      el.removeChild(probe);
      if (!wide && words.length > 2) wide = true;
    }
    el.style.whiteSpace = '';
    el.classList.toggle('is-long', wide);
  }
  window.addEventListener('resize', function () { fitEnd($('trFromCode')); fitEnd($('trToCode')); });
  function set(id, txt, empty) {
    var el = $(id); if (!el) return;
    el.textContent = txt;
    el.classList.toggle('is-empty', !!empty);
  }
  function whenText() { return [state.date ? dateShort(state.date) : '', state.time].filter(Boolean).join(', '); }

  function summary(pr) {
    var ft = fromTo(), c = clsObj(), lines = [];
    lines.push(T.waRoute + ': ' + label(ft.from) + ' → ' + label(ft.to));
    lines.push(T.waClass + ': ' + c.name + ' (' + c.car + ')');
    lines.push(T.waPax + ': ' + state.pax);
    if (state.rt) lines.push(T.roundTrip);
    if (state.seat) lines.push(T.waSeat);
    if (state.date || state.time) lines.push(T.waWhen + ': ' + whenText());
    if (state.flight && flightApplies()) lines.push(T.waFlight + ': ' + state.flight);
    lines.push(T.waPrice + ': ' + (pr ? fmtEur(pr.total) : T.onRequest));
    return lines;
  }

  function update(anim) {
    var pr = price(), ft = fromTo(), c = clsObj(), r = rowsById[state.dest];
    $('trFromCode').textContent = ft.from.code; $('trFromSub').textContent = ft.from.sub;
    $('trToCode').textContent = ft.to.code; $('trToSub').textContent = ft.to.sub;
    $('trFromCode').classList.toggle('is-code', ft.from.code.length <= 4);
    $('trToCode').classList.toggle('is-code', ft.to.code.length <= 4);
    fitEnd($('trFromCode')); fitEnd($('trToCode'));
    set('trPassClass', c.name);
    set('trPassCar', c.car);
    set('trPassPax', String(state.pax));
    set('trPassWhen', whenText() || T.notSet, !(state.date || state.time));
    set('trPassFlight', state.flight || T.optional, !state.flight);
    set('trPassWait', c.wait);

    var out = $('trTotal'), f = $('trFormula');
    if (pr) {
      out.textContent = fmtEur(pr.total);
      var bits = [state.rt ? T.roundTrip : T.oneWay];
      if (pr.lei && !state.rt) bits.push(fmtNum(pr.lei) + ' ' + T.lei);
      if (state.pax > 1) bits.push(T.perPerson.replace('{x}', fmtEur(Math.round(pr.total / state.pax))));
      f.textContent = bits.join(', ');
    } else {
      out.textContent = T.onRequestShort;
      f.textContent = T.onRequestNote;
    }
    $('trBarTotal').textContent = pr ? fmtEur(pr.total) : T.onRequestShort;
    $('trBarLabel').textContent = (ft.to.code.length <= 4 ? label(ft.from) : label(ft.to)) + ', ' + c.name;

    var rtPrice = $('trRtPrice');
    if (rtPrice) {
      if (D.rtMode === 'table') { var rtv = r.rt ? r.rt[clsIndex()] : null; rtPrice.textContent = rtv ? fmtEur(rtv) : T.onRequest; }
      else rtPrice.textContent = '−' + Math.round(D.rtDiscount * 100) + '%';
    }

    var wa = 'https://wa.me/37360000500?text=' + encodeURIComponent(T.waHello + '\n' + summary(pr).join('\n'));
    $('trWhatsApp').href = wa;
    $('trBarWa').href = wa;
    board.closest('.tr-board-wrap').classList.toggle('is-other', state.dest === 'other');
    if (anim !== false) { out.classList.remove('tr-bump'); void out.offsetWidth; out.classList.add('tr-bump'); }
  }

  /* ── WhatsApp counts as a conversion ───────────────── */
  ['trWhatsApp', 'trBarWa'].forEach(function (id) {
    var a = $(id); if (!a) return;
    a.addEventListener('click', function () { if (typeof window.gtag_report_conversion === 'function') window.gtag_report_conversion(); });
  });

  /* ── call me back: the same endpoint as before, now with the whole trip ── */
  var callBtn = $('trCallBtn');
  if (callBtn) callBtn.addEventListener('click', async function () {
    var phoneEl = $('trPhone'), msg = $('trCallMsg');
    var phone = (window.PhoneInput && window.PhoneInput.full(phoneEl)) || phoneEl.value.trim();
    if (phoneEl.prPhone) { if (!phoneEl.prPhone.validate().ok) { phoneEl.focus(); return; } }
    else if (phone.replace(/\D/g, '').length < 8) { msg.hidden = false; msg.classList.add('is-err'); msg.textContent = T.badPhone; phoneEl.focus(); return; }
    var pr = price(), ft = fromTo(), orig = callBtn.textContent;
    callBtn.disabled = true; callBtn.textContent = T.sending;
    try {
      var res = await fetch(D.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          phone_country: (phoneEl.dataset && phoneEl.dataset.country) || null,
          service_type: D.service,
          tier: clsObj().name,
          pickup_location: label(ft.from),
          destination: label(ft.to),
          pickup_date: state.date ? isoDate(state.date) : null,
          pickup_time: state.time || null,
          special_instructions: summary(pr).join('\n') + '\n' + T.waLang + ': ' + D.lang.toUpperCase()
        })
      });
      var data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'HTTP ' + res.status);
      if (typeof window.gtag_report_conversion === 'function') window.gtag_report_conversion();
      phoneEl.value = '';
      msg.hidden = false; msg.classList.remove('is-err'); msg.textContent = T.sent;
      var modal = $('successModal'); if (modal) modal.style.display = 'flex';
    } catch (err) {
      msg.hidden = false; msg.classList.add('is-err'); msg.textContent = T.failed;
    } finally { callBtn.disabled = false; callBtn.textContent = orig; }
  });

  /* ── the sticky bar on phones, while the pass is out of view ── */
  var bar = $('spBar'), pass = $('spReceipt'), hero = document.querySelector('.sp-hero');
  if (bar && pass && 'IntersectionObserver' in window) {
    var passIn = false, heroIn = true;
    var sync = function () {
      var on = !passIn && !heroIn;
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', on ? 'false' : 'true');
      bar.querySelectorAll('a').forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    };
    new IntersectionObserver(function (en) { passIn = en[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(pass);
    if (hero) new IntersectionObserver(function (en) { heroIn = en[0].isIntersecting; sync(); }).observe(hero);
  }

  showGroup(board.querySelector('.tr-group.is-on') ? board.querySelector('.tr-group.is-on').dataset.group : D.rows[0].group);
  paintBoardPrices();
  syncDir(); syncHub();
  renderWhen(); renderWhenTime(); renderFlight(false);
  setPax(state.pax);
  update(false);
})();
