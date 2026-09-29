/**
 * Home booking form: the pickup and return places as one compact "route"
 * (two <select>s, the phone's own picker) instead of two groups of three chips.
 *
 * The radio buttons stay in the form, hidden (.pr-places-legacy): the booking,
 * the price calculator and the fees read input[name="pickup_location"|"destination"].
 * This keeps both in step. It runs after the page has loaded (late-home.js),
 * so on start it copies the selects to the radios, in case a place was picked
 * before it arrived.
 */
(function () {
  "use strict";

  var selects = [].slice.call(document.querySelectorAll("select[data-pr-route]"));
  if (!selects.length) return;

  function radios(name) {
    return [].slice.call(document.querySelectorAll('input[type="radio"][name="' + name + '"]'));
  }

  function toRadios(select) {
    var name = select.getAttribute("data-pr-route");
    radios(name).forEach(function (r) {
      var on = r.value === select.value;
      if (r.checked !== on) {
        r.checked = on;
        if (on) {
          // the page listens with jQuery as well as natively
          if (window.jQuery) window.jQuery(r).trigger("change");
          else r.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });
  }

  function toSelect(select) {
    var name = select.getAttribute("data-pr-route");
    var checked = document.querySelector('input[type="radio"][name="' + name + '"]:checked');
    if (checked && select.value !== checked.value) select.value = checked.value;
  }

  selects.forEach(function (select) {
    toRadios(select);
    select.addEventListener("change", function () { toRadios(select); });
    radios(select.getAttribute("data-pr-route")).forEach(function (r) {
      r.addEventListener("change", function () { toSelect(select); });
    });
  });

  // form.reset() after a booking puts both back to their defaults; keep them equal
  var form = selects[0].form;
  if (form) {
    form.addEventListener("reset", function () {
      setTimeout(function () { selects.forEach(toSelect); }, 0);
    });
  }
})();
