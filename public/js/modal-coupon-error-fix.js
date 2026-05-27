/*
 * modal-coupon-error-fix.js
 * ----------------------------------------------------------------------------
 * Fix: when a coupon validation error fires inside the price-calculator modal,
 * the toast (#toast-container at body level) is visually hidden BEHIND the
 * modal's content area on most viewports — user sees nothing until modal
 * closes. The modal already has an empty <div id="coupon-error-message"> in
 * the DOM (under #modal-discount-code) for exactly this purpose. We populate
 * it whenever showError() fires while the modal is open.
 *
 * Patch approach:
 *   1) Wrap window.showError → if modal is open, also render inline error
 *   2) Auto-hide inline error when:
 *      - input is cleared
 *      - input becomes is-valid (coupon accepted)
 *      - modal is closed
 *
 * Loaded AFTER validation-booking.js so window.showError is already defined.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  function isModalOpen() {
    const modal = document.querySelector('.price-calculator-modal');
    if (!modal) return false;
    const cs = window.getComputedStyle(modal);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
  }

  function showInlineError(message) {
    const box = document.getElementById('coupon-error-message');
    if (!box || !message) return;

    box.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>' +
      '<line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
      '<span style="flex:1;">' + escapeHtml(message) + '</span>';

    // Inline styles (override base .field-error and ensure visibility inside modal)
    Object.assign(box.style, {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '10px 12px',
      marginTop: '8px',
      borderRadius: '8px',
      background: 'rgba(239, 68, 68, 0.08)',
      border: '1px solid rgba(239, 68, 68, 0.28)',
      color: '#b91c1c',
      fontSize: '13px',
      fontWeight: '500',
      lineHeight: '1.4',
      animation: 'pr-coupon-err-in 220ms ease',
    });
  }

  function hideInlineError() {
    const box = document.getElementById('coupon-error-message');
    if (!box) return;
    box.innerHTML = '';
    box.style.display = 'none';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function init() {
    // Inject keyframe animation once
    if (!document.getElementById('pr-coupon-err-style')) {
      const s = document.createElement('style');
      s.id = 'pr-coupon-err-style';
      s.textContent =
        '@keyframes pr-coupon-err-in {' +
        '  from { opacity: 0; transform: translateY(-4px); }' +
        '  to   { opacity: 1; transform: translateY(0); }' +
        '}';
      document.head.appendChild(s);
    }

    // (1) Wrap window.showError to also render inline if modal is open.
    //     Toast still fires (we don't break existing flow), but the user
    //     now also sees the error INSIDE the modal where they're looking.
    if (typeof window.showError === 'function' && !window.showError.__prModalPatched) {
      const original = window.showError;
      window.showError = function (message) {
        try {
          if (isModalOpen() && document.getElementById('modal-discount-code')) {
            showInlineError(message);
          }
        } catch (e) { /* never block original */ }
        return original.apply(this, arguments);
      };
      window.showError.__prModalPatched = true;
    }

    // (2) Auto-hide inline error on relevant input state changes
    const input = document.getElementById('modal-discount-code');
    if (input) {
      input.addEventListener('input', function () {
        if (this.value.trim() === '') {
          hideInlineError();
          this.classList.remove('is-valid', 'is-invalid');
        }
      });

      // Observe class changes — clear error when input becomes valid
      const obs = new MutationObserver(function (mutations) {
        for (const m of mutations) {
          if (m.attributeName === 'class' && input.classList.contains('is-valid')) {
            hideInlineError();
            return;
          }
        }
      });
      obs.observe(input, { attributes: true, attributeFilter: ['class'] });
    }

    // (3) Clear when modal closes (button or click outside)
    document.addEventListener('click', function (e) {
      if (!e.target) return;
      const closer = e.target.closest && e.target.closest('.close-modal, .btn-close-calc');
      if (closer) hideInlineError();
    }, true);

    // Also wrap closePriceCalculator if available (most robust)
    if (typeof window.closePriceCalculator === 'function' && !window.closePriceCalculator.__prModalPatched) {
      const origClose = window.closePriceCalculator;
      window.closePriceCalculator = function () {
        hideInlineError();
        return origClose.apply(this, arguments);
      };
      window.closePriceCalculator.__prModalPatched = true;
    }
  }

  // Run after validation-booking.js has set up window.showError
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Defer slightly so validation-booking.js init also completes
      setTimeout(init, 50);
    });
  } else {
    setTimeout(init, 50);
  }
})();
