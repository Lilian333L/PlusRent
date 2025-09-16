// Price Calculator for Car Rental
// Handles pricing logic based on location, insurance, working hours, and discounts

class PriceCalculator {
  constructor(car = null) {
    // Use car's price policy if available, otherwise fallback to default
    this.car = car;
    this.basePrice =
      car && car.price_policy && car.price_policy["1-2"]
        ? parseInt(car.price_policy["1-2"])
        : 60; // Default fallback

    this.workingHours = {
      start: 8, // 8:00 AM
      end: 18, // 6:00 PM
    };

    // Dynamic fee settings - will be loaded from API
    this.feeSettings = {
      outside_hours_fee: 15,
      chisinau_airport_pickup: 0,
      chisinau_airport_dropoff: 25,
      iasi_airport_pickup: 35,
      iasi_airport_dropoff: 35,
      office_pickup: 0,
      office_dropoff: 0,
    };

    // Legacy location fees (for backward compatibility)
    this.locationFees = {
      "Chisinau Airport": 25,
      "Our Office": 0,
      "Iasi Airport": 35,
    };

    // Legacy outside hours fee (for backward compatibility)
    this.outsideHoursFee = 15;

    // Load dynamic fee settings from API
    this.loadFeeSettings();

    // Discount codes are managed via backend API - no hardcoded rates needed
  }

  // Load fee settings from API
  async loadFeeSettings() {
    try {
      const response = await fetch(
        `${window.API_BASE_URL}/api/fee-settings/public`
      );
      if (response.ok) {
        const feeData = await response.json();
        // Update fee settings with API data
        Object.assign(this.feeSettings, feeData);

        // Update legacy properties for backward compatibility
        this.outsideHoursFee = this.feeSettings.outside_hours_fee || 15;
        this.locationFees = {
          "Chisinau Airport": this.feeSettings.chisinau_airport_pickup || 0,
          "Our Office": 0,
          "Iasi Airport": this.feeSettings.iasi_airport_pickup || 35,
        };

        // Trigger price recalculation after fee settings are loaded
        if (this.recalculatePrice) {
          this.recalculatePrice().catch((error) => {});
        }
      } else {
      }
    } catch (error) {}
  }

  // Update car data (called when car data is loaded)
  updateCarData(car) {
    this.car = car;
    this.basePrice =
      car && car.price_policy && car.price_policy["1-2"]
        ? parseInt(car.price_policy["1-2"])
        : 60;

    // Insurance costs removed - no longer needed
  }

  // Check if time is outside working hours (8:00-18:00)
  isOutsideWorkingHours(time) {
    const hour = parseInt(time.split(":")[0]);
    return hour < 8 || hour >= 18;
  }

  // Calculate number of days between two dates
  calculateDays(pickupDate, returnDate) {
    const pickup = new Date(pickupDate);
    const return_ = new Date(returnDate);
    const diffTime = return_.getTime() - pickup.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // Minimum 1 day
  }

  // Helper function to convert dd-mm-yyyy to YYYY-MM-DD
  convertDateFormatToISO(dateStr) {
    if (!dateStr) return "";
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Convert dd-mm-yyyy to YYYY-MM-DD
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const converted = `${parts[2]}-${parts[1]}-${parts[0]}`;

      return converted;
    }

    return dateStr;
  }

  // Calculate base price for the rental period
  calculateBasePrice(days) {
    if (!this.car || !this.car.price_policy) {
      return this.basePrice * days;
    }
    let pricePerDay = 0;

    if (days >= 1 && days <= 2) {
      pricePerDay = parseInt(this.car.price_policy["1-2"]) || this.basePrice;
    } else if (days >= 3 && days <= 7) {
      pricePerDay =
        parseInt(this.car.price_policy["3-7"]) ||
        parseInt(this.car.price_policy["1-2"]) ||
        this.basePrice;
    } else if (days >= 8 && days <= 20) {
      pricePerDay =
        parseInt(this.car.price_policy["8-20"]) ||
        parseInt(this.car.price_policy["3-7"]) ||
        parseInt(this.car.price_policy["1-2"]) ||
        this.basePrice;
    } else if (days >= 21 && days <= 45) {
      pricePerDay =
        parseInt(this.car.price_policy["21-45"]) ||
        parseInt(this.car.price_policy["8-20"]) ||
        parseInt(this.car.price_policy["3-7"]) ||
        parseInt(this.car.price_policy["1-2"]) ||
        this.basePrice;
    } else if (days >= 46) {
      pricePerDay =
        parseInt(this.car.price_policy["46+"]) ||
        parseInt(this.car.price_policy["21-45"]) ||
        parseInt(this.car.price_policy["8-20"]) ||
        parseInt(this.car.price_policy["3-7"]) ||
        parseInt(this.car.price_policy["1-2"]) ||
        this.basePrice;
    } else {
      // Fallback for edge cases
      pricePerDay = this.basePrice;
    }

    return pricePerDay * days;
  }

  // Calculate location delivery fee
  calculateLocationFee(location) {
    return this.locationFees[location] || 0;
  }

  // Calculate outside working hours fees
  calculateOutsideHoursFees(pickupTime, returnTime) {
    let fees = 0;

    // Check if pickup is outside working hours (8:00-18:00)
    const pickupOutside = this.isOutsideWorkingHours(pickupTime);
    if (pickupOutside) {
      fees += this.feeSettings.outside_hours_fee ?? 15; // Dynamic fee for pickup outside working hours
    }

    // Check if return is outside working hours (8:00-18:00)
    const returnOutside = this.isOutsideWorkingHours(returnTime);
    if (returnOutside) {
      fees += this.feeSettings.outside_hours_fee ?? 15; // Dynamic fee for return outside working hours
    }

    return fees;
  }

  // Apply discount
  applyDiscount(totalPrice, discountCode) {
    // If no discount code, return original price
    if (!discountCode || discountCode.trim() === "") {
      return totalPrice;
    }

    // Check if we have cached validation data for this coupon
    if (
      window.cachedCouponData &&
      window.lastValidatedCouponCode === discountCode.trim()
    ) {
      const discountPercentage = parseFloat(
        window.cachedCouponData.discount_percentage || 0
      );

      if (discountPercentage > 0) {
        const discountAmount = totalPrice * (discountPercentage / 100);

        return totalPrice - discountAmount;
      }
    }

    return totalPrice;
  }

  // Helper method to get discount percentage
  getDiscountPercentage(discountCode) {
    // Check if we have cached validation data
    if (
      window.cachedCouponData &&
      window.lastValidatedCouponCode === discountCode
    ) {
      return parseFloat(window.cachedCouponData.discount_percentage || 0);
    }

    // If no cached data, return 0 (no discount)
    return 0;
  }

  // Main calculation function
  calculatePrice(rentalData) {
    const {
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      pickupLocation,
      discountCode,
    } = rentalData;

    // Calculate days
    const days = this.calculateDays(pickupDate, returnDate);

    // Calculate base price
    const basePrice = this.calculateBasePrice(days);

    // Get dropoff location from rentalData
    const dropoffLocation =
      rentalData.dropoffLocation || rentalData.destination || "";

    // Calculate location fees using dynamic fee settings
    let pickupLocationFee = 0;
    let dropoffLocationFee = 0;

    // Pickup fees
    if (pickupLocation === "Chisinau Airport") {
      pickupLocationFee = this.feeSettings.chisinau_airport_pickup || 0;
    } else if (pickupLocation === "Iasi Airport") {
      pickupLocationFee = this.feeSettings.iasi_airport_pickup || 35;
    } else {
      pickupLocationFee = this.feeSettings.office_pickup || 0;
    }

    // Dropoff fees
    if (dropoffLocation === "Chisinau Airport") {
      dropoffLocationFee = this.feeSettings.chisinau_airport_dropoff || 25;
    } else if (dropoffLocation === "Iasi Airport") {
      dropoffLocationFee = this.feeSettings.iasi_airport_dropoff || 35;
    } else {
      dropoffLocationFee = this.feeSettings.office_dropoff || 0;
    }

    const totalLocationFee = pickupLocationFee + dropoffLocationFee;

    // Insurance cost removed - no longer needed
    const insuranceCost = 0;

    // Calculate outside hours fees
    const outsideHoursFees = this.calculateOutsideHoursFees(
      pickupTime,
      returnTime
    );

    // Calculate subtotal
    const subtotal =
      basePrice + totalLocationFee + insuranceCost + outsideHoursFees;

    // Apply discount

    const finalPrice = this.applyDiscount(subtotal, discountCode);

    // Return detailed breakdown
    return {
      days,
      basePrice,
      locationFee: totalLocationFee,
      insuranceCost,
      outsideHoursFees,
      subtotal,
      discount: this.calculateDiscountAmount(subtotal, discountCode),
      discountAmount: this.calculateDiscountAmount(subtotal, discountCode), // Add this
      finalPrice,
      // Add these properties that updatePriceDisplay expects:
      totalPrice: finalPrice, // Add this
      rentalDays: days, // Add this
      breakdown: {
        "Price per day": `${basePrice}€`,
        "Total days": `x ${days}`,
        "Location delivery":
          totalLocationFee > 0 ? `+ ${totalLocationFee} €` : "Included",
        "Outside hours pickup": this.isOutsideWorkingHours(pickupTime)
          ? `+ ${this.feeSettings.outside_hours_fee} €`
          : "Included",
        "Outside hours return": this.isOutsideWorkingHours(returnTime)
          ? `+ ${this.feeSettings.outside_hours_fee} €`
          : "Included",
        Discount: discountCode
          ? `- ${Math.round(
              this.calculateDiscountAmount(subtotal, discountCode)
            )} €`
          : "None",
      },
    };
  }

  // Validate discount code
  async validateDiscountCode(code) {
    if (!code || code.trim() === "") {
      return { valid: false, message: "Please enter a discount code" };
    }

    try {
      // Get customer phone number for validation
      const customerPhone =
        document.querySelector("#phone")?.value?.trim() ||
        document.querySelector('[name="customer_phone"]')?.value?.trim();

      // First try to validate as a redemption code (individual codes) with phone number if available
      let redemptionResponse;
      if (customerPhone) {
        redemptionResponse = await fetch(
          `${
            window.API_BASE_URL
          }/api/coupons/validate-redemption/${code.trim()}?phone=${encodeURIComponent(
            customerPhone
          )}`
        );
      } else {
        redemptionResponse = await fetch(
          `${
            window.API_BASE_URL
          }/api/coupons/validate-redemption/${code.trim()}`
        );
      }

      const redemptionResult = await redemptionResponse.json();

      if (redemptionResult.valid) {
        return redemptionResult;
      }

      // If not a redemption code, try as a main coupon code
      const couponResponse = await fetch(
        `${window.API_BASE_URL}/api/coupons/validate/${code.trim()}`
      );
      const couponResult = await couponResponse.json();
      return couponResult;
    } catch (error) {
      return { valid: false, message: "Error validating discount code" };
    }
  }

  // Get available discount codes (for reference)
  getAvailableDiscountCodes() {
    return []; // No hardcoded discount codes
  }

  // Update the price display
  updatePriceDisplay(priceData) {
    console.log("updatePriceDisplay priceData---", priceData);
    const priceContainer = document.getElementById("price-content");
    const loadingElement = document.getElementById("price-loading");

    if (!priceContainer) {
      return;
    }

    // Hide loading state
    if (loadingElement) {
      loadingElement.style.display = "none";
    }

    // Check if we have valid data
    if (!priceData || priceData.finalPrice === 0) {
      let message =
        typeof i18next !== "undefined"
          ? i18next.t("cars.please_fill_dates")
          : "Please fill in the dates and times to see the price breakdown";
      let messageStyle =
        "color: #666; background: white; border: 1px solid #ddd;";

      // Show specific error message if provided
      if (priceData.error) {
        message = priceData.error;
        messageStyle =
          "color: #dc3545; background: #f8d7da; border: 1px solid #f5c6cb;";
      }

      // Show specific message if provided (not an error)
      if (priceData.message) {
        message = priceData.message;
        messageStyle =
          "color: #666; background: white; border: 1px solid #ddd;";
      }

      priceContainer.innerHTML = `<div style="text-align: center; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); ${messageStyle}">${message}</div>`;
      return;
    }

    const t = (key) => {
      const fallbackTranslations = {
        "cars.price_breakdown": "Price Breakdown",
        "cars.price_per_day": "Price per day",
        "cars.total_days": "Total days",
        "cars.pickup": "Pickup",
        "cars.dropoff": "Dropoff",
        "cars.insurance": "Insurance",
        "cars.total_price": "Total price",
        "cars.please_fill_dates":
          "Please fill in the dates and times to see the price breakdown",
        "cars.chisinau_airport": "Chisinau Airport",
        "cars.iasi_airport": "Iasi Airport",
      };
      return fallbackTranslations[key] || key;
    };

    let html =
      '<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">';
    html += `<h5 style="margin-bottom: 15px; color: #333;">${i18next.t(
      "price_calculator.price_breakdown"
    )}</h5>`;

    // Always show base price calculation
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
      "cars.price_per_day"
    )}</span><span>${Math.round(
      priceData.basePrice / priceData.rentalDays
    )}€</span></div>`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
      "cars.total_days"
    )}</span><span>x ${priceData.rentalDays}</span></div>`;

    // Add pickup location
    const pickupLocation =
      this.getSelectedRadioValue("pickup_location") || "Our Office";
    const dropoffLocation =
      this.getSelectedRadioValue("dropoff_location") || "Our Office";

    if (pickupLocation !== "Our Office") {
      let pickupFee = 0;
      let locationName = pickupLocation;

      if (pickupLocation === "Chisinau Airport") {
        pickupFee = this.feeSettings.chisinau_airport_pickup ?? 0;
      } else if (pickupLocation === "Iasi Airport") {
        pickupFee = this.feeSettings.iasi_airport_pickup ?? 35;
      }

      if (pickupFee > 0) {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
          "price_calculator.pickup_location"
        )} ${locationName}</span><span>${pickupFee}€</span></div>`;
      }
    }

    if (dropoffLocation !== "Our Office") {
      let dropoffFee = 0;
      let locationName = dropoffLocation;

      if (dropoffLocation === "Chisinau Airport") {
        dropoffFee = this.feeSettings.chisinau_airport_dropoff ?? 25;
      } else if (dropoffLocation === "Iasi Airport") {
        dropoffFee = this.feeSettings.iasi_airport_dropoff ?? 35;
      }

      if (dropoffFee > 0) {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
          "price_calculator.dropoff_location"
        )}: ${locationName}</span><span>${dropoffFee}€</span></div>`;
      }
    }

    // Add breakdown items that have costs
    // Insurance removed - no longer needed

    if (priceData.outsideHoursFees > 0) {
      const pickupHour = parseInt(priceData.pickupTime.split(":")[0]);
      const returnHour = parseInt(priceData.returnTime.split(":")[0]);
      const outsideHoursFee = this.feeSettings.outside_hours_fee ?? 15;

      // Show separate fees for pickup and dropoff if both are outside hours
      if (
        (pickupHour < 8 || pickupHour >= 18) &&
        (returnHour < 8 || returnHour >= 18)
      ) {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
          "price_calculator.outside_hours"
        )} ${i18next.t("price_calculator.pickup_time")} (${
          priceData.pickupTime
        })</span><span>${outsideHoursFee}€</span></div>`;
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
          "price_calculator.outside_hours"
        )} ${i18next.t("price_calculator.return_time")} (${
          priceData.returnTime
        })</span><span>${outsideHoursFee}€</span></div>`;
      } else if (pickupHour < 8 || pickupHour >= 18) {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
          "price_calculator.outside_hours"
        )} ${i18next.t("price_calculator.pickup_time")} (${
          priceData.pickupTime
        })</span><span>${outsideHoursFee}€</span></div>`;
      } else if (returnHour < 8 || returnHour >= 18) {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
          "price_calculator.outside_hours"
        )} ${i18next.t("price_calculator.return_time")} (${
          priceData.returnTime
        })</span><span>${outsideHoursFee}€</span></div>`;
      }
    } else {
    }

    if (priceData.discountAmount > 0) {
      const discountCode =
        document.querySelector('input[name="discount_code"]')?.value || "";
      html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${i18next.t(
        "price_calculator.discount_code"
      )} (${discountCode})</span><span>-${priceData.discountAmount.toFixed(
        2
      )}€</span></div>`;
    }

    // Add total
    html += '<div style="border-top: 1px solid #ddd; margin: 12px 0;"></div>';
    html += `<div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 18px;"><span>${i18next.t(
      "cars.total_price"
    )}:</span><span>${Math.round(priceData.totalPrice)} €</span></div>`;

    html += "</div>";
    priceContainer.innerHTML = html;
  }

  // Update outside hours notice
  updateOutsideHoursNotice(pickupTime, returnTime) {
    const notice = document.getElementById("outside-hours-notice");
    const details = document.getElementById("outside-hours-details");

    if (!notice || !details) return;

    const pickupHour = parseInt(pickupTime.split(":")[0]);
    const returnHour = parseInt(returnTime.split(":")[0]);

    let isOutsideHours = false;
    let detailsText = "";

    // Check pickup time
    if (pickupHour < 8 || pickupHour >= 18) {
      isOutsideHours = true;
      detailsText += `• ${i18next.t('price_calculator.pickup_at')} ${pickupTime} (${i18next.t('price_calculator.outside_working_hours')})<br>`;
    }

    // Check return time
    if (returnHour < 8 || returnHour >= 18) {
      isOutsideHours = true;
      detailsText += `• ${i18next.t('price_calculator.return_at')} ${returnTime} (${i18next.t('price_calculator.outside_working_hours')})<br>`;
    }

    if (isOutsideHours) {
      details.innerHTML = detailsText;
      notice.style.display = "block";
    } else {
      notice.style.display = "none";
    }
  }

  // Initialize the price calculator
  async init() {
    try {
      await this.loadFeeSettings();
    } catch (error) {}
  }

  // Show default calculation on page load
  async showDefaultCalculation() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pickupDateInput = document.getElementById("date-picker");
    const returnDateInput = document.getElementById("date-picker-2");
    const pickupTimeSelect = document.getElementById("pickup-time");
    const returnTimeSelect = document.getElementById("collection-time");

    // Wait for daterangepicker to be initialized
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (pickupDateInput && returnDateInput) {
      // Set the values in YYYY-MM-DD format
      const todayFormatted = this.formatDate(today);
      const tomorrowFormatted = this.formatDate(tomorrow);

      // Try to set dates using jQuery daterangepicker if available
      if (window.jQuery && window.jQuery.fn.daterangepicker) {
        try {
          // Set dates using daterangepicker's setStartDate method
          const $pickupPicker = window.jQuery("#date-picker");
          const $returnPicker = window.jQuery("#date-picker-2");

          if ($pickupPicker.length && $pickupPicker.data("daterangepicker")) {
            $pickupPicker
              .data("daterangepicker")
              .setStartDate(window.moment(todayFormatted));
          }

          if ($returnPicker.length && $returnPicker.data("daterangepicker")) {
            $returnPicker
              .data("daterangepicker")
              .setStartDate(window.moment(tomorrowFormatted));
          }
        } catch (error) {}
      }

      // Also set the values directly as backup
      pickupDateInput.value = todayFormatted;
      returnDateInput.value = tomorrowFormatted;

      // Set the attribute as well
      pickupDateInput.setAttribute("value", todayFormatted);
      returnDateInput.setAttribute("value", tomorrowFormatted);

      // Also set the defaultValue property
      pickupDateInput.defaultValue = todayFormatted;
      returnDateInput.defaultValue = tomorrowFormatted;

      // Trigger multiple events to ensure the browser recognizes the change
      ["input", "change", "blur"].forEach((eventType) => {
        pickupDateInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        returnDateInput.dispatchEvent(new Event(eventType, { bubbles: true }));
      });

      // Double-check the values are set
      setTimeout(() => {}, 100);
    }

    // Set default times if time selects exist
    if (pickupTimeSelect && pickupTimeSelect.options.length > 0) {
      // Set to 08:00 (start of working hours) if available, otherwise first option
      const eightAMOption = Array.from(pickupTimeSelect.options).find(
        (option) => option.value === "08:00"
      );
      if (eightAMOption) {
        pickupTimeSelect.value = "08:00";
      } else {
        pickupTimeSelect.value = pickupTimeSelect.options[0].value;
      }
      pickupTimeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (returnTimeSelect && returnTimeSelect.options.length > 0) {
      // Set to 18:00 (end of working hours) if available, otherwise first option
      const sixPMOption = Array.from(returnTimeSelect.options).find(
        (option) => option.value === "17:00"
      );
      if (sixPMOption) {
        returnTimeSelect.value = "17:00";
      } else {
        returnTimeSelect.value = returnTimeSelect.options[0].value;
      }
      returnTimeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Set default radio button selections
    this.setDefaultRadioSelections();

    // Wait a bit to ensure all changes are processed
    await new Promise((resolve) => setTimeout(resolve, 300));

    await this.recalculatePrice();
  }

  // Set default radio button selections
  setDefaultRadioSelections() {
    // Set Our Office as default pickup location
    const ourOfficeRadio = document.querySelector(
      'input[name="pickup_location"][value="Our Office"]'
    );
    if (ourOfficeRadio) {
      ourOfficeRadio.checked = true;
    }

    // Set Our Office as default dropoff location - try both possible names
    let ourOfficeDropoffRadio = document.querySelector(
      'input[name="dropoff_location"][value="Our Office"]'
    );
    if (!ourOfficeDropoffRadio) {
      ourOfficeDropoffRadio = document.querySelector(
        'input[name="destination"][value="Our Office"]'
      );
    }
    if (ourOfficeDropoffRadio) {
      ourOfficeDropoffRadio.checked = true;
    }
  }

  // Ensure date input returns YYYY-MM-DD format
  formatDateInput(dateInput) {
    if (!dateInput.value) return "";

    // Parse the date and return in YYYY-MM-DD format
    const date = new Date(dateInput.value);
    if (isNaN(date.getTime())) return "";

    return this.formatDate(date);
  }

  // Format date to YYYY-MM-DD for consistency
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Show loading state
  showLoading() {
    const priceContainer = document.getElementById("price-content");
    const loadingElement = document.getElementById("price-loading");

    if (priceContainer && loadingElement) {
      loadingElement.style.display = "flex";
    }
  }

  // Debounced recalculation to prevent excessive API calls
  debouncedRecalculate() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Show loading state
    this.showLoading();

    this.debounceTimer = setTimeout(() => {
      this.recalculatePrice().catch((error) => {});
    }, 300);
  }

  // Recalculate price based on current form values
  // Recalculate price based on current form values
  async recalculatePrice() {
    try {
      const pickupDateInput = document.getElementById("date-picker");
      const returnDateInput = document.getElementById("date-picker-2");
      const pickupTimeSelect = document.getElementById("pickup-time");
      const returnTimeSelect = document.getElementById("collection-time");
      const discountCodeInput = document.querySelector(
        'input[name="discount_code"]'
      );

      if (
        !pickupDateInput ||
        !returnDateInput ||
        !pickupTimeSelect ||
        !returnTimeSelect
      ) {
        return;
      }

      // Get values and convert date format if needed
      const pickupDate = this.convertDateFormatToISO(pickupDateInput.value);
      const returnDate = this.convertDateFormatToISO(returnDateInput.value);
      const pickupTime = pickupTimeSelect.value;
      const returnTime = returnTimeSelect.value;
      const discountCode = discountCodeInput
        ? discountCodeInput.value.trim()
        : "";

      // Get location values BEFORE using them in debug
      const pickupLocation =
        this.getSelectedRadioValue("pickup_location") || "Our Office";
      const dropoffLocation =
        this.getSelectedRadioValue("dropoff_location") || "Our Office";

      // Validate dates
      if (!pickupDate || !returnDate) {
        this.updatePriceDisplay({
          totalPrice: 0,
          breakdown: [],
          message: i18next.t("price_calculator.select_dates_message"),
        });
        return;
      }

      // Create rental data object
      const rentalData = {
        pickupDate,
        returnDate,
        pickupTime,
        returnTime,
        pickupLocation,
        dropoffLocation,
        discountCode,
      };

      // Calculate price with all the data
      const priceData = this.calculatePrice({
        pickupDate,
        returnDate,
        pickupTime,
        returnTime,
        pickupLocation,
        dropoffLocation: dropoffLocation,
        discountCode,
      });

      // Add time values to priceData for display
      priceData.pickupTime = pickupTime;
      priceData.returnTime = returnTime;

      // Update the display
      this.updatePriceDisplay(priceData);
      this.updateOutsideHoursNotice(pickupTime, returnTime);
    } catch (error) {
      console.error("Error recalculating price:", error);
      this.updatePriceDisplay({ totalPrice: 0, breakdown: [] });
    }
  }

  // Handle discount code validation and updates
  async handleDiscountCode(code) {
    if (!code || code.trim() === "") {
      // Clear any previous error styling
      const discountField = document.querySelector(
        'input[name="discount_code"]'
      );
      if (discountField) {
        discountField.style.borderColor = "#ddd";
      }
      this.hideDiscountMessage();
      return { valid: false, message: "Please enter a discount code" };
    }

    const validationResult = await this.validateDiscountCode(code);
    if (!validationResult.valid) {
      // Show invalid discount code message
      const discountField = document.querySelector(
        'input[name="discount_code"]'
      );
      if (discountField) {
        discountField.style.borderColor = "#ff4444";
        // Add a small tooltip or message
        this.showDiscountMessage(validationResult.message, "error");
      }
      return validationResult;
    } else {
      // Valid code - clear error styling
      const discountField = document.querySelector(
        'input[name="discount_code"]'
      );
      if (discountField) {
        discountField.style.borderColor = "#ddd";
      }
      this.hideDiscountMessage();
      return validationResult;
    }
  }

  // Show discount message
  showDiscountMessage(message, type = "info") {
    let existingMessage = document.getElementById("discount-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    const discountField = document.querySelector('input[name="discount_code"]');
    if (discountField) {
      const messageDiv = document.createElement("div");
      messageDiv.id = "discount-message";
      messageDiv.style.cssText = `
        font-size: 12px;
        margin-top: 5px;
        color: ${type === "error" ? "#ff4444" : "#28a745"};
      `;
      messageDiv.textContent = message;
      discountField.parentNode.appendChild(messageDiv);
    }
  }

  // Hide discount message
  hideDiscountMessage() {
    const messageElement = document.getElementById("discount-message");
    if (messageElement) {
      messageElement.style.display = "none";
    }
  }

  // Get total price for booking form
  getTotalPrice() {
    const pickupDate = document.getElementById("date-picker")?.value;
    const returnDate = document.getElementById("date-picker-2")?.value;
    const pickupTime = document.getElementById("pickup-time")?.value;
    const returnTime = document.getElementById("collection-time")?.value;
    const pickupLocation = this.getSelectedRadioValue("pickup_location");
    const dropoffLocation = this.getSelectedRadioValue("dropoff_location");
    const discountCode = document.querySelector(
      'input[name="discount_code"]'
    )?.value;

    if (
      !pickupDate ||
      !returnDate ||
      !pickupTime ||
      !returnTime ||
      !pickupLocation ||
      !dropoffLocation
    ) {
      return 0;
    }

    const rentalData = {
      pickupDate: this.convertDateFormatToISO(pickupDate), // Convert dd-mm-yyyy to yyyy-mm-dd
      returnDate: this.convertDateFormatToISO(returnDate), // Convert dd-mm-yyyy to yyyy-mm-dd
      pickupTime,
      returnTime,
      pickupLocation,
      dropoffLocation,
      discountCode,
    };

    const priceData = this.calculatePrice(rentalData);

    // Ensure we return a number
    return parseFloat(priceData.finalPrice) || 0;
  }

  // Get price breakdown for booking form
  getPriceBreakdown() {
    const pickupDate = document.getElementById("date-picker")?.value;
    const returnDate = document.getElementById("date-picker-2")?.value;
    const pickupTime = document.getElementById("pickup-time")?.value;
    const returnTime = document.getElementById("collection-time")?.value;
    const pickupLocation = this.getSelectedRadioValue("pickup_location");
    const dropoffLocation = this.getSelectedRadioValue("dropoff_location");
    const discountCode = document.querySelector(
      'input[name="discount_code"]'
    )?.value;

    if (
      !pickupDate ||
      !returnDate ||
      !pickupTime ||
      !returnTime ||
      !pickupLocation ||
      !dropoffLocation
    ) {
      return {};
    }

    const rentalData = {
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      pickupLocation,
      dropoffLocation,
      discountCode,
    };

    const priceData = this.calculatePrice(rentalData);
    return priceData.breakdown;
  }

  // Get selected radio button value
  getSelectedRadioValue(name) {
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : null;
  }

  // Calculate discount amount for display
  calculateDiscountAmount(totalPrice, discountCode) {
    if (!discountCode || discountCode.trim() === "") {
      return 0;
    }

    if (
      window.cachedCouponData &&
      window.lastValidatedCouponCode === discountCode.trim()
    ) {
      const discountPercentage = parseFloat(
        window.cachedCouponData.discount_percentage || 0
      );
      if (discountPercentage > 0) {
        return totalPrice * (discountPercentage / 100);
      }
    }

    return 0;
  }
}

// Initialize calculator when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.priceCalculator = new PriceCalculator();

  // Don't auto-init, will be called manually with car data
});

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = PriceCalculator;
}
