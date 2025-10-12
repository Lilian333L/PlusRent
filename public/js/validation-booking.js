// Global variables for coupon caching
let cachedCouponData = null;
let lastValidatedCouponCode = null;
let modalFeeSettings = {
  outside_hours_fee: 15,
  chisinau_airport_pickup: 0,
  chisinau_airport_dropoff: 25,
  iasi_airport_pickup: 35,
  iasi_airport_dropoff: 35,
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
    const phone = $("#phone").val();
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (phone && !phoneRegex.test(phone)) {
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
      customer_phone: safeTrim("#phone"),
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
    console.log("submitButton clicked");
    // Skip old validation system if we're on car-single page (using new BookingFormHandler)
    if (window.location.pathname.includes("car-single")) {
      return; // Don't prevent default, let the new BookingFormHandler handle it
    }
    e.preventDefault();
    e.stopPropagation();

    // Hide any existing messages
    $("#booking-success-notification").hide();
    hideUniversalError();

    // Check only the most essential fields before opening modal
    const phone = $("#phone").val();
    const vehicleType = $("#vehicle_type").val();

    if (!phone || phone.trim() === "") {
      showError(i18next.t("errors.phone_required"));
      return;
    }
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phone.trim())) {
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
          `<div class="field-error text-danger small mt-1">${i18next.t(
            "errors.please_enter_valid_email"
          )}</div>`
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
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    $(this).siblings(".field-error").remove();

    if (phone && !phoneRegex.test(phone)) {
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

        // if (return_dt <= pickup) {
        //   if (window.showError && typeof window.showError === "function") {
        //     window.showError(i18next.t('errors.return_date_after_pickup'));
        //   } else {
        //     alert(i18next.t('errors.return_date_after_pickup'));
        //   }
        //   return;
        // }
      }

      calculateModalPrice();
      updateVehiclePriceDisplay();
    });

  // Show modal
  $("#price-calculator-modal").fadeIn(300);
  $("body").addClass("modal-open");

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

  // Add coupon validation on focus out (when user finishes typing)
  $("#modal-discount-code").on("blur", function () {
    const couponCode = $(this).val().trim();
    const customerPhone = $("#phone").val();

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
$("#modal-discount-code").on("input", function () {
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
    // const customerPhone = $("#modal-customer-phone").val() || $("#modal-customer-phone").val() || null;
    // Validate the existing coupon
    // validateCouponRealTime(existingCouponCode, customerPhone);
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
  // Hide the modal
  $("#price-calculator-modal").fadeOut(300);

  // Remove modal-open class to restore normal page functionality
  $("body").removeClass("modal-open");

  // Ensure body scroll is restored
  $("body").css("overflow", "");

  // Remove any remaining modal backdrop if present
  $(".modal-backdrop").remove();

  // Clean up DatePickerManager
  if (window.modalDatePicker) {
    window.modalDatePicker = null;
  }

  // Re-enable any disabled elements
  $("button, input, select, textarea").prop("disabled", false);

  // Remove event listeners to prevent memory leaks
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
  const pickup = new Date(pickupDateISO + "T00:00:00");
  const return_dt = new Date(returnDateISO + "T00:00:00");
  const days = Math.max(
    1,
    Math.ceil((return_dt - pickup) / (1000 * 60 * 60 * 24))
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

  // Calculate location fees
  let locationFees = 0;
  if (pickupLocation === "Chisinau Airport") {
  locationFees += modalFeeSettings.chisinau_airport_pickup || 0;
} else if (pickupLocation === "Iasi Airport") {
  locationFees += modalFeeSettings.iasi_airport_pickup || 0;
} else {
  locationFees += modalFeeSettings.office_pickup || 0;
}

if (dropoffLocation === "Chisinau Airport") {
  locationFees += modalFeeSettings.chisinau_airport_dropoff || 0;
} else if (dropoffLocation === "Iasi Airport") {
  locationFees += modalFeeSettings.iasi_airport_dropoff || 0;
} else {
  locationFees += modalFeeSettings.office_dropoff || 0;
}

  // Calculate outside hours fees
  let outsideHoursFees = 0;
  const pickupHour = parseInt(pickupTime.split(":")[0]);
  const returnHour = parseInt(returnTime.split(":")[0]);
  if (pickupHour < 8 || pickupHour >= 18) outsideHoursFees += modalFeeSettings.outside_hours_fee || 0;
  if (returnHour < 8 || returnHour >= 18) outsideHoursFees += modalFeeSettings.outside_hours_fee || 0;
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
  const daysText = document.querySelector('#modal-rental-duration [data-i18n="price_calculator.days"]');
  if (daysText && typeof i18next !== 'undefined' && i18next.isInitialized) {
  daysText.textContent = i18next.t('price_calculator.days');
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

  // Calculate days
  const pickup = new Date(pickupDate + "T00:00:00");
  const return_dt = new Date(returnDate + "T00:00:00");
  const days = Math.max(
    1,
    Math.ceil((return_dt - pickup) / (1000 * 60 * 60 * 24))
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

  // Simple location fees
  let locationFees = 0;
  if (pickupLocation === "Chisinau Airport") locationFees += 25;
  if (pickupLocation === "Iasi Airport") locationFees += 35;
  if (dropoffLocation === "Chisinau Airport") locationFees += 25;
  if (dropoffLocation === "Iasi Airport") locationFees += 35;

  // Simple outside hours calculation
  let outsideHoursFees = 0;
  const pickupHour = parseInt(pickupTime.split(":")[0]);
  const returnHour = parseInt(returnTime.split(":")[0]);
  if (pickupHour < 8 || pickupHour >= 18) outsideHoursFees += 15;
  if (returnHour < 8 || returnHour >= 18) outsideHoursFees += 15;

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
            showError(
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

  // Clear returning customer popup session storage for this phone number
  // This allows the popup to show again for the next booking
  if (bookingData && bookingData.customer_phone) {
    clearReturningCustomerSessionStorage(bookingData.customer_phone);
  }

  // Clear auto-applied coupon from localStorage after successful booking
  localStorage.removeItem("autoApplyCoupon");
  localStorage.removeItem("spinningWheelWinningCoupon");

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
                    <h2 class="success-title" data-i18n="booking.success_title"></h2>
                    <p class="success-subtitle" data-i18n="booking.success_subtitle"></p>
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
                                <span class="price-label" data-i18n="booking.total_price"></span>
                                <span class="price-value">€${
                                  bookingData.total_price
                                }</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="next-steps-compact">
                        <div class="steps-icon">📞</div>
                        <div class="steps-content" >
                            <h5 data-i18n="booking.next_steps"></h5>
                            <p data-i18n="booking.confirmation_timeline"></p>
                        </div>
                    </div>
                </div>
                
                <div class="success-modal-footer">
                    <button class="btn-success-primary" data-i18n="booking.got_it" data-i18n-processed="true" onclick="closeSuccessModal()">
                    </button>
                    <button class="btn-success-secondary" data-i18n="booking.book_another" data-i18n-processed="true" onclick="location.reload()">
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
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.4s ease-out;
        padding: 20px;
    }
    
    .success-modal-content {
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
        max-width: 520px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
    }
    
    .success-modal-header {
        text-align: center;
        padding: 40px 30px 30px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border-radius: 24px 24px 0 0;
        position: relative;
        overflow: hidden;
    }
    
    /* Декоративные элементы в заголовке */
    .success-modal-header::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%;
        width: 200px;
        height: 200px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
    }
    
    .success-modal-header::after {
        content: '';
        position: absolute;
        bottom: -30%;
        left: -10%;
        width: 150px;
        height: 150px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 50%;
    }
    
    .success-icon {
        margin-bottom: 20px;
        animation: iconBounce 0.8s ease-out;
        position: relative;
        z-index: 1;
    }
    
    .success-icon svg {
        filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
        width: 64px;
        height: 64px;
    }
    
    .success-title {
        font-size: 2rem;
        font-weight: 800;
        margin: 0 0 12px;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        letter-spacing: -0.5px;
        position: relative;
        z-index: 1;
    }
    
    .success-subtitle {
        font-size: 1rem;
        margin: 0;
        opacity: 0.95;
        font-weight: 400;
        line-height: 1.5;
        position: relative;
        z-index: 1;
    }
    
    .success-modal-body {
        padding: 30px;
    }
    
    .booking-summary-card {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    
    .summary-compact {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    
    .summary-main {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    
    .vehicle-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e2e8f0;
    }
    
    .vehicle-name {
        font-size: 1.2rem;
        font-weight: 700;
        color: #1e293b;
        letter-spacing: -0.3px;
    }
    
    .customer-name {
        font-size: 1rem;
        color: #64748b;
        font-weight: 500;
    }
    
    .booking-dates {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px 16px;
        background: white;
        border-radius: 10px;
        border-left: 4px solid #10b981;
    }
    
    .date-range {
        font-size: 1rem;
        font-weight: 700;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .date-range::before {
        content: '📅';
        font-size: 1.1rem;
    }
    
    .time-range {
        font-size: 0.9rem;
        color: #64748b;
        padding-left: 28px;
    }
    
    .location-info {
        margin-top: 8px;
        padding: 12px 16px;
        background: white;
        border-radius: 10px;
        border-left: 4px solid #3b82f6;
    }
    
    .location-text {
        font-size: 0.95rem;
        color: #1e293b;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .location-text::before {
        content: '📍';
        font-size: 1.1rem;
    }
    
    .price-highlight {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .price-label {
        font-size: 0.95rem;
        opacity: 0.95;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .price-value {
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.5px;
    }
    
    .next-steps-compact {
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #3b82f6;
        display: flex;
        align-items: flex-start;
        gap: 16px;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
    }
    
    .steps-icon {
        font-size: 1.8rem;
        flex-shrink: 0;
        line-height: 1;
    }
    
    .steps-content h5 {
        color: #1e40af;
        margin: 0 0 8px 0;
        font-weight: 700;
        font-size: 1rem;
    }
    
    .steps-content p {
        margin: 0;
        color: #475569;
        font-size: 0.9rem;
        line-height: 1.6;
    }
    
    .success-modal-footer {
        padding: 24px 30px 30px;
        text-align: center;
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
        background: #fafafa;
        border-radius: 0 0 24px 24px;
    }
    
    .btn-success-primary, .btn-success-secondary {
        padding: 14px 28px;
        border: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        letter-spacing: 0.3px;
        position: relative;
        overflow: hidden;
    }
    
    .btn-success-primary::before,
    .btn-success-secondary::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
    }
    
    .btn-success-primary:hover::before,
    .btn-success-secondary:hover::before {
        width: 300px;
        height: 300px;
    }
    
    .btn-success-primary {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
        flex: 1;
        min-width: 180px;
    }
    
    .btn-success-primary:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.5);
    }
    
    .btn-success-primary:active {
        transform: translateY(-1px);
    }
    
    .btn-success-secondary {
        background: linear-gradient(135deg, #64748b 0%, #475569 100%);
        color: white;
        box-shadow: 0 4px 16px rgba(100, 116, 139, 0.3);
        flex: 1;
        min-width: 180px;
    }
    
    .btn-success-secondary:hover {
        background: linear-gradient(135deg, #475569 0%, #334155 100%);
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(100, 116, 139, 0.4);
    }
    
    .btn-success-secondary:active {
        transform: translateY(-1px);
    }
    
    @keyframes fadeIn {
        from { 
            opacity: 0; 
        }
        to { 
            opacity: 1; 
        }
    }
    
    @keyframes slideIn {
        from { 
            opacity: 0;
            transform: translateY(-40px) scale(0.9);
        }
        to { 
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    @keyframes iconBounce {
        0% { 
            transform: scale(0);
            opacity: 0;
        }
        50% { 
            transform: scale(1.15);
        }
        70% {
            transform: scale(0.95);
        }
        100% { 
            transform: scale(1);
            opacity: 1;
        }
    }
    
    /* Улучшенная прокрутка */
    .success-modal-content::-webkit-scrollbar {
        width: 8px;
    }
    
    .success-modal-content::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 0 24px 24px 0;
    }
    
    .success-modal-content::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
    }
    
    .success-modal-content::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
    
    @media (max-width: 768px) {
        .booking-success-modal {
            padding: 10px;
        }
        
        .success-modal-content {
            width: 100%;
            max-height: 95vh;
            border-radius: 20px;
        }
        
        .success-modal-header {
            padding: 30px 20px 24px;
            border-radius: 20px 20px 0 0;
        }
        
        .success-icon svg {
            width: 52px;
            height: 52px;
        }
        
        .success-title {
            font-size: 1.6rem;
        }
        
        .success-subtitle {
            font-size: 0.95rem;
        }
        
        .success-modal-body {
            padding: 24px 20px;
        }
        
        .booking-summary-card {
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .vehicle-name {
            font-size: 1.1rem;
        }
        
        .customer-name {
            font-size: 0.95rem;
        }
        
        .date-range {
            font-size: 0.95rem;
        }
        
        .time-range {
            font-size: 0.85rem;
        }
        
        .location-text {
            font-size: 0.9rem;
        }
        
        .price-highlight {
            padding: 18px;
        }
        
        .price-value {
            font-size: 1.3rem;
        }
        
        .next-steps-compact {
            padding: 16px;
            gap: 12px;
        }
        
        .steps-icon {
            font-size: 1.5rem;
        }
        
        .steps-content h5 {
            font-size: 0.95rem;
        }
        
        .steps-content p {
            font-size: 0.85rem;
        }
        
        .success-modal-footer {
            padding: 20px;
            flex-direction: column;
            gap: 12px;
        }
        
        .btn-success-primary, .btn-success-secondary {
            width: 100%;
            min-width: auto;
            justify-content: center;
            padding: 16px 24px;
            font-size: 0.95rem;
        }
    }
    
    @media (max-width: 480px) {
        .success-modal-content {
            border-radius: 16px;
        }
        
        .success-modal-header {
            padding: 24px 16px 20px;
            border-radius: 16px 16px 0 0;
        }
        
        .success-title {
            font-size: 1.4rem;
        }
        
        .success-subtitle {
            font-size: 0.9rem;
        }
        
        .success-modal-body {
            padding: 20px 16px;
        }
        
        .booking-summary-card {
            padding: 16px;
        }
        
        .vehicle-name {
            font-size: 1rem;
        }
        
        .price-value {
            font-size: 1.2rem;
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
    document
      .querySelectorAll("[data-i18n]:not([data-i18n-processed])")
      .forEach(function (element) {
        updateContent();
        element.setAttribute("data-i18n-processed", "true");
      });
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

    // Create wheel options HTML based on enabled configurations
    let wheelOptionsHTML = "";

    if (wheelConfigs.length > 0) {
      wheelConfigs.forEach((config, index) => {
        // Get translations
        const titleKey =
          config.type === "percent"
            ? "wheel.percentage_discount_wheel"
            : config.type === "free-days"
            ? "wheel.free_days_wheel"
            : "wheel.title";
        const descKey =
          config.type === "percent"
            ? "wheel.percentage_discount_description"
            : config.type === "free-days"
            ? "wheel.free_days_description"
            : "wheel.subtitle";

        // Use fallback text initially, translations will be applied later
        const title = config.displayName;
        const description =
          config.type === "percent"
            ? "Win discount percentages on your rental"
            : config.type === "free-days"
            ? "Win free rental days for your next booking"
            : "Win amazing rewards";

        wheelOptionsHTML += `
          <button class="wheel-button ${config.type}-wheel" data-wheel-id="${config.id}">
            <div>
              <div data-i18n="${titleKey}">${title}</div>
              <div class="wheel-description" data-i18n="${descKey}">${description}</div>
            </div>
          </button>
        `;

      });
    } else {
      // Fallback if no configurations found
      wheelOptionsHTML = `
        <button class="wheel-button default-wheel" data-wheel-id="active">
          <div>
            <div>Spinning Wheel</div>
            <div class="wheel-description">Win amazing rewards</div>
          </div>
        </button>
      `;
    }

    // Create modal container
    const modalContainer = document.createElement("div");
    const modalHTML = `
      <div id="returningCustomerModal" class="returning-customer-modal quickbook-returning-modal">
        <div class="modal-content">
          <button class="modal-close" onclick="this.closest('.returning-customer-modal').classList.remove('show'); document.body.classList.remove('modal-open');">×</button>
          <div class="modal-header">
            <h2 class="modal-title" data-i18n="wheel.welcome_back_title">Welcome Back!</h2>
            <p class="modal-subtitle" data-i18n="wheel.welcome_back_subtitle">You have an unredeemed return gift waiting for you!</p>
          </div>
          <div class="modal-body">
            <div class="welcome-message" data-i18n="wheel.welcome_message">
              As a returning customer, you have a special gift waiting! Choose one of the spinning wheels below to redeem your return gift and win amazing rewards.
            </div>
            <div class="wheel-options">
              ${wheelOptionsHTML}
            </div>
          </div>
        </div>
      </div>
    `;

    modalContainer.innerHTML = modalHTML;

    // Add modal styles
    const modalStyles = document.createElement("style");
    modalStyles.textContent = `
      .quickbook-returning-modal.returning-customer-modal {
        display: none !important;
        position: fixed !important;
        z-index: 10000 !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(5px) !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
      }
      .quickbook-returning-modal.returning-customer-modal.show {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 1 !important;
      }
      .quickbook-returning-modal .modal-content {
        background: white !important;
        border-radius: 20px !important;
        width: 90% !important;
        max-width: 1000px !important;
        max-height: 85vh !important;
        position: relative !important;
        overflow: hidden !important;
        transform: scale(0.9) !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
      }
      .quickbook-returning-modal.returning-customer-modal.show .modal-content {
        transform: scale(1) !important;
      }
      .quickbook-returning-modal .modal-close {
        position: absolute !important;
        top: 15px !important;
        right: 20px !important;
        font-size: 28px !important;
        cursor: pointer !important;
        color: #FFFFFF !important;
        z-index: 10 !important;
        width: 30px !important;
        height: 30px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: none !important;
        border-radius: 50% !important;
        border: none !important;
        transition: all 0.3s ease !important;
      }
      .quickbook-returning-modal .modal-close:hover {
        background: none !important;
        transform: scale(1.1) !important;
      }
      .quickbook-returning-modal .modal-header {
        background: linear-gradient(135deg, #20b2aa 0%, #1e90ff 100%) !important;
        color: white !important;
        padding: 20px !important;
        text-align: center !important;
        border-radius: 20px 20px 0 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .quickbook-returning-modal .modal-title {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        margin: 0 !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3) !important;
        font-family: Arial, sans-serif !important;
        color: white !important;
      }
      .quickbook-returning-modal .modal-subtitle {
        font-size: 1rem !important;
        margin: 10px 0 0 0 !important;
        opacity: 0.9 !important;
        font-family: Arial, sans-serif !important;
        color: white !important;
      }
      .quickbook-returning-modal .modal-body {
        padding: 40px 30px !important;
        text-align: center !important;
      }
      .quickbook-returning-modal .welcome-message {
        font-size: 1.2rem !important;
        color: #333 !important;
        margin-bottom: 30px !important;
        line-height: 1.6 !important;
      }
      #returningCustomerModal.quickbook-returning-modal .wheel-options {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
        margin-top: 30px !important;
        justify-content: center !important;
      }
      #returningCustomerModal.quickbook-returning-modal .wheel-button {
        padding: 20px 30px !important;
        border: none !important;
        border-radius: 15px !important;
        font-size: 1.1rem !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        text-decoration: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 15px !important;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
        flex: 1 !important;
      }
      #returningCustomerModal.quickbook-returning-modal .wheel-button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2) !important;
      }
      #returningCustomerModal.quickbook-returning-modal .wheel-button.percent-wheel {
        background: linear-gradient(135deg, #20b2aa 0%, #1e90ff 100%) !important;
        color: white !important;
      }
      #returningCustomerModal.quickbook-returning-modal .wheel-button.free-days-wheel {
        background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%) !important;
        color: white !important;
      }
      #returningCustomerModal.quickbook-returning-modal .wheel-button div:first-child {
        font-size: 1.1rem !important;
        font-weight: 600 !important;
        margin-bottom: 5px !important;
      }
      #returningCustomerModal.quickbook-returning-modal .wheel-description {
        font-size: 0.9rem !important;
        opacity: 0.9 !important;
        margin-top: 5px !important;
      }
      @media (max-width: 768px) {
        .quickbook-returning-modal.returning-customer-modal {
          padding: 10px !important;
        }
        .quickbook-returning-modal .modal-content {
          margin: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          max-height: calc(100vh - 20px) !important;
          border-radius: 15px !important;
        }
        .quickbook-returning-modal .modal-header {
          padding: 15px !important;
          border-radius: 15px 15px 0 0 !important;
        }
        .quickbook-returning-modal .modal-title {
          font-size: 1.3rem !important;
          line-height: 1.2 !important;
        }
        .quickbook-returning-modal .modal-subtitle {
          font-size: 0.9rem !important;
          margin: 8px 0 0 0 !important;
        }
        .quickbook-returning-modal .modal-body {
          padding: 20px 15px !important;
        }
        .quickbook-returning-modal .welcome-message {
          font-size: 1rem !important;
          margin-bottom: 20px !important;
          line-height: 1.4 !important;
        }
        #returningCustomerModal.quickbook-returning-modal .wheel-options {
          flex-direction: column !important;
          gap: 12px !important;
          margin-top: 20px !important;
        }
        #returningCustomerModal.quickbook-returning-modal .wheel-button {
          padding: 15px 20px !important;
          font-size: 0.95rem !important;
          min-height: 60px !important;
        }
        #returningCustomerModal.quickbook-returning-modal .wheel-button div:first-child {
          font-size: 1rem !important;
          margin-bottom: 3px !important;
        }
        #returningCustomerModal.quickbook-returning-modal .wheel-description {
          font-size: 0.85rem !important;
          line-height: 1.3 !important;
        }
        .quickbook-returning-modal .modal-close {
          top: 10px !important;
          right: 15px !important;
          width: 25px !important;
          height: 25px !important;
          font-size: 20px !important;
        }
      }
      
      @media (max-width: 480px) {
        .quickbook-returning-modal .modal-content {
          margin: 5px !important;
          max-height: calc(100vh - 10px) !important;
          border-radius: 10px !important;
        }
        .quickbook-returning-modal .modal-header {
          padding: 12px !important;
          border-radius: 10px 10px 0 0 !important;
        }
        .quickbook-returning-modal .modal-title {
          font-size: 1.2rem !important;
        }
        .quickbook-returning-modal .modal-subtitle {
          font-size: 0.85rem !important;
        }
        .quickbook-returning-modal .modal-body {
          padding: 15px 12px !important;
        }
        .quickbook-returning-modal .welcome-message {
          font-size: 0.95rem !important;
          margin-bottom: 15px !important;
        }
        #returningCustomerModal.quickbook-returning-modal .wheel-options {
          gap: 10px !important;
          margin-top: 15px !important;
        }
        #returningCustomerModal.quickbook-returning-modal .wheel-button {
          padding: 12px 15px !important;
          font-size: 0.9rem !important;
          min-height: 55px !important;
        }
        #returningCustomerModal.quickbook-returning-modal .wheel-button div:first-child {
          font-size: 0.95rem !important;
        }
        #returningCustomerModal.quickbook-returning-modal .wheel-description {
          font-size: 0.8rem !important;
        }
      }
    `;

    // Add styles to head
    document.head.appendChild(modalStyles);

    // Add modal to page
    document.body.appendChild(modalContainer.firstElementChild);

    // Add wheel selection event listeners
    const wheelButtons = document.querySelectorAll(".wheel-button");
    wheelButtons.forEach((button) => {
      button.addEventListener("click", async function () {
        const wheelId = this.getAttribute("data-wheel-id");

        // Mark return gift as redeemed before opening the spinning wheel
        await markReturnGiftAsRedeemed();

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

// Mark return gift as redeemed
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

    // Call the API to mark return gift as redeemed
    const response = await fetch(
      "/api/spinning-wheels/mark-return-gift-redeemed",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: phoneNumber }),
      }
    );

    if (response.ok) {
    } else {
      console.error(
        "Failed to mark return gift as redeemed:",
        response.statusText
      );
    }
  } catch (error) {
    console.error("Error marking return gift as redeemed:", error);
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
    modal.classList.add("show");
    document.body.classList.add("modal-open");

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
    console.log(`🔔 showToast called: ${type} - ${message}`);
    
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
    console.log('🔴 showError called:', message);
    showErrorToast(message);
}

function showSuccess(message) {
    console.log('🟢 showSuccess called:', message);
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


