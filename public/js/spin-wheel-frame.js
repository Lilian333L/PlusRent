/**
 * PlusRent: the wheel inside the wheel modal (spinning-wheel-standalone.html).
 *
 * The prizes come from the API (/api/spinning-wheels/.../secure-data), the
 * winning slice from the server (random-winning-index) and the code from
 * secure/redeem-coupon, exactly as before; this file draws the wheel as SVG,
 * spins it, and shows the prize with its code.
 *
 * Talks to the page around it (js/universal-spinning-wheel.js) by postMessage:
 *   in:  phoneNumberEntered, languageChange
 *   out: autoApplyCoupon, closeSpinningWheel, wheelFrameHeight (so the modal
 *        can size the frame to its content and nothing is cut off)
 */
(function () {
  'use strict';

  if (!window.API_BASE_URL) window.API_BASE_URL = '';

  var SPIN_MS = 5200;

  // Words this design needs that the locale files do not have.
  var UI = {
    ro: { copy: 'Copiază', copied: 'Copiat', discount: 'reducere', free: 'gratuit', codeError: 'Codul nu a putut fi generat. Încearcă din nou mai târziu sau sună-ne.', needPhone: 'Introdu numărul de telefon pentru a învârti roata.' },
    ru: { copy: 'Скопировать', copied: 'Скопировано', discount: 'скидка', free: 'бесплатно', codeError: 'Не получилось выдать код. Попробуйте позже или позвоните нам.', needPhone: 'Чтобы крутить колесо, введите номер телефона.' },
    en: { copy: 'Copy', copied: 'Copied', discount: 'off', free: 'free', codeError: 'The code could not be issued. Please try again later or call us.', needPhone: 'Enter your phone number to spin the wheel.' }
  };

  var FALLBACK = {
    step1: 'Press the button in the center of the wheel',
    congratulations: 'Congratulations!',
    you_won: 'You won',
    use_code: 'Use code:',
    book_now: 'Book now and apply the bonus',
    start: 'START'
  };

  var currentLanguage = 'en';
  var translations = {};

  var availableCoupons = [];
  var cachedWheelSegments = null;
  var userPhoneNumber = null;
  var isSpinning = false;
  var hasSpun = false;
  var codeReady = false;

  var root = document.getElementById('swf');
  var wheel = document.getElementById('wheel');
  var rim = document.getElementById('swfRim');
  var centerButton = document.getElementById('centerButton');
  var hint = document.getElementById('swfHint');
  var resultCard = document.getElementById('resultCard');
  var prizeDisplay = document.getElementById('prizeDisplay');
  var prizeUnit = document.getElementById('prizeUnit');
  var discountCode = document.getElementById('discountCode');
  var copyButton = document.getElementById('copyCode');
  var bookNowButton = document.getElementById('bookNowButton');

  function ui(key) {
    return (UI[currentLanguage] || UI.en)[key];
  }

  function w(key) {
    var wt = translations.wheel || {};
    return wt[key] || FALLBACK[key] || '';
  }

  /* ── language (unchanged sources: the parent's i18next, else the locale file) ── */
  function setLanguage(lang) {
    lang = (typeof lang === 'string' ? lang : 'en').slice(0, 2).toLowerCase();
    currentLanguage = ['en', 'ro', 'ru'].indexOf(lang) >= 0 ? lang : 'en';
    document.documentElement.lang = currentLanguage;
  }

  async function loadLanguage() {
    try {
      var P = window.parent;
      if (P && P !== window && P.i18next && P.i18next.isInitialized && typeof P.i18next.language === 'string') {
        setLanguage(P.i18next.language);
        translations = P.i18next.getResourceBundle(currentLanguage, 'translation') ||
                       P.i18next.getResourceBundle(P.i18next.language, 'translation') || {};
        updateTexts();
        return;
      }
    } catch (e) {}

    var urlLang = new URLSearchParams(window.location.search).get('lang');
    var parentLang = null;
    try {
      if (window.parent && window.parent !== window) parentLang = window.parent.localStorage.getItem('lang');
    } catch (e) {}
    var storedLang = null;
    try { storedLang = localStorage.getItem('lang'); } catch (e) {}
    setLanguage(urlLang || parentLang || storedLang || 'en');

    try {
      var r = await fetch('js/locales/' + currentLanguage + '.json?v=20260930e');
      translations = r.ok ? await r.json() : {};
    } catch (e) {
      translations = {};
    }
    updateTexts();
  }

  function updateTexts() {
    if (!hasSpun) hint.textContent = w('step1');
    document.getElementById('congratulationsText').textContent = w('congratulations');
    document.getElementById('youWonText').textContent = w('you_won');
    document.getElementById('useCodeText').textContent = w('use_code').replace(/:\s*$/, '');
    document.getElementById('bookNowText').textContent = w('book_now');
    copyButton.setAttribute('aria-label', ui('copy'));
    copyButton.title = ui('copy');
    var icon = centerButton.querySelector('.center-icon');
    if (icon) icon.textContent = w('start');
    wheel.setAttribute('aria-label', w('step1'));
    if (availableCoupons.length && !isSpinning && !hasSpun) createWheelSegments();
    reportHeight();
  }

  /* ── data ── */
  function getPhoneNumberFromURL() {
    return new URLSearchParams(window.location.search).get('phone');
  }

  function getWheelIdFromURL() {
    return new URLSearchParams(window.location.search).get('wheel');
  }

  function showLoadingState() {
    wheel.innerHTML = '<div class="swf-loading"><svg class="swf-spinner" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="16" stroke="#f59e0b" stroke-width="4" fill="none" stroke-dasharray="28 100" stroke-linecap="round"/></svg></div>';
    centerButton.disabled = true;
  }

  function hideLoadingState() {
    centerButton.disabled = false;
    root.classList.add('is-ready');
  }

  async function fetchCoupons() {
    try {
      showLoadingState();
      var timeout = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('Request timeout')); }, 10000);
      });
      var wheelId = getWheelIdFromURL();
      var endpoint = wheelId && wheelId !== 'active'
        ? window.API_BASE_URL + '/api/spinning-wheels/' + wheelId + '/secure-data'
        : window.API_BASE_URL + '/api/spinning-wheels/secure/active-data';
      var response = await Promise.race([fetch(endpoint), timeout]);
      if (!response.ok) { availableCoupons = []; cachedWheelSegments = null; hideLoadingState(); return; }
      var data = await response.json();
      if (!data.segments || !data.segments.length) { availableCoupons = []; cachedWheelSegments = null; hideLoadingState(); return; }
      availableCoupons = data.segments.map(function (s) {
        return {
          id: s.coupon_id,
          type: s.type,
          discount_percentage: s.type === 'percentage' ? s.value : null,
          free_days: s.type === 'free_days' ? s.value : null,
          code: s.code
        };
      });
      cachedWheelSegments = null;
      hideLoadingState();
    } catch (e) {
      availableCoupons = [];
      cachedWheelSegments = null;
      hideLoadingState();
    }
  }

  /* ── what a slice says ── */
  function couponValue(c) {
    if (!c) return 0;
    return c.type === 'free_days' ? c.free_days : c.discount_percentage;
  }

  // "2 ДНЯ" -> { value: "2", unit: "ДНЯ" }; "10%" -> { value: "10%", unit: "" }
  function prizeParts(coupon) {
    if (coupon.type === 'free_days') {
      var segs = (translations.wheel && translations.wheel.wheel_segments) || {};
      var d = coupon.free_days;
      var key = d === 1 ? '1_day' : d + '_days';
      var label = segs[key] || (d + ' ' + (currentLanguage === 'ru' ? (d === 1 ? 'день' : d < 5 ? 'дня' : 'дней') : currentLanguage === 'ro' ? (d === 1 ? 'zi' : 'zile') : (d === 1 ? 'day' : 'days')));
      var m = String(label).match(/^(\S+)\s+(.+)$/);
      return m ? { value: m[1], unit: m[2] } : { value: String(label), unit: '' };
    }
    return { value: coupon.discount_percentage + '%', unit: '' };
  }

  // Colour follows the prize: the best one amber, then cream, dark, stone.
  var TIERS = [
    { fill: '#f59e0b', text: '#1c1917', sub: '#78350f' },
    { fill: '#faf7f2', text: '#1c1917', sub: '#78716c' },
    { fill: '#1c1917', text: '#faf7f2', sub: '#a8a29e' },
    { fill: '#44403c', text: '#faf7f2', sub: '#d6d3d1' }
  ];

  function getWheelSegments() {
    if (cachedWheelSegments) return cachedWheelSegments;
    var list = availableCoupons.length ? availableCoupons : [
      { id: null, type: 'percentage', discount_percentage: 5 },
      { id: null, type: 'percentage', discount_percentage: 10 },
      { id: null, type: 'percentage', discount_percentage: 15 },
      { id: null, type: 'percentage', discount_percentage: 20 }
    ];
    var ranked = list.map(couponValue).sort(function (a, b) { return b - a; });
    cachedWheelSegments = list.map(function (coupon, i) {
      var rank = ranked.indexOf(couponValue(coupon));
      var tier = rank === 0 ? TIERS[0] : TIERS[1 + ((rank - 1) % 3)];
      return {
        id: i + 1,
        visualPosition: i,
        parts: prizeParts(coupon),
        tier: tier,
        coupon: availableCoupons.length ? coupon : null
      };
    });
    return cachedWheelSegments;
  }

  /* ── drawing ── */
  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function point(r, deg) {
    var rad = (deg - 90) * Math.PI / 180;
    return [r * Math.cos(rad), r * Math.sin(rad)];
  }

  function drawRim() {
    rim.innerHTML = '';
    rim.appendChild(el('circle', { class: 'rim-ring', cx: 0, cy: 0, r: 99 }));
    for (var i = 0; i < 24; i++) {
      var p = point(95, i * 15 + 7.5);
      rim.appendChild(el('circle', { class: 'bulb', cx: p[0].toFixed(2), cy: p[1].toFixed(2), r: 2.3 }));
    }
  }

  function createWheelSegments() {
    var segments = getWheelSegments();
    var n = segments.length;
    var a = 360 / n;
    var svg = el('svg', { viewBox: '-100 -100 200 200', 'aria-hidden': 'true' });
    var big = n <= 4 ? 30 : n <= 6 ? 25 : n <= 8 ? 20 : 16;

    segments.forEach(function (s) {
      var start = s.visualPosition * a;
      var end = start + a;
      var g = el('g', { class: 'seg', 'data-index': s.id - 1 });
      var p1 = point(100, start), p2 = point(100, end);
      var d = n === 1
        ? 'M0,-100 A100,100 0 1,1 -0.01,-100 Z'
        : 'M0,0 L' + p1[0].toFixed(3) + ',' + p1[1].toFixed(3) +
          ' A100,100 0 ' + (a > 180 ? 1 : 0) + ',1 ' + p2[0].toFixed(3) + ',' + p2[1].toFixed(3) + ' Z';
      g.appendChild(el('path', { d: d, fill: s.tier.fill }));

      // labels stay level: while the wheel turns, each one turns back by the same amount
      var mid = start + a / 2;
      var c = point(62, mid);
      var place = el('g', { transform: 'translate(' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) + ')' });
      var label = el('g', { class: 'seg-label' });
      place.appendChild(label);
      var value = el('text', { class: 'seg-value', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': big, fill: s.tier.text, y: s.parts.unit ? -5 : 0 });
      value.textContent = s.parts.value;
      label.appendChild(value);
      if (s.parts.unit) {
        var unit = el('text', { class: 'seg-unit', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': Math.round(big * 0.36), fill: s.tier.sub, y: big * 0.55 });
        unit.textContent = s.parts.unit;
        label.appendChild(unit);
      }
      g.appendChild(place);
      svg.appendChild(g);
    });

    wheel.innerHTML = '';
    wheel.appendChild(svg);
  }

  /* ── the rim lights while turning ── */
  var chase = null;
  function startChase() {
    var bulbs = rim.querySelectorAll('.bulb');
    var i = 0;
    stopChase();
    chase = setInterval(function () {
      for (var k = 0; k < bulbs.length; k++) bulbs[k].classList.toggle('on', (k + i) % 4 === 0);
      i++;
    }, 90);
  }
  function stopChase() {
    if (chase) clearInterval(chase);
    chase = null;
    rim.querySelectorAll('.bulb.on').forEach(function (b) { b.classList.remove('on'); });
  }

  /* ── server calls (unchanged) ── */
  async function getRandomWinningIndex() {
    try {
      var wheelId = getWheelIdFromURL();
      var endpoint = wheelId && wheelId !== 'active'
        ? window.API_BASE_URL + '/api/spinning-wheels/' + wheelId + '/secure/random-winning-index'
        : window.API_BASE_URL + '/api/spinning-wheels/secure/random-winning-index';
      var r = await fetch(endpoint);
      if (r.ok) return (await r.json()).winningIndex;
      return Math.floor(Math.random() * availableCoupons.length);
    } catch (e) {
      return Math.floor(Math.random() * availableCoupons.length);
    }
  }

  function showCodeError() {
    discountCode.textContent = '· · ·';
    discountCode.classList.remove('is-pending');
    copyButton.disabled = true;
    hint.textContent = ui('codeError');
    hint.classList.add('is-error');
    hint.hidden = false;
    reportHeight();
  }

  async function redeemCouponSecurely(couponId, phoneNumber) {
    try {
      var r = await fetch(window.API_BASE_URL + '/api/spinning-wheels/secure/redeem-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId: couponId, phoneNumber: phoneNumber })
      });
      if (!r.ok) return showCodeError();
      var result = await r.json();
      if (result.success) {
        discountCode.textContent = result.code;
        discountCode.classList.remove('is-pending');
        codeReady = true;
        copyButton.disabled = false;
        try {
          localStorage.setItem('spinningWheelWinningCoupon', result.code);
          localStorage.setItem('spinningWheelRewardReceived', 'true');
        } catch (e) {}
      } else {
        showCodeError();
      }
    } catch (e) {
      showCodeError();
    }
  }

  /* ── spin ── */
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async function spinWheel() {
    if (isSpinning || hasSpun) return;

    if (!userPhoneNumber) {
      var entered = null, stored = null;
      try {
        entered = localStorage.getItem('spinningWheelPhoneEntered');
        stored = localStorage.getItem('spinningWheelPhone');
      } catch (e) {}
      if (entered === 'true' && stored) {
        userPhoneNumber = stored;
      } else {
        hint.textContent = ui('needPhone');
        hint.classList.add('is-error');
        return;
      }
    }

    isSpinning = true;
    centerButton.disabled = true;
    root.classList.remove('is-ready');
    centerButton.innerHTML = '<svg class="swf-spinner" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15" stroke="#1c1917" stroke-width="5" fill="none" stroke-dasharray="26 100" stroke-linecap="round"/></svg>';

    var winningIndex = await getRandomWinningIndex();
    var segments = getWheelSegments();
    var n = segments.length;
    var a = 360 / n;
    var target = segments[winningIndex % n];
    var adjusted = (n - 1 - target.visualPosition) % n;
    // land somewhere inside the slice, not always on its middle line
    var jitter = (Math.random() - 0.5) * a * 0.6;
    var total = 6 * 360 + adjusted * a + a / 2 + jitter;
    var ms = reducedMotion() ? 900 : SPIN_MS;

    root.classList.add('is-spinning');
    if (!reducedMotion()) startChase();
    wheel.style.transition = 'transform ' + ms + 'ms cubic-bezier(0.12, 0.72, 0.08, 1)';
    wheel.style.transform = 'rotate(' + total + 'deg)';
    wheel.querySelectorAll('.seg-label').forEach(function (l) {
      l.style.transition = wheel.style.transition;
      l.style.transform = 'rotate(' + (-total) + 'deg)';
    });

    setTimeout(function () { finishSpin(target); }, ms + 60);
  }

  function finishSpin(winner) {
    isSpinning = false;
    hasSpun = true;
    stopChase();
    root.classList.remove('is-spinning');
    root.classList.add('is-won', 'has-result');
    var seg = wheel.querySelector('.seg[data-index="' + (winner.id - 1) + '"]');
    if (seg) seg.classList.add('is-winner');
    centerButton.innerHTML = '<svg viewBox="0 0 24 24" width="40%" height="40%" fill="none" stroke="#1c1917" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

    var parts = winner.coupon ? prizeParts(winner.coupon) : winner.parts;
    prizeDisplay.textContent = parts.value;
    prizeUnit.textContent = winner.coupon && winner.coupon.type === 'free_days'
      ? (parts.unit ? parts.unit.toLowerCase() + ' ' + ui('free') : ui('free'))
      : ui('discount');

    hint.hidden = true;
    resultCard.classList.add('show');
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }

    if (winner.coupon) {
      redeemCouponSecurely(winner.coupon.id, userPhoneNumber);
    } else {
      showCodeError();
    }
    setTimeout(reportHeight, 50);
    setTimeout(reportHeight, 700);
    bookNowButton.focus({ preventScroll: true });
  }

  /* ── result actions ── */
  copyButton.addEventListener('click', function () {
    if (!codeReady) return;
    var code = discountCode.textContent.trim();
    var label = document.getElementById('useCodeText');
    var done = function () {
      copyButton.classList.add('is-done');
      label.textContent = ui('copied');
      label.classList.add('is-done');
      setTimeout(function () {
        copyButton.classList.remove('is-done');
        label.classList.remove('is-done');
        label.textContent = w('use_code').replace(/:\s*$/, '');
      }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var range = document.createRange();
      range.selectNodeContents(discountCode);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try { document.execCommand('copy'); done(); } catch (e) {}
    }
  });

  bookNowButton.addEventListener('click', function () {
    var code = discountCode.textContent.trim();
    var inFrame = window.parent && window.parent !== window;
    if (codeReady && code && inFrame) {
      window.parent.postMessage({ type: 'autoApplyCoupon', couponCode: code }, '*');
    }
    if (inFrame) window.parent.postMessage({ type: 'closeSpinningWheel' }, '*');
    else window.close();
  });

  centerButton.addEventListener('click', spinWheel);

  /* ── tell the modal how tall the content is ── */
  var lastHeight = 0;
  function reportHeight() {
    if (!(window.parent && window.parent !== window)) return;
    var h = Math.ceil(root.getBoundingClientRect().height);
    if (h && h !== lastHeight) {
      lastHeight = h;
      window.parent.postMessage({ type: 'wheelFrameHeight', height: h }, '*');
    }
  }
  if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(root);
  window.addEventListener('resize', reportHeight);

  /* ── start ── */
  drawRim();
  loadLanguage().then(async function () {
    userPhoneNumber = getPhoneNumberFromURL();
    if (!userPhoneNumber) {
      try {
        if (localStorage.getItem('spinningWheelPhoneEntered') === 'true' && localStorage.getItem('spinningWheelPhone')) {
          userPhoneNumber = localStorage.getItem('spinningWheelPhone');
        }
      } catch (e) {}
    }
    await fetchCoupons();
    createWheelSegments();
    var icon = document.createElement('span');
    icon.className = 'center-icon';
    icon.textContent = w('start');
    centerButton.innerHTML = '';
    centerButton.appendChild(icon);
    reportHeight();
  });

  window.addEventListener('message', function (event) {
    var d = event.data;
    if (!d) return;
    if (d.type === 'languageChange') {
      setLanguage(d.language);
      loadLanguage();
    }
    if (d.type === 'phoneNumberEntered') {
      userPhoneNumber = d.phoneNumber;
      hint.classList.remove('is-error');
      if (!hasSpun) hint.textContent = w('step1');
      try {
        localStorage.setItem('spinningWheelPhone', userPhoneNumber);
        localStorage.setItem('spinningWheelPhoneEntered', 'true');
      } catch (e) {}
    }
  });

  window.addEventListener('storage', function (event) {
    if (event.key === 'lang' && !isSpinning) loadLanguage();
  });
})();
