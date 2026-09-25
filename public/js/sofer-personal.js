/* Configurator for the personal driver pages (en, ro, ru).
   Prices are the owner-approved ones (Sept 2026). The HTML already shows the
   default day (our car, Standard 8 h, Audi A6, 175 €), so the page reads
   correctly without this script; the script only recalculates.
   The language comes from <html lang>. */
(function () {
  var form = document.getElementById('spBuilder');
  if (!form) return;

  var SUPABASE = 'https://ncmqbrhlxjrjgnkaafhv.supabase.co/storage/v1/object/public/car-images/';
  var PRICES = { our: { 8: 175, 10: 275, 12: 425 }, your: { 8: 120, 10: 170, 12: 240 } };
  var PER_HOUR = { our: { 8: 22, 10: 28, 12: 35 }, your: { 8: 15, 10: 17, 12: 20 } };
  var EXTRA_HOUR_MDL = { our: { 8: 437, 10: 550, 12: 708 }, your: { 8: 250, 10: 280, 12: 333 } };
  var TIER = { 8: 'Standard', 10: 'Business', 12: 'VIP' };
  var CROSSING = 25;
  var GUIDE = { 8: 90, 10: 130, 12: 150 };
  var MAX_DAYS = 29;
  var MODEL_IMG = { a6: 12, a4: 15, lexus: 13, bmw5: 22, merc: null };
  var PKG_MODELS = { 8: ['a6', 'a4', 'lexus'], 10: ['a6', 'lexus'], 12: ['bmw5', 'merc', 'lexus', 'a6'] };

  function ruPlural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  var I18N = {
    en: {
      locale: 'en-US',
      hours: { 8: '8 hours', 10: '10 hours', 12: '12 hours or on demand' },
      models: { a6: 'Audi A6 2022', a4: 'Audi A4 2017', lexus: 'Lexus NX300h', bmw5: 'BMW 5 Series', merc: 'Mercedes E-Class' },
      alt: function (n) { return n + ', PlusRent chauffeur car'; },
      note: {
        8: 'Usually an Audi A6, otherwise an Audi A4 2017 or a Lexus NX300h.',
        10: 'Audi A6 2022 or Lexus NX300h. Driver in business attire.',
        12: 'Mercedes E, BMW 5, Lexus NX300h or Audi A6. VIP driver in a suit.'
      },
      perks: {
        8: ['Professional driver (EN/RO/RU)', '8 hours of service', 'Punctuality guaranteed', 'Luggage assistance', 'You pay only for the driver, your car = your fuel'],
        10: ['Senior multilingual driver (EN/RO/RU)', '10 hours of service', 'Business attire', 'Schedule flexibility and priority booking', 'Same driver included'],
        12: ['VIP driver in suit', '12 hours or 24/7 on demand', 'Absolute discretion', 'Concierge service and account manager', 'Same driver guaranteed']
      },
      route: {
        md: { name: 'Chisinau and Moldova' },
        tr: { name: 'Transnistria', line: 'Crossing into Transnistria', small: 'Tiraspol, Bender, Rîbnița, the whole region' },
        ro: { name: 'Romania', line: 'Crossing into Romania', small: 'Iași and further, passport needed' }
      },
      ourCar: 'Our car + driver', yourCar: 'Driver on your car', preferred: 'Preferred: ', usually: 'usually',
      yourFuel: 'Your car, your fuel', guideLine: function (h) { return 'Guide, ' + h + ' hours'; },
      guideLangs: 'English, Russian, Romanian',
      day: function (n) { return n === 1 ? '1 day' : n + ' days'; },
      daysSmall: 'One day times the number of days',
      disc: function (p) { return p + '% off the driver package'; },
      nothing: function (h) { return 'One day, ' + h + ' hours, nothing added'; },
      onDriver: function (p) { return ' − ' + p + '% on the driver'; },
      inclOur: 'Included: car, fuel, insurance, 200 km a day, Wi-Fi and water.',
      inclYour: function (h) { return 'Included: a professional driver for ' + h + ' hours. Fuel is yours.'; },
      extra: function (h, m) { return 'Only if you use them: an hour over ' + h + ' h is about ' + m + ' MDL, a km over 200 a day is 5 MDL.'; },
      iasi: 'Chisinau to Iasi and back is about 260 km, so about 60 km extra, 300 MDL.',
      guideSub: function (h) { return 'For ' + h + ' hours. English, Russian, Romanian. Book 24 hours ahead.'; },
      perHour: function (n) { return '~' + n + ' €/h'; },
      copied: 'Your choices are copied. Paste them into the Telegram chat.',
      pickLabel: 'Preferred car', more: 'Other cars on request',
      barYour: 'Your car', barGuide: ', guide',
      msg: function (s, name, route, total, date) {
        return 'Hello PlusRent! I would like a personal driver:\n' +
          '- ' + (s.car === 'our' ? 'Your car + driver (Option A), preferred car: ' + name : 'Driver on my car (Option B)') + '\n' +
          '- Package: ' + TIER[s.hours] + ', ' + s.hours + ' hours\n' +
          '- Route: ' + route + '\n' +
          '- Guide: ' + (s.guide ? 'yes' : 'no') + '\n' +
          '- Days: ' + s.days + (date ? ', from ' + date : '') + '\n' +
          'Price on the site: ' + total + '. Is it available?';
      }
    },
    ro: {
      locale: 'ro-RO',
      hours: { 8: '8 ore', 10: '10 ore', 12: '12 ore sau la cerere' },
      models: { a6: 'Audi A6 2022', a4: 'Audi A4 2017', lexus: 'Lexus NX300h', bmw5: 'BMW Seria 5', merc: 'Mercedes E-Class' },
      alt: function (n) { return n + ', mașină cu șofer PlusRent'; },
      note: {
        8: 'De obicei un Audi A6, altfel un Audi A4 2017 sau un Lexus NX300h.',
        10: 'Audi A6 2022 sau Lexus NX300h. Șofer în ținută business.',
        12: 'Mercedes E, BMW Seria 5, Lexus NX300h sau Audi A6. Șofer VIP la costum.'
      },
      perks: {
        8: ['Șofer profesionist (RO/RU/EN)', '8 ore de serviciu', 'Punctualitate garantată', 'Ajutor cu bagajele', 'Plătești doar șoferul, mașina ta = combustibilul tău'],
        10: ['Șofer senior multilingv (RO/RU/EN)', '10 ore de serviciu', 'Ținută business', 'Program flexibil și rezervare prioritară', 'Același șofer inclus'],
        12: ['Șofer VIP la costum', '12 ore sau 24/7 la cerere', 'Discreție absolută', 'Concierge și manager dedicat', 'Același șofer garantat']
      },
      route: {
        md: { name: 'Chișinău și Moldova' },
        tr: { name: 'Transnistria', line: 'Trecere în Transnistria', small: 'Tiraspol, Bender, Rîbnița, toată regiunea' },
        ro: { name: 'România', line: 'Trecere în România', small: 'Iași și mai departe, cu pașaport' }
      },
      ourCar: 'Mașina noastră + șofer', yourCar: 'Șofer pe mașina ta', preferred: 'Preferată: ', usually: 'de obicei',
      yourFuel: 'Mașina ta, combustibilul tău', guideLine: function (h) { return 'Ghid, ' + h + ' ore'; },
      guideLangs: 'engleză, rusă, română',
      day: function (n) { return n === 1 ? '1 zi' : n + ' zile'; },
      daysSmall: 'O zi înmulțită cu numărul de zile',
      disc: function (p) { return 'Reducere ' + p + '% la pachetul șoferului'; },
      nothing: function (h) { return 'O zi, ' + h + ' ore, fără adaosuri'; },
      onDriver: function (p) { return ' − ' + p + '% la șofer'; },
      inclOur: 'Inclus: mașina, combustibilul, asigurarea, 200 km pe zi, Wi-Fi și apă.',
      inclYour: function (h) { return 'Inclus: un șofer profesionist pentru ' + h + ' ore. Combustibilul este al tău.'; },
      extra: function (h, m) { return 'Doar dacă le folosești: o oră peste ' + h + ' h costă circa ' + m + ' MDL, un km peste 200 pe zi costă 5 MDL.'; },
      iasi: 'Chișinău - Iași și înapoi înseamnă circa 260 km, adică circa 60 km în plus, 300 MDL.',
      guideSub: function (h) { return 'Pentru ' + h + ' ore. Engleză, rusă, română. Rezervare cu 24 de ore înainte.'; },
      perHour: function (n) { return '~' + n + ' €/oră'; },
      copied: 'Alegerile tale sunt copiate. Lipește-le în chatul Telegram.',
      pickLabel: 'Mașina preferată', more: 'Alte mașini la cerere',
      barYour: 'Mașina ta', barGuide: ', ghid',
      msg: function (s, name, route, total, date) {
        return 'Bună ziua, PlusRent! Aș dori un șofer personal:\n' +
          '- ' + (s.car === 'our' ? 'Mașina voastră + șofer (Opțiunea A), mașina preferată: ' + name : 'Șofer pe mașina mea (Opțiunea B)') + '\n' +
          '- Pachet: ' + TIER[s.hours] + ', ' + s.hours + ' ore\n' +
          '- Ruta: ' + route + '\n' +
          '- Ghid: ' + (s.guide ? 'da' : 'nu') + '\n' +
          '- Zile: ' + s.days + (date ? ', din ' + date : '') + '\n' +
          'Prețul de pe site: ' + total + '. Este disponibil?';
      }
    },
    ru: {
      locale: 'ru-RU',
      hours: { 8: '8 часов', 10: '10 часов', 12: '12 часов или по запросу' },
      models: { a6: 'Audi A6 2022', a4: 'Audi A4 2017', lexus: 'Lexus NX300h', bmw5: 'BMW 5 серии', merc: 'Mercedes E-Class' },
      alt: function (n) { return n + ', машина с водителем PlusRent'; },
      note: {
        8: 'Обычно Audi A6, иначе Audi A4 2017 или Lexus NX300h.',
        10: 'Audi A6 2022 или Lexus NX300h. Водитель в деловом стиле.',
        12: 'Mercedes E, BMW 5 серии, Lexus NX300h или Audi A6. VIP-водитель в костюме.'
      },
      perks: {
        8: ['Профессиональный водитель (RU/RO/EN)', '8 часов работы', 'Пунктуальность гарантирована', 'Помощь с багажом', 'Платите только за водителя, ваша машина = ваше топливо'],
        10: ['Опытный многоязычный водитель (RU/RO/EN)', '10 часов работы', 'Деловой стиль одежды', 'Гибкий график и приоритетная бронь', 'Тот же водитель включён'],
        12: ['VIP-водитель в костюме', '12 часов или 24/7 по запросу', 'Абсолютная конфиденциальность', 'Консьерж и персональный менеджер', 'Тот же водитель гарантирован']
      },
      route: {
        md: { name: 'Кишинёв и Молдова' },
        tr: { name: 'Приднестровье', line: 'Поездка в Приднестровье', small: 'Тирасполь, Бендеры, Рыбница, весь регион' },
        ro: { name: 'Румыния', line: 'Поездка в Румынию', small: 'Яссы и дальше, нужен паспорт' }
      },
      ourCar: 'Наша машина + водитель', yourCar: 'Водитель на вашей машине', preferred: 'Желаемое авто: ', usually: 'обычно',
      yourFuel: 'Ваша машина, ваше топливо', guideLine: function (h) { return 'Гид, ' + h + ' часов'; },
      guideLangs: 'английский, русский, румынский',
      day: function (n) { return n + ' ' + ruPlural(n, 'день', 'дня', 'дней'); },
      daysSmall: 'Цена одного дня, умноженная на число дней',
      disc: function (p) { return 'Скидка ' + p + '% на пакет водителя'; },
      nothing: function (h) { return 'Один день, ' + h + ' часов, без доплат'; },
      onDriver: function (p) { return ' − ' + p + '% на водителя'; },
      inclOur: 'Включено: машина, топливо, страховка, 200 км в день, Wi-Fi и вода.',
      inclYour: function (h) { return 'Включено: профессиональный водитель на ' + h + ' часов. Топливо ваше.'; },
      extra: function (h, m) { return 'Только если понадобится: час сверх ' + h + ' ч около ' + m + ' MDL, км сверх 200 в день 5 MDL.'; },
      iasi: 'Кишинёв - Яссы и обратно около 260 км, то есть около 60 км сверх лимита, 300 MDL.',
      guideSub: function (h) { return 'На ' + h + ' часов. Английский, русский, румынский. Бронь за 24 часа.'; },
      perHour: function (n) { return '~' + n + ' €/час'; },
      copied: 'Ваш выбор скопирован. Вставьте его в чат Telegram.',
      pickLabel: 'Желаемое авто', more: 'Другие авто по запросу',
      barYour: 'Ваша машина', barGuide: ', гид',
      msg: function (s, name, route, total, date) {
        return 'Здравствуйте, PlusRent! Хочу заказать личного водителя:\n' +
          '- ' + (s.car === 'our' ? 'Ваша машина + водитель (Вариант A), желаемое авто: ' + name : 'Водитель на моей машине (Вариант B)') + '\n' +
          '- Пакет: ' + TIER[s.hours] + ', ' + s.hours + ' часов\n' +
          '- Маршрут: ' + route + '\n' +
          '- Гид: ' + (s.guide ? 'да' : 'нет') + '\n' +
          '- Дней: ' + s.days + (date ? ', с ' + date : '') + '\n' +
          'Цена на сайте: ' + total + '. Свободно?';
      }
    }
  };
  var lang = (document.documentElement.lang || 'en').slice(0, 2);
  var T = I18N[lang] || I18N.en;
  var M = T.models;

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
  // off the live host the /_vercel/image URLs do not exist; on it, any photo
  // that reached the page without a src still gets one
  document.querySelectorAll('img[data-car]').forEach(function (img) {
    if (optimise && img.getAttribute('src')) return;
    img.removeAttribute('srcset');
    img.src = carSrc(img.getAttribute('data-car'), 1080);
  });

  function eur(n) {
    var r = Math.round(n * 100) / 100;
    var d = r % 1 ? 2 : 0;
    return r.toLocaleString(T.locale, { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €';
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
  function modelName(s) { return M[s.model] + (s.hours === 8 && s.model === 'a6' ? ' (' + T.usually + ')' : ''); }

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
    var html = '<span class="sp-carpick-label">' + T.pickLabel + '</span>';
    list.forEach(function (m) {
      html += '<label><input type="radio" name="model" value="' + m + '"' + (m === chosen ? ' checked' : '') + '><span>' +
        M[m] + (hours === 8 && m === 'a6' ? ' <em>' + T.usually + '</em>' : '') + '</span></label>';
    });
    html += '<span class="sp-carpick-more">' + T.more + '</span>';
    el.pick.innerHTML = html;
  }

  var currentImg = 12;
  function showCar(model) {
    var img = MODEL_IMG[model];
    if (!img) { el.plain.hidden = false; el.img.classList.add('is-out'); currentImg = null; return; }
    el.plain.hidden = true;
    if (currentImg === img) { el.img.classList.remove('is-out'); return; }
    currentImg = img;
    var next = new Image();
    next.onload = next.onerror = function () {
      // the photo carries a srcset, which wins over src, so both are swapped
      if (optimise) el.img.srcset = carSrc(img, 640) + ' 640w, ' + carSrc(img, 1080) + ' 1080w';
      else el.img.removeAttribute('srcset');
      el.img.src = next.src;
      el.img.alt = T.alt(M[model]);
      requestAnimationFrame(function () { el.img.classList.remove('is-out'); });
    };
    el.img.classList.add('is-out');
    setTimeout(function () { next.src = carSrc(img, 1080); }, reduceMotion ? 0 : 180);
  }

  function renderStage(s) {
    var your = s.car === 'your';
    el.mode.classList.toggle('is-your', your);
    el.stage.classList.toggle('is-your', your);
    el.driver.hidden = !your;
    el.kicker.textContent = TIER[s.hours] + ', ' + T.hours[s.hours];
    el.stagePrice.textContent = eur(PRICES[s.car][s.hours]);
    if (your) {
      el.perks.innerHTML = T.perks[s.hours].map(function (p) {
        return '<li><svg class="sp-ico" aria-hidden="true"><use href="#i-check"/></svg>' + p + '</li>';
      }).join('');
      return;
    }
    el.name.textContent = M[s.model];
    el.note.textContent = T.note[s.hours];
    showCar(s.model);
  }

  function calc(s) {
    var pkg = PRICES[s.car][s.hours];
    var perDay = pkg;
    var lines = [{
      key: 'pkg',
      label: (s.car === 'our' ? T.ourCar : T.yourCar) + ', ' + TIER[s.hours] + ' ' + s.hours + ' h',
      small: s.car === 'our' ? T.preferred + modelName(s) : T.yourFuel,
      value: eur(pkg)
    }];
    if (s.route !== 'md') {
      perDay += CROSSING;
      lines.push({ key: 'x-' + s.route, cls: 'is-add', label: T.route[s.route].line, small: T.route[s.route].small, value: '+' + eur(CROSSING) });
    }
    if (s.guide) {
      perDay += GUIDE[s.hours];
      lines.push({ key: 'guide', cls: 'is-add', label: T.guideLine(s.hours), small: T.guideLangs, value: '+' + eur(GUIDE[s.hours]) });
    }
    var total = perDay * s.days;
    var pct = discountFor(s.days);
    if (s.days > 1) lines.push({ key: 'days', label: T.day(s.days) + ' × ' + eur(perDay), small: T.daysSmall, value: eur(total) });
    if (pct) {
      var discount = pkg * s.days * pct / 100;
      total -= discount;
      lines.push({ key: 'disc', cls: 'is-minus', label: T.disc(pct), small: s.days + ' × ' + eur(pkg) + ' × ' + pct + '%', value: '−' + eur(discount) });
    }
    return { pkg: pkg, perDay: perDay, total: total, lines: lines, pct: pct };
  }

  function formula(s, r) {
    var parts = [eur(r.pkg)];
    if (s.route !== 'md') parts.push(eur(CROSSING));
    if (s.guide) parts.push(eur(GUIDE[s.hours]));
    if (parts.length === 1 && s.days === 1) return T.nothing(s.hours);
    var f = parts.join(' + ');
    if (s.days > 1) f = (parts.length > 1 ? '(' + f + ')' : f) + ' × ' + s.days;
    if (r.pct) f += T.onDriver(r.pct);
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
    var n = '<p>' + ok + '<span>' + (s.car === 'our' ? T.inclOur : T.inclYour(s.hours)) + '</span></p>';
    n += '<p class="is-extra">' + info + '<span>' + T.extra(s.hours, EXTRA_HOUR_MDL[s.car][s.hours]) + '</span></p>';
    if (s.route === 'ro') n += '<p class="is-extra">' + info + '<span>' + T.iasi + '</span></p>';
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
      el.total.textContent = eur(k < 1 ? Math.round(from + (to - from) * e) : to);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function syncControls(s) {
    form.querySelectorAll('[data-pkg-price]').forEach(function (n) { n.textContent = eur(PRICES[s.car][n.getAttribute('data-pkg-price')]); });
    form.querySelectorAll('[data-pkg-hour]').forEach(function (n) { n.textContent = T.perHour(PER_HOUR[s.car][n.getAttribute('data-pkg-hour')]); });
    form.querySelectorAll('[data-mode]').forEach(function (n) { n.hidden = n.getAttribute('data-mode') !== s.car; });
    el.guidePrice.textContent = '+' + eur(GUIDE[s.hours]);
    el.guideSub.textContent = T.guideSub(s.hours);
    el.days.textContent = T.day(s.days);
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
    lastText = T.msg(s, M[s.model], T.route[s.route].name, eur(r.total), el.date.value);
    var href = 'https://wa.me/37360000500?text=' + encodeURIComponent(lastText);
    el.wa.href = href;
    el.barWa.href = href;
    el.barTotal.textContent = eur(r.total);
    el.barLabel.textContent = (s.car === 'our' ? M[s.model] : T.barYour) + ', ' + s.hours + ' h' +
      (s.route !== 'md' ? ', ' + T.route[s.route].name : '') + (s.guide ? T.barGuide : '') + (s.days > 1 ? ', ' + T.day(s.days) : '');
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
      if (b.hasAttribute('data-pick-guide')) { form.querySelector('input[name="guide"]').checked = true; }
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
      navigator.clipboard.writeText(lastText).then(function () { el.foot.textContent = T.copied; }, function () {});
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
