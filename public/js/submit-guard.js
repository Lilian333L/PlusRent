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
      ".pr-busy{cursor:progress!important;opacity:.9}",
      ".pr-busy-inner{display:inline-flex;align-items:center;justify-content:center;gap:10px}",
      ".pr-busy-spin{width:16px;height:16px;flex:none;border:2px solid currentColor;",
      "border-right-color:transparent;border-radius:50%;animation:pr-spin .7s linear infinite}",
      "@keyframes pr-spin{to{transform:rotate(360deg)}}",
      "@media (prefers-reduced-motion:reduce){.pr-busy-spin{animation-duration:2.4s}}",
    ].join("");
    document.head.appendChild(st);
  }

  /**
   * Swap the button's contents for a spinner and a label, and put the original
   * back afterwards. Replacing the contents rather than overlaying them with a
   * pseudo-element means the spinner sits correctly whatever the button's
   * width, padding or icon happens to be.
   */
  function markBusy(el) {
    if (!el) return function () {};
    css();
    var prevHTML = el.innerHTML;
    var prevDisabled = el.disabled;
    var prevWidth = el.style.width;

    // hold the width so the button does not jump as the label changes
    var w = el.getBoundingClientRect().width;
    if (w > 0) el.style.width = Math.round(w) + "px";

    var inner = document.createElement("span");
    inner.className = "pr-busy-inner";
    var spin = document.createElement("span");
    spin.className = "pr-busy-spin";
    spin.setAttribute("aria-hidden", "true");
    inner.appendChild(spin);
    inner.appendChild(document.createTextNode(t("sending")));
    el.innerHTML = "";
    el.appendChild(inner);

    el.classList.add(BUSY);
    el.setAttribute("aria-busy", "true");
    if ("disabled" in el) el.disabled = true;

    var released = false;
    return function release() {
      if (released) return;
      released = true;
      el.classList.remove(BUSY);
      el.removeAttribute("aria-busy");
      el.style.width = prevWidth;
      el.innerHTML = prevHTML;
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
