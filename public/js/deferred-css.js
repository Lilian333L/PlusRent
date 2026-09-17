/**
 * Turns on the deferred stylesheets (<link media="print" data-deferred-css>) all at once,
 * after every one of them has loaded. Enabling them one by one would briefly apply
 * bootstrap without mdb/style.css and make the layout jump (CLS).
 * Above-the-fold styles come from /css/critical-*.css until then.
 */
(function () {
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
