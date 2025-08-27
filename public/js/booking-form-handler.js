// Booking Form Handler
// Handles form submission for car rentals - can be reused across different pages

class BookingFormHandler {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || window.API_BASE_URL;
    this.carId = options.carId || null;
    this.onSuccess = options.onSuccess || this.defaultSuccessHandler;
    this.onError = options.onError || this.defaultErrorHandler;
    this.onValidationError = options.onValidationError || this.defaultValidationErrorHandler;
  }

  // Set car ID (useful when car data is loaded asynchronously)
  setCarId(carId) {
    this.carId = carId;
  }

  // Handle form submission
  async handleSubmit(formElement, submitButton) {
    if (!formElement || !submitButton) {
      console.error('Form element or submit button not found');
      return;
    }

    const originalText = submitButton.value || submitButton.textContent;
    
    // Show loading state
    this.setButtonLoading(submitButton, 'Processing...');

    try {
      // Collect and validate form data
      const bookingData = this.collectFormData(formElement);
      console.log('Collected booking data:', bookingData);
      
      const validationResult = await this.validateBookingData(bookingData);
      
      if (!validationResult.isValid) {
        // Call validation error handler directly instead of throwing
        this.onValidationError(validationResult.error);
        return; // Exit early without proceeding to server submission
      }

      // Check car availability for the selected dates
      if (bookingData.car_id) {
        const availabilityResult = await this.checkCarAvailability(
          bookingData.car_id, 
          bookingData.pickup_date, 
          bookingData.return_date
        );
        
        if (!availabilityResult.available) {
          this.onValidationError(availabilityResult.reason);
          return; // Exit early if car is not available
        }
      }

      // Send booking to server
      console.log('Submitting booking to server...');
      const response = await this.submitBooking(bookingData);
      console.log('Server response:', response);
      
      // Handle success
      this.onSuccess(response, bookingData);
      
    } catch (error) {
      console.error('Booking error details:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      
      // Handle server errors (not validation errors)
        this.onError(error.message || 'An unexpected error occurred');
    } finally {
      // Restore button state
      this.setButtonNormal(submitButton, originalText);
    }
  }

  // Collect form data
  collectFormData(formElement) {
    const formData = new FormData(formElement);
    
    // Helper function to get radio button value
    const getRadioValue = (name) => {
      const radio = formElement.querySelector(`input[name="${name}"]:checked`);
      return radio ? radio.value : null;
    };
    
    // Get car ID from the selected vehicle option
    const vehicleSelect = formElement.querySelector('#vehicle_type');
    let carId = this.carId; // Fallback to constructor carId
    if (vehicleSelect && vehicleSelect.selectedIndex > 0) {
      const selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
      const optionCarId = selectedOption.getAttribute('data-car-id');
      if (optionCarId) {
        carId = optionCarId;
      }
    }
    
    return {
      car_id: carId,
      pickup_date: formData.get('Pick Up Date'),
      pickup_time: formData.get('Pick Up Time'),
      return_date: formData.get('Collection Date'),
      return_time: formData.get('Collection Time'),
      discount_code: formData.get('discount_code'),
      insurance_type: getRadioValue('insurance_type') || 'RCA', // Default to RCA if not selected
      pickup_location: getRadioValue('pickup_location'),
      dropoff_location: getRadioValue('dropoff_location'),
      special_instructions: formData.get('special_instructions'),
      total_price: this.getTotalPrice(),
      price_breakdown: this.getPriceBreakdown(),
      customer_name: formData.get('customer_name'),
      customer_email: formData.get('customer_email'),
      customer_phone: formData.get('customer_phone'),
      customer_age: formData.get('customer_age')
    };
  }

  // Validate booking data
  async validateBookingData(bookingData) {
    // Check required fields
    if (!bookingData.car_id) {
      return { isValid: false, error: 'Please select a car' };
    }
    
    if (!bookingData.pickup_date || !bookingData.return_date) {
      return { isValid: false, error: 'Please select pickup and return dates' };
    }
    
    if (!bookingData.pickup_time || !bookingData.return_time) {
      return { isValid: false, error: 'Please select pickup and return times' };
    }
    
    if (!bookingData.pickup_location || !bookingData.dropoff_location) {
      return { isValid: false, error: 'Please select pickup and dropoff locations' };
    }

    // Customer information validation
    if (!bookingData.customer_phone) {
      return { isValid: false, error: 'Please enter your phone number' };
    }

    // Validate phone format (very lenient - just check it's not empty and has some digits)
    const phoneRegex = /.*[0-9].*/;
    if (!phoneRegex.test(bookingData.customer_phone)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }
    
    // Validate age
    if (!bookingData.customer_age) {
      return { isValid: false, error: 'Please enter your age' };
    }
    const age = parseInt(bookingData.customer_age);
    if (isNaN(age) || age < 18 || age > 100) {
      return { isValid: false, error: 'Age must be between 18 and 100 years' };
    }

    // Validate email format if provided
    if (bookingData.customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(bookingData.customer_email)) {
        return { isValid: false, error: 'Please enter a valid email address' };
      }
    }

    // Validate dates
    const pickupDate = new Date(bookingData.pickup_date);
    const returnDate = new Date(bookingData.return_date);
    const now = new Date();
    
    // Allow today's date for pickup (set time to start of day for comparison)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pickupDateOnly = new Date(bookingData.pickup_date);
    pickupDateOnly.setHours(0, 0, 0, 0);

    if (pickupDateOnly < today) {
      return { isValid: false, error: 'Pickup date must be today or in the future' };
    }

    // Handle same-day rentals
    if (bookingData.pickup_date === bookingData.return_date) {
      // Same day rental: return time must be after pickup time
      if (bookingData.pickup_time >= bookingData.return_time) {
        return { isValid: false, error: 'For same-day rentals, return time must be after pickup time' };
      }
    } else if (returnDate <= pickupDate) {
      // Different days: return date must be after pickup date
      return { isValid: false, error: 'Return date must be after pickup date' };
    }

    // Check if outside hours fields are required
    const pickupTime = new Date(`2000-01-01T${bookingData.pickup_time}`);
    const returnTime = new Date(`2000-01-01T${bookingData.return_time}`);
    const isOutsideHours = pickupTime.getHours() < 8 || pickupTime.getHours() >= 18 || 
                          returnTime.getHours() < 8 || returnTime.getHours() >= 18;
    
            if (isOutsideHours && !bookingData.customer_phone) {
            return { isValid: false, error: 'Phone number is required for outside hours pickup/dropoff' };
        }

    // Validate coupon code if provided
    if (bookingData.discount_code && bookingData.discount_code.trim()) {
      try {
        const couponCode = bookingData.discount_code.trim();
        const customerPhone = bookingData.customer_phone;
        
        // Try redemption code validation first (with phone number if available)
        let response;
        if (customerPhone) {
          response = await fetch(`${this.apiBaseUrl}/api/coupons/validate-redemption/${couponCode}?phone=${encodeURIComponent(customerPhone)}`);
        } else {
          response = await fetch(`${this.apiBaseUrl}/api/coupons/validate-redemption/${couponCode}`);
        }
        
        let result = await response.json();
        
        // If redemption code validation fails, try regular coupon validation
        if (!result.valid) {
          response = await fetch(`${this.apiBaseUrl}/api/coupons/validate/${couponCode}`);
          result = await response.json();
        }
        
        if (!response.ok || !result.valid) {
          const errorMessage = result.message || result.error || 'Invalid coupon code. Please enter a valid coupon or remove it.';
          return { isValid: false, error: errorMessage };
        }
      } catch (error) {
        console.error('Error validating coupon:', error);
        return { isValid: false, error: 'Error validating coupon code. Please try again.' };
      }
    }

    return { isValid: true };
  }

  // Check car availability for specific dates
  async checkCarAvailability(carId, pickupDate, returnDate) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/cars/${carId}/availability?pickup_date=${pickupDate}&return_date=${returnDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check availability');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking car availability:', error);
      return { available: false, reason: 'Unable to check availability. Please try again.' };
    }
  }

  // Submit booking to server
  async submitBooking(bookingData) {
    const response = await fetch(`${this.apiBaseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Booking failed');
    }
    
    return await response.json();
  }

  // Get total price from price calculator
  getTotalPrice() {
    if (window.priceCalculator && typeof window.priceCalculator.getTotalPrice === 'function') {
      const totalPrice = window.priceCalculator.getTotalPrice();
      console.log('Price calculator returned total price:', totalPrice);
      
      // If price calculator returns 0, try to get the displayed price from the UI
      if (totalPrice === 0) {
        // Look for the total price in the price breakdown display
        const priceContent = document.getElementById('price-content');
        if (priceContent) {
          const totalPriceText = priceContent.textContent;
          const totalPriceMatch = totalPriceText.match(/Total price:\s*(\d+)\s*€/);
          if (totalPriceMatch) {
            const displayedPrice = parseInt(totalPriceMatch[1]);
            console.log('Found displayed price from breakdown:', displayedPrice);
            return displayedPrice;
          }
        }
        
        // Fallback: look for any price display elements
        const priceDisplay = document.querySelector('.total-price-display, .price-total, #total-price');
        if (priceDisplay) {
          const displayedPrice = parseFloat(priceDisplay.textContent.replace(/[^\d.]/g, ''));
          console.log('Found displayed price from fallback:', displayedPrice);
          return displayedPrice || 0;
        }
      }
      
      return totalPrice;
    }
    return 0;
  }

  // Get price breakdown from price calculator
  getPriceBreakdown() {
    if (window.priceCalculator && typeof window.priceCalculator.getPriceBreakdown === 'function') {
      return window.priceCalculator.getPriceBreakdown();
    }
    return {};
  }

  // Set button to loading state
  setButtonLoading(button, text) {
    button.disabled = true;
    if (button.tagName === 'INPUT') {
      button.value = text;
    } else {
      button.textContent = text;
    }
    button.style.opacity = '0.7';
  }

  // Restore button to normal state
  setButtonNormal(button, text) {
    button.disabled = false;
    if (button.tagName === 'INPUT') {
      button.value = text;
    } else {
      button.textContent = text;
    }
    button.style.opacity = '1';
  }

  // Default success handler
  defaultSuccessHandler(response, bookingData) {
    // Booking submitted successfully - no alert needed
    // Optionally redirect to confirmation page
    // window.location.href = 'booking-confirmation.html?id=' + response.booking_id;
  }

  // Default error handler
  defaultErrorHandler(errorMessage) {
    // Booking failed - no alert needed
  }

  // Default validation error handler
  defaultValidationErrorHandler(errorMessage) {
    alert('Please fix the following issues:\n' + errorMessage);
  }

  // Initialize form handler for a specific form
  initForm(formId, submitButtonId, options = {}) {
    const form = document.getElementById(formId);
    const submitButton = document.getElementById(submitButtonId);
    
    if (!form || !submitButton) {
      console.error(`Form (${formId}) or submit button (${submitButtonId}) not found`);
      return;
    }

    // Merge options
    const handlerOptions = { ...this, ...options };
    const handler = new BookingFormHandler(handlerOptions);

    // Add submit event listener
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handler.handleSubmit(form, submitButton);
    });

    return handler;
  }
}

// Export for use in other files
window.BookingFormHandler = BookingFormHandler; 