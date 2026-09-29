/**
 * Whether a phone field holds a usable number.
 *
 * phone-input.js knows which country the number is from and how many digits
 * that country uses, so where it is present it is the answer. The old pattern
 * is kept only for a field it has not reached: it accepts almost anything with
 * eight characters, which is how a number this file called valid could sit in
 * a box the component had already marked wrong.
 */
/**
 * The page's phone field, wherever it is.
 *
 * The homepage form calls it #phone. The form on a car page calls it
 * customer_phone and gives it no id, so every lookup written as $("#phone")
 * finds nothing there and reads an empty value, which is how a number with a
 * green tick beside it was refused as missing.
 */
function prPhoneField() {
  return (
    document.getElementById("phone") ||
    document.querySelector('input[name="customer_phone"]') ||
    document.querySelector('form input[type="tel"]')
  );
}

/**
 * Is this one of the car pages, which has its own booking handler?
 *
 * They used to live at car-single.html?id=, and this file recognised them by
 * that word in the address. They moved to /ro/chirie-auto/<slug> and the test
 * stopped matching, so the old validation kept running on a form it was never
 * written for. The bootstrap object the server injects is the reliable answer;
 * the other two are there for the old address and for anything served before
 * that object exists.
 */
function prIsCarPage() {
  var path = window.location.pathname;
  return (
    !!window.__PR_CAR__ ||
    path.indexOf("car-single") !== -1 ||
    /\/(chirie-auto|arenda-avto|car-rental)\//.test(path)
  );
}

function prPhoneLooksValid(value, el) {
  var field = el || prPhoneField();
  if (field && field.prPhone) return field.prPhone.value().ok;
  if (field && field.dataset && field.dataset.prPhone) {
    return !!(field.dataset.e164 || "").length;
  }
  return /^[+]?[0-9\s\-()]{8,}$/.test(String(value || "").trim());
}

// Global variables for coupon caching
let cachedCouponData = null;
let lastValidatedCouponCode = null;
let modalFeeSettings = {
  outside_hours_fee: 15,
  chisinau_airport_pickup: 15,
  chisinau_airport_dropoff: 15,
  iasi_airport_pickup: 175,
  iasi_airport_dropoff: 175,
  office_pickup: 0,
  office_dropoff: 0,
};

$(document).ready(function () {
  // Initialize booking form handler
  const bookingForm = $("#booking_form");
  const submitButton = $("#send_message");
  const successMessage = $("#success_message");
  // Use universal error popup instead
  const mailFail = $("#mail_fail");

  // API base URL from config - use relative URLs for Vercel deployment
  const apiBaseUrl = window.API_BASE_URL || "";

  async function loadModalFeeSettings() {
    try {
      const response = await fetch(
        `${window.API_BASE_URL}/api/fee-settings/public`
      );
      if (response.ok) {
        const feeData = await response.json();
        Object.assign(modalFeeSettings, feeData);
      }
    } catch (error) {
      console.error("Error loading fee settings:", error);
    }
  }

  // Call this when the page loads
  $(document).ready(function () {
    loadModalFeeSettings();
  });
  // Enhanced form validation
  function validateForm() {
    let isValid = true;
    const errors = [];

    // Clear previous error states
    $(".error_input").removeClass("error_input");
    $(".field-error").remove();

    // Required fields validation (removed date/time fields since they're now in modal)
    const requiredFields = {
      phone: i18next.t("booking.phone_number"),
      vehicle_type: i18next.t("booking.vehicle_type"),
    };
    // Check required fields
    Object.keys(requiredFields).forEach((fieldId) => {
      const field = $(`#${fieldId}`);
      const value = field.val();

      if (!value || value.trim() === "") {
        field.addClass("error_input");
        field.after(
          `<div class="field-error text-danger small mt-1">${i18next.t(
            `errors.${fieldId}_required`
          )}</div>`
        );
        errors.push(i18next.t(`errors.${fieldId}_required`));
        isValid = false;
      }
    });

    // Email validation
    const email = $("#email").val();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      $("#email").addClass("error_input");
      $("#email").after(
        `<div class="field-error text-danger small mt-1">${i18next.t(
          "errors.please_enter_valid_email"
        )}</div>`
      );
      errors.push(i18next.t("errors.please_enter_valid_email"));
      isValid = false;
    }

    // Phone validation
    const phone = $(prPhoneField()).val();
    if (phone && !prPhoneLooksValid(phone)) {
      $("#phone").addClass("error_input");
      $("#phone").after(
        `<div class="field-error text-danger small mt-1">${i18next.t(
          "errors.please_enter_valid_phone"
        )}</div>`
      );
      errors.push(i18next.t("errors.please_enter_valid_phone"));
      isValid = false;
    }

    // Date and time validation is now handled in the modal
    const pickupDateStr = $("#modal-pickup-date").val();
    const returnDateStr = $("#modal-return-date").val();
    const pickupTime = $("#modal-pickup-time").val();
    const returnTime = $("#modal-return-time").val();

    if (pickupDateStr && returnDateStr) {
      const pickupDate = new Date(pickupDateStr + "T00:00:00");
      const returnDate = new Date(returnDateStr + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (pickupDate < today) {
        errors.push(i18next.t("errors.pickup_date_future"));
        isValid = false;
      }

      if (returnDate < pickupDate) {
        errors.push(i18next.t("errors.return_date_after_pickup"));
        isValid = false;
      }
    }

    // Time validation for same-day rentals
    // if (pickupTime && returnTime && pickupDateStr && returnDateStr) {
    //   const pickupDateTime = new Date(pickupDateStr + "T" + pickupTime);
    //   const returnDateTime = new Date(returnDateStr + "T" + returnTime);

    // if (pickupDateStr === returnDateStr && returnDateTime <= pickupDateTime) {
    //   errors.push(i18next.t('errors.return_time_after_pickup'));
    //   isValid = false;
    // }
    // }

    // Additional validation for minimum rental duration
    // if (pickupDateStr && returnDateStr) {
    //   const pickup = new Date(pickupDateStr);
    //   const return_dt = new Date(returnDateStr);
    //   const duration = Math.ceil((return_dt - pickup) / (1000 * 60 * 60 * 24));

    //   if (duration < 1) {
    //     $("#date-picker-2").addClass("error_input");
    //     $("#date-picker-2").after(
    //       `<div class="field-error text-danger small mt-1">${i18next.t('errors.minimum_rental_duration')}</div>`
    //     );
    //     errors.push(i18next.t('errors.minimum_rental_duration'));
    //     isValid = false;
    //   }
    // }

    // Vehicle selection validation
    const vehicleSelect = $("#vehicle_type");
    if (vehicleSelect.val() === "" || vehicleSelect.val() === null) {
      vehicleSelect.addClass("error_input");
      vehicleSelect.after(
        `<div class="field-error text-danger small mt-1">${i18next.t(
          "errors.please_select_vehicle"
        )}</div>`
      );
      errors.push(i18next.t("errors.please_select_vehicle"));
      isValid = false;
    }

    // Pickup location validation (radio buttons)
    const pickupLocationRadios = $('input[name="pickup_location"]');
    const pickupLocation = $('input[name="pickup_location"]:checked').val();

    if (!pickupLocation) {
      $('.radio-group:has(input[name="pickup_location"])').addClass(
        "error_input"
      );
      $('.radio-group:has(input[name="pickup_location"])').after(
        `<div class="field-error text-danger small mt-1">${i18next.t(
          "errors.please_select_pickup_location"
        )}</div>`
      );
      errors.push(i18next.t("errors.please_select_pickup_location"));
      isValid = false;
    }

    // Dropoff location validation (radio buttons)
    const dropoffLocationRadios = $('input[name="destination"]');
    const dropoffLocation = $('input[name="destination"]:checked').val();

    if (!dropoffLocation) {
      $('.radio-group:has(input[name="destination"])').addClass("error_input");
      $('.radio-group:has(input[name="destination"])').after(
        `<div class="field-error text-danger small mt-1">${i18next.t(
          "errors.please_select_dropoff_location"
        )}</div>`
      );
      errors.push(i18next.t("errors.please_select_dropoff_location"));
      isValid = false;
    }

    return { isValid, errors };
  }

  // Collect form data for API submission
  window.collectFormData = function () {
    const vehicleSelect = $("#vehicle_type");
    const selectedOption = vehicleSelect.find("option:selected");

    // Helper function to safely get and trim values
    const safeTrim = (selector) => {
      const element = $(selector);
      return element.length > 0 ? (element.val() || "").trim() : "";
    };

    // Get the original total price
    const originalTotalPrice = parseFloat($("#total_price").val()) || 0;

    // Calculate discounted price if coupon is applied
    let finalTotalPrice = originalTotalPrice;
    const discountCode = safeTrim("#modal-discount-code");

    if (
      discountCode &&
      cachedCouponData &&
      cachedCouponData.valid &&
      lastValidatedCouponCode === discountCode
    ) {
      const discountPercentage = parseFloat(
        cachedCouponData.discount_percentage || 0
      );

      if (!isNaN(discountPercentage) && discountPercentage > 0) {
        const discountAmount = originalTotalPrice * (discountPercentage / 100);
        finalTotalPrice = originalTotalPrice - discountAmount;
      }
    }

    return {
      car_id: selectedOption.attr("data-car-id"),
      customer_name: safeTrim("#name"),
      customer_email: safeTrim("#email"),
      // international form when the phone widget has worked one out, otherwise
      // what was typed; without this the country code never leaves the page
      customer_phone:
        (window.PhoneInput && window.PhoneInput.full("#phone")) ||
        safeTrim("#phone"),
      customer_phone_country: (prPhoneField() || {}).dataset
        ? (prPhoneField().dataset.country || null)
        : null,
      customer_age:
        safeTrim("#modal-customer-age") || safeTrim("#customer_age"),
      pickup_date: (() => {
        const dateStr = $("#modal-pickup-date").val() || "";
        const converted = convertDateFormatToISO(dateStr);
        return converted;
      })(),
      pickup_time: $("#modal-pickup-time").val() || "",
      return_date: (() => {
        const dateStr = $("#modal-return-date").val() || "";
        const converted = convertDateFormatToISO(dateStr);
        return converted;
      })(),
      return_time: $("#modal-return-time").val() || "",
      pickup_location:
        translateLocation($('input[name="pickup_location"]:checked').val()) ||
        "",
      dropoff_location:
        translateLocation($('input[name="destination"]:checked').val()) || "",
      special_instructions: safeTrim("#message") || null,
      total_price: finalTotalPrice,
      discount_code: discountCode,
      price_breakdown: {},
    };
  };

  function translateLocation(locationValue) {
    if (!locationValue) return "";

    if (typeof i18next === "undefined" || !i18next.t) {
      return locationValue; // Return original value if i18next not ready
    }

    const locationMap = {
      "Chisinau Airport": i18next.t("cars.chisinau_airport"),
      "Our Office": i18next.t("cars.our_office"),
      "Iasi Airport": i18next.t("cars.iasi_airport"),
    };

    return locationMap[locationValue] || locationValue;
  }

  // Show loading state
  window.showLoading = function () {
    const submitButton = $("#send_message");
    submitButton.attr("disabled", true).val("Processing...");
    submitButton.css("opacity", "0.7");
    submitButton.prepend('<span class="loading-spinner"></span>');
  };

  // Hide loading state
  window.hideLoading = function () {
    const submitButton = $("#send_message");
    submitButton.attr("disabled", false).val("Submit");
    submitButton.css("opacity", "1");
    submitButton.find(".loading-spinner").remove();
  };

  // Show success message - This function is now defined later in the file with the professional modal

  // Clear error states when user starts typing
  $("input, select, textarea").on("input change", function () {
    $(this).removeClass("error_input");
    $(this).siblings(".field-error").remove();

    // Hide error message when user starts interacting
    hideUniversalError();
  });

  // Clear error states for radio buttons
  $('input[type="radio"]').on("change", function () {
    const name = $(this).attr("name");
    const value = $(this).val();

    $('.radio-group:has(input[name="' + name + '"])').removeClass(
      "error_input"
    );
    $('.radio-group:has(input[name="' + name + '"])')
      .siblings(".field-error")
      .remove();

    // Hide error message when user starts interacting
    hideUniversalError();
  });

  // Debug: Check if submit button exists

  // Handle form submission - now opens price calculator modal
  submitButton.click(function (e) {
    // Skip old validation system on a car page: BookingFormHandler owns that
    // form. Recognised by the object the server injects rather than by the word
    // car-single in the address, which stopped being true when the car pages
    // moved to /ro/chirie-auto/<slug> and left this validation running on a
    // form whose fields it cannot find.
    if (prIsCarPage()) {
      return; // Don't prevent default, let the new BookingFormHandler handle it
    }
    e.preventDefault();
    e.stopPropagation();

    // Hide any existing messages
    $("#booking-success-notification").hide();
    hideUniversalError();

    // Check only the most essential fields before opening modal
    const phone = $(prPhoneField()).val();
    const vehicleType = $("#vehicle_type").val();

    if (!phone || phone.trim() === "") {
      showError(i18next.t("errors.phone_required"));
      return;
    }
    if (!prPhoneLooksValid(phone)) {
      showError(i18next.t("errors.please_enter_valid_phone") || "Please enter a valid phone number");
      return;
    }
    
    // Additional check: ensure phone has at least 8 digits
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      showError(i18next.t("errors.phone_invalid_length") || "Phone number must be between 8 and 15 digits");
      return;
    }

    if (!vehicleType || vehicleType.trim() === "") {
      showError(i18next.t("errors.vehicle_type_required"));
      return;
    }

    // Open the modal
    openPriceCalculator();
  });

  // Also prevent form submission event (in case the form is submitted by other means)
  $("#booking_form").on("submit", function (e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });

  // Send confirmation email (optional enhancement)
  window.closeSuccessModal = function () {
    // Hide the success modal with animation
    $("#booking-success-modal").fadeOut(300, function () {
      // Remove the modal from DOM after animation
      $(this).remove();

      // Reset the form (clears all input values: name, phone, email, message...)
      $("#booking_form")[0].reset();
      $("#total_price").val("0");

      // Clear any error states
      $(".error_input").removeClass("error_input");
      $(".field-error").remove();

      // ── RESTORE persisted phone from localStorage so returning users keep it ──
      // form.reset() clears the input AND does NOT fire 'input' event. The phone
      // validation listener in index.html relies on 'input' to sync .is-valid /
      // submit-disabled states. Without this, the checkmark + active button
      // stay stale (showing "valid" state on an empty field).
      try {
        var phoneInput = document.getElementById("phone");
        if (phoneInput) {
          var savedPhone = localStorage.getItem("pr_user_phone");
          if (savedPhone) {
            phoneInput.value = savedPhone;
          }
          // Always fire input event so validation re-syncs (.is-valid + submit
          // disabled state). If savedPhone exists → marks valid. If not → invalid.
          phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } catch (e) { /* localStorage may be blocked — graceful fallback */ }
    });
  };

  // Initialize price calculator (for modal only)
  function initializePriceCalculator() {
    // Add event listeners for price calculation (but don't show compact summary)
    $("#vehicle_type").on("change", function () {
      // Calculate price but keep compact summary hidden
      calculatePrice();
    });

    // Ensure compact summary is hidden on page load
    $("#price-summary").hide();
  }

  // Calculate and display price (for modal only - compact summary is hidden)
  function calculatePrice() {
    const vehicleSelect = $("#vehicle_type");
    const pickupDate = $("#modal-pickup-date").val();
    const returnDate = $("#modal-return-date").val();

    if (!vehicleSelect.val() || !pickupDate || !returnDate) {
      // Keep compact summary hidden
      $("#price-summary").hide();
      return;
    }

    const selectedOption = vehicleSelect.find("option:selected");
    const dailyPrice = parseFloat(selectedOption.attr("data-daily-price")) || 0;

    if (dailyPrice <= 0) {
      // Keep compact summary hidden
      $("#price-summary").hide();
      return;
    }

    // Calculate rental duration
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (duration <= 0) {
      // Keep compact summary hidden
      $("#price-summary").hide();
      return;
    }

    // Calculate costs (for internal use only)
    const baseCost = dailyPrice * duration;
    const insuranceCost = 15 * duration; // €15 per day for RCA insurance
    const totalCost = baseCost + insuranceCost;

    // Update price display (but keep hidden - only for modal)
    $("#daily-rate").text(`€${dailyPrice}`);
    $("#rental-duration").text(`${duration} day${duration > 1 ? "s" : ""}`);
    $("#insurance-cost").text(`€${insuranceCost}`);
    $("#total-estimate").text(`€${totalCost}`);

    // Keep compact summary hidden - only show in modal
    $("#price-summary").hide();
  }

  // Initialize price calculator
  initializePriceCalculator();

  // Load saved user preferences
  loadUserPreferences();

  // Add real-time validation feedback
  $("#email").on("blur", function () {
    const email = $(this).val();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      $(this).addClass("error_input");
      if (!$(this).siblings(".field-error").length) {
        $(this).after(
          `<div class="field-error text-danger small mt-1">${i18next.t(
            "errors.please_enter_valid_email"
          )}</div>`
        );
      }
    }
  });

  $("#phone").on("blur", function () {
    const phone = $(this).val();
    if (phone && !prPhoneLooksValid(phone)) {
      $(this).addClass("error_input");
      if (!$(this).siblings(".field-error").length) {
        $(this).after(
          `<div class="field-error text-danger small mt-1">${i18next.t(
            "errors.please_enter_valid_phone"
          )}</div>`
        );
      }
    }
  });

  // Save user preferences
  function saveUserPreferences() {
    const preferences = {
      name: $("#name").val(),
      email: $("#email").val(),
      phone: $("#phone").val(),
      pickup_location: $("#pickup_location").val(),
      destination: $("#destination").val(),
    };
    localStorage.setItem("bookingPreferences", JSON.stringify(preferences));
  }

  // Load user preferences
  function loadUserPreferences() {
    const saved = localStorage.getItem("bookingPreferences");
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        if (preferences.name) $("#name").val(preferences.name);
        if (preferences.email) $("#email").val(preferences.email);
        if (preferences.phone) $("#phone").val(preferences.phone);
        if (preferences.pickup_location)
          $("#pickup_location").val(preferences.pickup_location);
        if (preferences.destination)
          $("#destination").val(preferences.destination);
      } catch (e) {}
    }
  }

  // Save preferences when form is submitted successfully
  $("input, select").on("change", saveUserPreferences);

  // Initialize price calculator modal
  initializePriceCalculator();

  // Add real-time validation feedback
  $("#email").on("blur", function () {
    const email = $(this).val();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    $(this).siblings(".field-error").remove();

    if (email && !emailRegex.test(email)) {
      $(this).addClass("error_input");
      $(this).after(
        `<div class="field-error text-danger small mt-1">${i18next.t(
          "errors.please_enter_valid_email"
        )}</div>`
      );
    } else {
      $(this).removeClass("error_input");
    }
  });

  $("#phone").on("blur", function () {
    const phone = $(this).val();
    $(this).siblings(".field-error").remove();

    if (phone && !prPhoneLooksValid(phone, this)) {
      $(this).addClass("error_input");
      $(this).after(
        `<div class="field-error text-danger small mt-1">${i18next.t(
          "errors.please_enter_valid_phone"
        )}</div>`
      );
    } else {
      $(this).removeClass("error_input");
    }
  });

  // Clear error states when user starts typing
  $("input, select").on("input change", function () {
    $(this).removeClass("error_input");
    $(this).siblings(".field-error").remove();
  });
});

/* ──────────────────────────────────────────────────────────────────────
 * syncVehicleDataToModal — copies vehicle data from the visible booking
 * form (index.html) to the price-calculator-modal display elements.
 *
 * Previously lived in inline-wrapper scripts inside ro/ru/en index.html
 * (~70 lines × 3 files). Moved here as a single source of truth.
 *
 * Note: validation-booking.js's openPriceCalculator already populates
 * modal-vehicle-image / -name / -details from the `data-car-details`
 * JSON attribute of the selected <option>. This function is a fallback
 * + extension: it copies from the visible DOM elements (which may have
 * loaded fresh data from API) AND it populates fields that data-car-details
 * doesn't carry (year, location labels).
 * ────────────────────────────────────────────────────────────────────── */
function syncVehicleDataToModal() {
  var vehicleImage   = document.getElementById('vehicle-image');
  var vehicleName    = document.getElementById('vehicle-name');
  var vehicleDetails = document.getElementById('vehicle-details');

  var modalImage   = document.getElementById('modal-vehicle-image');
  var modalName    = document.getElementById('modal-vehicle-name');
  var modalDetails = document.getElementById('modal-vehicle-details');
  var modalYear    = document.getElementById('modal-vehicle-year');

  // Robust src check — don't copy '' or document URL into the modal img
  if (vehicleImage && modalImage) {
    var rawVehicleSrc = vehicleImage.getAttribute('src');
    var docUrlNoHash  = window.location.href.split('#')[0];
    var isValidVehicleSrc = rawVehicleSrc && rawVehicleSrc.trim() !== ''
                            && vehicleImage.src
                            && vehicleImage.src !== window.location.href
                            && vehicleImage.src !== docUrlNoHash;
    // Don't override modal image if it already has a valid src
    // (openPriceCalculator sets it from carDetails.head_image — authoritative)
    var rawModalSrc = modalImage.getAttribute('src');
    var modalHasValidSrc = rawModalSrc && rawModalSrc.trim() !== ''
                           && modalImage.src
                           && modalImage.src !== window.location.href
                           && modalImage.src !== docUrlNoHash;
    if (isValidVehicleSrc && !modalHasValidSrc) {
      modalImage.src = vehicleImage.src;
    }
  }

  if (vehicleName && modalName && vehicleName.textContent.trim()) {
    modalName.textContent = vehicleName.textContent.trim();
  }

  if (vehicleDetails && modalDetails && vehicleDetails.textContent.trim()) {
    modalDetails.textContent = vehicleDetails.textContent.trim();
  }

  var vehicleSelect = document.getElementById('vehicle_type');
  if (vehicleSelect && vehicleSelect.value && modalYear) {
    var selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
    var year = selectedOption.dataset.year || '-';
    modalYear.textContent = year;
  }

  var pickupChecked  = document.querySelector('input[name="pickup_location"]:checked');
  var dropoffChecked = document.querySelector('input[name="destination"]:checked');

  if (pickupChecked) {
    var pickupLabel = pickupChecked.closest('.radio-option')
      && pickupChecked.closest('.radio-option').querySelector('span:not(.radio-custom)')
      && pickupChecked.closest('.radio-option').querySelector('span:not(.radio-custom)').textContent;
    var modalPickup = document.getElementById('modal-pickup-location');
    if (modalPickup && pickupLabel) {
      modalPickup.textContent = pickupLabel.trim();
    }
  }

  if (dropoffChecked) {
    var dropoffLabel = dropoffChecked.closest('.radio-option')
      && dropoffChecked.closest('.radio-option').querySelector('span:not(.radio-custom)')
      && dropoffChecked.closest('.radio-option').querySelector('span:not(.radio-custom)').textContent;
    var modalDropoff = document.getElementById('modal-dropoff-location');
    if (modalDropoff && dropoffLabel) {
      modalDropoff.textContent = dropoffLabel.trim();
    }
  }
}

/* Save last-known vehicle data to dataset on selection change.
 * Was inline in index.html's wrapper; consolidated here. */
$(document).ready(function () {
  var vehicleSelect = document.getElementById('vehicle_type');
  if (!vehicleSelect) return;
  vehicleSelect.addEventListener('change', function () {
    setTimeout(function () {
      var vehicleImage   = document.getElementById('vehicle-image');
      var vehicleName    = document.getElementById('vehicle-name');
      var vehicleDetails = document.getElementById('vehicle-details');
      var vehiclePrice   = document.getElementById('vehicle-price');
      if (vehicleImage   && vehicleImage.src)        vehicleSelect.dataset.lastImage   = vehicleImage.src;
      if (vehicleName    && vehicleName.textContent) vehicleSelect.dataset.lastName    = vehicleName.textContent;
      if (vehicleDetails && vehicleDetails.textContent) vehicleSelect.dataset.lastDetails = vehicleDetails.textContent;
      if (vehiclePrice   && vehiclePrice.textContent)   vehicleSelect.dataset.lastPrice   = vehiclePrice.textContent;
    }, 600);
  });
});

async function openPriceCalculator() {
  // Since we removed date/time fields from main form, we'll set default values
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(today.getDate() + 2);

  const pickupDate = tomorrow.toISOString().split("T")[0];
  const returnDate = dayAfterTomorrow.toISOString().split("T")[0];

  const selectedVehicle = $("#vehicle_type option:selected");

  if (!selectedVehicle.val()) {
    if (window.showError && typeof window.showError === "function") {
      window.showError(i18next.t("errors.please_select_vehicle_first"));
    } else {
      alert(i18next.t("errors.please_select_vehicle_first"));
    }
    return;
  }

  // Populate modal fields with default values
  $("#modal-pickup-date").val(pickupDate);
  $("#modal-return-date").val(returnDate);
  $("#modal-pickup-time").val("08:00"); // Default to 8 AM
  $("#modal-return-time").val("17:00"); // Default to 6 PM

  // Set minimum dates for modal date fields
  $("#modal-pickup-date").attr("min", pickupDate);
  $("#modal-return-date").attr("min", returnDate);

  // Populate location information
  const pickupLocation = $('input[name="pickup_location"]:checked').val();
  const dropoffLocation = $('input[name="destination"]:checked').val();

  // Update pickup location with translation
  const pickupEl = $("#modal-pickup-location");
  const dropoffEl = $("#modal-dropoff-location");

  // Map location values to translation keys
  const locationMap = {
    "Chisinau Airport": "cars.chisinau_airport",
    "Our Office": "cars.our_office",
    "Iasi Airport": "cars.iasi_airport",
  };

  // Update pickup location
  if (pickupLocation) {
    pickupEl.attr(
      "data-i18n",
      locationMap[pickupLocation] || "cars.chisinau_airport"
    );
    pickupEl.text(pickupLocation);
  } else {
    pickupEl.attr("data-i18n", "");
    pickupEl.text("Not selected");
  }

  // Update dropoff location
  if (dropoffLocation) {
    dropoffEl.attr(
      "data-i18n",
      locationMap[dropoffLocation] || "cars.our_office"
    );
    dropoffEl.text(dropoffLocation);
  } else {
    dropoffEl.attr("data-i18n", "");
    dropoffEl.text("Not selected");
  }

  // Trigger i18n update
  if (typeof updateContent === "function") {
    updateContent();
  }
  // Populate vehicle info
  if (selectedVehicle.attr("data-car-details")) {
    const carDetails = JSON.parse(selectedVehicle.attr("data-car-details"));
    // Handle both local paths and full URLs for head_image
    let imageUrl;
    if (carDetails.head_image) {
      if (carDetails.head_image.startsWith("http")) {
        // Full URL (Supabase Storage)
        imageUrl = carDetails.head_image;
      } else {
        // Local path (legacy)
        imageUrl = window.API_BASE_URL + carDetails.head_image;
      }
    } else {
      imageUrl = window.API_BASE_URL + "/uploads/placeholder.png";
    }
    $("#modal-vehicle-image").attr("src", imageUrl);
    $("#modal-vehicle-name").text(
      carDetails.make_name + " " + carDetails.model_name
    );
    // Update vehicle details with translations
    const passengersText = i18next.t(
      "price_calculator.vehicle_details.passengers"
    );
    const doorsText = i18next.t("price_calculator.vehicle_details.doors");
    const carTypeKey = `price_calculator.vehicle_details.car_types.${carDetails.car_type}`;
    const carTypeText = i18next.exists(carTypeKey)
      ? i18next.t(carTypeKey)
      : carDetails.car_type;

    $("#modal-vehicle-details").text(
      `${carDetails.num_passengers || "-"} ${passengersText} • ${
        carDetails.num_doors || "-"
      } ${doorsText} • ${carTypeText}`
    );
  }

// Calculate and display prices in modal
  calculateModalPrice();

  // ============================================
  // Time validation: блокирует прошедшее время
  // и гарантирует минимум 1 час между pickup и return
  // ============================================
  const MIN_HOURS_GAP = 1; // минимум 1 час между получением и возвратом в один день

  function updateTimeOptions() {
    const pickupDateStr = $("#modal-pickup-date").val();
    const returnDateStr = $("#modal-return-date").val();
    const pickupTimeSelect = document.getElementById("modal-pickup-time");
    const returnTimeSelect = document.getElementById("modal-return-time");

    if (!pickupTimeSelect || !returnTimeSelect) return;

    // Парсим даты в формате d-m-Y
    const parseDate = (str) => {
      if (!str) return null;
      const parts = str.split("-");
      if (parts.length !== 3) return null;
      return new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0])
      );
    };

    const pickupDate = parseDate(pickupDateStr);
    const returnDate = parseDate(returnDateStr);
    if (!pickupDate || !returnDate) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentHour = new Date().getHours();

    pickupDate.setHours(0, 0, 0, 0);
    returnDate.setHours(0, 0, 0, 0);

    const isPickupToday = pickupDate.getTime() === today.getTime();
    const isSameDay = pickupDate.getTime() === returnDate.getTime();

    // ===== 1. Pickup time: блокируем прошедшие часы если pickup = сегодня =====
    Array.from(pickupTimeSelect.options).forEach((option) => {
      const hour = parseInt(option.value.split(":")[0]);
      let blocked = false;

      if (isPickupToday && hour <= currentHour) {
        blocked = true;
      }

      option.disabled = blocked;
      option.style.color = blocked ? "#ccc" : "";
    });

    // Если выбранное pickup-время заблокировано — переключить на ближайшее доступное
    const currentPickupOption = pickupTimeSelect.options[pickupTimeSelect.selectedIndex];
    if (currentPickupOption && currentPickupOption.disabled) {
      const firstOk = Array.from(pickupTimeSelect.options).find((o) => !o.disabled);
      if (firstOk) {
        pickupTimeSelect.value = firstOk.value;
      }
    }

    // ===== 2. Return time: блокируем по правилам =====
    const pickupHour = parseInt(pickupTimeSelect.value.split(":")[0]);

    Array.from(returnTimeSelect.options).forEach((option) => {
      const hour = parseInt(option.value.split(":")[0]);
      let blocked = false;

      if (isSameDay) {
        // В один день — return минимум на MIN_HOURS_GAP позже pickup
        if (hour < pickupHour + MIN_HOURS_GAP) blocked = true;
      } else if (returnDate.getTime() === today.getTime()) {
        // Return в сегодня (на всякий случай)
        if (hour <= currentHour) blocked = true;
      }

      option.disabled = blocked;
      option.style.color = blocked ? "#ccc" : "";
    });

    // Если выбранное return-время заблокировано — переключить
    const currentReturnOption = returnTimeSelect.options[returnTimeSelect.selectedIndex];
    if (currentReturnOption && currentReturnOption.disabled) {
      const firstOk = Array.from(returnTimeSelect.options).find((o) => !o.disabled);
      if (firstOk) {
        returnTimeSelect.value = firstOk.value;
      } else {
        // Если в этот день вообще нет доступного времени —
        // переключаем return на завтра
        const tomorrow = new Date(returnDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dd = String(tomorrow.getDate()).padStart(2, "0");
        const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const yyyy = tomorrow.getFullYear();
        $("#modal-return-date").val(`${dd}-${mm}-${yyyy}`);
        // разблокируем все опции
        Array.from(returnTimeSelect.options).forEach((o) => {
          o.disabled = false;
          o.style.color = "";
        });
      }
    }
  }

  // Add event listeners for real-time price updates
  $("#modal-pickup-date, #modal-return-date, #modal-pickup-time, #modal-return-time")
    .off("change")
    .on("change", function () {
      updateTimeOptions();
      calculateModalPrice();
      updateVehiclePriceDisplay();
    });

  // Применить сразу при открытии модалки
  setTimeout(updateTimeOptions, 100);

  // Show modal — single source of truth via PlusRentModal.openManaged.
  // This handles: class toggle (.open → CSS display:flex), body scroll
  // lock (position:fixed + scrollY save), ARIA, focus trap, ESC handler,
  // backdrop click close, iOS scroll engine kick + ResizeObserver +
  // MutationObserver. No inline-wrapper duplication anymore.
  var __pcm = document.getElementById("price-calculator-modal");
  if (__pcm) {
    // Sync vehicle data from index.html form to modal display elements
    // (covers fields that data-car-details JSON doesn't have, e.g. year)
    syncVehicleDataToModal();
    setTimeout(syncVehicleDataToModal, 100);
    setTimeout(syncVehicleDataToModal, 300);

    if (window.PlusRentModal && typeof window.PlusRentModal.openManaged === 'function') {
      window.PlusRentModal.openManaged(__pcm, {
        iosScrollContainer: '.modal-body',
        closeFn: window.closePriceCalculator || closePriceCalculator,
        closeOnBackdropClick: true,
      });
    } else {
      // Fallback if PlusRentModal isn't loaded for some reason
      __pcm.style.display = "flex";
    }
  }
  $("body").addClass("modal-open"); // legacy class consumers (CSS in scroll-lock.css)

  // Initialize DatePickerManager for modal

  // Get car ID from selected vehicle
  const carId = selectedVehicle.attr("data-car-id") || "7"; // Default to car ID 7 for testing

  // Initialize DatePickerManager for modal
  if (typeof DatePickerManager !== "undefined") {
    try {
      const modalDatePicker = new DatePickerManager({
        pickupInputId: "modal-pickup-date",
        returnInputId: "modal-return-date",
        carId: carId,
        isModal: true,
        customClass: "modal-return-date-picker",
        dateFormat: "d-m-Y",
        onDateChange: function () {
          calculateModalPrice();
          updateVehiclePriceDisplay();
        },
      });

      // Initialize the DatePickerManager

      await modalDatePicker.initialize();

      // Store reference globally for cleanup
      window.modalDatePicker = modalDatePicker;

      // Test if the inputs have been converted to date pickers
      setTimeout(() => {
        // Remove the manual click handlers - Flatpickr should handle clicks automatically
        // The manual click handlers were causing both calendars to open
      }, 1000);
    } catch (error) {
      console.error("DEBUG: Error initializing DatePickerManager:", error);
    }
  } else {
  }

  // Clear any previous error messages when modal opens
  hideUniversalError();

  // Add keyboard event listener for Escape key
  // Disabled: Modal should not close with Escape key
  // $(document).on("keydown.modal", function (e) {
  //   if (e.key === "Escape" && $("#price-calculator-modal").is(":visible")) {
  //     closePriceCalculator();
  //   }
  // });

  // Add click event listener to close modal when clicking outside
  // Use setTimeout to prevent immediate triggering from the opening click
  // Disabled: Modal should not close when clicking outside
  // setTimeout(function () {
  //   $(document).on("click.modal", function (e) {
  //     if (
  //       $(e.target).closest("#price-calculator-modal").length === 0 &&
  //       $("#price-calculator-modal").is(":visible")
  //     ) {
  //       closePriceCalculator();
  //     }
  //   });
  // }, 100);

  // Validate when the field is left, and on "change": a code put in by
  // auto-apply-coupon.js (after the wheel) fires input/change but never blur,
  // and the modal then priced the booking without the discount.
  $("#modal-discount-code").on("blur change", function () {
    const couponCode = $(this).val().trim();
    const customerPhone =
      (window.PhoneInput && window.PhoneInput.full(prPhoneField())) ||
      $(prPhoneField()).val();

    if (couponCode.length >= 3) {
      // Only validate if at least 3 characters
      validateCouponRealTime(couponCode, customerPhone);
    } else if (couponCode.length > 0) {
      // Clear validation state for short codes
      $("#modal-discount-code").removeClass("is-valid is-invalid");
      cachedCouponData = null;
      lastValidatedCouponCode = null;
      calculateModalPrice(); // Recalculate without discount
    } else {
      // Coupon field is empty - clear everything
      $("#modal-discount-code").removeClass("is-valid is-invalid");
      cachedCouponData = null;
      lastValidatedCouponCode = null;
      calculateModalPrice(); // Recalculate without discount
    }
  });

  // Also clear validation state when user starts typing again
  $("#modal-discount-code").on("input", function () {
    const couponCode = $(this).val().trim();
    if (couponCode.length < 3) {
      // Clear validation state while typing
      $("#modal-discount-code").removeClass("is-valid is-invalid");
      // If coupon code changed, clear cache
      if (lastValidatedCouponCode && lastValidatedCouponCode !== couponCode) {
        cachedCouponData = null;
        lastValidatedCouponCode = null;
        calculateModalPrice(); // Recalculate without discount
      }
    }
  });

  // Clear auto-apply coupons when user starts typing
$("#modal-discount-code").on("input", function (e) {
  // Only real typing: auto-apply fires a synthetic input event, and clearing
  // here threw away the code the visitor had just won.
  if (!e.originalEvent || !e.originalEvent.isTrusted) return;
  // Clear auto-apply coupons to prevent overwriting user input
  localStorage.removeItem("autoApplyCoupon");
  localStorage.removeItem("spinningWheelWinningCoupon");
  window.__autoCouponAppliedOnce = true; // Prevent future auto-apply
});
  let currentValidationAbort;

  // Real-time coupon validation function
  async function validateCouponRealTime(couponCode, customerPhone) {
    if (!couponCode || couponCode.length < 3) return;

    if (currentValidationAbort) currentValidationAbort.abort();
    currentValidationAbort = new AbortController();

    const apiBaseUrl = window.API_BASE_URL || "";
    // If the phone field exists in the modal, always include it (when non-empty)
    const phonePart = customerPhone
      ? `?phone=${encodeURIComponent(customerPhone)}`
      : "";
    const lookupUrl = `${apiBaseUrl}/api/coupons/lookup/${couponCode}${phonePart}`;

    try {
      const response = await fetch(lookupUrl, {
        signal: currentValidationAbort.signal,
      });
      const result = await response.json();

      if (result.valid) {
        $("#modal-discount-code")
          .removeClass("is-invalid")
          .addClass("is-valid");
        cachedCouponData = result;
        lastValidatedCouponCode = couponCode;
        hideFloatingFreeDaysNotification();
        // show free days if any... (existing logic)
        calculateModalPrice();
      } else {
        $("#modal-discount-code")
          .removeClass("is-valid")
          .addClass("is-invalid");
        cachedCouponData = null;
        lastValidatedCouponCode = null;
        hideFloatingFreeDaysNotification();

        // Priority: if coupon invalid, show only invalid coupon; else show phone error
        const msgKey =
          result.message === "coupons.invalid_code"
            ? "coupons.invalid_code"
            : result.message || "coupons.invalid_code";
        showError(i18next.t(msgKey));


        calculateModalPrice();
      }
    } catch (err) {
      if (err.name === "AbortError") return; // ignore canceled fetches
      $("#modal-discount-code").removeClass("is-valid is-invalid");
      cachedCouponData = null;
      lastValidatedCouponCode = null;
      hideFloatingFreeDaysNotification();
      showError(i18next.t("errors.error_validating_coupon"));
    } finally {
      currentValidationAbort = null;
    }
  }
  // Check if there's already a coupon code in the input field and validate it
  const existingCouponCode = $("#modal-discount-code").val().trim();
  if (existingCouponCode && existingCouponCode.length >= 3) {
    // Get customer phone if available
    const customerPhone =
      (window.PhoneInput && window.PhoneInput.full(prPhoneField())) ||
      $(prPhoneField()).val();
    validateCouponRealTime(existingCouponCode, customerPhone);
  } else {
    // Show free days notification if there's already a valid coupon cached
    if (
      cachedCouponData &&
      cachedCouponData.free_days != null &&
      cachedCouponData.free_days > 0
    ) {
      const freeDays = parseInt(cachedCouponData.free_days || 0);
      const message =
        freeDays === 1
          ? i18next.t("coupons.free_days_handled_in_office_singular")
          : i18next.t("coupons.free_days_handled_in_office_plural", {
              days: freeDays,
            });
      // showFloatingFreeDaysNotification(freeDays, message);
    } else {
    }
  }
}

function closePriceCalculator() {
  hideLoading();

  // Close the modal via single source of truth — PlusRentModal handles
  // class toggle (.open removed → CSS display:none), body scroll lock
  // cleanup (position/top/etc. cleared + window.scrollTo restored),
  // ARIA, keyboard handlers, backdrop click cleanup, focus restoration.
  var __pcm = document.getElementById("price-calculator-modal");
  if (__pcm) {
    if (window.PlusRentModal && typeof window.PlusRentModal.closeManaged === 'function') {
      window.PlusRentModal.closeManaged(__pcm);
    } else {
      // Fallback if PlusRentModal isn't loaded
      __pcm.style.display = "none";
    }
  }

  // Legacy body class
  $("body").removeClass("modal-open");

  // Defensive: clear any inline body locks that legacy code may have set
  // (idempotent — PlusRentModal already did this if it was the locker).
  // This protects against stuck body state if other modal scripts get
  // out of sync.
  if (document.body.style.position === 'fixed') {
    var savedScrollY = 0;
    if (document.body.dataset && document.body.dataset.scrollY) {
      savedScrollY = parseInt(document.body.dataset.scrollY, 10) || 0;
    } else if (document.body.style.top) {
      savedScrollY = Math.abs(parseInt(document.body.style.top, 10)) || 0;
    }
    document.body.style.position = "";
    document.body.style.top      = "";
    document.body.style.left     = "";
    document.body.style.right    = "";
    document.body.style.width    = "";
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    if (document.body.dataset) delete document.body.dataset.scrollY;
    if (savedScrollY > 0) window.scrollTo(0, savedScrollY);
  }

  // Remove any remaining modal backdrop if present
  $(".modal-backdrop").remove();

  // Clean up DatePickerManager
  if (window.modalDatePicker) {
    window.modalDatePicker = null;
  }

  // Re-enable any disabled elements (but DO NOT touch submit button — its disabled state
  // is managed by phone validation listener; let updateSubmitState own it)
  $("button:not(#send_message), input, select, textarea").prop("disabled", false);

  // Remove jQuery-namespaced listeners that legacy code may have added
  $(document).off("keydown.modal");
  $(document).off("click.modal");
}

async function calculateModalPrice() {
  const pickupDateStr = $("#modal-pickup-date").val();
  const returnDateStr = $("#modal-return-date").val();
  const pickupTime = $("#modal-pickup-time").val();
  const returnTime = $("#modal-return-time").val();
  const selectedVehicle = $("#vehicle_type option:selected");

  if (!selectedVehicle.val() || !pickupDateStr || !returnDateStr) {
    return;
  }

  // Get car details
  const carDetails = JSON.parse(selectedVehicle.attr("data-car-details"));

  // Get locations
  const pickupLocation =
    $('input[name="pickup_location"]:checked').val() || "Our Office";
  const dropoffLocation =
    $('input[name="destination"]:checked').val() || "Our Office";

  // Get discount code
  const discountCode = $("#modal-discount-code").val().trim();

  // Convert dates from d-m-Y to YYYY-MM-DD format
  const pickupDateISO = convertDateFormatToISO(pickupDateStr);
  const returnDateISO = convertDateFormatToISO(returnDateStr);

  // Calculate base pr
  // A rental day is 24 hours from handover, not a calendar date difference
  const days = window.RentalFees.rentalDays(
    pickupDateISO,
    returnDateISO,
    pickupTime,
    returnTime
  );

  // Get base price
  let dailyRate = 0;
  if (days >= 1 && days <= 2) {
    dailyRate = parseInt(carDetails.price_policy["1-2"]) || this.basePrice;
  } else if (days >= 3 && days <= 7) {
    dailyRate =
      parseInt(carDetails.price_policy["3-7"]) ||
      parseInt(carDetails.price_policy["1-2"]) ||
      this.basePrice;
  } else if (days >= 8 && days <= 20) {
    dailyRate =
      parseInt(carDetails.price_policy["8-20"]) ||
      parseInt(carDetails.price_policy["3-7"]) ||
      parseInt(carDetails.price_policy["1-2"]) ||
      this.basePrice;
  } else if (days >= 21 && days <= 45) {
    dailyRate =
      parseInt(carDetails.price_policy["21-45"]) ||
      parseInt(carDetails.price_policy["8-20"]) ||
      parseInt(carDetails.price_policy["3-7"]) ||
      parseInt(carDetails.price_policy["1-2"]) ||
      this.basePrice;
  } else if (days >= 46) {
    dailyRate =
      parseInt(carDetails.price_policy["46+"]) ||
      parseInt(carDetails.price_policy["21-45"]) ||
      parseInt(carDetails.price_policy["8-20"]) ||
      parseInt(carDetails.price_policy["3-7"]) ||
      parseInt(carDetails.price_policy["1-2"]) ||
      this.basePrice;
  } else {
    dailyRate = carDetails.price_policy
      ? parseFloat(carDetails.price_policy["46+"])
      : 0;
  }

  const baseCost = dailyRate * days;

  // Location and out-of-hours fees come from the shared rules in rental-fees.js,
  // so the home page modal and the car page always agree.
  const locationFees = window.RentalFees.locationFees(
    pickupLocation,
    dropoffLocation,
    days,
    modalFeeSettings
  );
  const outsideHoursFees = window.RentalFees.outsideHoursFees(
    pickupTime,
    returnTime,
    days,
    pickupLocation,
    dropoffLocation,
    modalFeeSettings
  );
  // Calculate subtotal before discount
  const subtotal = baseCost + locationFees + outsideHoursFees;

  // Apply coupon discount if available
  let discountAmount = 0;
  let totalEstimate = subtotal;

  if (
    discountCode &&
    cachedCouponData &&
    cachedCouponData.valid &&
    lastValidatedCouponCode === discountCode
  ) {
    const discountPercentage = parseFloat(
      cachedCouponData.discount_percentage || 0
    );
    if (!isNaN(discountPercentage) && discountPercentage > 0) {
      discountAmount = subtotal * (discountPercentage / 100);
      totalEstimate = subtotal - discountAmount;
    }
  }

  // Update modal display
  updateModalPriceDisplay({
    dailyRate: dailyRate,
    days: days,
    locationFees: locationFees,
    outsideHoursFees: outsideHoursFees,
    discountAmount: discountAmount,
    totalEstimate: totalEstimate,
  });
}

// Helper function to update modal price display
function updateModalPriceDisplay(priceData) {
  const currencySymbol = "€";

  
  // Update daily rate
  $("#modal-daily-rate").text(currencySymbol + priceData.dailyRate.toFixed(2));

  // Update duration - ИСПРАВЛЕНО: обновляем только число, сохраняя перевод
  $("#modal-duration-number").text(priceData.days);


  // Принудительно обновляем перевод "days"
  // The word follows the number: 1 день / 2 дня / 5 дней, 1 zi / 2 zile, 1 day / 2 days.
  // The span loses data-i18n so a later translation pass does not put back the plural-only word.
  const daysText = document.querySelector('#modal-rental-duration [data-i18n="price_calculator.days"], #modal-rental-duration .md-days');
  if (daysText) {
    const n = Math.abs(parseInt(priceData.days, 10)) || 0;
    const lang = ((window.i18next && i18next.language) || document.documentElement.lang || "ro").slice(0, 2);
    let word;
    if (lang === "ru") {
      const m10 = n % 10, m100 = n % 100;
      word = m10 === 1 && m100 !== 11 ? "день" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "дня" : "дней";
    } else if (lang === "en") {
      word = n === 1 ? "day" : "days";
    } else {
      word = n === 1 ? "zi" : "zile";
    }
    daysText.removeAttribute("data-i18n");
    daysText.classList.add("md-days");
    daysText.textContent = word;
  }

  // Update location fees
  $("#modal-location-fees").text(
    currencySymbol + priceData.locationFees.toFixed(2)
  );

  // Update outside hours fees
  $("#modal-night-premium").text(
    currencySymbol + priceData.outsideHoursFees.toFixed(2)
  );

  // Update total estimate with discount info
  let totalText = currencySymbol + priceData.totalEstimate.toFixed(2);

  if (priceData.discountAmount && priceData.discountAmount > 0) {
    // Show original price crossed out and discounted price
    const originalTotal = priceData.totalEstimate + priceData.discountAmount;
    totalText = `<span style="text-decoration: line-through; color: #999;">${currencySymbol}${originalTotal.toFixed(
      2
    )}</span> <span class="text-success">${currencySymbol}${priceData.totalEstimate.toFixed(
      2
    )}</span>`;
  }

  $("#modal-total-estimate").html(totalText);

  // The discount on its own line, as on the car pages: "Discount 7%: -€16.10"
  var $total = $("#modal-total-estimate").closest(".modal-price-item");
  var $row = $("#modal-discount-row");
  if (priceData.discountAmount && priceData.discountAmount > 0) {
    var lang = ((window.i18next && i18next.language) || document.documentElement.lang || "ro").slice(0, 2);
    var label = { ro: "Reducere", ru: "Скидка", en: "Discount" }[lang] || "Reducere";
    var pct = cachedCouponData && parseFloat(cachedCouponData.discount_percentage);
    if (!$row.length) {
      $row = $('<div class="modal-price-item modal-discount-item" id="modal-discount-row"><span class="md-label"></span><span class="md-value"></span></div>');
      $row.insertBefore($total);
    }
    $row.find(".md-label").text(label + (pct ? " " + pct + "%" : "") + ":");
    $row.find(".md-value").text("\u2212" + currencySymbol + priceData.discountAmount.toFixed(2));
  } else if ($row.length) {
    $row.remove();
  }
}

// Fallback calculation (simplified version of original)
async function calculateModalPriceFallback(rentalData) {
  const {
    car,
    pickupDate,
    returnDate,
    pickupTime,
    returnTime,
    pickupLocation,
    dropoffLocation,
  } = rentalData;

  const days = window.RentalFees.rentalDays(
    pickupDate,
    returnDate,
    pickupTime,
    returnTime
  );

  // Get base price
  let dailyRate = 0;
  if (days >= 1 && days <= 2) {
    dailyRate = car.price_policy ? parseFloat(car.price_policy["1-2"]) : 0;
  } else if (days >= 3 && days <= 7) {
    dailyRate = car.price_policy ? parseFloat(car.price_policy["3-7"]) : 0;
  } else if (days >= 8 && days <= 20) {
    dailyRate = car.price_policy ? parseFloat(car.price_policy["8-20"]) : 0;
  } else if (days >= 21 && days <= 45) {
    dailyRate = car.price_policy ? parseFloat(car.price_policy["21-45"]) : 0;
  } else {
    dailyRate = car.price_policy ? parseFloat(car.price_policy["46+"]) : 0;
  }

  const baseCost = dailyRate * days;

  const locationFees = window.RentalFees.locationFees(
    pickupLocation,
    dropoffLocation,
    days,
    modalFeeSettings
  );
  const outsideHoursFees = window.RentalFees.outsideHoursFees(
    pickupTime,
    returnTime,
    days,
    pickupLocation,
    dropoffLocation,
    modalFeeSettings
  );

  const totalEstimate = baseCost + locationFees + outsideHoursFees;

  // Update display
  updateModalPriceDisplay({
    dailyRate: dailyRate,
    days: days,
    locationFees: locationFees,
    outsideHoursFees: outsideHoursFees,
    totalEstimate: totalEstimate,
  });
}

// Update vehicle price display in modal based on current rental duration
function updateVehiclePriceDisplay() {
  const selectedVehicle = $("#vehicle_type option:selected");
  if (!selectedVehicle.attr("data-car-details")) return;

  const carDetails = JSON.parse(selectedVehicle.attr("data-car-details"));
  const pickupDateStr = $("#modal-pickup-date").val();
  const returnDateStr = $("#modal-return-date").val();

  if (!pickupDateStr || !returnDateStr) return;

  const pickupDate = new Date(pickupDateStr + "T00:00:00");
  const returnDate = new Date(returnDateStr + "T00:00:00");
  const daysDiff = Math.max(
    1,
    Math.ceil(
      (returnDate.getTime() - pickupDate.getTime()) / (1000 * 3600 * 24)
    )
  );

  let displayPrice = "0";
  if (daysDiff >= 1 && daysDiff <= 2) {
    displayPrice = carDetails.price_policy
      ? carDetails.price_policy["1-2"]
      : "0";
  } else if (daysDiff >= 3 && daysDiff <= 7) {
    displayPrice = carDetails.price_policy
      ? carDetails.price_policy["3-7"]
      : "0";
  } else if (daysDiff >= 8 && daysDiff <= 20) {
    displayPrice = carDetails.price_policy
      ? carDetails.price_policy["8-20"]
      : "0";
  } else if (daysDiff >= 21 && daysDiff <= 45) {
    displayPrice = carDetails.price_policy
      ? carDetails.price_policy["21-45"]
      : "0";
  } else {
    displayPrice = carDetails.price_policy
      ? carDetails.price_policy["46+"]
      : "0";
  }

  const currencySymbol = i18next.t(
    "price_calculator.vehicle_details.currency_symbol"
  );
  const perDayText = i18next.t("price_calculator.vehicle_details.per_day");
  $("#modal-vehicle-price").text(
    currencySymbol + displayPrice + " " + perDayText
  );
}

async function applyModalCalculation() {
  try {
    // Apply the calculated values to the main booking form
    const totalEstimate = document.getElementById(
      "modal-total-estimate"
    ).textContent;
    const dailyRate = document.getElementById("modal-daily-rate").textContent;
    const duration = document.getElementById(
      "modal-rental-duration"
    ).textContent;

    // Update the main form with calculated values
    if (document.getElementById("total_price")) {
      document.getElementById("total_price").value = totalEstimate.replace(
        "€",
        ""
      );
    } else {
    }

    // Validate age field before proceeding
    const modalCustomerAge = $("#modal-customer-age").val().trim();
    const ageInput = document.getElementById("modal-customer-age");

    // Check if age field is empty or invalid
    if (!modalCustomerAge) {
      ageInput.focus();
      ageInput.reportValidity(); // This will show the browser's native validation message
      return; // Don't proceed with submission
    }

    // Check if age is within valid range
    const age = parseInt(modalCustomerAge);
    if (isNaN(age) || age < 18 || age > 100) {
      ageInput.focus();
      ageInput.reportValidity(); // This will show the browser's native validation message
      return; // Don't proceed with submission
    }

    // Age is valid, proceed with form submission

    // Store age in a hidden field for the main form
    if (!$("#customer_age").length) {
      $("<input>")
        .attr({
          type: "hidden",
          id: "customer_age",
          name: "customer_age",
          value: modalCustomerAge,
        })
        .appendTo("#booking_form");
    } else {
      $("#customer_age").val(modalCustomerAge);
    }

    // Show loading state
    hideLoading()
    showLoading();

    // API base URL - use relative URLs for Vercel deployment
    const apiBaseUrl = window.API_BASE_URL || "";

    // Submit booking to API and return a Promise
    const bookingResult = await submitBooking();
    if (bookingResult === true) {
      // Clear any error messages before closing modal
      hideUniversalError();
      // Only close modal if booking was successful
      closePriceCalculator();
    } else {
      // Don't close modal on booking error - let user fix the issues
    }
  } catch (error) {
    if (window.showError && typeof window.showError === "function") {
      window.showError(i18next.t("errors.error_processing_booking"));
    } else {
      // Create temporary error element and use showError
      showUniversalError(i18next.t("errors.error_processing_booking"));
    }
  }
}

async function submitBooking() {
  try {
    // Collect form data
    const bookingData = collectFormData();

    // Validate booking data
    if (!bookingData.car_id || !bookingData.customer_phone) {
      if (window.showError && typeof window.showError === "function") {
        window.showError(i18next.t("errors.missing_booking_info"));
      } else {
        // Create temporary error element and use showError
        showUniversalError(i18next.t("errors.missing_booking_info"));
      }
      return false; // Return false for errors (don't throw)
    }

    // Age validation is now handled by HTML5 required attribute and min/max constraints
    // The browser will show native validation messages for empty or invalid age

    // Check if customer is returning (has existing bookings with unredeemed return gift)
    if (bookingData.customer_phone) {
      const isReturningCustomer = await checkReturningCustomer(
        bookingData.customer_phone
      );

      if (isReturningCustomer) {
        const shouldShowPopup = await showReturningCustomerAlert(
          bookingData.customer_phone
        );

        if (shouldShowPopup) {
          return false; // Exit early for returning customers on their second booking
        }
        // If popup was already shown, continue with booking
      }
    }

    // Validate coupon code if provided
    if (bookingData.discount_code && bookingData.discount_code.trim()) {
      // Validate coupon code if provided
      if (bookingData.discount_code && bookingData.discount_code.trim()) {
        try {
          const couponCode = bookingData.discount_code.trim();
          const customerPhone = bookingData.customer_phone;
          const apiBaseUrl = window.API_BASE_URL || "";

          const phonePart = customerPhone
            ? `?phone=${encodeURIComponent(customerPhone)}`
            : "";
          const response = await fetch(
            `${apiBaseUrl}/api/coupons/lookup/${couponCode}${phonePart}`
          );
          const result = await response.json();

          if (!result.valid) {
            const errorKey = result.message || "coupons.invalid_code";
            showError(i18next.t(errorKey)); // ensure user sees invalid coupon on submit
            return false;
          }
          // Optionally cache:
          // cachedCouponData = result;
          // lastValidatedCouponCode = couponCode;
        } catch (error) {
          showError(i18next.t("errors.error_validating_coupon"));
          return false;
        }
      }
    }

    // Show loading state
    hideLoading()
    showLoading();

    // API base URL - use relative URLs for Vercel deployment
    const apiBaseUrl = window.API_BASE_URL || "";

    // Submit booking to API and return a Promise
    return fetch(`${apiBaseUrl}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        hideLoading();

        if (data.success) {
          showSuccess(bookingData);
          // Clear form
          $("#booking_form")[0].reset();
          $("#total_price").val("0");
          return true; // Return success
        } else {
          // Handle validation errors with translations
          if (data.error === "Validation error" && data.field) {
            // Use the translation key that the backend sends directly
            let translationKey = data.details; // This is already 'errors.validation.dates_invalid'

            // Get translated message or fallback to server message
            let finalMessage = translationKey; // Default to the key

            // Try to translate using i18next
            if (typeof i18next !== "undefined" && i18next.t) {
              const translatedMessage = i18next.t(translationKey);

              // If translation worked (not the same as the key), use it
              if (translatedMessage && translatedMessage !== translationKey) {
                finalMessage = translatedMessage;
              } else {
              }
            } else {
            }

            showError(finalMessage);
          } else {
            // Server may return an i18n key (e.g. "coupons.phone_not_authorized",
            // "coupons.applied_successfully") in data.message or data.error.
            // Translate before showing the toast so user doesn't see raw keys.
            let msg = data.message || data.error || "Booking failed. Please try again.";
            if (
              typeof msg === "string" &&
              /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(msg) &&
              typeof i18next !== "undefined" &&
              typeof i18next.t === "function"
            ) {
              const t = i18next.t(msg);
              if (t && t !== msg) msg = t;
            }
            showError(msg);
          }
          return false; // Return false for errors (don't throw)
        }
      })
      .catch((error) => {
        hideLoading();
        showError("Network error. Please check your connection and try again.");
        return false; // Return false for network errors
      });
  } catch (error) {
    if (window.showError && typeof window.showError === "function") {
      window.showError(i18next.t("errors.error_processing_booking"));
    } else {
      // Create temporary error element and use showError
      showUniversalError(i18next.t("errors.error_processing_booking"));
    }
  }
}

window.showSuccess = function (bookingData) {
  // Trigger booking success event for coupon removal
  const bookingSuccessEvent = new CustomEvent("bookingSuccess", {
    detail: { bookingData: bookingData },
  });
  document.dispatchEvent(bookingSuccessEvent);

  // Clear returning customer popup session storage
  if (bookingData && bookingData.customer_phone) {
    clearReturningCustomerSessionStorage(bookingData.customer_phone);
  }

  // Clear auto-applied coupon
  localStorage.removeItem("autoApplyCoupon");
  localStorage.removeItem("spinningWheelWinningCoupon");

  // The request is sent, not yet confirmed: the words say so in every
  // language (the English page used to say "Booking Confirmed!").
  // Styles: css/indstyle.css, "booking success".
  const lang = ((window.i18next && i18next.language) || document.documentElement.lang || "ro").slice(0, 2);
  const W = {
    ro: { title: "Cererea de rezervare a fost trimisă", text: "Vă sunăm în curând pentru a confirma rezervarea.", total: "Total estimat", car: "Mașina", dates: "Perioada", places: "Preluare și returnare", client: "Client", ok: "Am înțeles", another: "Rezervă altă mașină" },
    ru: { title: "Заявка на бронирование отправлена", text: "Мы скоро позвоним, чтобы подтвердить бронирование.", total: "Итого", car: "Автомобиль", dates: "Срок аренды", places: "Получение и возврат", client: "Клиент", ok: "Понятно", another: "Забронировать другой автомобиль" },
    en: { title: "Booking request sent", text: "We will call you shortly to confirm the booking.", total: "Estimated total", car: "Car", dates: "Dates", places: "Pickup and return", client: "Customer", ok: "Got it", another: "Book another car" }
  }[lang] || null;
  const w = W || { title: "Cererea de rezervare a fost trimisă", text: "Vă sunăm în curând pentru a confirma rezervarea.", total: "Total estimat", car: "Mașina", dates: "Perioada", places: "Preluare și returnare", client: "Client", ok: "Am înțeles", another: "Rezervă altă mașină" };

  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // "2026-10-02" or "02-10-2026" (+ time) -> "2 oct., 08:00"
  const fmtDate = (d, t) => {
    if (!d) return "";
    let m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/), dt = null;
    if (m) dt = new Date(+m[1], +m[2] - 1, +m[3]);
    else if ((m = String(d).match(/^(\d{2})[-./](\d{2})[-./](\d{4})/))) dt = new Date(+m[3], +m[2] - 1, +m[1]);
    let out = String(d);
    if (dt && !isNaN(dt)) {
      try { out = new Intl.DateTimeFormat(lang === "ro" ? "ro-MD" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short" }).format(dt); } catch (e) {}
    }
    return t ? out + ", " + t : out;
  };

  const placeKey = { "Chisinau Airport": "cars.chisinau_airport", "Our Office": "cars.our_office", "Iasi Airport": "cars.iasi_airport" };
  const place = (v) => {
    const k = placeKey[v];
    if (k && window.i18next && i18next.t) { const t = i18next.t(k); if (t && t !== k) return t; }
    return v || "";
  };

  const carName = $("#vehicle_type option:selected").text() || "";
  const customerDisplay = bookingData.customer_name || bookingData.customer_phone || "";
  const total = parseFloat(bookingData.total_price);
  const totalText = isNaN(total) ? String(bookingData.total_price || "") : "€" + total.toFixed(2);
  const dates = fmtDate(bookingData.pickup_date, bookingData.pickup_time) + " \u2192 " + fmtDate(bookingData.return_date, bookingData.return_time);
  const places = bookingData.pickup_location === bookingData.dropoff_location
    ? place(bookingData.pickup_location)
    : place(bookingData.pickup_location) + " \u2192 " + place(bookingData.dropoff_location);

  const row = (icon, label, value) => value ? `
          <div class="bsm-row"><span class="bsm-ico" aria-hidden="true">${icon}</span><span class="bsm-row-text"><span class="bsm-label">${esc(label)}</span><span class="bsm-value">${esc(value)}</span></span></div>` : "";
  const I = {
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M3 17v-5l2-5h14l2 5v5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
  };

  const successModalHTML = `
    <div id="booking-success-modal" class="booking-success-modal" role="dialog" aria-modal="true" aria-labelledby="bsmTitle" tabindex="-1">
      <div class="bsm-card">
        <div class="bsm-head">
          <span class="bsm-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          <h2 class="bsm-title" id="bsmTitle">${esc(w.title)}</h2>
          <p class="bsm-text">${esc(w.text)}</p>
        </div>
        ${totalText ? `<div class="bsm-total"><span>${esc(w.total)}</span><strong>${esc(totalText)}</strong></div>` : ""}
        <div class="bsm-list">${row(I.car, w.car, carName)}${row(I.cal, w.dates, dates)}${row(I.pin, w.places, places)}${row(I.user, w.client, customerDisplay)}
        </div>
        <div class="bsm-actions">
          <button type="button" class="bsm-primary" onclick="closeSuccessModal()">${esc(w.ok)}</button>
          <button type="button" class="bsm-secondary" onclick="location.reload()">${esc(w.another)}</button>
        </div>
      </div>
    </div>
  `;

  $("#booking-success-modal").remove();
  $("body").append(successModalHTML);
  $("#booking-success-modal").fadeIn(250, function () {
    try { this.querySelector(".bsm-primary").focus({ preventScroll: true }); } catch (e) {}
  });
};

// Universal Error Popup System
function showUniversalError(message) {
  const popup = $("#universal-error-popup");
  const messageElement = $("#universal-error-message");

  if (popup.length === 0) {
    // Fallback to alert
    alert(message);
    return;
  }

  messageElement.html(i18next.t(message));
  popup.fadeIn(300);

  // Auto-hide after 8 seconds
  setTimeout(() => {
    hideUniversalError();
  }, 8000);
}

function hideUniversalError() {
  $("#universal-error-popup").fadeOut(300);
}

// Make functions globally available
window.showUniversalError = showUniversalError;
window.hideUniversalError = hideUniversalError;


// Debug: Test modal error display
window.testModalError = function () {
  if ($("#modal-error-message").length > 0) {
    $("#modal-error-text").text("Test error message");
    $("#modal-error-message").fadeIn(300);
  } else {
  }
};

// Debug: Track modal closing events
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("bookingModal");
  if (modal) {
    modal.addEventListener("hidden.bs.modal", function () {
      hideLoading();
    });
    modal.addEventListener("hide.bs.modal", function () {
      hideLoading();
    });
  }
});

// Debug: Track error message behavior
$(document).ready(function () {
  // Monitor when error message is shown/hidden
  const originalShowError = window.showError;
  window.showError = function (message) {
    originalShowError.call(this, message);
  };
  const originalClosePriceCalculator = window.closePriceCalculator;
  window.closePriceCalculator = function () {
    originalClosePriceCalculator.call(this);
  };
});

// Check if customer is returning (has existing bookings with unredeemed return gift)
async function checkReturningCustomer(phoneNumber) {
  try {
    const apiBaseUrl = window.API_BASE_URL || "";
    const response = await fetch(
      `${apiBaseUrl}/api/bookings/check-returning-customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to check returning customer:", response.statusText);
      // If API fails, allow booking to proceed
      return false;
    }

    const data = await response.json();

    // Customer is returning if they have one or more bookings with unredeemed return gift
    const isReturning = data.isReturningCustomer === true;

    return isReturning;
  } catch (error) {
    console.error("Error checking returning customer:", error);
    // If there's an error, allow booking to proceed
    return false;
  }
}

// Show modal for returning customers
async function showReturningCustomerAlert(phoneNumber = null) {
  // Use provided phone number or get from form input
  if (!phoneNumber) {
    // Check both possible phone input selectors
    let phoneInput = document.querySelector('input[name="customer_phone"]');
    if (!phoneInput) {
      phoneInput = document.querySelector("#phone");
    }
    phoneNumber = phoneInput ? phoneInput.value.trim() : null;
  }

  if (!phoneNumber) {
    return false;
  }

  // Get the current booking number from the API response
  let currentBookingNumber = null;
  try {
    const apiBaseUrl = window.API_BASE_URL || "";
    const response = await fetch(
      `${apiBaseUrl}/api/bookings/check-returning-customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      currentBookingNumber = data.nextBookingNumber;
    }
  } catch (error) {
    console.error("Error getting booking number:", error);
  }

  if (!currentBookingNumber) {
    return false;
  }

  // Check if we've already shown the returning customer popup for this specific phone number and booking number
  const sessionKey = `hasShownReturningCustomerPopup_${phoneNumber}_${currentBookingNumber}`;
  const hasShownReturningCustomerPopup = sessionStorage.getItem(sessionKey);

  if (hasShownReturningCustomerPopup === "true") {
    // User has already seen the popup for this phone number and booking number, allow booking to proceed

    return false; // Return false to indicate we should proceed with booking
  }

  // Set flag to indicate we've shown the popup for this phone number and booking number
  sessionStorage.setItem(sessionKey, "true");

  // Load and show the returning customer modal
  loadReturningCustomerModal();
  return true; // Return true to indicate we're showing the popup
}

// Load the returning customer modal
async function loadReturningCustomerModal() {

  // Check if modal is already loaded
  const existingModal = document.getElementById("returningCustomerModal");
  if (existingModal) {
    showReturningCustomerModal();
    return;
  }


  try {
    // Fetch active wheel configurations

    const response = await fetch("/api/spinning-wheels/enabled-configs");
    let wheelConfigs = [];

    if (response.ok) {
      const activeWheels = await response.json();

      // Convert to wheel configs format
      wheelConfigs = activeWheels.map((wheel, index) => ({
        id: wheel.id,
        name: wheel.name || `Wheel ${index + 1}`,
        type: index === 0 ? "percent" : "free-days", // Assume first is percent, second is free-days
        displayName:
          index === 0 ? "Percentage Discount Wheel" : "Free Days Wheel",
      }));
    } else {
      // Fallback: create default configs
      wheelConfigs = [
        {
          id: "active",
          name: "Spinning Wheel",
          type: "default",
          displayName: "Spinning Wheel",
        },
      ];
    }

    // Same chooser as the car pages (js/booking-form-handler.js); styles in
    // css/spin-wheel.css, scoped to #returningCustomerModal. The old inline
    // styles here (blue/green texts) are gone.
    const tr = (key, fallback) => {
      const t = (typeof i18next !== "undefined" && i18next.t) ? i18next.t(key) : "";
      return t && t !== key ? t : fallback;
    };
    const lang = (document.documentElement.lang || "ro").slice(0, 2);
    const UPTO = { ro: "până la", ru: "до", en: "up to" }[lang] || "up to";
    const texts = {
      percent: ["wheel.percentage_discount_wheel", "Percentage discount wheel", "wheel.percentage_discount_description", "Win discount percentages on your rental"],
      "free-days": ["wheel.free_days_wheel", "Free days wheel", "wheel.free_days_description", "Win free rental days for your next booking"],
      default: ["wheel.title", "Spinning Wheel", "wheel.subtitle", "Win amazing rewards"],
    };
    const icons = {
      percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>',
      "free-days": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18M9 15.5l2 2 4-4"/></svg>',
      default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.4M12 12 5.6 18.4M12 12H3"/></svg>',
    };
    const wheelOptionsHTML = wheelConfigs.map((config) => {
      const t = texts[config.type] || texts.default;
      return `
          <button type="button" class="wheel-button ${config.type}-wheel" data-wheel-id="${config.id}">
            <span class="wheel-icon-circle">${icons[config.type] || icons.default}</span>
            <span class="wheel-text-content">
              <span class="wheel-button-title">${tr(t[0], t[1])}</span>
              <span class="wheel-description">${tr(t[2], t[3])}</span>
              <span class="pr-rc-range"></span>
            </span>
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>`;
    }).join("");

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = `
      <div id="returningCustomerModal" class="returning-customer-modal" role="dialog" aria-modal="true" aria-labelledby="prRcTitle" tabindex="-1">
        <div class="pr-rc-card">
          <button type="button" class="pr-rc-close" aria-label="&times;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
          <div class="pr-rc-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v9H4v-9"></path><path d="M22 7H2v5h20V7z"></path><path d="M12 21V7"></path><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
          </div>
          <h2 class="pr-rc-title" id="prRcTitle" data-i18n="wheel.welcome_back_title">${tr("wheel.welcome_back_title", "Welcome back!")}</h2>
          <p class="pr-rc-subtitle" data-i18n="wheel.welcome_back_subtitle">${tr("wheel.welcome_back_subtitle", "Your second booking comes with a gift. Choose a wheel and try your luck.")}</p>
          <div class="pr-rc-options">
            ${wheelOptionsHTML}
          </div>
        </div>
      </div>
    `;

    // What each wheel can give, read from its prizes: "up to 14%", "up to 6 days"
    wheelConfigs.forEach((config) => {
      if (!config.id || config.id === "active") return;
      fetch(`/api/spinning-wheels/${config.id}/secure-data`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const segs = data && Array.isArray(data.segments) ? data.segments : [];
          const max = Math.max.apply(null, segs.map((x) => Number(x.value) || 0).concat(0));
          if (!max) return;
          let label = `${UPTO} ${max}%`;
          if (segs[0].type === "free_days") {
            const n10 = max % 10, n100 = max % 100;
            const ru = n10 === 1 && n100 !== 11 ? "день" : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? "дня" : "дней";
            const word = { ro: max === 1 ? "zi" : "zile", ru: ru, en: max === 1 ? "day" : "days" }[lang] || "days";
            label = `${UPTO} ${max} ${word}`;
          }
          const chip = document.querySelector(`#returningCustomerModal .wheel-button[data-wheel-id="${config.id}"] .pr-rc-range`);
          if (chip) chip.textContent = label;
        })
        .catch(() => {});
    });

    // the modal's styles first, so it never shows unstyled
    if (window.UniversalSpinningWheel && window.UniversalSpinningWheel.ensureCss) {
      await window.UniversalSpinningWheel.ensureCss();
    }
    document.body.appendChild(modalContainer.firstElementChild);

    const rcModal = document.getElementById("returningCustomerModal");
    const closeRc = () => {
      rcModal.classList.remove("show");
      document.body.classList.remove("modal-open");
    };
    rcModal.querySelector(".pr-rc-close").addEventListener("click", closeRc);
    rcModal.addEventListener("click", (e) => { if (e.target === rcModal) closeRc(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && rcModal.classList.contains("show")) closeRc(); });
    // phones: pull the sheet down to close it (js/universal-spinning-wheel.js)
    if (window.PrSheetSwipe) window.PrSheetSwipe(rcModal.querySelector(".pr-rc-card"), ".pr-rc-close");

    // Add wheel selection event listeners
    const wheelButtons = rcModal.querySelectorAll(".wheel-button");
    wheelButtons.forEach((button) => {
      button.addEventListener("click", async function () {
        const wheelId = this.getAttribute("data-wheel-id");

        // Mark return gift as redeemed before opening the spinning wheel
        await markReturnGiftAsRedeemed();
        // ✅ ДОБАВЬТЕ ЭТУ СТРОКУ - Сбросить флаг закрытия рулетки
        if (window.UniversalSpinningWheel && window.UniversalSpinningWheel.resetClosedFlag) {
          window.UniversalSpinningWheel.resetClosedFlag();
        }

        // Close the modal
        const modal = document.getElementById("returningCustomerModal");
        if (modal) {
          modal.classList.remove("show");
          document.body.classList.remove("modal-open");
        }

        // Show the spinning wheel using the same method as single car page
        if (
          window.UniversalSpinningWheel &&
          window.UniversalSpinningWheel.show
        ) {
          // Get the phone number from the form
          let phoneInput = document.querySelector(
            'input[name="customer_phone"]'
          );
          if (!phoneInput) {
            phoneInput = document.querySelector("#phone");
          }
          const phoneNumber = phoneInput ? phoneInput.value.trim() : null;

          // Show the spinning wheel modal with the specified wheel ID, skipping phone step
          window.UniversalSpinningWheel.show({
            skipPhoneStep: true,
            phoneNumber: phoneNumber,
            wheelId: wheelId,
          });
        } else {
          console.error("UniversalSpinningWheel not available");
        }
      });
    });

    // Update translations for the modal
    const updateTranslations = () => {


      if (typeof i18next !== "undefined") {

      }

      // Try multiple approaches to get translations
      let translationFunction = null;

      if (typeof i18next !== "undefined" && i18next.t) {
        translationFunction = i18next.t;
      } else if (typeof window.i18next !== "undefined" && window.i18next.t) {
        translationFunction = window.i18next.t;
      } else {
      }

      if (translationFunction) {
        // Update all elements with data-i18n attributes
        const elements = document.querySelectorAll("[data-i18n]");

        elements.forEach((element, index) => {
          const key = element.getAttribute("data-i18n");
          if (key) {
            const translation = translationFunction(key);
            if (translation && translation !== key) {
              element.textContent = translation;
            } else {
            }
          }
        });
      } else {
        // Fallback: try to get translations from the fallback system
        const currentLang = localStorage.getItem("lang") || "en";

        const fallbackTranslations = {
          en: {
            wheel: {
              welcome_back_title: "Welcome Back!",
              welcome_back_subtitle:
                "You have an unredeemed return gift waiting for you!",
              welcome_message:
                "As a returning customer, you have a special gift waiting! Choose one of the spinning wheels below to redeem your return gift and win amazing rewards.",
              percentage_discount_wheel: "Percentage Discount Wheel",
              percentage_discount_description:
                "Win discount percentages on your rental",
              free_days_wheel: "Free Days Wheel",
              free_days_description:
                "Win free rental days for your next booking",
            },
          },
        };

        const translations =
          fallbackTranslations[currentLang] || fallbackTranslations.en;

        const elements = document.querySelectorAll("[data-i18n]");

        elements.forEach((element, index) => {
          const key = element.getAttribute("data-i18n");
          if (key) {
            const keys = key.split(".");
            let value = translations;
            for (const k of keys) {
              if (value && value[k]) {
                value = value[k];
              } else {
                value = key;
                break;
              }
            } 
            if (value && value !== key) {
              element.textContent = value;
            } else {
            }
          }
        });
      }
    };

    // Show the modal first
    showReturningCustomerModal();

    // Apply translations multiple times with different delays to ensure they work
    updateTranslations();

    setTimeout(() => {
      updateTranslations();
    }, 100);

    setTimeout(() => {
      updateTranslations();
    }, 500);

    setTimeout(() => {
      updateTranslations();
    }, 1000);

    // Also apply translations when i18next is ready (in case it's still loading)
    if (typeof i18next !== "undefined") {
      i18next.on("initialized", () => {
        updateTranslations();
      });
      i18next.on("languageChanged", () => {
        updateTranslations();
      });
    } else {
    }
  } catch (error) {
    console.error("Error loading returning customer modal:", error);
  }
}

// Удалите обе старые функции и добавьте эту ОДНУ правильную функцию

async function markReturnGiftAsRedeemed() {
  try {
    // Get the phone number from the form
    let phoneInput = document.querySelector('input[name="customer_phone"]');
    if (!phoneInput) {
      phoneInput = document.querySelector("#phone");
    }
    const phoneNumber = phoneInput ? phoneInput.value.trim() : null;

    if (!phoneNumber) {
      return;
    }
    // ✅ ИСПРАВЛЕНО: Правильный URL и параметр
    const response = await fetch(
      "/api/bookings/mark-return-gift-redeemed",  // ← ИСПРАВЛЕНО
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone_number: phoneNumber }),  // ← ИСПРАВЛЕНО
      }
    );

    if (response.ok) {
      const result = await response.json();
    } else {
      const errorData = await response.json();
      console.error('❌ Failed to mark return gift:', errorData);
    }
  } catch (error) {
    console.error("❌ Error marking return gift as redeemed:", error);
  }
}

// Update modal translations
function updateModalTranslations() {
  const modal = document.getElementById("returningCustomerModal");
  if (!modal) return;

  // Check if i18next is available
  if (typeof i18next !== "undefined" && i18next.t) {
    // Update title
    const titleElement = modal.querySelector(
      '.modal-title[data-i18n="wheel.welcome_back_title"]'
    );
    if (titleElement) {
      const translatedTitle = i18next.t("wheel.welcome_back_title");
      if (translatedTitle && translatedTitle !== "wheel.welcome_back_title") {
        titleElement.textContent = translatedTitle;
      }
    }

    // Update subtitle
    const subtitleElement = modal.querySelector(
      '.modal-subtitle[data-i18n="wheel.welcome_back_subtitle"]'
    );
    if (subtitleElement) {
      const translatedSubtitle = i18next.t("wheel.welcome_back_subtitle");
      if (
        translatedSubtitle &&
        translatedSubtitle !== "wheel.welcome_back_subtitle"
      ) {
        subtitleElement.textContent = translatedSubtitle;
      }
    }

    // Update welcome message
    const welcomeMessageElement = modal.querySelector(
      '.welcome-message[data-i18n="wheel.welcome_message"]'
    );
    if (welcomeMessageElement) {
      const translatedMessage = i18next.t("wheel.welcome_message");
      if (translatedMessage && translatedMessage !== "wheel.welcome_message") {
        welcomeMessageElement.textContent = translatedMessage;
      }
    }

    // Update wheel button titles and descriptions
    const wheelButtons = modal.querySelectorAll(".wheel-button");
    wheelButtons.forEach((button) => {
      const titleElement = button.querySelector("div[data-i18n]");
      const descElement = button.querySelector(".wheel-description[data-i18n]");

      if (titleElement && titleElement.getAttribute("data-i18n")) {
        const titleKey = titleElement.getAttribute("data-i18n");
        const translatedTitle = i18next.t(titleKey);
        if (translatedTitle && translatedTitle !== titleKey) {
          titleElement.textContent = translatedTitle;
        }
      }

      if (descElement && descElement.getAttribute("data-i18n")) {
        const descKey = descElement.getAttribute("data-i18n");
        const translatedDesc = i18next.t(descKey);
        if (translatedDesc && translatedDesc !== descKey) {
          descElement.textContent = translatedDesc;
        }
      }
    });
  }
}

// Show the returning customer modal
function showReturningCustomerModal() {

  const modal = document.getElementById("returningCustomerModal");

  if (modal) {
    // The price calculator marks every other element of the page inert while
    // it is open ([inert] also gets pointer-events:none), so this window showed
    // but every tap went through to the calculator behind it, and the wheel
    // chosen here waits for the calculator to close. Close it first.
    var calc = document.getElementById("price-calculator-modal");
    if (calc && calc.classList.contains("open") && typeof window.closePriceCalculator === "function") {
      window.closePriceCalculator();
    }
    modal.removeAttribute("inert");
    modal.removeAttribute("aria-hidden");
    modal.classList.add("show");
    document.body.classList.add("modal-open");
    modal.querySelectorAll(".wheel-button[aria-busy]").forEach(function (b) { b.removeAttribute("aria-busy"); });

    // Update translations after modal is shown
    updateModalTranslations();
  } else {
    console.error("❌ Modal element not found!");
  }
}

// Clear returning customer session storage for a phone number
function clearReturningCustomerSessionStorage(phoneNumber) {
  if (!phoneNumber) return;

  // Clear all session storage keys that start with the phone number pattern
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (
      key &&
      key.startsWith(`hasShownReturningCustomerPopup_${phoneNumber}_`)
    ) {
      keysToRemove.push(key);
    }
  }

  // Remove all matching keys
  keysToRemove.forEach((key) => {
    sessionStorage.removeItem(key);
  });
}

// Debug function to check modal state
function debugModalState() {
  if (typeof i18next !== "undefined") {
  }
}

// Run debug check when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", debugModalState);
} else {
  debugModalState();
}

// Helper function to convert dd-mm-yyyy to YYYY-MM-DD
function convertDateFormatToISO(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert dd-mm-yyyy to YYYY-MM-DD
  }
  return dateStr;
}

// Show floating free days notification for modal
function showFloatingFreeDaysNotification(freeDays, message) {
  // Remove existing notification
  const existingNotification = document.getElementById(
    "free-days-notification"
  );
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.id = "free-days-notification";
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
    z-index: 9999;
    max-width: 300px;
    animation: slideInFromRight 0.5s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  notification.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    ">
      <div style="
        width: 24px;
        height: 24px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      ">
        ��
      </div>
      <span style="font-weight: 600; font-size: 14px;">${message}</span>
    </div>
    <div style="
      font-size: 13px;
      opacity: 0.9;
      font-style: italic;
      text-align: center;
    ">
 ${i18next.t("coupons.processed_in_office")}
     </div>
  `;

  // Add CSS animation if not already added
  if (!document.getElementById("free-days-notification-styles")) {
    const style = document.createElement("style");
    style.id = "free-days-notification-styles";
    style.textContent = `
      @keyframes slideInFromRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Add to page
  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  // Add close button functionality
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "&times;";
  closeButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 8px;
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
    `;

  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.opacity = "1";
  });

  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.opacity = "0.7";
  });

  closeButton.addEventListener("click", () => {
    if (notification && notification.parentElement) {
      notification.style.animation = "slideInFromRight 0.5s ease-out reverse";
      setTimeout(() => {
        if (notification && notification.parentElement) {
          notification.remove();
        }
      }, 500);
    }
  });

  notification.appendChild(closeButton);
}

// Hide free days notification
function hideFloatingFreeDaysNotification() {
  const existingNotification = document.getElementById(
    "free-days-notification"
  );
  if (existingNotification) {
    existingNotification.remove();
  }
}

// ========== MODERN TOAST NOTIFICATION SYSTEM ==========

function showToast(message, type = 'error', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('❌ Toast container not found!');
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icons = {
        error: '✕',
        success: '✓',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const titles = {
        error: typeof i18next !== 'undefined' ? i18next.t('toast.error_title', 'Error') : 'Error',
        success: typeof i18next !== 'undefined' ? i18next.t('toast.success_title', 'Success') : 'Success',
        warning: typeof i18next !== 'undefined' ? i18next.t('toast.warning_title', 'Warning') : 'Warning',
        info: typeof i18next !== 'undefined' ? i18next.t('toast.info_title', 'Info') : 'Info'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ'}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, duration);

    return toast;
}

function showErrorToast(message, duration = 5000) {
    return showToast(message, 'error', duration);
}

function showSuccessToast(message, duration = 5000) {
    return showToast(message, 'success', duration);
}

function showWarningToast(message, duration = 5000) {
    return showToast(message, 'warning', duration);
}

function showInfoToast(message, duration = 5000) {
    return showToast(message, 'info', duration);
}

// ✅ Простые обёртки для совместимости со старым кодом
function showError(message) {
    showErrorToast(message);
}

function showSuccess(message) {
    showSuccessToast(message);
}

// ✅ Делаем все функции глобально доступными
window.showToast = showToast;
window.showErrorToast = showErrorToast;
window.showSuccessToast = showSuccessToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;
window.showError = showError;
window.showSuccess = showSuccess;
