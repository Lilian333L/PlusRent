/**
 * Quick booking form for the Chișinău airport transfer page (/ro|ru|en/transfer-chisinau).
 * Sends to the existing service-callback endpoint (saved in Supabase + Telegram notification).
 * Localized messages come from data-* attributes on the <form>.
 */
(function () {
  var form = document.getElementById('airportBookingForm');
  if (!form) return;

  var dateInput = form.querySelector('[name="pickup_date"]');
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var field = function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : '';
    };

    var phone = field('phone_number');
    if (phone.replace(/\D/g, '').length < 8) {
      alert(form.dataset.msgPhone);
      return;
    }

    var notes = [];
    if (field('flight_number')) notes.push(form.dataset.labelFlight + ': ' + field('flight_number'));
    if (field('passengers')) notes.push(form.dataset.labelPassengers + ': ' + field('passengers'));

    var btn = form.querySelector('button[type="submit"]');
    var originalText = btn.textContent;
    btn.textContent = form.dataset.msgSending;
    btn.disabled = true;

    try {
      var res = await fetch('/api/bookings/transfer-chisinau-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          service_type: 'transfer_chisinau',
          pickup_location: form.dataset.pickup,
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
