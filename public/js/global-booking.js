// Global Booking System
// This script provides booking functionality that can be used across all pages

class GlobalBookingSystem {
  constructor() {
    // Use relative API URLs for Vercel deployment
    this.apiBaseUrl = window.API_BASE_URL || '';
    this.currentCar = null;
    this.priceCalculator = null;
  }

  // Initialize the global booking system
  init() {
    this.setupBookingButtons();
    this.setupCouponValidation();
    
  }

  // Setup booking buttons on cars page
  setupBookingButtons() {
    // Find all "Book Now" buttons
    const bookButtons = document.querySelectorAll("[data-booking-action]");

    bookButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const carId = button.getAttribute("data-car-id");
        const action = button.getAttribute("data-booking-action");

        if (action === "book") {
          this.openBookingModal(carId);
        }
      });
    });
  }

  // Setup coupon validation
  setupCouponValidation() {
    const couponInputs = document.querySelectorAll("[data-coupon-input]");

    couponInputs.forEach((input) => {
      input.addEventListener("blur", async (e) => {
        const code = e.target.value.trim();
        if (code) {
          await this.validateCoupon(code, e.target);
        } else {
          // Clear coupon data when input is empty
          this.clearCouponData();
          // Recalculate price without discount
          if (window.priceCalculator && typeof window.priceCalculator.recalculatePrice === 'function') {
            window.priceCalculator.recalculatePrice();
          }
        }
      });
      
      // Also clear data when user types (to handle removal)
      input.addEventListener("input", (e) => {
        const code = e.target.value.trim();
        if (code.length < 3) {
          // Clear coupon data for short codes
          this.clearCouponData();
          if (window.priceCalculator && typeof window.priceCalculator.recalculatePrice === 'function') {
            window.priceCalculator.recalculatePrice();
          }
        }
      });
    });
  }

  // Open booking modal with car data
  async openBookingModal(carId) {
    try {
      // Fetch car data
      const response = await fetch(`${this.apiBaseUrl}/api/cars/${carId}`);
      const car = await response.json();

      if (!response.ok) {
        throw new Error("Car not found");
      }

      this.currentCar = car;

      // Create and show booking modal
      this.showBookingModal(car);
    } catch (error) {
      
      alert("Error loading car information. Please try again.");
    }
  }

  // Show booking modal
  showBookingModal(car) {
    // Create modal HTML
    const modalHTML = `
      <div id="bookingModal" class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Book ${car.make_name} ${
      car.model_name
    }</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-4">
                  <img src="${
                    car.head_image && car.head_image.startsWith("http")
                      ? car.head_image
                      : car.head_image
                      ? window.API_BASE_URL + car.head_image
                      : window.API_BASE_URL + "/uploads/placeholder.png"
                  }" 
                       class="img-fluid rounded" alt="${car.make_name} ${
      car.model_name
    }">
                </div>
                <div class="col-md-8">
                  <h6>${car.make_name} ${car.model_name} (${
      car.production_year
    })</h6>
                  <p class="text-muted">
                    ${car.car_type} • ${car.fuel_type} • ${car.gear_type}<br>
                    ${car.num_passengers} passengers • ${car.num_doors} doors
                  </p>
                  <div class="booking-form-container">
                    <!-- Booking form will be loaded here -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Load booking form
    this.loadBookingForm(car);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById("bookingModal"));
    modal.show();

    // Clean up when modal is hidden
    document
      .getElementById("bookingModal")
      .addEventListener("hidden.bs.modal", () => {
        document.getElementById("bookingModal").remove();
      });
  }

  // Load booking form
  async loadBookingForm(car) {
    const container = document.querySelector(".booking-form-container");

    // Create booking form HTML
    const formHTML = `
      <form id="globalBookingForm" class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Pickup Date</label>
          <input type="date" name="pickup_date" class="form-control" required>
        </div>
        <div class="col-md-6">
          <label class="form-label">Pickup Time</label>
          <input type="time" name="pickup_time" class="form-control" required>
        </div>
        <div class="col-md-6">
          <label class="form-label">Return Date</label>
          <input type="date" name="return_date" class="form-control" required>
        </div>
        <div class="col-md-6">
          <label class="form-label">Return Time</label>
          <input type="time" name="return_time" class="form-control" required>
        </div>
        <div class="col-md-6">
          <label class="form-label">Pickup Location</label>
          <select name="pickup_location" class="form-control" required>
            <option value="">Select location</option>
            <option value="Chisinau Airport">Chisinau Airport</option>
            <option value="Our Office">Our Office</option>
            <option value="Iasi Airport">Iasi Airport</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Dropoff Location</label>
          <select name="dropoff_location" class="form-control" required>
            <option value="">Select location</option>
            <option value="Chisinau Airport">Chisinau Airport</option>
            <option value="Our Office">Our Office</option>
            <option value="Iasi Airport">Iasi Airport</option>
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label">Coupon Code (Optional)</label>
          <input type="text" name="discount_code" class="form-control" data-coupon-input>
        </div>
        <div class="col-md-6">
          <label class="form-label">Customer Name</label>
          <input type="text" name="customer_name" class="form-control" required>
        </div>
        <div class="col-md-6">
          <label class="form-label">Customer Phone</label>
          <input type="tel" name="customer_phone" class="form-control" required>
        </div>
        <div class="col-md-6">
          <label class="form-label">Customer Age</label>
          <input type="number" name="customer_age" class="form-control" min="18" max="100" required>
        </div>
        <div class="col-12">
          <label class="form-label">Special Instructions</label>
          <textarea name="special_instructions" class="form-control" rows="3"></textarea>
        </div>
        <div class="col-12">
          <div id="priceBreakdown" class="alert alert-info">
            <strong>Total Price: €0</strong><br>
            <small>Select dates and options to see pricing</small>
          </div>
        </div>
        <div class="col-12">
          <button type="submit" class="btn btn-primary">Submit Booking</button>
        </div>
      </form>
    `;

    container.innerHTML = formHTML;

    // Initialize price calculator
    this.initPriceCalculator(car);

    // Setup form submission
    this.setupFormSubmission();

    // Setup coupon validation
    this.setupCouponValidation();
  }

  // Initialize price calculator
  initPriceCalculator(car) {
    if (window.PriceCalculator) {
      this.priceCalculator = new window.PriceCalculator(car);

      // Add event listeners for price calculation
      const form = document.getElementById("globalBookingForm");
      const inputs = form.querySelectorAll("input, select");

      inputs.forEach((input) => {
        input.addEventListener("change", () => {
          this.updatePrice();
        });
      });
    }
  }

  // Update price display
  async updatePrice() {
    if (!this.priceCalculator) return;

    const form = document.getElementById("globalBookingForm");
    const formData = new FormData(form);

    const bookingData = {
      pickup_date: formData.get("pickup_date"),
      pickup_time: formData.get("pickup_time"),
      return_date: formData.get("return_date"),
      return_time: formData.get("return_time"),
      pickup_location: formData.get("pickup_location"),
      dropoff_location: formData.get("dropoff_location"),

      discount_code: formData.get("discount_code"),
    };

    // Check if we have all required data
    if (!bookingData.pickup_date || !bookingData.return_date) {
      return;
    }

    try {
      const priceData = await this.priceCalculator.calculatePrice(bookingData);
      this.updatePriceDisplay(priceData);
    } catch (error) {
      
    }
  }

  // Update price display
   // Update price display
   updatePriceDisplay(priceData) {
    const breakdown = document.getElementById("priceBreakdown");
    if (!breakdown) return;

    breakdown.innerHTML = `
      <strong>Total Price: €${priceData.total}</strong><br>
      <small>
        Base Price: €${priceData.basePrice}<br>
        Insurance: €${priceData.insurance}<br>
        Location Fees: €${priceData.locationFees}<br>
        Outside Hours: €${priceData.outsideHours}<br>
        ${priceData.discount ? `Discount: -€${priceData.discount}<br>` : ""}
      </small>
    `;

    // Show free days notification if applicable
    this.showFreeDaysNotificationIfNeeded();
  }

  // Show free days notification for quick book modal
  showFreeDaysNotificationIfNeeded() {
    if (
      window.cachedCouponData &&
      window.cachedCouponData.free_days != null &&
      window.cachedCouponData.free_days > 0
    ) {
      const freeDays = parseInt(window.cachedCouponData.free_days || 0);
      if (freeDays > 0) {
        const message =
          freeDays === 1
            ? i18next.t("coupons.free_days_handled_in_office_singular")
            : i18next.t("coupons.free_days_handled_in_office_plural", {
                days: freeDays,
              });

        // this.showFloatingFreeDaysNotification(freeDays, message);
      }
    }
  }

  // Show floating free days notification (similar to price-calculator.js)
  showFloatingFreeDaysNotification(freeDays, message) {
    // Remove existing notification
    const existingNotification = document.getElementById("free-days-notification");
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
          🎉
        </div>
        <span style="font-weight: 600; font-size: 14px;">${message}</span>
      </div>
      <div style="
        font-size: 13px;
        opacity: 0.9;
        font-style: italic;
        text-align: center;
      ">
        This will be applied when you visit our office
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
    setTimeout(() => {
      if (notification && notification.parentElement) {
        notification.style.animation = "slideInFromRight 0.5s ease-out reverse";
        setTimeout(() => {
          if (notification && notification.parentElement) {
            notification.remove();
          }
        }, 500);
      }
    }, 10000);
  }

  // Validate coupon code
  async validateCoupon(code, inputElement) {
    try {
      // Get customer phone if available
      const customerPhone = document.querySelector('[name="customer_phone"]')?.value?.trim();
      
      // Use the new lookup endpoint
      const lookupUrl = customerPhone
        ? `${this.apiBaseUrl}/api/coupons/lookup/${code}?phone=${encodeURIComponent(customerPhone)}`
        : `${this.apiBaseUrl}/api/coupons/lookup/${code}`;
      
      const response = await fetch(lookupUrl);
      const result = await response.json();
  
      if (result.valid) {
        inputElement.classList.remove("is-invalid");
        inputElement.classList.add("is-valid");
        
        // Cache coupon data for later use
        window.cachedCouponData = result;
        window.lastValidatedCouponCode = code;
        
        // this.showCouponMessage("Coupon applied successfully!", "success");
        
        // Show free days notification if applicable
        this.showFreeDaysNotificationIfNeeded();
      } else {
        inputElement.classList.remove("is-valid");
        inputElement.classList.add("is-invalid");
        const translatedMessage = i18next.t(result.message || "coupons.invalid_code");
        this.showCouponMessage(result.translatedMessage || "Invalid coupon code", "error");
        
        // Clear coupon data on invalid
        window.cachedCouponData = null;
        window.lastValidatedCouponCode = null;
        
        // Hide any existing free days notification
        // this.hideFreeDaysNotification();
      }
    }  catch (error) {
      console.error("Error validating coupon:", error);
      inputElement.classList.remove("is-valid", "is-invalid");
      
      this.showCouponMessage("Error validating coupon", "error");
      
      // Clear coupon data on error
      window.cachedCouponData = null;
      window.lastValidatedCouponCode = null;
      
      // Hide any existing free days notification
      // this.hideFreeDaysNotification();
    }
  }

  // Show coupon message
  showCouponMessage(message, type) {
    // Translate the message if it's a translation key
    const translatedMessage = message.startsWith("coupons.") ? i18next.t(message) : message;
    
    // Remove existing message
    const existingMessage = document.querySelector(".coupon-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create new message
    // const messageDiv = document.createElement("div");
    // messageDiv.className = `alert alert-${
    //   type === "success" ? "success" : "danger"
    // } coupon-message`;
    // messageDiv.textContent = translatedMessage; // Use translatedMessage instead of message

    // Insert after coupon input
    // const couponInput = document.querySelector('[name="discount_code"]');
    // if (couponInput) {
      // couponInput.parentNode.insertBefore(messageDiv, couponInput.nextSibling);
    // }
  }

  // Setup form submission
  setupFormSubmission() {
    const form = document.getElementById("globalBookingForm");
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Disable submit button
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";

      try {
        // Validate coupon code if provided
        const discountCode = form
          .querySelector('[name="discount_code"]')
          .value.trim();
        if (discountCode) {
          const couponInput = form.querySelector('[name="discount_code"]');
          await this.validateCoupon(discountCode, couponInput);

          // Check if coupon validation failed
          if (couponInput.classList.contains("is-invalid")) {
            this.showCouponMessage(
              "Please enter a valid coupon code before submitting",
              "error"
            );
            return; // Prevent form submission
          }
        }

        // Collect form data
        const formData = new FormData(form);
        const bookingData = {
          car_id: this.currentCar.id,
          pickup_date: formData.get("pickup_date"),
          pickup_time: formData.get("pickup_time"),
          return_date: formData.get("return_date"),
          return_time: formData.get("return_time"),
          pickup_location: formData.get("pickup_location"),
          dropoff_location: formData.get("dropoff_location"),

          discount_code: formData.get("discount_code") || null,
          customer_name: formData.get("customer_name"),
          customer_phone: formData.get("customer_phone"),
          customer_age: formData.get("customer_age"),
          special_instructions: formData.get("special_instructions") || null,
          total_price: this.priceCalculator
            ? this.priceCalculator.getTotalPrice()
            : 0,
          price_breakdown: this.priceCalculator
            ? this.priceCalculator.getPriceBreakdown()
            : {},
        };

        // Submit booking
        const response = await fetch(`${this.apiBaseUrl}/api/bookings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Booking failed");
        }

        const result = await response.json();

        // Dispatch booking success event for auto-apply coupon cleanup
        document.dispatchEvent(new CustomEvent('bookingSuccess', { 
          detail: { bookingData: bookingData } 
        }));

        // Close modal
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("bookingModal")
        );
        modal.hide();
      } catch (error) {
        
        this.showCouponMessage("Booking failed. Please try again.", "error");
      } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = "Submit Booking";
      }
    });
  }

  // Add booking button to car card
  addBookingButton(carElement, carData) {
    const button = document.createElement("button");
    button.className = "btn btn-primary btn-sm";
    button.textContent = "Book Now";
    button.setAttribute("data-booking-action", "book");
    button.setAttribute("data-car-id", carData.id);

    // Add button to car element
    const actionArea = carElement.querySelector(".d-info .d-text");
    if (actionArea) {
      actionArea.appendChild(button);
    }
  }

  // Clear coupon data when input is cleared
  clearCouponData() {
    window.cachedCouponData = null;
    window.lastValidatedCouponCode = null;
  }
}

// Initialize global booking system when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.globalBooking = new GlobalBookingSystem();
  window.globalBooking.init();
});
