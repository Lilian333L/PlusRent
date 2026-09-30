/**
 * "Rent now" on the home fleet and the /cars catalogue opens the car's page.
 * On a slow connection that takes seconds, and without a sign the tap was taken
 * people tap again or leave. On the tap the button shows a spinner and
 * "Opening…" in the page language until the car page arrives; coming back with
 * the Back button (bfcache) restores it. Styles: css/home-v2.css (home),
 * css/cars-catalog.css (/cars).
 */
(function () {
  "use strict";

  var SELECTOR = "#fleet-car-grid a.btn-main, #cars-catalog a.pr-car-cta";
  var LABEL = { ro: "Se deschide…", ru: "Открываем…", en: "Opening…" };
  var lang = (document.documentElement.lang || "ro").slice(0, 2);
  var label = LABEL[lang] || LABEL.ro;

  // iOS Safari only applies :active (the pressed look) when a touch listener exists
  document.addEventListener("touchstart", function () {}, { passive: true });

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest(SELECTOR);
    if (!a || a.target === "_blank" || a.classList.contains("is-opening")) return;
    a.dataset.label = a.textContent;
    a.style.minWidth = a.offsetWidth + "px"; // the shorter text must not shrink the button
    a.textContent = label;
    a.classList.add("is-opening");
    a.setAttribute("aria-busy", "true");
  });

  function restore() {
    var busy = document.querySelectorAll(".is-opening");
    for (var i = 0; i < busy.length; i++) {
      var a = busy[i];
      if (a.dataset.label) a.textContent = a.dataset.label;
      a.classList.remove("is-opening");
      a.removeAttribute("aria-busy");
      a.style.minWidth = "";
    }
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted) restore(); });
})();
