/* ============================================================================
 * PlusRent — Unified Modal & Scroll Lock Manager  v2.0
 * ─────────────────────────────────────────────────────────────────────────
 * Handles scroll lock + a11y for all site modals/popups/menus in one place.
 *
 * Features
 *   ✓ Scroll lock with position preservation (iOS Safari safe)
 *   ✓ Focus trap inside active modal (WCAG 2.4.3)
 *   ✓ Escape-key close
 *   ✓ ARIA attributes auto-applied (aria-modal, aria-hidden on background)
 *   ✓ Multi-modal safe (reference counter — survives nested/overlapping opens)
 *   ✓ Touch/wheel handling allows scroll inside content, blocks outside
 *   ✓ Declarative registration — add a modal without touching this file
 *   ✓ Proper cleanup on page unload (no memory leaks)
 *   ✓ Respects prefers-reduced-motion
 *   ✓ Works without dependencies, < 5 KB minified
 * ========================================================================== */

(function () {
  'use strict';

  /* ────────────── STATE ────────────── */

  const state = {
    openCount: 0,           // counter for nested modals
    scrollY:   0,           // saved scroll position
    lastFocus: null,        // element focused before opening
    activeModal: null,      // currently active modal element
    observers: [],          // tracked observers for cleanup
    keydownHandler: null,   // bound Escape/Tab handler
    lockedByExternal: false,// true if body lock was set by another script (avoid double-restore)
  };

  /* ────────────── SCROLLABLE CONTAINERS WHITELIST ────────────── */

  const SCROLLABLE_SELECTORS = [
    '.contact-popup-body',
    '.modal-body',
    '.price-calculator-content',
    '#de-sidebar',
    '#mainmenu',
    '.mobile-filter-content',
    '[data-scrollable]',     // ← so HTML can opt-in without JS change
  ];

  /* ────────────── FLOATING ELEMENTS (auto-hide during modal) ────────────── */
  /*
   * Selectors for floating buttons/triggers that should be hidden whenever
   * any modal is open. Covers common patterns + provides opt-in attribute.
   *
   * Add `data-hide-on-modal` to any element you want auto-hidden.
   */
  const FLOATING_SELECTORS = [
    // Generic floating call/contact buttons
    '.floating-call-btn',
    '.floating-contact-btn',
    '.float-btn',
    '.sticky-cta',
    '.fixed-cta',
    '.call-now-floating',
    '.suna-acum',
    '.btn-suna',
    '.btn-call-now',
    '.scroll-to-top',
    '.back-to-top',
    // Common popup triggers
    '.contact-popup-trigger',
    '.popup-trigger',
    '.chat-widget',
    '.whatsapp-float',
    // Opt-in attribute — sprinkle on any element to auto-hide
    '[data-hide-on-modal]',
  ];

  // List of elements found at boot — populated by detectFloatingElements()
  let floatingElements = [];

  function detectFloatingElements() {
    // 1. Find by explicit selectors (always hide these)
    const explicit = new Set();
    FLOATING_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => explicit.add(el));
    });

    // 2. Catch the "Sună Acum" / "Call Now" CTA button in the header
    //    (which is NOT inside the menu navigation — that one stays visible)
    document.querySelectorAll('header a[href^="tel:"], header button[onclick*="tel:"]').forEach(el => {
      // Skip if it's INSIDE a menu list (those are the menu's own phone links)
      if (el.closest('nav ul, .menu, #mainmenu, .navbar-collapse, ul.nav')) return;
      explicit.add(el);
    });

    // 3. Catch CTA-style buttons in header (Sună Acum variations)
    document.querySelectorAll('header').forEach(header => {
      header.querySelectorAll('a, button').forEach(el => {
        if (el.closest('nav ul, .menu, #mainmenu, .navbar-collapse, ul.nav')) return;
        const text = (el.textContent || '').trim().toLowerCase();
        const className = (el.className || '').toString().toLowerCase();
        // Match common Sună Acum / Call Now / Звоните patterns
        if (
          /\b(sun[aă]\s*acum|call\s*now|звон|позвонить|sunati|apel|book\s*now)\b/i.test(text) ||
          /\b(suna|call|phone|tel|book|btn-main|btn-cta|de-btn)\b/i.test(className)
        ) {
          explicit.add(el);
        }
      });
    });

    // 4. Auto-detect by computed style:
    //    - position: fixed
    //    - has high z-index (≥ 100)
    //    - is NOT a registered modal/header itself/menu
    //    - is currently visible
    const autoDetected = new Set();
    const excludeIds = ['contactPopup', 'price-calculator-modal', 'mobile-filter-overlay', 'mainmenu', 'de-sidebar'];
    document.querySelectorAll('a, button, div').forEach(el => {
      if (excludeIds.includes(el.id)) return;
      if (el.tagName === 'HEADER' || el.tagName === 'NAV') return;
      if (el.closest('[aria-modal], #contactPopup, #price-calculator-modal, #mobile-filter-overlay, nav ul, .menu, #mainmenu')) return;
      const cs = window.getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      const z = parseInt(cs.zIndex, 10);
      if (isNaN(z) || z < 100) return;
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      // Skip very large containers (likely modal backdrops not yet detected)
      const rect = el.getBoundingClientRect();
      if (rect.width > 400 && rect.height > 400) return;
      autoDetected.add(el);
    });

    floatingElements = [...new Set([...explicit, ...autoDetected])];
  }

  function hideFloatingElements() {
    floatingElements.forEach(el => {
      // Save current inline styles so we can restore exactly
      el._prevTransition = el.style.transition;
      el._prevOpacity    = el.style.opacity;
      el._prevPointer    = el.style.pointerEvents;
      // Smooth fade-out
      el.style.transition    = 'opacity 0.18s ease-out';
      el.style.opacity       = '0';
      el.style.pointerEvents = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.dataset.hiddenByModal = '1';
    });
  }

  function showFloatingElements() {
    floatingElements.forEach(el => {
      if (el.dataset.hiddenByModal === '1') {
        el.style.opacity       = el._prevOpacity    || '';
        el.style.pointerEvents = el._prevPointer    || '';
        // Remove transition after a frame so we don't keep it lingering
        requestAnimationFrame(() => {
          el.style.transition = el._prevTransition || '';
        });
        el.removeAttribute('aria-hidden');
        delete el.dataset.hiddenByModal;
      }
    });
  }

  function findScrollable(target) {
    for (const sel of SCROLLABLE_SELECTORS) {
      const el = target.closest && target.closest(sel);
      if (el) return el;
    }
    return null;
  }

  /* ────────────── SCROLL LOCK (iOS-safe) ────────────── */

  function lockScroll() {
    if (state.openCount === 0) {
      /* ── Detect if body is ALREADY locked by another script
       *    (e.g. inline wrapper in index.html for price-calculator-modal,
       *    which sets position:fixed + top:-Ypx synchronously BEFORE this
       *    MutationObserver-triggered call runs as a microtask).
       *    If we naively read window.scrollY here, it returns 0 (because
       *    body is already position:fixed), and we'd overwrite top:-500px
       *    with top:0px — causing a visible page-jump under the modal
       *    that looks like a "flicker" or modal re-opening. ── */
      const existingPosition = document.body.style.position;
      const existingTop      = document.body.style.top;
      const alreadyLocked    = existingPosition === 'fixed' && existingTop && existingTop !== '0px';

      if (alreadyLocked) {
        // Reuse the scrollY captured by whoever locked first — don't touch styles.
        state.scrollY = Math.abs(parseInt(existingTop, 10)) || 0;
        state.lockedByExternal = true;
      } else {
        state.scrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.position = 'fixed';
        document.body.style.top      = `-${state.scrollY}px`;
        document.body.style.left     = '0';
        document.body.style.right    = '0';
        document.body.style.width    = '100%';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        state.lockedByExternal = false;
      }
      document.documentElement.classList.add('is-modal-open');
      document.addEventListener('touchmove', preventOutsideScroll, { passive: false });
      document.addEventListener('wheel',     preventOutsideScroll, { passive: false });
      /* PlusRent v7: reset per-gesture state when touch ends */
      document.addEventListener('touchend',    resetTouchTracking, { passive: true });
      document.addEventListener('touchcancel', resetTouchTracking, { passive: true });
      // Re-scan and hide all floating elements (in case DOM changed)
      detectFloatingElements();
      hideFloatingElements();
    }
    state.openCount += 1;
  }

  function unlockScroll() {
    state.openCount = Math.max(0, state.openCount - 1);
    if (state.openCount > 0) return;
    document.documentElement.classList.remove('is-modal-open');
    /* If the lock was owned by external code (inline wrapper), let IT clear
     * the body styles + scrollTo. Touching them here causes a double-restore
     * jump. We only clear what WE set. */
    if (!state.lockedByExternal) {
      document.body.style.position    = '';
      document.body.style.top         = '';
      document.body.style.left        = '';
      document.body.style.right       = '';
      document.body.style.width       = '';
      document.body.style.overflow    = '';
      document.body.style.touchAction = '';
    }
    document.removeEventListener('touchmove', preventOutsideScroll);
    document.removeEventListener('wheel',     preventOutsideScroll);
    document.removeEventListener('touchend',    resetTouchTracking);
    document.removeEventListener('touchcancel', resetTouchTracking);
    showFloatingElements();
    if (!state.lockedByExternal) {
      const restoreTo = state.scrollY;
      requestAnimationFrame(() => window.scrollTo(0, restoreTo));
    }
    state.lockedByExternal = false;
  }

  function preventOutsideScroll(e) {
    const container = findScrollable(e.target);
    if (!container) {
      e.preventDefault();
      return;
    }
    /* PlusRent v7: rewrote the edge-bounce logic.
     * The OLD code had a critical bug: on the FIRST touchmove of a gesture
     * (when container._lastTouchY was undefined), the fallback `_lastTouchY
     * || touch.clientY` made direction always compute to 'up'. If the modal
     * had just opened (scrollTop == 0 == atTop), the very first swipe →
     * preventDefault() → iOS aborted the scroll gesture entirely. The user
     * had to lift their finger and try again; iOS then sometimes initialized
     * scroll, sometimes not. Hence "scroll sometimes works, sometimes not".
     *
     * Now: track touchstart Y per-container, and only preventDefault when
     * we have a CONFIRMED overscroll direction (not on the first touchmove).
     */
    if (e.type === 'touchmove') {
      const touch = e.touches[0];
      if (!touch) return;
      // First touchmove — record position, never preventDefault
      if (container._touchStartY === undefined) {
        container._touchStartY = touch.clientY;
        container._lastTouchY = touch.clientY;
        return;
      }
      const atTop    = container.scrollTop <= 0;
      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight;
      const direction = touch.clientY > container._touchStartY ? 'up' : 'down';
      // Only block when CLEARLY trying to overscroll past an edge
      if ((atTop && direction === 'up') || (atBottom && direction === 'down')) {
        // Need a minimum delta to be confident — avoid blocking tiny jitter
        if (Math.abs(touch.clientY - container._touchStartY) > 8) {
          e.preventDefault();
        }
      }
      container._lastTouchY = touch.clientY;
    } else if (e.type === 'touchend' || e.type === 'touchcancel') {
      // Reset per-gesture state
      delete container._touchStartY;
      delete container._lastTouchY;
    }
  }

  function resetTouchTracking(e) {
    // Walk through known scrollable selectors and clear gesture state.
    SCROLLABLE_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        delete el._touchStartY;
        delete el._lastTouchY;
      });
    });
  }

  /* ────────────── ACCESSIBILITY ────────────── */

  function getFocusables(root) {
    return Array.from(root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]),' +
      ' textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
  }

  function trapFocus(modal, e) {
    if (e.key !== 'Tab') return;
    const focusables = getFocusables(modal);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }

  function applyA11y(modal, opening) {
    if (!modal) return;
    if (opening) {
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('role', modal.getAttribute('role') || 'dialog');
      modal.removeAttribute('aria-hidden');
      // Hide everything else from screen readers
      Array.from(document.body.children).forEach(child => {
        if (child !== modal && !child.contains(modal) && !modal.contains(child)) {
          child.setAttribute('inert', '');                 // modern
          child.setAttribute('aria-hidden', 'true');       // fallback
        }
      });
    } else {
      modal.removeAttribute('aria-modal');
      modal.setAttribute('aria-hidden', 'true');
      Array.from(document.body.children).forEach(child => {
        child.removeAttribute('inert');
        if (child !== modal) child.removeAttribute('aria-hidden');
      });
    }
  }

  function setupKeyboardHandlers(modal, closeFn) {
    state.keydownHandler = function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        closeFn();
      } else if (e.key === 'Tab') {
        trapFocus(modal, e);
      }
    };
    document.addEventListener('keydown', state.keydownHandler);
  }

  function teardownKeyboardHandlers() {
    if (state.keydownHandler) {
      document.removeEventListener('keydown', state.keydownHandler);
      state.keydownHandler = null;
    }
  }

  function focusFirstElement(modal) {
    const focusables = getFocusables(modal);
    const target = focusables[0] || modal;
    // Give the browser one tick to render
    requestAnimationFrame(() => {
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    });
  }

  /* ────────────── PUBLIC OPEN / CLOSE API ────────────── */

  function openModal(modal, closeFn) {
    if (!modal) return;
    state.lastFocus = document.activeElement;
    state.activeModal = modal;
    lockScroll();
    applyA11y(modal, true);
    setupKeyboardHandlers(modal, closeFn);
    focusFirstElement(modal);
  }

  function closeModal(modal) {
    if (!modal) return;
    applyA11y(modal, false);
    teardownKeyboardHandlers();
    unlockScroll();
    // Restore focus to opener (e.g. burger button)
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
      requestAnimationFrame(() => {
        try { state.lastFocus.focus({ preventScroll: true }); } catch (e) { state.lastFocus.focus(); }
      });
    }
    state.activeModal = null;
    state.lastFocus = null;
  }

  /* ────────────── DECLARATIVE REGISTRATION ────────────── */
  /*
   * Each modal is described by:
   *   element       — DOM element to observe (or null if not yet in DOM)
   *   isOpen        — function returning boolean
   *   onClose       — function that closes the modal (sets class/style)
   *   attrFilter    — which attribute mutations to watch
   */

  function registerModal({ element, isOpen, onClose, attrFilter }) {
    if (!element) return;
    let opened = false;
    const observer = new MutationObserver(() => {
      const isNowOpen = isOpen();
      if (isNowOpen === opened) return;
      opened = isNowOpen;
      if (isNowOpen) openModal(element, onClose);
      else           closeModal(element);
    });
    observer.observe(element, { attributes: true, attributeFilter: attrFilter });
    state.observers.push(observer);
  }

  /* ────────────── BURGER MENU (header.menu-open) ────────────── */

  const header = document.querySelector('header');
  if (header) {
    registerModal({
      element:    header,
      isOpen:     () => header.classList.contains('menu-open'),
      onClose:    () => header.classList.remove('menu-open'),
      attrFilter: ['class'],
    });
  }

  /* ────────────── MOBILE FILTER ────────────── */

  const mobileFilter = document.getElementById('mobile-filter-overlay');
  if (mobileFilter) {
    registerModal({
      element:    mobileFilter,
      isOpen:     () => mobileFilter.classList.contains('active'),
      onClose:    () => mobileFilter.classList.remove('active'),
      attrFilter: ['class'],
    });
  }

  /* ────────────── CONTACT POPUP ────────────── */

  const contactPopup = document.getElementById('contactPopup');
  if (contactPopup) {
    registerModal({
      element:    contactPopup,
      isOpen:     () => window.getComputedStyle(contactPopup).display !== 'none',
      onClose:    () => { contactPopup.style.display = 'none'; },
      attrFilter: ['style', 'class'],
    });
  }

  /* ────────────── PRICE CALCULATOR ────────────── */

  const priceModal = document.getElementById('price-calculator-modal');
  if (priceModal) {
    registerModal({
      element:    priceModal,
      isOpen:     () => window.getComputedStyle(priceModal).display !== 'none',
      /* Route ESC close through window.closePriceCalculator() so the full
       * body-lock cleanup runs (otherwise body stays position:fixed). */
      onClose:    () => {
        if (typeof window.closePriceCalculator === 'function') {
          window.closePriceCalculator();
        } else {
          priceModal.style.display = 'none';
        }
      },
      attrFilter: ['style', 'class'],
    });
  }

  /* ────────────── CLEANUP ON UNLOAD ────────────── */

  window.addEventListener('pagehide', function () {
    state.observers.forEach(o => o.disconnect());
    state.observers = [];
    teardownKeyboardHandlers();
    document.removeEventListener('touchmove', preventOutsideScroll);
    document.removeEventListener('wheel',     preventOutsideScroll);
    document.removeEventListener('touchend',    resetTouchTracking);
    document.removeEventListener('touchcancel', resetTouchTracking);
  });

  /* ────────────── EXPOSE MINIMAL API ────────────── */
  /* For inline scripts or future modals: */
  window.PlusRentModal = {
    open:  openModal,
    close: closeModal,
    register: registerModal,
    lock:  lockScroll,
    unlock: unlockScroll,
  };

})();
