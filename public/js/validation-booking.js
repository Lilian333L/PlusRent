$(document).ready(function () {
  // Initialize booking form handler
  const bookingForm = $("#booking_form");
  const submitButton = $("#send_message");
  const successMessage = $("#success_message");
  const errorMessage = $("#error_message");
  const mailFail = $("#mail_fail");

  // API base URL from config - use relative URLs for Vercel deployment
  const apiBaseUrl = window.API_BASE_URL || "";

  // Cache for coupon data to avoid repeated API calls
  let cachedCouponData = null;
  let lastValidatedCouponCode = null;

  // Debug: Check if radio buttons are accessible on page load

  // Enhanced form validation
  function validateForm() {
    let isValid = true;
    const errors = [];

    // Clear previous error states
    $(".error_input").removeClass("error_input");
    $(".field-error").remove();

    // Required fields validation (removed date/time fields since they're now in modal)
    const requiredFields = {
      phone: i18next.t('booking.phone_number'),
      vehicle_type: i18next.t('booking.vehicle_type'),
    };
    // Check required fields
    Object.keys(requiredFields).forEach((fieldId) => {
      const field = $(`#${fieldId}`);
      const value = field.val();

      if (!value || value.trim() === "") {
        field.addClass("error_input");
        field.after(
          `<div class="field-error text-danger small mt-1">${i18next.t(`errors.${fieldId}_required`)}</div>`
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
        `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_enter_valid_email')}</div>`
      );
      errors.push(i18next.t('errors.please_enter_valid_email'));
      isValid = false;
    }

    // Phone validation
    const phone = $("#phone").val();
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (phone && !phoneRegex.test(phone)) {
      $("#phone").addClass("error_input");
      $("#phone").after(
        `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_enter_valid_phone')}</div>`
      );
      errors.push(i18next.t('errors.please_enter_valid_phone'));
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
        errors.push(i18next.t('errors.pickup_date_future'));
        isValid = false;
      }

      if (returnDate <= pickupDate) {
        errors.push(i18next.t('errors.return_date_after_pickup'));
        isValid = false;
      }
    }

    // Time validation for same-day rentals
    if (pickupTime && returnTime && pickupDateStr && returnDateStr) {
      const pickupDateTime = new Date(pickupDateStr + "T" + pickupTime);
      const returnDateTime = new Date(returnDateStr + "T" + returnTime);

      if (pickupDateStr === returnDateStr && returnDateTime <= pickupDateTime) {
        errors.push(i18next.t('errors.return_time_after_pickup'));
        isValid = false;
      }
    }

    // Additional validation for minimum rental duration
    if (pickupDateStr && returnDateStr) {
      const pickup = new Date(pickupDateStr);
      const return_dt = new Date(returnDateStr);
      const duration = Math.ceil((return_dt - pickup) / (1000 * 60 * 60 * 24));

      if (duration < 1) {
        $("#date-picker-2").addClass("error_input");
        $("#date-picker-2").after(
          `<div class="field-error text-danger small mt-1">${i18next.t('errors.minimum_rental_duration')}</div>`
        );
        errors.push(i18next.t('errors.minimum_rental_duration'));
        isValid = false;
      }
    }

    // Vehicle selection validation
    const vehicleSelect = $("#vehicle_type");
    if (vehicleSelect.val() === "" || vehicleSelect.val() === null) {
      vehicleSelect.addClass("error_input");
      vehicleSelect.after(
        `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_select_vehicle')}</div>`
      );
      errors.push(i18next.t('errors.please_select_vehicle'));
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
        `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_select_pickup_location')}</div>`
      );
      errors.push(i18next.t('errors.please_select_pickup_location'));
      isValid = false;
    }

    // Dropoff location validation (radio buttons)
    const dropoffLocationRadios = $('input[name="destination"]');
    const dropoffLocation = $('input[name="destination"]:checked').val();

    

    if (!dropoffLocation) {
      $('.radio-group:has(input[name="destination"])').addClass("error_input");
      $('.radio-group:has(input[name="destination"])').after(
        `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_select_dropoff_location')}</div>`
      );
      errors.push(i18next.t('errors.please_select_dropoff_location'));
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

    return {
      car_id: selectedOption.attr("data-car-id"),
      customer_name: safeTrim("#name"),
      customer_email: safeTrim("#email"),
      customer_phone: safeTrim("#phone"),
      customer_age:
        safeTrim("#modal-customer-age") || safeTrim("#customer_age"),
      pickup_date: $("#modal-pickup-date").val() || "",
      pickup_time: $("#modal-pickup-time").val() || "",
      return_date: $("#modal-return-date").val() || "",
      return_time: $("#modal-return-time").val() || "",
      pickup_location: $('input[name="pickup_location"]:checked').val() || "",
      dropoff_location: $('input[name="destination"]:checked').val() || "",

      special_instructions: safeTrim("#message") || null,
      total_price: parseFloat($("#total_price").val()) || 0, // Get from hidden field
      price_breakdown: {},
    };
  };

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

  // Show error message
  window.showError = function (message) {
    const errorMessage = $("#error_message");
    const errorMessageText = $("#error_message_text");
    const successMessage = $("#booking-success-notification");

    if (errorMessage.length === 0) {
      const tempError = $('<div id="error_message" class="alert alert-danger" style="display: none; margin: 20px 0;"></div>');
      $('body').prepend(tempError);
      window.showError(i18next.t('errors.error_prefix') + message);      return;
    }

    if (errorMessageText.length === 0) {
      errorMessage.html(message).show().addClass("show");
    } else {
      // Set the error message text
      errorMessageText.html(message);

      // Show error, hide success
      errorMessage.show().addClass("show");
    }

    successMessage.hide();

    // Scroll to error message
    $("html, body").animate(
      {
        scrollTop: errorMessage.offset().top - 100,
      },
      500
    );
    setTimeout(() => {
      errorMessage.hide().removeClass("show");
    }, 5000);
  };

  // Clear error states when user starts typing
  $("input, select, textarea").on("input change", function () {
    $(this).removeClass("error_input");
    $(this).siblings(".field-error").remove();

    // Hide error message when user starts interacting
    $("#error_message").hide().removeClass("show");
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
    $("#error_message").hide().removeClass("show");
  });

  // Debug: Check if submit button exists

  // Handle form submission - now opens price calculator modal
  submitButton.click(function (e) {
    
    // Skip old validation system if we're on car-single page (using new BookingFormHandler)
    if (window.location.pathname.includes("car-single")) {
      return; // Don't prevent default, let the new BookingFormHandler handle it
    }
    e.preventDefault();
    e.stopPropagation();

    // Hide any existing messages
    $("#booking-success-notification").hide();
    $("#error_message").hide().removeClass("show");
    

    // Check only the most essential fields before opening modal
    const phone = $("#phone").val();
    const vehicleType = $("#vehicle_type").val();

    if (!phone || phone.trim() === "") {
        showError(i18next.t('errors.phone_required'));
        return;
    }

    if (!vehicleType || vehicleType.trim() === "") {
        showError(i18next.t('errors.vehicle_type_required'));
        return;
    }

    // Open the modal
    openPriceCalculator();
  });

  // Also prevent form submission event (in case the form is submitted by other means)
  $("#booking_form").on("submit", function(e) {
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

      // Reset the form
      $("#booking_form")[0].reset();
      $("#total_price").val("0");

      // Clear any error states
      $(".error_input").removeClass("error_input");
      $(".field-error").remove();
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
          `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_enter_valid_email')}</div>`
        );
      }
    }
  });

  $("#phone").on("blur", function () {
    const phone = $(this).val();
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (phone && !phoneRegex.test(phone)) {
      $(this).addClass("error_input");
      if (!$(this).siblings(".field-error").length) {
        $(this).after(
          `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_enter_valid_phone')}</div>`
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
  initializePriceCalculatorModal();

  // Add real-time validation feedback
  $("#email").on("blur", function () {
    const email = $(this).val();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    $(this).siblings(".field-error").remove();

    if (email && !emailRegex.test(email)) {
      $(this).addClass("error_input");
      $(this).after(
        `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_enter_valid_email')}</div>`
      );
    } else {
      $(this).removeClass("error_input");
    }
  });

  $("#phone").on("blur", function () {
    const phone = $(this).val();
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    $(this).siblings(".field-error").remove();

    if (phone && !phoneRegex.test(phone)) {
      $(this).addClass("error_input");
      $(this).after(
        `<div class="field-error text-danger small mt-1">${i18next.t('errors.please_enter_valid_phone')}</div>`
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

function openPriceCalculator() {
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
      window.showError(i18next.t('errors.please_select_vehicle_first'));
    } else {
      alert(i18next.t('errors.please_select_vehicle_first'));
    }
    return;
  }

  // Populate modal fields with default values
  $("#modal-pickup-date").val(pickupDate);
  $("#modal-return-date").val(returnDate);
  $("#modal-pickup-time").val("08:00"); // Default to 8 AM
  $("#modal-return-time").val("17:00"); // Default to 6 PM

  // Set minimum dates for modal date fields
  const todayStr = today.toISOString().split("T")[0];
  $("#modal-pickup-date").attr("min", todayStr);
  $("#modal-return-date").attr("min", pickupDate);

  // Populate location information
  const pickupLocation = $('input[name="pickup_location"]:checked').val();
  const dropoffLocation = $('input[name="destination"]:checked').val();

// Update pickup location with translation
const pickupEl = $("#modal-pickup-location");
const dropoffEl = $("#modal-dropoff-location");

// Map location values to translation keys
const locationMap = {
  'Chisinau Airport': 'cars.chisinau_airport',
  'Our Office': 'cars.our_office',
  'Iasi Airport': 'cars.iasi_airport'
};

// Update pickup location
if (pickupLocation) {
  pickupEl.attr('data-i18n', locationMap[pickupLocation] || 'cars.chisinau_airport');
  pickupEl.text(pickupLocation);
} else {
  pickupEl.attr('data-i18n', '');
  pickupEl.text("Not selected");
}

// Update dropoff location
if (dropoffLocation) {
  dropoffEl.attr('data-i18n', locationMap[dropoffLocation] || 'cars.our_office');
  dropoffEl.text(dropoffLocation);
} else {
  dropoffEl.attr('data-i18n', '');
  dropoffEl.text("Not selected");
}

// Trigger i18n update
if (typeof updateContent === 'function') {
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
    const passengersText = i18next.t('price_calculator.vehicle_details.passengers');
    const doorsText = i18next.t('price_calculator.vehicle_details.doors');
    const carTypeKey = `price_calculator.vehicle_details.car_types.${carDetails.car_type}`;
    const carTypeText = i18next.exists(carTypeKey) ? i18next.t(carTypeKey) : carDetails.car_type;

    $("#modal-vehicle-details").text(
      `${carDetails.num_passengers || "-"} ${passengersText} • ${
        carDetails.num_doors || "-"
      } ${doorsText} • ${carTypeText}`
    );

    // Show dynamic price based on current rental duration
    const currentPickup = new Date(pickupDate + "T00:00:00");
    const currentReturn = new Date(returnDate + "T00:00:00");
    const currentDays = Math.max(
      1,
      Math.ceil(
        (currentReturn.getTime() - currentPickup.getTime()) / (1000 * 3600 * 24)
      )
    );

    let displayPrice = "0";
    if (currentDays >= 1 && currentDays <= 2) {
      displayPrice = carDetails.price_policy
        ? carDetails.price_policy["1-2"]
        : "0";
    } else if (currentDays >= 3 && currentDays <= 7) {
      displayPrice = carDetails.price_policy
        ? carDetails.price_policy["3-7"]
        : "0";
    } else if (currentDays >= 8 && currentDays <= 20) {
      displayPrice = carDetails.price_policy
        ? carDetails.price_policy["8-20"]
        : "0";
    } else if (currentDays >= 21 && currentDays <= 45) {
      displayPrice = carDetails.price_policy
        ? carDetails.price_policy["21-45"]
        : "0";
    } else {
      displayPrice = carDetails.price_policy
        ? carDetails.price_policy["46+"]
        : "0";
    }

    const currencySymbol = i18next.t('price_calculator.vehicle_details.currency_symbol');
    const perDayText = i18next.t('price_calculator.vehicle_details.per_day');
    $("#modal-vehicle-price").text(currencySymbol + displayPrice + " " + perDayText);
  }

  // Calculate and display prices in modal
  calculateModalPrice();

  // Add event listeners for real-time price updates
  $(
    "#modal-pickup-date, #modal-return-date, #modal-pickup-time, #modal-return-time"
  )
    .off("change")
    .on("change", function () {
      // Validate dates
      const pickupDate = $("#modal-pickup-date").val();
      const returnDate = $("#modal-return-date").val();

      if (pickupDate && returnDate) {
        const pickup = new Date(pickupDate);
        const return_dt = new Date(returnDate);

        if (return_dt <= pickup) {
          if (window.showError && typeof window.showError === "function") {
            window.showError(i18next.t('errors.return_date_after_pickup'));
          } else {
            alert(i18next.t('errors.return_date_after_pickup'));
          }
          return;
        }
      }

      calculateModalPrice();
      updateVehiclePriceDisplay();
    });

  // Show modal
  $("#price-calculator-modal").fadeIn(300);
  $("body").addClass("modal-open");

  // Clear any previous error messages when modal opens
  $("#error_message").hide().removeClass("show");

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

  // Add coupon validation on focus out (when user finishes typing)
  $("#modal-discount-code").on("blur", function() {
    const couponCode = $(this).val().trim();
    const customerPhone = $("#phone").val();
    
    if (couponCode.length >= 3) { // Only validate if at least 3 characters
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
  $("#modal-discount-code").on("input", function() {
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

  // Real-time coupon validation function
  async function validateCouponRealTime(couponCode, customerPhone) {
    try {
      // If we already have cached data for this exact coupon code, use it
      if (cachedCouponData && lastValidatedCouponCode === couponCode) {
        $("#modal-discount-code").removeClass("is-invalid").addClass("is-valid");
        calculateModalPrice();
        return;
      }

      const apiBaseUrl = window.API_BASE_URL || "";
      
      // Step 1: Validate coupon code without phone
      let response = await fetch(
        `${apiBaseUrl}/api/coupons/validate-redemption/${couponCode}`
      );
      let result = await response.json();

      if (!result.valid) {
        $("#modal-discount-code").removeClass("is-valid").addClass("is-invalid");
        cachedCouponData = null;
        lastValidatedCouponCode = null;
        calculateModalPrice();
        return;
      }

      // Step 2: Validate with phone if available
      if (customerPhone) {
        response = await fetch(
          `${apiBaseUrl}/api/coupons/validate-redemption/${couponCode}?phone=${encodeURIComponent(customerPhone)}`
        );
        result = await response.json();

        if (!result.valid) {
          $("#modal-discount-code").removeClass("is-valid").addClass("is-invalid");
          cachedCouponData = null;
          lastValidatedCouponCode = null;
          calculateModalPrice();
          return;
        }
      }

      // Coupon is valid - cache the data
      cachedCouponData = result;
      lastValidatedCouponCode = couponCode;
      $("#modal-discount-code").removeClass("is-invalid").addClass("is-valid");
      calculateModalPrice();
      
    } catch (error) {
      console.error("Real-time coupon validation error:", error);
      $("#modal-discount-code").removeClass("is-valid is-invalid");
      cachedCouponData = null;
      lastValidatedCouponCode = null;
      calculateModalPrice();
    }
  }
}

function closePriceCalculator() {
  // Hide the modal
  $("#price-calculator-modal").fadeOut(300);

  // Remove modal-open class to restore normal page functionality
  $("body").removeClass("modal-open");

  // Ensure body scroll is restored
  $("body").css("overflow", "");

  // Remove any remaining modal backdrop if present
  $(".modal-backdrop").remove();

  // Re-enable any disabled elements
  $("button, input, select, textarea").prop("disabled", false);

  // Remove event listeners to prevent memory leaks
  $(document).off("keydown.modal");
  $(document).off("click.modal");
}

async function calculateModalPrice() {
  const pickupDateStr = $("#modal-pickup-date").val();
  const returnDateStr = $("#modal-return-date").val();
  const selectedVehicle = $("#vehicle_type option:selected");


  if (!selectedVehicle.val() || !pickupDateStr || !returnDateStr) {
    return;
  }

  // Parse dates with proper format
  const pickupDate = new Date(pickupDateStr + "T00:00:00");
  const returnDate = new Date(returnDateStr + "T00:00:00");

  const carDetails = JSON.parse(selectedVehicle.attr("data-car-details"));

  // Calculate duration - fix the calculation
  const timeDiff = returnDate.getTime() - pickupDate.getTime();
  const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));

  // Get base price based on rental days (using backend logic)
  let dailyRate = 0;

  if (daysDiff >= 1 && daysDiff <= 2) {
    dailyRate = carDetails.price_policy
      ? parseFloat(carDetails.price_policy["1-2"])
      : 0;
  } else if (daysDiff >= 3 && daysDiff <= 7) {
    dailyRate = carDetails.price_policy
      ? parseFloat(carDetails.price_policy["3-7"])
      : 0;
  } else if (daysDiff >= 8 && daysDiff <= 20) {
    dailyRate = carDetails.price_policy
      ? parseFloat(carDetails.price_policy["8-20"])
      : 0;
  } else if (daysDiff >= 21 && daysDiff <= 45) {
    dailyRate = carDetails.price_policy
      ? parseFloat(carDetails.price_policy["21-45"])
      : 0;
  } else {
    dailyRate = carDetails.price_policy
      ? parseFloat(carDetails.price_policy["46+"])
      : 0;
  }

  // Calculate base cost
  const baseCost = dailyRate * daysDiff;

  // Calculate location fees using dynamic fee settings
  const pickupLocation = $('input[name="pickup_location"]:checked').val();
  const dropoffLocation = $('input[name="destination"]:checked').val();

  let pickupLocationFee = 0;
  let dropoffLocationFee = 0;

  // Fetch dynamic fee settings directly from API
  let outsideHoursFee = 15;
  let chisinauDropoffFee = 25;
  let iasiDropoffFee = 35;

  try {
    const response = await fetch(
      `${window.API_BASE_URL}/api/fee-settings/public`
    );
    if (response.ok) {
      const fees = await response.json();
      outsideHoursFee = fees.outside_hours_fee ?? 15;
      chisinauDropoffFee = fees.chisinau_airport_dropoff ?? 25;
      iasiDropoffFee = fees.iasi_airport_dropoff ?? 35;
    }
  } catch (error) {}

  if (pickupLocation === "Chisinau Airport") {
    pickupLocationFee = 0; // Chisinau pickup is free
  } else if (pickupLocation === "Iasi Airport") {
    pickupLocationFee = iasiDropoffFee;
  }

  if (dropoffLocation === "Chisinau Airport") {
    dropoffLocationFee = chisinauDropoffFee;
  } else if (dropoffLocation === "Iasi Airport") {
    dropoffLocationFee = iasiDropoffFee;
  }

  const totalLocationFee = pickupLocationFee + dropoffLocationFee;

  // Calculate outside working hours fees using dynamic fee settings
  let pickupTime = $("#modal-pickup-time").val() || "08:00";
  let returnTime = $("#modal-return-time").val() || "18:00";

  // Ensure the time inputs have values
  $("#modal-pickup-time").val(pickupTime);
  $("#modal-return-time").val(returnTime);

  let outsideHoursFees = 0;

  // Check if pickup is outside working hours (8:00-18:00)
  const pickupHour = parseInt(pickupTime.split(":")[0]);
  if (pickupHour < 8 || pickupHour >= 18) {
    outsideHoursFees += outsideHoursFee;
  }

  // Check if return is outside working hours (8:00-18:00)
  const returnHour = parseInt(returnTime.split(":")[0]);
  if (returnHour < 8 || returnHour >= 18) {
    outsideHoursFees += outsideHoursFee;
  }

  // Calculate total (removed insurance as requested)
  let totalCost = baseCost + totalLocationFee + outsideHoursFees;

  // Apply coupon discount if valid coupon is entered
  const couponCode = $("#modal-discount-code").val().trim();
  let discountAmount = 0;
  let discountPercentage = 0;

  if (couponCode && $("#modal-discount-code").hasClass("is-valid") && cachedCouponData) {
    // Use cached coupon data instead of making API call
    if (cachedCouponData.discount_percentage) {
      discountPercentage = cachedCouponData.discount_percentage || 0;
      discountAmount = (totalCost * discountPercentage) / 100;
    } else if (cachedCouponData.discount_amount) {
      discountAmount = cachedCouponData.discount_amount || 0;
    }
    
    // Ensure discount doesn't exceed total cost
    discountAmount = Math.min(discountAmount, totalCost);
    totalCost = Math.max(0, totalCost - discountAmount);
  }

  // Update modal display
  $("#modal-daily-rate").text("€" + dailyRate);
  $("#modal-rental-duration").html(
    daysDiff + ' <span data-i18n="price_calculator.days">days</span>'
  );
  $("#modal-location-fees").text("€" + totalLocationFee.toFixed(2));
  $("#modal-night-premium").text("€" + outsideHoursFees.toFixed(2));
  
  // Show discount if applied
  if (discountAmount > 0) {
    $("#modal-total-estimate").html(
      '<span style="text-decoration: line-through; color: #999;">€' + 
      (baseCost + totalLocationFee + outsideHoursFees).toFixed(2) + 
      '</span> €' + totalCost.toFixed(2) + 
      ' <span style="color: #28a745; font-size: 0.9em;">(-€' + discountAmount.toFixed(2) + ')</span>'
    );
  } else {
    $("#modal-total-estimate").text("€" + totalCost.toFixed(2));
  }

  // Trigger i18n update for the duration
  if (typeof updateContent === 'function') {
    updateContent();
  }
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

  const currencySymbol = i18next.t('price_calculator.vehicle_details.currency_symbol');
  const perDayText = i18next.t('price_calculator.vehicle_details.per_day');
  $("#modal-vehicle-price").text(currencySymbol + displayPrice + " " + perDayText);
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
    showLoading();

    // API base URL - use relative URLs for Vercel deployment
    const apiBaseUrl = window.API_BASE_URL || "";

    // Submit booking to API and return a Promise
    const bookingResult = await submitBooking();
    if (bookingResult === true) {
      // Clear any error messages before closing modal
      $("#error_message").hide().removeClass("show");
      // Only close modal if booking was successful
      closePriceCalculator();
    } else {
      // Don't close modal on booking error - let user fix the issues
    }
  } catch (error) {
    if (window.showError && typeof window.showError === "function") {
      window.showError(i18next.t('errors.error_processing_booking'));
    } else {
      // Create temporary error element and use showError
      const tempError = $('<div id="error_message" class="alert alert-danger" style="display: none; margin: 20px 0;"></div>');
      $('body').prepend(tempError);
      window.showError(i18next.t('errors.error_processing_booking'));
    }
  }
  
}

async function submitBooking() {
  
  try {
    // Collect form data
    const bookingData = collectFormData();

    // Validate booking data
    if (
      !bookingData.car_id ||
      !bookingData.customer_phone
    ) {
      if (window.showError && typeof window.showError === "function") {
        window.showError(i18next.t('errors.missing_booking_info'));
      } else {
        // Create temporary error element and use showError
        const tempError = $('<div id="error_message" class="alert alert-danger" style="display: none; margin: 20px 0;"></div>');
        $('body').prepend(tempError);
        window.showError(i18next.t('errors.missing_booking_info'));
      }
      return false; // Return false for errors (don't throw)
    }

    // Age validation is now handled by HTML5 required attribute and min/max constraints
    // The browser will show native validation messages for empty or invalid age

    // Validate coupon code if provided
    if (bookingData.discount_code && bookingData.discount_code.trim()) {
      try {
        const couponCode = bookingData.discount_code.trim();
        const customerPhone = bookingData.customer_phone;
        const apiBaseUrl = window.API_BASE_URL || "";

        // Step 1: Validate coupon code without phone number
        let response = await fetch(
          `${apiBaseUrl}/api/coupons/validate-redemption/${couponCode}`
        );
        let result = await response.json();

        if (!result.valid) {
          // Coupon code is invalid
          const errorMessage = result.message || i18next.t('errors.invalid_coupon_code');
          showUniversalError(errorMessage);
          return false;
        }

        // Step 2: Validate coupon code with phone number (if phone is available)
        if (customerPhone) {
          response = await fetch(
            `${apiBaseUrl}/api/coupons/validate-redemption/${couponCode}?phone=${encodeURIComponent(customerPhone)}`
          );
          result = await response.json();

          if (!result.valid) {
            // Coupon is not available for this phone number
            const errorMessage = result.message || i18next.t('errors.coupon_not_available');
            showUniversalError(errorMessage);
            return false;
          }
        }

        // Coupon is valid and available
        console.log("Coupon validation successful:", result);
        
      } catch (error) {
        console.error("Coupon validation error:", error);
        showUniversalError(i18next.t('errors.error_validating_coupon'));
        return false;
      }
    }

    // Show loading state
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
            if (typeof i18next !== 'undefined' && i18next.t) {
              const translatedMessage = i18next.t(translationKey);
              
              
              // If translation worked (not the same as the key), use it
              if (translatedMessage && translatedMessage !== translationKey) {
                finalMessage = translatedMessage;
                
              } else {
                
              }
            } else {
              
            }

            
            showUniversalError(finalMessage);
          } else {
            
            showUniversalError(
              data.message || data.error || "Booking failed. Please try again."
            );
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
    
    console.error("Error in submitBooking:", error);
    if (window.showError && typeof window.showError === "function") {
      window.showError(i18next.t('errors.error_processing_booking'));
    } else {
      // Create temporary error element and use showError
      const tempError = $('<div id="error_message" class="alert alert-danger" style="display: none; margin: 20px 0;"></div>');
      $('body').prepend(tempError);
      window.showError(i18next.t('errors.error_processing_booking'));
    }
  }
  
  
}

window.showSuccess = function (bookingData) {
  // Trigger booking success event for coupon removal
  const bookingSuccessEvent = new CustomEvent('bookingSuccess', {
    detail: { bookingData: bookingData }
  });
  document.dispatchEvent(bookingSuccessEvent);

  // Create a clean, modern success modal
  const successModalHTML = `
        <div id="booking-success-modal" class="booking-success-modal">
            <div class="success-modal-content">
                <div class="success-modal-header">
                    <div class="success-icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="24" fill="#28a745"/>
                            <path d="M20 32L14 26L15.4 24.6L20 29.2L32.6 16.6L34 18L20 32Z" fill="white"/>
                        </svg>
                    </div>
                    <h2 class="success-title">Booking Confirmed!</h2>
                    <p class="success-subtitle">Your booking has been submitted successfully</p>
                </div>
                
                <div class="success-modal-body">
                    <div class="booking-summary-card">
                        <div class="summary-compact">
                            <div class="summary-main">
                                <div class="vehicle-info">
                                    <span class="vehicle-name">${$(
                                      "#vehicle_type option:selected"
                                    ).text()}</span>
                                    <span class="customer-name">${
                                      bookingData.customer_name
                                    }</span>
                                </div>
                                <div class="booking-dates">
                                    <span class="date-range">${
                                      bookingData.pickup_date
                                    } - ${bookingData.return_date}</span>
                                    <span class="time-range">${
                                      bookingData.pickup_time
                                    } - ${bookingData.return_time}</span>
                                </div>
                                <div class="location-info">
                                    <span class="location-text">${
                                      bookingData.pickup_location
                                    } → ${bookingData.dropoff_location}</span>
                                </div>
                            </div>
                            <div class="price-highlight">
                                <span class="price-label">Total Price</span>
                                <span class="price-value">€${
                                  bookingData.total_price
                                }</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="next-steps-compact">
                        <div class="steps-icon">📞</div>
                        <div class="steps-content">
                            <h5>Next Steps</h5>
                            <p>We'll contact you within 24 hours to confirm your booking</p>
                        </div>
                    </div>
                </div>
                
                <div class="success-modal-footer">
                    <button class="btn-success-primary" onclick="closeSuccessModal()">
                        <i class="fa fa-check"></i> Got it!
                    </button>
                    <button class="btn-success-secondary" onclick="location.reload()">
                        <i class="fa fa-plus"></i> Book Another
                    </button>
                </div>
            </div>
        </div>
    `;

  // Add the modal to the page
  $("body").append(successModalHTML);

  // Add CSS for the clean success modal
  const successModalCSS = `
        <style>
            .booking-success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease-out;
            }
            
            .success-modal-content {
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 480px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                animation: slideIn 0.4s ease-out;
            }
            
            .success-modal-header {
                text-align: center;
                padding: 32px 24px 24px;
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                border-radius: 16px 16px 0 0;
                position: relative;
            }
            
            .success-icon {
                margin-bottom: 16px;
                animation: iconBounce 0.6s ease-out;
            }
            
            .success-icon svg {
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
            }
            
            .success-title {
                font-size: 1.75rem;
                font-weight: 700;
                margin: 0 0 8px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .success-subtitle {
                font-size: 0.95rem;
                margin: 0;
                opacity: 0.95;
                font-weight: 400;
            }
            
            .success-modal-body {
                padding: 24px;
            }
            
            .booking-summary-card {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid #e9ecef;
            }
            
            .summary-compact {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .summary-main {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .vehicle-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .vehicle-name {
                font-size: 1.1rem;
                font-weight: 600;
                color: #495057;
            }
            
            .customer-name {
                font-size: 0.95rem;
                color: #6c757d;
                font-weight: 500;
            }
            
            .booking-dates {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .date-range {
                font-size: 0.95rem;
                font-weight: 600;
                color: #495057;
            }
            
            .time-range {
                font-size: 0.85rem;
                color: #6c757d;
            }
            
            .location-info {
                margin-top: 4px;
            }
            
            .location-text {
                font-size: 0.9rem;
                color: #495057;
                font-weight: 500;
            }
            
            .price-highlight {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 16px;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
            }
            
            .price-label {
                font-size: 0.9rem;
            }
            
            .price-value {
                font-size: 1.1rem;
            }
            
            .next-steps-compact {
                background: #e8f5e8;
                border-radius: 12px;
                padding: 16px;
                border-left: 4px solid #28a745;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .steps-icon {
                font-size: 1.4rem;
                flex-shrink: 0;
            }
            
            .steps-content h5 {
                color: #28a745;
                margin: 0 0 4px 0;
                font-weight: 600;
                font-size: 0.95rem;
            }
            
            .steps-content p {
                margin: 0;
                color: #495057;
                font-size: 0.85rem;
                line-height: 1.4;
            }
            
            .success-modal-footer {
                padding: 20px 24px 24px;
                text-align: center;
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .btn-success-primary, .btn-success-secondary {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-success-primary {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            }
            
            .btn-success-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
            }
            
            .btn-success-secondary {
                background: #6c757d;
                color: white;
                box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
            }
            
            .btn-success-secondary:hover {
                background: #5a6268;
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-30px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes iconBounce {
                0% { 
                    transform: scale(0.3);
                    opacity: 0;
                }
                50% { 
                    transform: scale(1.1);
                }
                100% { 
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @media (max-width: 768px) {
                .success-modal-content {
                    width: 95%;
                    margin: 10px;
                    max-height: 90vh;
                }
                
                .success-modal-header {
                    padding: 24px 20px 20px;
                }
                
                .success-icon svg {
                    width: 40px;
                    height: 40px;
                }
                
                .success-title {
                    font-size: 1.5rem;
                }
                
                .success-subtitle {
                    font-size: 0.9rem;
                }
                
                .success-modal-body {
                    padding: 20px;
                }
                
                .booking-summary-card {
                    padding: 16px;
                    margin-bottom: 16px;
                }
                
                .vehicle-name {
                    font-size: 1rem;
                }
                
                .customer-name {
                    font-size: 0.9rem;
                }
                
                .date-range {
                    font-size: 0.9rem;
                }
                
                .time-range {
                    font-size: 0.8rem;
                }
                
                .location-text {
                    font-size: 0.85rem;
                }
                
                .price-highlight {
                    padding: 14px;
                }
                
                .price-value {
                    font-size: 1rem;
                }
                
                .next-steps-compact {
                    padding: 14px;
                    gap: 10px;
                }
                
                .steps-icon {
                    font-size: 1.2rem;
                }
                
                .steps-content h5 {
                    font-size: 0.9rem;
                }
                
                .steps-content p {
                    font-size: 0.8rem;
                }
                
                .success-modal-footer {
                    padding: 16px 20px 20px;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .btn-success-primary, .btn-success-secondary {
                    width: 100%;
                    justify-content: center;
                    padding: 14px 20px;
                    font-size: 0.9rem;
                }
            }
        </style>
    `;

  // Add CSS to head if not already present
  if (!$("#success-modal-styles").length) {
    $("head").append(successModalCSS);
  }

  // Show the modal with animation
  $("#booking-success-modal").fadeIn(300);

  // Update i18n content if available
  if (typeof updateContent === "function") {
    updateContent();
  }
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
    
    messageElement.html(message);
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

// Override the existing showError function to use popup
window.showError = function(message) {
    showUniversalError(message);
};

// Debug: Test modal error display
window.testModalError = function() {

    if ($("#modal-error-message").length > 0) {
        $("#modal-error-text").text("Test error message");
        $("#modal-error-message").fadeIn(300);
    } else {
    }
};

// Debug: Track modal closing events
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.addEventListener('hidden.bs.modal', function() {
      console.log("=== MODAL CLOSED EVENT DETECTED ===");
      console.trace("Modal close stack trace:");
    });
    
    modal.addEventListener('hide.bs.modal', function() {
      console.log("=== MODAL HIDE EVENT DETECTED ===");
      console.trace("Modal hide stack trace:");
    });
  }
});

// Debug: Track error message behavior
$(document).ready(function() {
  // Monitor when error message is shown/hidden
  const originalShowError = window.showError;
  window.showError = function(message) {
    console.log("=== SHOW ERROR CALLED ===");
    console.log("Error message:", message);
    console.log("Error element:", $("#error_message")[0]);
    console.log("Modal visible:", $("#price-calculator-modal").is(":visible"));
    originalShowError.call(this, message);
  };
  
  // Monitor modal open/close
  const originalClosePriceCalculator = window.closePriceCalculator;
  window.closePriceCalculator = function() {
    console.log("=== CLOSE PRICE CALCULATOR CALLED ===");
    console.log("Error message visible before close:", $("#error_message").is(":visible"));
    originalClosePriceCalculator.call(this);
    console.log("Error message visible after close:", $("#error_message").is(":visible"));
  };
});
