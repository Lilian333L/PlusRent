/*
 * phone-coupon-revalidate.js
 * ----------------------------------------------------------------------------
 * Single-purpose fix: when the user changes the phone number AFTER a coupon
 * has already been validated, re-trigger the coupon validation so a
 * phone-restricted coupon doesn't stay falsely valid.
 *
 * Original behavior (kept intact — we don't touch it):
 *   - If user enters phone FIRST then coupon → coupon is validated with phone
 *     and correctly fails when phone isn't authorized.
 *   - If user enters coupon FIRST then phone → coupon was validated with empty
 *     phone, server returned valid:true (code exists), discount applied. Now
 *     phone changes but coupon stays "valid". BUG.
 *
 * This script does ONE thing:
 *   Watch the phone input. When it changes (debounced) AND a coupon code is
 *   currently in the discount field, dispatch a 'blur' event on the discount
 *   field. The existing inline validator in car-single.html re-fetches with
 *   the new phone and updates UI state correctly.
 *
 * No design changes, no API duplication, no new UI. Purely additive.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  function init() {
    const phoneInput = document.getElementById('phone');
    const discountInput = document.querySelector('input[name="discount_code"]');
    if (!phoneInput || !discountInput) return false;
    if (phoneInput.__prPhoneCouponRevalidate) return true;
    phoneInput.__prPhoneCouponRevalidate = true;

    let lastSeenPhone = (phoneInput.value || '').trim();
    let timer = null;

    function maybeRevalidate() {
      const currentPhone = (phoneInput.value || '').trim();
      if (currentPhone === lastSeenPhone) return;
      lastSeenPhone = currentPhone;

      const code = (discountInput.value || '').trim();
      if (code.length < 3) return;

      // Re-fire the existing inline blur validator with the new phone in scope.
      discountInput.dispatchEvent(new Event('blur'));
    }

    phoneInput.addEventListener('input', function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(maybeRevalidate, 500);
    });
    phoneInput.addEventListener('change', maybeRevalidate);
    phoneInput.addEventListener('blur', maybeRevalidate);

    return true;
  }

  // Retry until inputs exist (phone field is in main form, present at load;
  // retries are insurance against odd ordering).
  function tryInit(attempts) {
    if (init()) return;
    if (attempts <= 0) return;
    setTimeout(function () { tryInit(attempts - 1); }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tryInit(15); });
  } else {
    tryInit(15);
  }
})();
