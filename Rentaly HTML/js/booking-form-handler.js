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
      
      const validationResult = this.validateBookingData(bookingData);
      
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
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
      
      if (error.message.includes('Please select') || 
          error.message.includes('required') ||
          error.message.includes('must be')) {
        this.onValidationError(error.message);
      } else {
        this.onError(error.message || 'An unexpected error occurred');
      }
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
    
    return {
      car_id: this.carId,
      pickup_date: formData.get('Pick Up Date'),
      pickup_time: formData.get('Pick Up Time'),
      return_date: formData.get('Collection Date'),
      return_time: formData.get('Collection Time'),
      discount_code: formData.get('discount_code'),
      insurance_type: getRadioValue('insurance_type') || 'RCA', // Default to RCA if not selected
      pickup_location: getRadioValue('pickup_location'),
      dropoff_location: getRadioValue('dropoff_location'),
      contact_person: formData.get('contact_person'),
      contact_phone: formData.get('contact_phone'),
      special_instructions: formData.get('special_instructions'),
      total_price: this.getTotalPrice(),
      price_breakdown: this.getPriceBreakdown(),
      customer_name: formData.get('customer_name') || formData.get('contact_person'),
      customer_email: formData.get('customer_email'),
      customer_phone: formData.get('customer_phone') || formData.get('contact_phone')
    };
  }

  // Validate booking data
  validateBookingData(bookingData) {
    // Check required fields
    if (!bookingData.pickup_date || !bookingData.return_date) {
      return { isValid: false, error: 'Please select pickup and return dates' };
    }
    
    if (!bookingData.pickup_time || !bookingData.return_time) {
      return { isValid: false, error: 'Please select pickup and return times' };
    }
    

    
    if (!bookingData.pickup_location || !bookingData.dropoff_location) {
      return { isValid: false, error: 'Please select pickup and dropoff locations' };
    }

    // Customer information validation - commented out for now
    /*
    if (!bookingData.customer_name) {
      return { isValid: false, error: 'Please enter your name' };
    }
    
    if (!bookingData.customer_email) {
      return { isValid: false, error: 'Please enter your email address' };
    }
    
    if (!bookingData.customer_phone) {
      return { isValid: false, error: 'Please enter your phone number' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.customer_email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (!phoneRegex.test(bookingData.customer_phone)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }
    */

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

    if (returnDate <= pickupDate) {
      return { isValid: false, error: 'Return date must be after pickup date' };
    }

    // Check if outside hours fields are required
    const pickupTime = new Date(`2000-01-01T${bookingData.pickup_time}`);
    const returnTime = new Date(`2000-01-01T${bookingData.return_time}`);
    const isOutsideHours = pickupTime.getHours() < 8 || pickupTime.getHours() >= 18 || 
                          returnTime.getHours() < 8 || returnTime.getHours() >= 18;
    
    if (isOutsideHours && (!bookingData.contact_person || !bookingData.contact_phone)) {
      return { isValid: false, error: 'Contact person and phone are required for outside hours pickup/dropoff' };
    }

    return { isValid: true };
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
      return window.priceCalculator.getTotalPrice();
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