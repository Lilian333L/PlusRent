/* Configurator for the personal driver test page.
   Prices are the owner-approved ones (Sept 2026). The HTML already shows the
   default day (our car, Standard 8 h, Audi A6, 175 €), so the page reads
   correctly without this script; the script only recalculates. */
(function () {
  var form = document.getElementById('spBuilder');
  if (!form) return;

  var SUPABASE = 'https://ncmqbrhlxjrjgnkaafhv.supabase.co/storage/v1/object/public/car-images/';
  var PRICES = { our: { 8: 175, 10: 275, 12: 425 }, your: { 8: 120, 10: 170, 12: 240 } };
  var PER_HOUR = { our: { 8: 22, 10: 28, 12: 35 }, your: { 8: 15, 10: 17, 12: 20 } };
  var EXTRA_HOUR_MDL = { our: { 8: 437, 10: 550, 12: 708 }, your: { 8: 250, 10: 280, 12: 333 } };
  var TIER = { 8: 'Standard', 10: 'Business', 12: 'VIP' };
  var TIER_HOURS = { 8: '8 hours', 10: '10 hours', 12: '12 hours or on demand' };
  var CROSSING = 25;
  var GUIDE = { 8: 90, 10: 130, 12: 150 };
  var MAX_DAYS = 29;

  var MODELS = {
    a6:    { name: 'Audi A6 2022', img: 12, alt: 'Audi A6 2022, the usual PlusRent chauffeur car' },
    a4:    { name: 'Audi A4 2017', img: 15, alt: 'Audi A4 2017, PlusRent' },
    lexus: { name: 'Lexus NX300h', img: 13, alt: 'Lexus NX300h 2022, PlusRent' },
    bmw5:  { name: 'BMW 5 Series', img: 22, alt: 'BMW 5 Series, PlusRent' },
    merc:  { name: 'Mercedes E-Class', img: null }
  };
  var PKG_MODELS = { 8: ['a6', 'a4', 'lexus'], 10: ['a6', 'lexus'], 12: ['bmw5', 'merc', 'lexus', 'a6'] };
  var PKG_NOTE = {
    8: 'Usually an Audi A6, otherwise an Audi A4 2017 or a Lexus NX300h.',
    10: 'Audi A6 2022 or Lexus NX300h. Driver in business attire.',
    12: 'Mercedes E, BMW 5, Lexus NX300h or Audi A6. VIP driver in a suit.'
  };
  var DRIVER_PERKS = {
    8: ['Professional driver (EN/RO/RU)', '8 hours of service', 'Punctuality guaranteed', 'Luggage assistance', 'You pay only for the driver, your car = your fuel'],
    10: ['Senior multilingual driver (EN/RO/RU)', '10 hours of service', 'Business attire', 'Schedule flexibility and priority booking', 'Same driver included'],
    12: ['VIP driver in suit', '12 hours or 24/7 on demand', 'Absolute discretion', 'Concierge service and account manager', 'Same driver guaranteed']
  };
  var ROUTE = {
    md: { name: 'Chisinau and Moldova' },
    tr: { name: 'Transnistria', line: 'Crossing into Transnistria', small: 'Tiraspol, Bender, Rîbnița, the whole region' },
    ro: { name: 'Romania', line: 'Crossing into Romania', small: 'Iași and further, passport needed' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    mode: $('spMode'), stage: $('spStage'), img: $('spStageImg'), plain: $('spStagePlain'), driver: $('spStageDriver'),
    perks: $('spDriverPerks'), kicker: $('spStageKicker'), name: $('spStageName'), note: $('spStageNote'),
    stagePrice: $('spStagePrice'), pick: $('spCarPick'),
    lines: $('spLines'), total: $('spTotal'), formula: $('spFormula'), notes: $('spNotes'),
    days: $('spDays'), minus: $('spDaysMinus'), plus: $('spDaysPlus'), date: $('spDate'),
    guideRow: $('spGuideRow'), guidePrice: $('spGuidePrice'), guideSub: $('spGuideSub'),
    wa: $('spWhatsApp'), tg: $('spTelegram'), foot: $('spTicketFoot'),
    bar: $('spBar'), barTotal: $('spBarTotal'), barLabel: $('spBarLabel'), barWa: $('spBarWa')
  };
  var days = 1;
  var shownKeys = null;
  var shownTotal = 175;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── images: Vercel-optimised on the live site, originals elsewhere ── */
  var optimise = /(^|\.)plusrent\.md$|\.vercel\.app$/.test(location.hostname);
  function carSrc(id, w) {
    var orig = SUPABASE + 'car-' + id + '/head.jpg';
    return optimise ? '/_vercel/image?url=' + encodeURIComponent(orig) + '&w=' + w + '&q=75' : orig;
  }
  if (!optimise) {
    document.querySelectorAll('img[data-car]').forEach(function (img) {
      img.removeAttribute('srcset');
      img.src = carSrc(img.getAttribute('data-car'), 1080);
    });
  }

  function eur(n) {
    var r = Math.round(n * 100) / 100;
    var d = r % 1 ? 2 : 0;
    return r.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €';
  }
  function val(name) {
    var c = form.querySelector('input[name="' + name + '"]:checked');
    return c ? c.value : null;
  }
  function discountFor(d) { return d >= 10 ? 15 : d >= 5 ? 10 : 0; }
  function check(name, value) {
    var i = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (i) i.checked = true;
  }

  function state() {
    return {
      car: val('car') || 'our',
      hours: parseInt(val('hours') || '8', 10),
      model: val('model') || 'a6',
      route: val('route') || 'md',
      guide: form.querySelector('input[name="guide"]').checked,
      days: days
    };
  }

  /* ── preferred-car chips follow the package ── */
  function renderPick(hours, keep) {
    var list = PKG_MODELS[hours];
    var chosen = list.indexOf(keep) > -1 ? keep : list[0];
    var html = '<span class="sp-carpick-label">Preferred car</span>';
    list.forEach(function (m) {
      html += '<label><input type="radio" name="model" value="' + m + '"' + (m === chosen ? ' checked' : '') + '><span>' +
        MODELS[m].name + (hours === 8 && m === 'a6' ? ' <em>usually</em>' : '') + '</span></label>';
    });
    html += '<span class="sp-carpick-more">Other cars on request</span>';
    el.pick.innerHTML = html;
  }

  var currentImg = 12;
  function showCar(model) {
    var m = MODELS[model];
    if (!m.img) { el.plain.hidden = false; el.img.classList.add('is-out'); currentImg = null; return; }
    el.plain.hidden = true;
    if (currentImg === m.img) { el.img.classList.remove('is-out'); return; }
    currentImg = m.img;
    var next = new Image();
    next.onload = next.onerror = function () {
      el.img.src = next.src;
      el.img.alt = m.alt;
      requestAnimationFrame(function () { el.img.classList.remove('is-out'); });
    };
    el.img.classList.add('is-out');
    setTimeout(function () { next.src = carSrc(m.img, 1080); }, reduceMotion ? 0 : 180);
  }

  function renderStage(s) {
    var your = s.car === 'your';
    el.mode.classList.toggle('is-your', your);
    el.stage.classList.toggle('is-your', your);
    el.driver.hidden = !your;
    el.kicker.textContent = TIER[s.hours] + ', ' + TIER_HOURS[s.hours];
    el.stagePrice.textContent = eur(PRICES[s.car][s.hours]);
    if (your) {
      el.perks.innerHTML = DRIVER_PERKS[s.hours].map(function (p) {
        return '<li><svg class="sp-ico" aria-hidden="true"><use href="#i-check"/></svg>' + p + '</li>';
      }).join('');
      return;
    }
    el.name.textContent = MODELS[s.model].name;
    el.note.textContent = PKG_NOTE[s.hours];
    showCar(s.model);
  }

  function calc(s) {
    var pkg = PRICES[s.car][s.hours];
    var perDay = pkg;
    var lines = [{
      key: 'pkg',
      label: (s.car === 'our' ? 'Our car + driver' : 'Driver on your car') + ', ' + TIER[s.hours] + ' ' + s.hours + ' h',
      small: s.car === 'our' ? 'Preferred: ' + MODELS[s.model].name + (s.hours === 8 && s.model === 'a6' ? ' (usually)' : '') : 'Your car, your fuel',
      value: eur(pkg)
    }];
    if (s.route !== 'md') {
      perDay += CROSSING;
      lines.push({ key: 'x-' + s.route, cls: 'is-add', label: ROUTE[s.route].line, small: ROUTE[s.route].small, value: '+' + eur(CROSSING) });
    }
    if (s.guide) {
      perDay += GUIDE[s.hours];
      lines.push({ key: 'guide', cls: 'is-add', label: 'Guide, ' + s.hours + ' hours', small: 'English, Russian, Romanian', value: '+' + eur(GUIDE[s.hours]) });
    }
    var total = perDay * s.days;
    var pct = discountFor(s.days);
    if (s.days > 1) lines.push({ key: 'days', label: s.days + ' days × ' + eur(perDay), small: 'One day times the number of days', value: eur(total) });
    if (pct) {
      var discount = pkg * s.days * pct / 100;
      total -= discount;
      lines.push({ key: 'disc', cls: 'is-minus', label: pct + '% off the driver package', small: s.days + ' × ' + eur(pkg) + ' × ' + pct + '%', value: '−' + eur(discount) });
    }
    return { pkg: pkg, perDay: perDay, total: total, lines: lines, pct: pct };
  }

  function formula(s, r) {
    var parts = [eur(r.pkg)];
    if (s.route !== 'md') parts.push(eur(CROSSING));
    if (s.guide) parts.push(eur(GUIDE[s.hours]));
    if (parts.length === 1 && s.days === 1) return 'One day, ' + s.hours + ' hours, nothing added';
    var f = parts.join(' + ');
    if (s.days > 1) f = (parts.length > 1 ? '(' + f + ')' : f) + ' × ' + s.days;
    if (r.pct) f += ' − ' + r.pct + '% on the driver';
    return f + ' = ' + eur(r.total);
  }

  function renderLines(r) {
    var next = {};
    el.lines.innerHTML = r.lines.map(function (l) {
      next[l.key] = true;
      var isNew = shownKeys && !shownKeys[l.key] ? ' is-new' : '';
      return '<li class="sp-line ' + (l.cls || '') + isNew + '"><span>' + l.label +
        (l.small ? '<small>' + l.small + '</small>' : '') + '</span><span>' + l.value + '</span></li>';
    }).join('');
    shownKeys = next;
  }

  function renderNotes(s) {
    var ok = '<svg class="sp-ico" aria-hidden="true"><use href="#i-check"/></svg>';
    var info = '<svg class="sp-ico" aria-hidden="true"><use href="#i-info"/></svg>';
    var n = '<p>' + ok + '<span>' + (s.car === 'our'
      ? 'Included: car, fuel, insurance, 200 km a day, Wi-Fi and water.'
      : 'Included: a professional driver for ' + s.hours + ' hours. Fuel is yours.') + '</span></p>';
    n += '<p class="is-extra">' + info + '<span>Only if you use them: an hour over ' + s.hours + ' h is about ' +
      EXTRA_HOUR_MDL[s.car][s.hours] + ' MDL, a km over 200 a day is 5 MDL.</span></p>';
    if (s.route === 'ro') n += '<p class="is-extra">' + info + '<span>Chisinau to Iasi and back is about 260 km, so about 60 km extra, 300 MDL.</span></p>';
    el.notes.innerHTML = n;
  }

  function tweenTotal(to) {
    var from = shownTotal;
    shownTotal = to;
    if (reduceMotion || from === to) { el.total.textContent = eur(to); return; }
    var t0 = null, dur = 420;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      var v = from + (to - from) * e;
      el.total.textContent = eur(k < 1 ? Math.round(v) : to);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function summary(s, r) {
    var t = 'Hello PlusRent! I would like a personal driver:\n';
    t += '- ' + (s.car === 'our' ? 'Your car + driver (Option A), preferred car: ' + MODELS[s.model].name : 'Driver on my car (Option B)') + '\n';
    t += '- Package: ' + TIER[s.hours] + ', ' + s.hours + ' hours\n';
    t += '- Route: ' + ROUTE[s.route].name + '\n';
    t += '- Guide: ' + (s.guide ? 'yes' : 'no') + '\n';
    t += '- Days: ' + s.days + (el.date.value ? ', from ' + el.date.value : '') + '\n';
    t += 'Price on the site: ' + eur(r.total) + '. Is it available?';
    return t;
  }

  function syncControls(s) {
    form.querySelectorAll('[data-pkg-price]').forEach(function (n) { n.textContent = eur(PRICES[s.car][n.getAttribute('data-pkg-price')]); });
    form.querySelectorAll('[data-pkg-hour]').forEach(function (n) { n.textContent = '~' + PER_HOUR[s.car][n.getAttribute('data-pkg-hour')] + ' €/h'; });
    form.querySelectorAll('[data-mode]').forEach(function (n) { n.hidden = n.getAttribute('data-mode') !== s.car; });
    el.guidePrice.textContent = '+' + eur(GUIDE[s.hours]);
    el.guideSub.textContent = 'For ' + s.hours + ' hours. English, Russian, Romanian. Book 24 hours ahead.';
    el.days.textContent = s.days === 1 ? '1 day' : s.days + ' days';
    el.minus.disabled = s.days <= 1;
    el.plus.disabled = s.days >= MAX_DAYS;
    var pct = discountFor(s.days);
    form.querySelectorAll('[data-disc]').forEach(function (n) { n.classList.toggle('is-on', parseInt(n.getAttribute('data-disc'), 10) === pct); });
  }

  var lastText = '';
  function update() {
    var s = state();
    var r = calc(s);
    syncControls(s);
    renderStage(s);
    renderLines(r);
    renderNotes(s);
    tweenTotal(r.total);
    el.formula.textContent = formula(s, r);
    lastText = summary(s, r);
    var href = 'https://wa.me/37360000500?text=' + encodeURIComponent(lastText);
    el.wa.href = href;
    el.barWa.href = href;
    el.barTotal.textContent = eur(r.total);
    el.barLabel.textContent = (s.car === 'our' ? MODELS[s.model].name : 'Your car') + ', ' + s.hours + ' h' +
      (s.route !== 'md' ? ', ' + ROUTE[s.route].name : '') + (s.guide ? ', guide' : '') + (s.days > 1 ? ', ' + s.days + ' days' : '');
  }

  form.addEventListener('change', function (e) {
    if (e.target.name === 'hours') renderPick(parseInt(e.target.value, 10), val('model'));
    update();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  el.minus.addEventListener('click', function () { if (days > 1) { days--; update(); } });
  el.plus.addEventListener('click', function () { if (days < MAX_DAYS) { days++; update(); } });

  /* ── shortcuts from the rest of the page ── */
  function pickModel(model) {
    check('car', 'our');
    var h = parseInt(val('hours') || '8', 10);
    if (PKG_MODELS[h].indexOf(model) === -1) {
      h = [8, 10, 12].filter(function (x) { return PKG_MODELS[x].indexOf(model) > -1; })[0];
      check('hours', h);
    }
    renderPick(h, model);
    update();
  }
  document.querySelectorAll('[data-pick-car]').forEach(function (a) {
    a.addEventListener('click', function () { check('car', a.getAttribute('data-pick-car')); update(); });
  });
  document.querySelectorAll('[data-pick-route]').forEach(function (b) {
    b.addEventListener('click', function () {
      check('route', b.getAttribute('data-pick-route'));
      if (b.hasAttribute('data-pick-guide')) { form.querySelector('input[name="guide"]').checked = true; check('hours', 8); renderPick(8, val('model')); }
      update();
    });
  });
  document.querySelectorAll('[data-pick-model]').forEach(function (b) {
    b.addEventListener('click', function () { pickModel(b.getAttribute('data-pick-model')); });
  });

  /* ── contact buttons ── */
  function track() { if (typeof window.gtag_report_conversion === 'function') window.gtag_report_conversion(); }
  el.wa.addEventListener('click', track);
  el.barWa.addEventListener('click', track);
  el.tg.addEventListener('click', function () {
    track();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastText).then(function () {
        el.foot.textContent = 'Your choices are copied. Paste them into the Telegram chat.';
      }, function () {});
    }
  });

  /* ── phone bar: from the end of the hero to the final call, except while
     the ticket itself is on screen (it has the same buttons, bigger) ── */
  if ('IntersectionObserver' in window && el.bar) {
    var mq = window.matchMedia('(max-width: 960px)');
    var inHero = true, inTicket = false, inFinal = false;
    var set = function () {
      var on = mq.matches && !inHero && !inTicket && !inFinal;
      el.bar.classList.toggle('is-on', on);
      el.bar.setAttribute('aria-hidden', on ? 'false' : 'true');
      document.body.classList.toggle('sp-bar-visible', on);
    };
    var watch = function (node, fn, opts) { if (node) new IntersectionObserver(function (en) { fn(en[0].isIntersecting); set(); }, opts).observe(node); };
    watch(document.querySelector('.sp-hero-ctas'), function (v) { inHero = v; });
    watch($('spReceipt'), function (v) { inTicket = v; }, { threshold: 0.2 });
    watch(document.querySelector('.sp-final'), function (v) { inFinal = v; });
    if (mq.addEventListener) mq.addEventListener('change', set);
  }

  el.date.min = new Date().toISOString().slice(0, 10);
  update();
})();
