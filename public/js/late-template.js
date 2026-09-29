/**
 * /cars and the sober-driver pages: the template bundle (jQuery and its plugins, 133 KB) and designesia.js
 * only drive template helpers here (back-to-top, the header on scroll). None of
 * the page's own scripts use jQuery, and the burger menu is driven by
 * burger-menu-fix.js. So both start after the load event and stay out of the
 * first screen, as on the driver and transfer pages.
 *
 * designesia binds its own window "load" handler, which has already fired by
 * then, so the event is replayed through jQuery once it is in.
 * When plugins.js or designesia.min.js change, update their ?v= here.
 */
(function () {
  'use strict';

  function add(src, done) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = done;
    s.onerror = done;
    document.body.appendChild(s);
  }

  function start() {
    add('/js/plugins.js?v=dc2ac48a', function () {
      add('/js/designesia.min.js?v=eef6b4c0', function () {
        if (window.jQuery) window.jQuery(window).trigger('load');
      });
    });
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
