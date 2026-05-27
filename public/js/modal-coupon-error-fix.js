/*
 * modal-coupon-error-fix.js  (v3 — direct API call, bulletproof)
 * ----------------------------------------------------------------------------
 * Renders coupon validation errors INSIDE the price-calculator modal,
 * directly under the discount code input.
 *
 * History:
 *   v1: wrapped window.showError → didn't work (validation-booking.js calls
 *       file-local showError, bypassing the wrap).
 *   v2: MutationObserver on #toast-container → also didn't fire reliably for
 *       reasons specific to the production environment.
 *   v3 (this): bypass everything. Attach own blur handler on
 *       #modal-discount-code, call the coupon API directly, render result
 *       into #coupon-error-message with !important inline styles.
 *       Independent of any other validation flow. Bulletproof.
 *
 * Required DOM:
 *   - #modal-discount-code   (input where user enters coupon)
 *   - #coupon-error-message  (empty div under the input — already in HTML)
 *   - #phone                 (main form phone input — read for API call)
 *
 * API endpoint:
 *   GET /api/coupons/lookup/{code}?phone={encodedPhone}
 *   Response: { valid: bool, message: string }   (message is an i18n key)
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const LOG = '[PR-COUPON-FIX]';
  function log() {
    // Uncomment next line to enable debug logging in production console
    // console.log.apply(console, [LOG].concat([].slice.call(arguments)));
  }

  function getApiBase() {
    return (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL) || '';
  }

  function translateApiMessage(msg) {
    if (!msg) return '';
    if (typeof window.i18next === 'undefined' || !window.i18next.t) return msg;
    // Translation key pattern: word.word(.word)+
    if (/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(msg)) {
      const t = window.i18next.t(msg);
      if (t && t !== msg) return t;
    }
    return msg;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showInlineError(message) {
    const box = document.getElementById('coupon-error-message');
    if (!box) { log('no #coupon-error-message in DOM'); return; }
    if (!message) return;

    box.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>' +
      '<line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
      '<span style="flex:1;">' + escapeHtml(message) + '</span>';

    // setProperty with 'important' to beat any CSS, including the
    // `.field-error { display: none }` rule baked into the class.
    box.style.setProperty('display', 'flex', 'important');
    box.style.setProperty('align-items', 'flex-start', 'important');
    box.style.setProperty('gap', '8px', 'important');
    box.style.setProperty('padding', '10px 12px', 'important');
    box.style.setProperty('margin-top', '8px', 'important');
    box.style.setProperty('border-radius', '8px', 'important');
    box.style.setProperty('background', 'rgba(239, 68, 68, 0.08)', 'important');
    box.style.setProperty('border', '1px solid rgba(239, 68, 68, 0.28)', 'important');
    box.style.setProperty('color', '#b91c1c', 'important');
    box.style.setProperty('background-image', 'none', 'important');  // override .field-error gradient
    box.style.setProperty('font-size', '13px', 'important');
    box.style.setProperty('font-weight', '500', 'important');
    box.style.setProperty('line-height', '1.4', 'important');
    box.style.setProperty('box-shadow', 'none', 'important');

    log('inline error shown:', message);
  }

  function hideInlineError() {
    const box = document.getElementById('coupon-error-message');
    if (!box) return;
    box.innerHTML = '';
    box.style.setProperty('display', 'none', 'important');
    log('inline error hidden');
  }

  // Our independent coupon validator — runs in parallel to existing one.
  // Does not interfere with anything else; just shows result inline.
  let currentAbort = null;
  async function validateAndShowInline(code, phone) {
    log('validateAndShowInline:', { code, phone });
    if (!code || code.length < 3) { hideInlineError(); return; }

    if (currentAbort) currentAbort.abort();
    currentAbort = new AbortController();

    const url = getApiBase() + '/api/coupons/lookup/' +
                encodeURIComponent(code) +
                (phone ? '?phone=' + encodeURIComponent(phone) : '');

    log('fetching:', url);
    try {
      const resp = await fetch(url, { signal: currentAbort.signal });
      const data = await resp.json();
      log('response:', data);

      if (data && data.valid) {
        hideInlineError();
      } else {
        // Translate i18n message key (e.g. "coupons.invalid_code",
        // "coupons.phone_not_authorized", "coupons.expired", etc.)
        const raw = (data && (data.message || data.error)) || 'coupons.invalid_code';
        let msg = translateApiMessage(raw);
        if (!msg || msg === raw) {
          // Final fallback if i18next can't translate
          msg = (window.i18next && window.i18next.t)
            ? window.i18next.t('coupons.invalid_code', { defaultValue: 'Промокод недействителен' })
            : 'Промокод недействителен';
        }
        showInlineError(msg);
      }
    } catch (err) {
      if (err.name === 'AbortError') { log('aborted'); return; }
      log('fetch failed:', err);
      const msg = (window.i18next && window.i18next.t)
        ? window.i18next.t('errors.error_validating_coupon', { defaultValue: 'Ошибка проверки промокода' })
        : 'Ошибка проверки промокода';
      showInlineError(msg);
    } finally {
      currentAbort = null;
    }
  }

  function init() {
    log('init() running, readyState=', document.readyState);

    const input = document.getElementById('modal-discount-code');
    if (!input) { log('no #modal-discount-code yet, retrying...'); return false; }
    if (input.__prDirectFix) { log('already initialized'); return true; }
    input.__prDirectFix = true;

    log('attaching blur/input handlers to #modal-discount-code');

    // Blur → validate via direct API call
    input.addEventListener('blur', function () {
      const code = (input.value || '').trim();
      const phoneEl = document.getElementById('phone') ||
                      document.querySelector('input[name="phone"]') ||
                      document.querySelector('input[name="customer_phone"]');
      const phone = phoneEl ? (phoneEl.value || '').trim() : '';
      // Small delay so any existing handler that may briefly clear classes runs first
      setTimeout(function () { validateAndShowInline(code, phone); }, 20);
    });

    // Clear inline error as user starts typing (gives fresh state)
    input.addEventListener('input', function () {
      const code = (input.value || '').trim();
      if (code.length === 0) hideInlineError();
    });

    // Hide error when modal closes (multiple paths)
    document.addEventListener('click', function (e) {
      if (!e.target) return;
      const closer = e.target.closest && e.target.closest('.close-modal, .btn-close-calc, .btn-close');
      if (closer) hideInlineError();
    }, true);

    if (typeof window.closePriceCalculator === 'function' && !window.closePriceCalculator.__prDirectFix) {
      const orig = window.closePriceCalculator;
      window.closePriceCalculator = function () {
        hideInlineError();
        return orig.apply(this, arguments);
      };
      window.closePriceCalculator.__prDirectFix = true;
    }

    return true;
  }

  // Retry init until input appears (modal HTML might be injected late on some flows)
  function tryInit(attemptsLeft) {
    if (init()) return;
    if (attemptsLeft <= 0) { log('giving up after retries'); return; }
    setTimeout(function () { tryInit(attemptsLeft - 1); }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tryInit(15); });
  } else {
    tryInit(15);
  }
})();
