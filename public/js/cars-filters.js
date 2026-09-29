/* ============================================================================
 * PlusRent — /cars filter helpers (ro, ru, en)
 *
 * The filters themselves live in the page's own script (renderFilterOptions,
 * applyMobileFilters, allCarsFullCache). This file only makes them easier:
 *
 *  1. A group with a single choice (every car has 4 doors today) is hidden:
 *     a filter that cannot narrow anything is noise. It comes back by itself
 *     when a car with another value is added.
 *  2. On the phone every group starts open; in the desktop sidebar the groups
 *     people use most (dates, make, body, gearbox) are open, the rest folded,
 *     and a folded group that holds a choice opens by itself.
 *  3. On the phone, the apply button says how many cars the choice will show
 *     ("Show 7 cars") and is disabled when the answer is none, so nobody
 *     applies filters into an empty page. The count follows the API's rules:
 *     exact match within each group, price compared with the 1-2 day rate.
 *     With dates chosen availability is decided later, so no number is shown.
 * ========================================================================== */
(function () {
  'use strict';

  var lang = (/^\/(ro|ru|en)\//.exec(location.pathname) || [])[1] || 'ro';

  var WORDS = {
    ro: {
      show: function (n) { return 'Arată ' + n + ' ' + (n === 1 ? 'mașină' : (n % 100 >= 20 || n % 100 === 0 ? 'de mașini' : 'mașini')); },
      none: 'Nicio mașină potrivită',
      generic: 'Arată mașinile'
    },
    ru: {
      show: function (n) {
        var m10 = n % 10, m100 = n % 100;
        var w = (m10 === 1 && m100 !== 11) ? 'машину' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? 'машины' : 'машин';
        return 'Показать ' + n + ' ' + w;
      },
      none: 'Нет подходящих машин',
      generic: 'Показать машины'
    },
    en: {
      show: function (n) { return 'Show ' + n + ' ' + (n === 1 ? 'car' : 'cars'); },
      none: 'No matching cars',
      generic: 'Show cars'
    }
  };
  var W = WORDS[lang];

  var GROUPS = ['make', 'gear', 'fuel', 'type', 'doors', 'passengers'];
  var FIELD = { make: 'make_name', gear: 'gear_type', fuel: 'fuel_type', type: 'car_type', doors: 'num_doors', passengers: 'num_passengers' };

  function cars() {
    // declared with let in the page script: a global binding, not a window property
    try { return (typeof allCarsFullCache !== 'undefined' && allCarsFullCache) || []; } catch (e) { return []; }
  }

  /* 1. Hide groups that offer one choice or none */
  function tidyGroups() {
    GROUPS.forEach(function (g) {
      ['filter-' + g + '-options', 'mobile-filter-' + g + '-options'].forEach(function (id) {
        var box = document.getElementById(id);
        if (!box) return;
        var section = box.closest('details');
        if (!section) return;
        var n = box.querySelectorAll('.filter-option-row').length;
        // before the options arrive there is nothing to judge
        if (!n && !cars().length) return;
        section.hidden = n <= 1;
      });
    });
  }

  /* 2. The live count on the phone */
  function selected(id) {
    var box = document.getElementById(id);
    if (!box) return [];
    return Array.prototype.map.call(box.querySelectorAll('input[type=checkbox]:checked'), function (cb) { return cb.value; });
  }

  function num(id) {
    var el = document.getElementById(id);
    var v = el && el.value !== '' ? parseFloat(el.value) : NaN;
    return isNaN(v) ? null : v;
  }

  function rate12(car) {
    var p = car.price_policy;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } }
    var v = p && p['1-2'] != null ? parseFloat(p['1-2']) : NaN;
    return isNaN(v) ? null : v;
  }

  // writing the same text again would itself be a DOM change the observer below
  // reacts to, so text is only touched when it differs
  function setText(el, text) { if (el.textContent !== text) el.textContent = text; }

  function updateApply() {
    var label = document.getElementById('prApplyLabel');
    var button = label && label.closest('button');
    if (!label || !button) return;
    var list = cars();
    var datesChosen = ['mobile-filter-date-from', 'mobile-filter-date-to'].some(function (id) {
      var el = document.getElementById(id); return el && el.value;
    });
    if (!list.length || datesChosen) {
      setText(label, W.generic);
      button.disabled = false;
      return;
    }
    var picks = {};
    GROUPS.forEach(function (g) { picks[g] = selected('mobile-filter-' + g + '-options'); });
    var min = num('mobile-filter-price-min');
    var max = num('mobile-filter-price-max');
    var n = list.filter(function (car) {
      for (var i = 0; i < GROUPS.length; i++) {
        var g = GROUPS[i];
        if (picks[g].length && picks[g].indexOf(String(car[FIELD[g]])) === -1) return false;
      }
      if (min !== null || max !== null) {
        var r = rate12(car);
        if (r === null) return false;
        if (min !== null && r < min) return false;
        if (max !== null && r > max) return false;
      }
      return true;
    }).length;
    setText(label, n ? W.show(n) : W.none);
    button.disabled = !n;
  }

  var DESKTOP_OPEN = ['.date-range-filter', '#filter-make-options', '#filter-type-options', '#filter-gear-options'];

  function hasChoice(section) {
    if (section.querySelector('input[type=checkbox]:checked')) return true;
    var radio = section.querySelector('input[type=radio]:checked');
    if (radio && radio.value !== 'all') return true;
    return Array.prototype.some.call(section.querySelectorAll('input[type=number], .date-range-filter input'), function (el) { return !!el.value; });
  }

  function openDesktopGroups() {
    Array.prototype.forEach.call(document.querySelectorAll('.filter-sidebar details.pr-filter-section'), function (d) {
      var main = DESKTOP_OPEN.some(function (sel) { return d.querySelector(sel); });
      d.open = main || hasChoice(d);
    });
  }

  // later changes only ever open a group, never fold one the visitor opened
  function openChosen() {
    Array.prototype.forEach.call(document.querySelectorAll('.filter-sidebar details.pr-filter-section'), function (d) {
      if (!d.open && hasChoice(d)) d.open = true;
    });
  }

  function init() {
    // Phone sheet: every group open (it scrolls, and the footer shows the result).
    // Desktop sidebar: the groups people use most are open, the rest folded; a
    // folded group that already holds a choice opens, so a choice is never hidden.
    Array.prototype.forEach.call(document.querySelectorAll('#mobile-filter-overlay details.pr-filter-section'), function (d) { d.open = true; });
    openDesktopGroups();
    var overlay = document.getElementById('mobile-filter-overlay');
    if (overlay) {
      overlay.addEventListener('change', function () { setTimeout(updateApply, 0); });
      overlay.addEventListener('input', function () { setTimeout(updateApply, 0); });
    }
    // options are re-rendered by the page after every fetch and on opening the sheet
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; tidyGroups(); updateApply(); openChosen(); });
    }).observe(document.getElementById('cars-catalog') || document.body, { childList: true, subtree: true });
    tidyGroups();
    updateApply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
