/**
 * Home page: the scripts the first screen does not need start after the load
 * event (as /cars does with js/late-template.js).
 *
 * They sit in the page as <script data-late-src="..."> (no src, so the browser
 * does not fetch them) in their original order: the template bundle (jQuery,
 * select2...), the booking form, the calendar, the price calculator, the wheel,
 * the phone field. PageSpeed counts every request started before the first
 * text is painted; with ~20 scripts and jQuery among them the home page could
 * not get past ~70 on mobile.
 *
 * They are fetched in parallel and run in order (async = false). While they
 * run, a DOMContentLoaded or window "load" listener they add is called at once
 * (both events are long past), and jQuery's window "load" is replayed at the
 * end for designesia, as late-template.js does.
 */
(function () {
  'use strict';

  function start() {
    var tags = [].slice.call(document.querySelectorAll('script[data-late-src]'));
    if (!tags.length) return;

    var dAdd = document.addEventListener;
    var wAdd = window.addEventListener;
    var fire = function (target, type, fn) {
      setTimeout(function () {
        try {
          if (typeof fn === 'function') fn.call(target, new Event(type));
          else if (fn && typeof fn.handleEvent === 'function') fn.handleEvent(new Event(type));
        } catch (e) {
          setTimeout(function () { throw e; });
        }
      }, 0);
    };
    document.addEventListener = function (type, fn, opts) {
      if (type === 'DOMContentLoaded') return fire(document, type, fn);
      return dAdd.call(this, type, fn, opts);
    };
    window.addEventListener = function (type, fn, opts) {
      if (type === 'load') return fire(window, type, fn);
      return wAdd.call(this, type, fn, opts);
    };

    var left = tags.length;
    var done = function () {
      left -= 1;
      if (left > 0) return;
      setTimeout(function () {
        document.addEventListener = dAdd;
        window.addEventListener = wAdd;
        if (window.jQuery) window.jQuery(window).trigger('load');
        document.dispatchEvent(new Event('pr:late-ready'));
      }, 0);
    };

    tags.forEach(function (tag) {
      var s = document.createElement('script');
      s.src = tag.getAttribute('data-late-src');
      s.async = false;
      s.onload = done;
      s.onerror = done;
      document.body.appendChild(s);
    });
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
