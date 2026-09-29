/**
 * Turns on the deferred stylesheets (<link media="print" data-deferred-css>) all at once,
 * after every one of them has loaded. Enabling them one by one would briefly apply
 * bootstrap without mdb/style.css and make the layout jump (CLS).
 * Above-the-fold styles come from /css/critical-*.css until then.
 *
 * With data-after-paint on this script tag (home page), they are also held back
 * until the first frame has been painted: on a slow phone every stylesheet is
 * already loaded before the first paint, and switching ~20 of them on at that
 * moment made the browser restyle the whole page before showing the heading.
 */
(function () {
  var me = document.currentScript;
  var afterPaint = !!(me && me.hasAttribute('data-after-paint'));
  var links = [].slice.call(document.querySelectorAll('link[data-deferred-css]'));
  var pending = links.length;
  var applied = false;

  function applyNow() {
    links.forEach(function (link) { link.media = 'all'; });
  }

  function applyAll() {
    if (applied) return;
    applied = true;
    if (afterPaint && window.requestAnimationFrame) {
      requestAnimationFrame(function () { setTimeout(applyNow, 0); });
    } else {
      applyNow();
    }
  }

  function onDone() {
    pending -= 1;
    if (pending <= 0) applyAll();
  }

  if (!pending) return;
  links.forEach(function (link) {
    if (link.sheet) {
      onDone();
    } else {
      link.addEventListener('load', onDone);
      link.addEventListener('error', onDone);
    }
  });
  // Never wait forever on a slow third-party stylesheet
  setTimeout(applyAll, 6000);
})();
