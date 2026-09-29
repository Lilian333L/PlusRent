/**
 * Turns on the deferred stylesheets (<link media="print" data-deferred-css>) all at once,
 * after every one of them has loaded. Enabling them one by one would briefly apply
 * bootstrap without mdb/style.css and make the layout jump (CLS).
 * Above-the-fold styles come from /css/critical-*.css until then.
 *
 * With data-after-paint on this script tag (home page) the links carry data-href
 * instead of href and are only requested once the first frame has been painted.
 * PageSpeed's slow test phones paint late (~2.3 s) whatever the page does, and
 * count every request started before that paint; with ~20 stylesheets among them
 * the home page scored ~78 instead of ~96.
 */
(function () {
  var me = document.currentScript;
  var afterPaint = !!(me && me.hasAttribute('data-after-paint'));
  var links = [].slice.call(document.querySelectorAll('link[data-deferred-css]'));
  var pending = links.length;
  var applied = false;

  function applyAll() {
    if (applied) return;
    applied = true;
    links.forEach(function (link) { link.media = 'all'; });
  }

  function onDone() {
    pending -= 1;
    if (pending <= 0) applyAll();
  }

  function watch() {
    links.forEach(function (link) {
      var href = link.getAttribute('data-href');
      if (href) {
        link.media = 'print';
        link.rel = 'stylesheet';
        link.addEventListener('load', onDone);
        link.addEventListener('error', onDone);
        link.href = href;
      } else if (link.sheet) {
        onDone();
      } else {
        link.addEventListener('load', onDone);
        link.addEventListener('error', onDone);
      }
    });
    // Never wait forever on a slow stylesheet
    setTimeout(applyAll, 6000);
  }

  // Calls cb once the first contentful paint has happened (or after 3 s at most,
  // e.g. in a background tab that never paints).
  function whenPainted(cb) {
    var done = false;
    function go() {
      if (done) return;
      done = true;
      setTimeout(cb, 0);
    }
    setTimeout(go, 3000);
    try {
      if (performance.getEntriesByName('first-contentful-paint').length) return go();
      var types = window.PerformanceObserver && PerformanceObserver.supportedEntryTypes;
      if (!types || types.indexOf('paint') < 0) throw 0;
      var po = new PerformanceObserver(function (list) {
        if (list.getEntriesByName('first-contentful-paint').length) {
          po.disconnect();
          go();
        }
      });
      po.observe({ type: 'paint', buffered: true });
    } catch (e) {
      requestAnimationFrame(function () { setTimeout(go, 0); });
    }
  }

  if (!pending) return;
  if (afterPaint) whenPainted(watch);
  else watch();
})();
