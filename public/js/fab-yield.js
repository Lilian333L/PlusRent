/**
 * Floating buttons (call, back to top) step aside while one of the page's own
 * call or messenger buttons sits in the lower part of the screen. On a phone
 * they otherwise land on top of those buttons, and a tap meant for Telegram
 * starts a phone call instead.
 */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var FABS = '.floating-call-btn, .floating-btn-st, .floating-contact-btn, #back-to-top';
  var targets = [].slice.call(document.querySelectorAll('main a[href^="tel:"], #content a[href^="tel:"], a[href^="/whatsapp"], a[href*="t.me/"]'))
    .filter(function (a) { return !a.closest('header, footer, ' + FABS); });
  if (!targets.length) return;

  var visible = new Set();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    document.body.classList.toggle('pr-fab-yield', visible.size > 0);
  }, { rootMargin: '-70% 0px 0px 0px' });   // only the bottom 30% of the viewport counts

  targets.forEach(function (a) { io.observe(a); });
})();
