/**
 * Transfer pages: the stylesheets below the first screen start downloading right
 * after the first paint instead of competing with it. They come from
 * <noscript id="lateCss"> (which is also the no-JavaScript fallback) and are
 * switched on together once all have loaded, so nothing jumps.
 * The first screen is styled by the page's critical stylesheet until then.
 */
(function () {
  var box = document.getElementById('lateCss');
  if (!box) return;
  var started = false;
  function start() {
    if (started) return;
    started = true;
    var tmp = document.createElement('div');
    tmp.innerHTML = box.textContent;
    var links = [].slice.call(tmp.querySelectorAll('link[rel="stylesheet"]'));
    var pending = links.length, anchor = box;
    function done() { if (--pending === 0) links.forEach(function (l) { l.media = 'all'; }); }
    links.forEach(function (l) {
      l.media = 'print';
      l.addEventListener('load', done);
      l.addEventListener('error', done);
      anchor.parentNode.insertBefore(l, anchor.nextSibling);
      anchor = l;
    });
  }
  try {
    var seen = performance.getEntriesByName('first-contentful-paint');
    if (seen.length) { requestAnimationFrame(start); }
    else {
      new PerformanceObserver(function (list) {
        if (list.getEntriesByName('first-contentful-paint').length) requestAnimationFrame(start);
      }).observe({ type: 'paint', buffered: true });
    }
  } catch (e) { start(); }
  // never later than this, whatever happens with the paint timing
  setTimeout(start, 2500);
  window.addEventListener('load', start);
})();
