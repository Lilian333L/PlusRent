/**
 * Swap the car from inside the price calculator, with pictures.
 *
 * The modal used to show whichever car was picked in the form and offer no way to
 * change it, so comparing two cars meant closing the modal and starting again. A
 * plain dropdown replaced that, but a list of names is a poor way to choose a car,
 * so clicking the selected vehicle now opens the same kind of picture list the
 * home page uses. #vehicle_type stays the single source of truth: picking here
 * changes it there and the price recalculates.
 */
(function () {
  "use strict";

  var PANEL_ID = "modal-vehicle-picker";
  var CSS_ID = "modal-vehicle-picker-css";

  var CSS =
    "#" + PANEL_ID + "{display:none;margin-top:10px;border:1px solid #e7e5e4;border-radius:12px;" +
    "background:#fff;max-height:280px;overflow-y:auto;-webkit-overflow-scrolling:touch}" +
    "#" + PANEL_ID + ".open{display:block}" +
    "#" + PANEL_ID + " button{display:flex;width:100%;gap:10px;align-items:center;text-align:left;" +
    "padding:8px 10px;border:0;border-bottom:1px solid #f5f5f4;background:#fff;cursor:pointer;font-family:inherit}" +
    "#" + PANEL_ID + " button:last-child{border-bottom:0}" +
    "#" + PANEL_ID + " button:hover,#" + PANEL_ID + " button:focus{background:#fffbeb}" +
    "#" + PANEL_ID + " button[aria-current='true']{background:#fef3c7}" +
    "#" + PANEL_ID + " img{width:62px;height:42px;object-fit:cover;border-radius:7px;flex:0 0 auto;background:#f5f5f4}" +
    "#" + PANEL_ID + " .mv-name{display:block;font-weight:700;font-size:.9rem;color:#1e293b;line-height:1.25}" +
    "#" + PANEL_ID + " .mv-meta{display:block;font-size:.78rem;color:#78716c;margin-top:2px}" +
    "#" + PANEL_ID + " button > span{min-width:0}" +
    ".mv-switch{display:flex;align-items:center;gap:6px;margin-top:8px;padding:7px 12px;border:1px solid #e7e5e4;" +
    "border-radius:999px;background:#fafaf8;color:#b8730a;font-weight:700;font-size:.84rem;cursor:pointer;font-family:inherit}" +
    ".mv-switch:hover{background:#fffbeb}" +
    "#modal-vehicle-info{cursor:pointer}";

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement("style");
    st.id = CSS_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function source() {
    return document.getElementById("vehicle_type");
  }

  function detailsOf(option) {
    try {
      return JSON.parse(option.getAttribute("data-car-details") || "{}");
    } catch (e) {
      return {};
    }
  }

  function thumb(option, details) {
    var src = details.head_image || option.getAttribute("data-src") || "";
    if (!src) return "";
    return window.carImageUrl ? window.carImageUrl(src, 480) : src;
  }

  function metaOf(details) {
    var bits = [];
    if (details.production_year) bits.push(details.production_year);
    if (details.car_type) bits.push(details.car_type);
    if (details.gear_type) bits.push(details.gear_type);
    if (details.num_passengers) bits.push(details.num_passengers + "+1");
    return bits.join(" · ");
  }

  function panel() {
    var el = document.getElementById(PANEL_ID);
    if (el) return el;
    var info = document.getElementById("modal-vehicle-info");
    if (!info) return null;
    el = document.createElement("div");
    el.id = PANEL_ID;
    el.setAttribute("role", "listbox");
    info.parentNode.insertBefore(el, info.nextSibling);
    return el;
  }

  function build() {
    injectCss();
    var src = source();
    var box = panel();
    if (!src || !box) return;
    box.innerHTML = "";
    var count = 0;
    for (var i = 0; i < src.options.length; i++) {
      var o = src.options[i];
      if (!o.value) continue;
      var d = detailsOf(o);
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "option");
      b.dataset.carId = o.value;
      if (o.value === src.value) b.setAttribute("aria-current", "true");
      var img = thumb(o, d);
      b.innerHTML =
        (img ? '<img src="' + img + '" alt="" loading="lazy" decoding="async">' : '<img alt="">') +
        '<span><span class="mv-name">' + (o.textContent || "").trim() + "</span>" +
        (metaOf(d) ? '<span class="mv-meta">' + metaOf(d) + "</span>" : "") +
        "</span>";
      box.appendChild(b);
      count++;
    }
    var toggle = document.getElementById("mv-switch-btn");
    if (toggle) toggle.style.display = count > 1 ? "" : "none";
    return count;
  }

  function choose(carId) {
    var src = source();
    if (!src || !carId) return;
    src.value = carId;
    if (window.jQuery && window.jQuery(src).data("select2")) {
      window.jQuery(src).val(carId).trigger("change");
    } else {
      src.dispatchEvent(new Event("change", { bubbles: true }));
    }
    var o = src.options[src.selectedIndex];
    if (o) {
      var d = detailsOf(o);
      var img = document.getElementById("modal-vehicle-image");
      var t = thumb(o, d);
      if (img && t) img.src = t;
      var name = document.getElementById("modal-vehicle-name");
      if (name) name.textContent = (o.textContent || "").trim();
      var year = document.getElementById("modal-vehicle-year");
      if (year) year.textContent = o.dataset.year || d.production_year || "-";
      if (window.priceCalculator && d && d.price_policy) window.priceCalculator.car = d;
    }
    if (typeof window.syncVehicleDataToModal === "function") window.syncVehicleDataToModal();
    // The car page keeps its rates in priceCalculator; the home page modal reads
    // them straight off the selected option and recalculates in calculateModalPrice.
    // Only the first was called here, so on the home page the total stayed on the
    // car that was picked first no matter which one you switched to.
    if (window.priceCalculator && typeof window.priceCalculator.recalculatePrice === "function") {
      window.priceCalculator.recalculatePrice();
    }
    if (typeof window.updateVehiclePriceDisplay === "function") {
      window.updateVehiclePriceDisplay();
    }
    if (typeof window.calculateModalPrice === "function") {
      window.calculateModalPrice();
    }
    if (typeof window.updateRentalDayHint === "function") {
      window.updateRentalDayHint();
    }
    build();
    close();
  }

  function open() {
    if (build() < 2) return;
    var box = document.getElementById(PANEL_ID);
    if (box) box.classList.add("open");
    var current = box && box.querySelector('button[aria-current="true"]');
    if (current) current.scrollIntoView({ block: "nearest" });
  }

  function close() {
    var box = document.getElementById(PANEL_ID);
    if (box) box.classList.remove("open");
  }

  function addToggle() {
    if (document.getElementById("mv-switch-btn")) return;
    var info = document.getElementById("modal-vehicle-info");
    if (!info) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "mv-switch-btn";
    b.className = "mv-switch";
    b.innerHTML = '<i class="fa fa-exchange-alt" aria-hidden="true"></i><span>' + label() + "</span>";
    info.parentNode.insertBefore(b, info.nextSibling);
  }

  function label() {
    var lang = (document.documentElement.lang || "ro").slice(0, 2);
    if (lang === "ru") return "Сменить машину";
    if (lang === "en") return "Change car";
    return "Schimbă mașina";
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#" + PANEL_ID + " button[data-car-id]");
    if (btn) {
      choose(btn.dataset.carId);
      return;
    }
    if (e.target.closest && (e.target.closest("#mv-switch-btn") || e.target.closest("#modal-vehicle-info"))) {
      var box = document.getElementById(PANEL_ID);
      if (box && box.classList.contains("open")) close();
      else open();
      return;
    }
    if (!e.target.closest || !e.target.closest("#" + PANEL_ID)) close();
  });

  function init() {
    injectCss();
    addToggle();
    build();
    var modal =
      document.getElementById("price-calculator-modal") ||
      document.querySelector(".price-calculator-modal");
    if (modal) {
      new MutationObserver(function () {
        var visible =
          modal.classList.contains("show") ||
          (modal.style && modal.style.display && modal.style.display !== "none");
        if (visible) {
          addToggle();
          build();
        } else {
          close();
        }
      }).observe(modal, { attributes: true, attributeFilter: ["class", "style"] });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  document.addEventListener("plusrent:cars-loaded", build);
  setTimeout(init, 2500);
  setTimeout(build, 6000);

  window.fillModalVehicleSelect = build;
})();
