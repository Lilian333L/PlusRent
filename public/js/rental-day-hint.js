/**
 * Explain why the price went up when the return time crosses into another day.
 *
 * A rental day is 24 hours, so collecting at 09:00 and returning the next day at
 * 23:00 is two days, not one. Without a word of explanation that looks like an
 * error to the customer. The hint appears under the dates, only while the times
 * actually add a day, and says by when to return to stay on the lower price.
 */
(function () {
  "use strict";

  var HINT_ID = "rental-day-hint";
  var CSS_ID = "rental-day-hint-css";

  var TEXT = {
    ro: {
      title: "De ce apare încă o zi?",
      body: "O zi de închiriere înseamnă 24 de ore de la preluare. Ai luat mașina la {pickup}, " +
        "deci prima zi se încheie mâine la {pickup}. Dacă o returnezi la {ret}, intră a doua zi. " +
        "Returneaz-o până la {limit} și plătești {days}.",
      grace: "Ai 60 de minute de toleranță după ora preluării.",
      day: "o zi",
      days: "{n} zile",
    },
    ru: {
      title: "Почему добавился ещё один день?",
      body: "Сутки аренды это 24 часа с момента получения. Вы забрали машину в {pickup}, " +
        "значит первые сутки заканчиваются завтра в {pickup}. Если вернуть в {ret}, начинаются вторые. " +
        "Верните до {limit} и заплатите за {days}.",
      grace: "У вас есть 60 минут запаса после часа получения.",
      day: "одни сутки",
      days: "{n} суток",
    },
    en: {
      title: "Why is there an extra day?",
      body: "A rental day is 24 hours from pickup. You are collecting at {pickup}, so the first day " +
        "ends tomorrow at {pickup}. Returning at {ret} starts the second day. " +
        "Bring it back by {limit} and you pay for {days}.",
      grace: "You have 60 minutes of leeway after the pickup time.",
      day: "one day",
      days: "{n} days",
    },
  };

  var CSS =
    "#" + HINT_ID + "{display:none;margin:10px 0 0;padding:12px 14px;border-radius:10px;" +
    "background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;text-align:left}" +
    "#" + HINT_ID + ".show{display:block}" +
    "#" + HINT_ID + " b{display:block;color:#7c2d12;font-size:.9rem;font-weight:800;margin-bottom:4px}" +
    "#" + HINT_ID + " span{display:block;color:#7c2d12;font-size:.85rem;line-height:1.55}" +
    "#" + HINT_ID + " em{display:block;margin-top:5px;color:#a16207;font-size:.8rem;font-style:normal}";

  function lang() {
    var l = (document.documentElement.lang || "ro").slice(0, 2);
    return TEXT[l] ? l : "ro";
  }

  function css() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement("style");
    st.id = CSS_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : "";
  }

  function fields() {
    // the calculator modal on the home page and the booking form on a car page
    var ids = [
      ["modal-pickup-date", "modal-return-date", "modal-pickup-time", "modal-return-time"],
      ["pickup-date", "return-date", "pickup-time", "collection-time"],
      ["date-picker", "date-picker-2", "pickup-time", "collection-time"],
    ];
    for (var i = 0; i < ids.length; i++) {
      var set = ids[i];
      if (document.getElementById(set[0]) && document.getElementById(set[1])) {
        return {
          pickupDate: val(set[0]),
          returnDate: val(set[1]),
          pickupTime: val(set[2]),
          returnTime: val(set[3]),
          anchor: document.getElementById(set[1]),
        };
      }
    }
    return null;
  }

  function box(anchor) {
    var el = document.getElementById(HINT_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = HINT_ID;
    el.setAttribute("role", "note");
    var host = anchor.closest(".calculator-section") || anchor.closest(".row") || anchor.parentElement;
    if (!host || !host.parentElement) return null;
    host.parentElement.insertBefore(el, host.nextSibling);
    return el;
  }

  function update() {
    if (!window.RentalFees) return;
    var f = fields();
    if (!f || !f.pickupDate || !f.returnDate) return;
    css();
    var el = box(f.anchor);
    if (!el) return;

    var extra = window.RentalFees.extraDayFromTime(
      f.pickupDate, f.returnDate, f.pickupTime, f.returnTime
    );
    if (!extra) {
      el.classList.remove("show");
      return;
    }
    var t = TEXT[lang()];
    var byDate = window.RentalFees.rentalDays(f.pickupDate, f.returnDate, null, null);
    var limit = window.RentalFees.latestReturnTime(f.pickupTime) || f.pickupTime;
    var daysText = byDate === 1 ? t.day : t.days.replace("{n}", byDate);
    el.innerHTML =
      "<b>" + t.title + "</b><span>" +
      t.body.replace(/\{pickup\}/g, f.pickupTime).replace("{ret}", f.returnTime)
        .replace("{limit}", limit).replace("{days}", daysText) +
      "</span><em>" + t.grace + "</em>";
    el.classList.add("show");
  }

  ["change", "input"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (!e.target || !e.target.id) return;
      if (/pickup|return|collection|date-picker/.test(e.target.id)) setTimeout(update, 60);
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(update, 800); });
  } else {
    setTimeout(update, 800);
  }
  setTimeout(update, 2500);
  window.updateRentalDayHint = update;
})();
