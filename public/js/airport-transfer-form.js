/**
 * Quick booking form for the Chișinău airport transfer page (/ro|ru|en/transfer-chisinau).
 * Sends to the existing service-callback endpoint (saved in Supabase + Telegram notification).
 * Localized messages come from data-* attributes on the <form>.
 */
(function () {
  var form = document.getElementById('airportBookingForm');
  if (!form) return;
  var endpoint = form.dataset.endpoint || '/api/bookings/transfer-chisinau-callback';
  var service = form.dataset.service || 'transfer_chisinau';

  var dateInput = form.querySelector('[name="pickup_date"]');
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var field = function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : '';
    };

    // the international form, so the number can be dialled back from anywhere
    var phoneEl = form.querySelector('[name="phone_number"]');
    var phone = (window.PhoneInput && window.PhoneInput.full(phoneEl)) || field('phone_number');
    if (phone.replace(/\D/g, '').length < 8) {
      alert(form.dataset.msgPhone);
      return;
    }

    var notes = [];
    if (field('flight_number')) notes.push(form.dataset.labelFlight + ': ' + field('flight_number'));
    if (field('passengers')) notes.push(form.dataset.labelPassengers + ': ' + field('passengers'));
    if (field('pickup_location')) notes.push((form.dataset.labelPickup || 'Pickup') + ': ' + field('pickup_location'));

    var btn = form.querySelector('button[type="submit"]');
    var originalText = btn.textContent;
    btn.textContent = form.dataset.msgSending;
    btn.disabled = true;

    try {
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          service_type: service,
          pickup_location: field('pickup_location') || form.dataset.pickup,
          destination: field('destination') || null,
          pickup_date: field('pickup_date') || null,
          pickup_time: field('pickup_time') || null,
          special_instructions: notes.join('\n') || null
        })
      });
      var data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'HTTP ' + res.status);

      if (typeof window.gtag_report_conversion === 'function') window.gtag_report_conversion();
      form.reset();
      var modal = document.getElementById('successModal');
      if (modal) modal.style.display = 'flex';
      else alert(form.dataset.msgSuccess);
    } catch (err) {
      alert(form.dataset.msgError);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
})();
