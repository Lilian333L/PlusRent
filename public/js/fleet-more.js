/**
 * Home page, phones: the cars are a compact list; the first six show, the
 * button under them ("Show all cars (11)") opens the rest in place.
 * The collapsing itself is CSS (css/home-v2.css, #fleet-car-grid:not(.is-expanded));
 * this counts the cars once the list is drawn and opens it on a tap.
 * All the cars stay in the page for search engines.
 */
(function () {
  "use strict";

  var grid = document.getElementById("fleet-car-grid");
  var button = document.querySelector(".pr-fleet-more");
  if (!grid || !button) return;
  var count = button.querySelector(".pr-fleet-more-n");
  var SHOWN = 6;

  function cars() {
    return grid.querySelectorAll(".de-item").length;
  }

  function update() {
    var n = cars();
    if (count) count.textContent = n ? "(" + n + ")" : "";
    button.classList.toggle("is-needed", n > SHOWN && !grid.classList.contains("is-expanded"));
  }

  button.addEventListener("click", function () {
    grid.classList.add("is-expanded");
    button.setAttribute("aria-expanded", "true");
    update();
    // keep the eye on the first car that was hidden
    var next = grid.children[SHOWN];
    if (next) {
      var a = next.querySelector("a, button");
      if (a) a.focus({ preventScroll: true });
    }
  });

  // the list is drawn from the API (and again on a language change)
  new MutationObserver(update).observe(grid, { childList: true });
  update();
})();
