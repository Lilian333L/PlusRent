/*
 * modal-coupon-error-fix.js  (v2 — MutationObserver approach)
 * ----------------------------------------------------------------------------
 * Fix: coupon validation errors shown in toast (#toast-container at body level)
 * are visually hidden behind the price-calculator modal's backdrop. The modal
 * already has an empty <div id="coupon-error-message"> for inline errors but
 * it's unused.
 *
 * v1 of this patch wrapped window.showError — that DID NOT WORK because
 * validation-booking.js calls the file-local `showError(...)` function directly
 * (line 1097: `showError(i18next.t(msgKey))`), bypassing window.showError.
 *
 * v2 approach: MutationObserver on #toast-container. When a new
 * .toast-notification.error is added AND the modal is open → copy its text
 * into #coupon-error-message. Works regardless of who created the toast.
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

  function extractToastMessage(toastNode) {
    // Toast structure (from validation-booking.js:3274-3281):
    //   <div class="toast-notification error">
    //     <div class="toast-icon">✕</div>
    //     <div class="toast-content">
    //       <div class="toast-title">Error</div>
    //       <div class="toast-message">{actual text}</div>
    //     </div>
    //     <button class="toast-close">×</button>
    //   </div>
    const msgEl = toastNode.querySelector && toastNode.querySelector('.toast-message');
    if (msgEl) return msgEl.textContent.trim();
    // Fallback: take all text minus the close button "×"
    return (toastNode.textContent || '').replace(/×/g, '').trim();
  }

  function init() {
    // Inject fade-in keyframe once
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

    // (1) Primary mechanism — MutationObserver on toast container
    // When a new error toast appears AND the modal is open → mirror inline.
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer && !toastContainer.__prCouponPatched) {
      const obs = new MutationObserver(function (mutations) {
        if (!isModalOpen()) return;
        for (const m of mutations) {
          if (m.type !== 'childList') continue;
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue; // ELEMENT_NODE
            if (!node.classList) continue;
            if (!node.classList.contains('toast-notification')) continue;
            // Only mirror errors (not success/info/warning)
            if (!node.classList.contains('error')) continue;
            const msg = extractToastMessage(node);
            if (msg) showInlineError(msg);
          }
        }
      });
      obs.observe(toastContainer, { childList: true });
      toastContainer.__prCouponPatched = true;
    }

    // (2) Auto-hide inline error on relevant state changes
    const input = document.getElementById('modal-discount-code');
    if (input && !input.__prCouponPatched) {
      input.addEventListener('input', function () {
        if (this.value.trim() === '') {
          hideInlineError();
          this.classList.remove('is-valid', 'is-invalid');
        }
      });
      const inputObs = new MutationObserver(function (mutations) {
        for (const m of mutations) {
          if (m.attributeName === 'class' && input.classList.contains('is-valid')) {
            hideInlineError();
            return;
          }
        }
      });
      inputObs.observe(input, { attributes: true, attributeFilter: ['class'] });
      input.__prCouponPatched = true;
    }

    // (3) Clear when modal closes (button or close-handler)
    document.addEventListener('click', function (e) {
      if (!e.target) return;
      const closer = e.target.closest && e.target.closest('.close-modal, .btn-close-calc');
      if (closer) hideInlineError();
    }, true);

    if (typeof window.closePriceCalculator === 'function' && !window.closePriceCalculator.__prCouponPatched) {
      const origClose = window.closePriceCalculator;
      window.closePriceCalculator = function () {
        hideInlineError();
        return origClose.apply(this, arguments);
      };
      window.closePriceCalculator.__prCouponPatched = true;
    }
  }

  // The toast-container and modal might not exist at DOMContentLoaded
  // (if they are injected later). Be defensive — try once at ready, then once
  // 200ms later as a safety net.
  function tryInit() {
    init();
    // Re-try once more in case toast-container was injected late
    setTimeout(init, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
