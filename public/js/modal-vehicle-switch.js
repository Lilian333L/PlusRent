/**
 * Let the customer swap the car inside the price calculator.
 *
 * The modal showed whichever car was picked in the form and gave no way to change
 * it, so comparing two cars meant closing the modal, changing the select and
 * opening it again. The dropdown added here mirrors #vehicle_type, which stays the
 * single source of truth: changing it here changes it there and recalculates.
 */
(function () {
  var MODAL_SELECT_ID = 'modal-vehicle-select';

  function sourceSelect() {
    return document.getElementById('vehicle_type');
  }

  function fillModalSelect() {
    var src = sourceSelect();
    var dst = document.getElementById(MODAL_SELECT_ID);
    if (!src || !dst) return;
    dst.innerHTML = '';
    for (var i = 0; i < src.options.length; i++) {
      var o = src.options[i];
      if (!o.value) continue;
      var opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.textContent;
      if (o.value === src.value) opt.selected = true;
      dst.appendChild(opt);
    }
    dst.disabled = dst.options.length < 2;
  }

  function applyChange(carId) {
    var src = sourceSelect();
    if (!src || !carId) return;
    src.value = carId;
    if (window.jQuery && window.jQuery(src).data('select2')) {
      window.jQuery(src).val(carId).trigger('change');
    } else {
      src.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // the modal image and name come from the option's data-car-details
    var opt = src.options[src.selectedIndex];
    if (opt) {
      var details = {};
      try { details = JSON.parse(opt.getAttribute('data-car-details') || '{}'); } catch (e) {}
      var img = document.getElementById('modal-vehicle-image');
      var head = details.head_image || opt.getAttribute('data-src');
      if (img && head) {
        img.src = window.carImageUrl ? window.carImageUrl(head, 480) : head;
      }
      var name = document.getElementById('modal-vehicle-name');
      if (name) name.textContent = (opt.textContent || '').trim();
      var year = document.getElementById('modal-vehicle-year');
      if (year) year.textContent = opt.dataset.year || details.production_year || '-';
      var det = document.getElementById('modal-vehicle-details');
      if (det && details.num_passengers) {
        det.textContent = [details.num_passengers && details.num_passengers + ' ' + (det.dataset.seats || ''),
                           details.num_doors && details.num_doors + ' ' + (det.dataset.doors || ''),
                           details.car_type].filter(Boolean).join(' • ');
      }
      if (window.priceCalculator) {
        if (typeof window.priceCalculator.setCar === 'function') {
          window.priceCalculator.setCar(details);
        } else if (details && details.price_policy) {
          window.priceCalculator.car = details;
        }
      }
    }
    if (typeof window.syncVehicleDataToModal === 'function') window.syncVehicleDataToModal();
    if (window.priceCalculator && typeof window.priceCalculator.recalculatePrice === 'function') {
      window.priceCalculator.recalculatePrice();
    }
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === MODAL_SELECT_ID) applyChange(e.target.value);
  });

  // refill whenever the calculator is opened
  var modal = null;
  function watchModal() {
    modal = document.getElementById('price-calculator-modal') ||
            document.querySelector('.price-calculator-modal');
    if (!modal) return;
    new MutationObserver(function () {
      var open = modal.classList.contains('show') ||
                 (modal.style && modal.style.display && modal.style.display !== 'none');
      if (open) fillModalSelect();
    }).observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { watchModal(); fillModalSelect(); });
  } else {
    watchModal();
    fillModalSelect();
  }
  // the car list arrives from the API after load
  document.addEventListener('plusrent:cars-loaded', fillModalSelect);
  setTimeout(fillModalSelect, 2500);
  setTimeout(fillModalSelect, 6000);

  window.fillModalVehicleSelect = fillModalSelect;
})();
