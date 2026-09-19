/**
 * One booking per press.
 *
 * Sending a booking takes two or three seconds: the form is validated, the
 * phone is checked against past customers, a coupon may be looked up, the row
 * is written and Telegram is notified. Nothing on screen said any of that was
 * happening, so people pressed again, and every press sent another booking.
 * The owner received the same booking twice on Telegram.
 *
 * So the button now says what it is doing and refuses to be pressed while it
 * does it. The guard is on the action, not only on the button, because the same
 * action can be reached with the keyboard and by a second element.
 *
 * It restores itself when the action finishes, and after a timeout as well, so
 * a request that never returns cannot leave the form stuck for good.
 */
(function () {
  "use strict";

  var BUSY = "pr-busy";
  var MAX_MS = 45000;

  var TEXT = {
    ro: { sending: "Se trimite rezervarea", wait: "Trimitem rezervarea, durează câteva secunde." },
    ru: { sending: "Отправляем бронь", wait: "Отправляем бронь, это займёт несколько секунд." },
    en: { sending: "Sending your booking", wait: "Sending your booking, this takes a few seconds." },
  };

  function t(key) {
    var l = (document.documentElement.lang || "ro").slice(0, 2);
    return (TEXT[l] || TEXT.ro)[key];
  }

  function css() {
    if (document.getElementById("pr-busy-css")) return;
    var st = document.createElement("style");
    st.id = "pr-busy-css";
    st.textContent = [
      ".pr-busy{position:relative;cursor:progress!important;opacity:.85}",
      ".pr-busy>*{visibility:hidden}",
      ".pr-busy::after{content:attr(data-busy-label);position:absolute;inset:0;display:flex;",
      "align-items:center;justify-content:center;gap:9px;visibility:visible;",
      "font:inherit;color:inherit;white-space:nowrap}",
      ".pr-busy::before{content:'';position:absolute;left:50%;top:50%;width:17px;height:17px;",
      "margin-top:-8.5px;margin-left:calc(-1 * (var(--pr-busy-w,150px) / 2) - 13px);",
      "border:2px solid currentColor;border-right-color:transparent;border-radius:50%;",
      "visibility:visible;animation:pr-spin .7s linear infinite}",
      "@keyframes pr-spin{to{transform:rotate(360deg)}}",
      "@media (prefers-reduced-motion:reduce){.pr-busy::before{animation-duration:2.4s}}",
    ].join("");
    document.head.appendChild(st);
  }

  function markBusy(el) {
    if (!el) return function () {};
    css();
    var prevDisabled = el.disabled;
    var label = t("sending");
    el.dataset.busyLabel = label;
    el.style.setProperty("--pr-busy-w", (label.length * 7.5) + "px");
    el.classList.add(BUSY);
    el.setAttribute("aria-busy", "true");
    if ("disabled" in el) el.disabled = true;

    var released = false;
    return function release() {
      if (released) return;
      released = true;
      el.classList.remove(BUSY);
      el.removeAttribute("aria-busy");
      delete el.dataset.busyLabel;
      if ("disabled" in el) el.disabled = prevDisabled;
    };
  }

  var inFlight = {};

  /**
   * Wrap a global function so it runs once at a time. The original keeps its
   * name, so inline onclick handlers in the markup need no change.
   */
  function guard(name, buttonSelector) {
    var original = window[name];
    if (typeof original !== "function" || original.prGuarded) return false;

    var wrapped = function () {
      if (inFlight[name]) return undefined; // already running, ignore the press
      inFlight[name] = true;

      var btn = buttonSelector ? document.querySelector(buttonSelector) : null;
      var release = markBusy(btn);
      var timer = setTimeout(finish, MAX_MS);

      function finish() {
        clearTimeout(timer);
        inFlight[name] = false;
        release();
      }

      var out;
      try {
        out = original.apply(this, arguments);
      } catch (err) {
        finish();
        throw err;
      }
      if (out && typeof out.then === "function") {
        out.then(finish, finish);
      } else {
        finish();
      }
      return out;
    };
    wrapped.prGuarded = true;
    window[name] = wrapped;
    return true;
  }

  var TARGETS = [
    ["applyModalCalculation", ".price-calculator-modal .btn-calculate"],
    ["submitBooking", null],
  ];

  function apply() {
    TARGETS.forEach(function (pair) { guard(pair[0], pair[1]); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
  // the page defines these late, so try again once everything has parsed
  setTimeout(apply, 800);
  setTimeout(apply, 2500);

  window.SubmitGuard = { guard: guard, markBusy: markBusy };
})();
