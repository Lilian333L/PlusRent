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
      
      return;
    }

    const originalText = submitButton.value || submitButton.textContent;
    
    // Show loading state
    this.setButtonLoading(submitButton, 'Processing...');

    try {
      // Collect and validate form data
      const bookingData = this.collectFormData(formElement);

      const validationResult = await this.validateBookingData(bookingData);
      
      if (!validationResult.isValid) {
        // Call validation error handler directly instead of throwing
        this.onValidationError(validationResult.error);
        return; // Exit early without proceeding to server submission
      }

      // Check if customer is returning (has existing bookings with unredeemed return gift)
      if (bookingData.customer_phone) {
        const isReturningCustomer = await this.checkReturningCustomer(bookingData.customer_phone);
        
        if (isReturningCustomer) {
          const shouldShowPopup = this.showReturningCustomerAlert(bookingData.customer_phone);
          if (shouldShowPopup) {
            return; // Exit early for returning customers with unredeemed gifts (first time)
          }
          // If popup was already shown, continue with booking
        }
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
      
      const response = await this.submitBooking(bookingData);

      // Check if response contains an error
      if (response.error) {

        // Handle validation errors
        if (response.error === 'Validation error' && response.field) {

          // Get user-friendly error message
          let errorMessage = response.details || 'Please check your form and try again.';
          
          // Use translation if available
          if (window.i18n && window.i18n.t) {
            const translationKey = `booking.validation.${response.field}_invalid`;
            const translatedMessage = window.i18n.t(translationKey);
            if (translatedMessage && translatedMessage !== translationKey) {
              errorMessage = translatedMessage;
            }
          }

          this.onValidationError(errorMessage);
        } else {
          // Handle other errors
          this.onError(response.details || response.error || 'Booking failed. Please try again.');
        }
      } else {
        // Handle success
        this.onSuccess(response, bookingData);
      }
      
    } catch (error) {

      // Handle unexpected errors
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
      
      return { available: false, reason: 'Unable to check availability. Please try again.' };
    }
  }

  // Submit booking to server
  async submitBooking(bookingData) {

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      let responseData;
      try {
        responseData = await response.json();
        
      } catch (jsonError) {
        
        return { error: true, details: 'Invalid server response' };
      }
      
      if (!response.ok) {
        
        // Return the error data instead of throwing
        return { error: true, ...responseData };
      }

      return responseData;
    } catch (error) {
      
      return { error: true, details: error.message };
    }
  }

  // Get total price from price calculator
  getTotalPrice() {
    if (window.priceCalculator && typeof window.priceCalculator.getTotalPrice === 'function') {
      const totalPrice = window.priceCalculator.getTotalPrice();

      // If price calculator returns 0, try to get the displayed price from the UI
      if (totalPrice === 0) {
        // Look for the total price in the price breakdown display
        const priceContent = document.getElementById('price-content');
        if (priceContent) {
          const totalPriceText = priceContent.textContent;
          const totalPriceMatch = totalPriceText.match(/Total price:\s*(\d+)\s*€/);
          if (totalPriceMatch) {
            const displayedPrice = parseInt(totalPriceMatch[1]);
            
            return displayedPrice;
          }
        }
        
        // Fallback: look for any price display elements
        const priceDisplay = document.querySelector('.total-price-display, .price-total, #total-price');
        if (priceDisplay) {
          const displayedPrice = parseFloat(priceDisplay.textContent.replace(/[^\d.]/g, ''));
          
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

    // Try to use the showError function if available
    if (window.showError && typeof window.showError === 'function') {
      
      window.showError(errorMessage);
    } else {
      
      // Fallback to alert
      alert('Please fix the following issues:\n' + errorMessage);
    }
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

  // Check if customer is returning (has existing bookings with unredeemed return gift)
  async checkReturningCustomer(phoneNumber) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/bookings/check-returning-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber
        })
      });

      if (!response.ok) {
        console.error('Failed to check returning customer:', response.statusText);
        // If API fails, allow booking to proceed
        return false;
      }

      const data = await response.json();
      
      // Customer is returning if they have one or more bookings with unredeemed return gift
      return data.isReturningCustomer === true;

    } catch (error) {
      console.error('Error checking returning customer:', error);
      // If there's an error, allow booking to proceed
      return false;
    }
  }

  // Show modal for returning customers
  showReturningCustomerAlert(phoneNumber = null) {
    // Use provided phone number or get from form input
    if (!phoneNumber) {
      const phoneInput = document.querySelector('input[name="customer_phone"]');
      phoneNumber = phoneInput ? phoneInput.value.trim() : null;
    }
    
    if (!phoneNumber) {
      return false;
    }
    
    // Check if we've already shown the returning customer popup for this specific phone number in this session
    const sessionKey = `hasShownReturningCustomerPopup_${phoneNumber}`;
    const hasShownReturningCustomerPopup = sessionStorage.getItem(sessionKey);
    
    if (hasShownReturningCustomerPopup === 'true') {
      // User has already seen the popup for this phone number, allow booking to proceed
      return false; // Return false to indicate we should proceed with booking
    }
    
    // Set flag to indicate we've shown the popup for this phone number
    sessionStorage.setItem(sessionKey, 'true');
    
    // Load and show the returning customer modal
    this.loadReturningCustomerModal();
    return true; // Return true to indicate we're showing the popup
  }

  // Load the returning customer modal
  async loadReturningCustomerModal() {
    // Check if modal is already loaded
    if (document.getElementById('returningCustomerModal')) {
      this.showReturningCustomerModal();
      return;
    }

    // Fetch enabled wheel configurations
    let wheelConfigs = [];
    const API_BASE_URL = window.API_BASE_URL || '';
    
    // Get active wheels using the working endpoint
    const response = await fetch(`${API_BASE_URL}/api/spinning-wheels/active`);
    if (response.ok) {
      const activeWheels = await response.json();
      
      // Convert to wheel configs format
      wheelConfigs = activeWheels.map((wheel, index) => ({
        id: wheel.id,
        name: wheel.name || `Wheel ${index + 1}`,
        type: index === 0 ? 'percent' : 'free-days', // Assume first is percent, second is free-days
        displayName: index === 0 ? 'Percentage Discount Wheel' : 'Free Days Wheel'
      }));
    } else {
      // Fallback: create default configs
      wheelConfigs = [
        {
          id: 'active',
          name: 'Spinning Wheel',
          type: 'default',
          displayName: 'Spinning Wheel'
        }
      ];
    }

    // Create wheel options HTML based on enabled configurations
    let wheelOptionsHTML = '';
    
    if (wheelConfigs.length > 0) {
      wheelConfigs.forEach((config, index) => {
        // Get translations
        const titleKey = config.type === 'percent' ? 'wheel.percentage_discount_wheel' : 
                        config.type === 'free-days' ? 'wheel.free_days_wheel' : 
                        'wheel.title';
        const descKey = config.type === 'percent' ? 'wheel.percentage_discount_description' : 
                       config.type === 'free-days' ? 'wheel.free_days_description' : 
                       'wheel.subtitle';
        
        const title = (typeof i18next !== 'undefined' && i18next.t) ? i18next.t(titleKey) : config.displayName;
        const description = (typeof i18next !== 'undefined' && i18next.t) ? i18next.t(descKey) : 
                           (config.type === 'percent' ? 'Win discount percentages on your rental' : 
                            config.type === 'free-days' ? 'Win free rental days for your next booking' : 
                            'Win amazing rewards');
        
        wheelOptionsHTML += `
          <button class="wheel-button ${config.type}-wheel" data-wheel-id="${config.id}">
            <div>
              <div>${title}</div>
              <div class="wheel-description">${description}</div>
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
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
      <div id="returningCustomerModal" class="returning-customer-modal">
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

    // Add modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
      .returning-customer-modal {
        display: none;
        position: fixed;
        z-index: 9999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .returning-customer-modal.show {
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
      }
      .modal-content {
        background: white;
        border-radius: 20px !important;
        width: 90%;
        max-width: 1000px;
        max-height: 85vh;
        position: relative;
        overflow: hidden;
        transform: scale(0.9);
        transition: all 0.3s ease;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      .returning-customer-modal.show .modal-content {
        transform: scale(1);
      }
      .modal-close {
        position: absolute;
        top: 15px;
        right: 20px;
        font-size: 28px;
        cursor: pointer;
        color: #FFFFFF;
        z-index: 10;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
        background: none !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      .modal-close:hover {
        background: #f0f0f0 !important;
        color: #333 !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Override any external CSS that might be affecting the close button */
      .returning-customer-modal .modal-close,
      .returning-customer-modal .modal-close:focus,
      .returning-customer-modal .modal-close:active {
        background: none !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      .modal-header {
        background: linear-gradient(135deg, #20b2aa 0%, #1e90ff 100%) !important;
        color: white !important;
        padding: 20px !important;
        text-align: center !important;
        border-radius: 20px 20px 0 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .modal-title {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        margin: 0 !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3) !important;
        font-family: Arial, sans-serif !important;
        color: white !important;
      }
      .modal-subtitle {
        font-size: 1rem !important;
        margin: 10px 0 0 0 !important;
        opacity: 0.9 !important;
        font-family: Arial, sans-serif !important;
        color: white !important;
      }
      .modal-body {
        padding: 40px;
        text-align: center;
        background: white;
      }
      .welcome-message {
        font-size: 1.2rem;
        color: #333;
        margin-bottom: 30px;
        line-height: 1.6;
      }
      .wheel-options {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-top: 30px;
      }
      .wheel-button {
        padding: 20px 30px;
        border: none;
        border-radius: 15px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      }
      .wheel-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      }
      .wheel-button.percent-wheel {
        background: linear-gradient(135deg, #20b2aa 0%, #1e90ff 100%);
        color: white;
      }
      .wheel-button.free-days-wheel {
        background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        color: white;
      }
      .wheel-description {
        font-size: 0.9rem;
        opacity: 0.9;
        margin-top: 5px;
      }
      body.modal-open {
        overflow: hidden;
      }
      @media (max-width: 768px) {
        .modal-content {
          margin: 10px;
          max-width: calc(100vw - 20px);
          max-height: calc(100vh - 20px);
        }
        .modal-header {
          padding: 20px;
        }
        .modal-title {
          font-size: 1.5rem;
        }
        .modal-subtitle {
          font-size: 1rem;
        }
        .modal-body {
          padding: 30px 20px;
        }
        .wheel-options {
          gap: 15px;
        }
        .wheel-button {
          padding: 15px 20px;
          font-size: 1rem;
        }
      }
    `;

    // Add styles and modal to document
    document.head.appendChild(modalStyles);
    document.body.appendChild(modalContainer);

    // Update translations for modal header
    this.updateModalHeaderTranslations();

    // Add event listeners
    this.setupReturningCustomerModalEvents();

    // Show the modal
    this.showReturningCustomerModal();
  }

  // Show the returning customer modal
  showReturningCustomerModal() {
    const modal = document.getElementById('returningCustomerModal');
    if (modal) {
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    }
  }

  updateModalHeaderTranslations() {
    const modal = document.getElementById('returningCustomerModal');
    if (!modal) return;

    // Check if i18next is available
    if (typeof i18next !== 'undefined' && i18next.t) {
      // Update title
      const titleElement = modal.querySelector('.modal-title[data-i18n="wheel.welcome_back_title"]');
      if (titleElement) {
        const translatedTitle = i18next.t('wheel.welcome_back_title');
        if (translatedTitle && translatedTitle !== 'wheel.welcome_back_title') {
          titleElement.textContent = translatedTitle;
        }
      }

      // Update subtitle
      const subtitleElement = modal.querySelector('.modal-subtitle[data-i18n="wheel.welcome_back_subtitle"]');
      if (subtitleElement) {
        const translatedSubtitle = i18next.t('wheel.welcome_back_subtitle');
        if (translatedSubtitle && translatedSubtitle !== 'wheel.welcome_back_subtitle') {
          subtitleElement.textContent = translatedSubtitle;
        }
      }

      // Update welcome message
      const welcomeMessageElement = modal.querySelector('.welcome-message[data-i18n="wheel.welcome_message"]');
      if (welcomeMessageElement) {
        const translatedMessage = i18next.t('wheel.welcome_message');
        if (translatedMessage && translatedMessage !== 'wheel.welcome_message') {
          welcomeMessageElement.textContent = translatedMessage;
        }
      }
    }
  }

  // Setup event listeners for the returning customer modal
  setupReturningCustomerModalEvents() {
    const modal = document.getElementById('returningCustomerModal');
    if (!modal) return;

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeReturningCustomerModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        this.closeReturningCustomerModal();
      }
    });

    // Setup wheel button click handlers
    const wheelButtons = modal.querySelectorAll('.wheel-button');
    
    wheelButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const wheelId = button.getAttribute('data-wheel-id');
        if (wheelId) {
          // Mark return gift as redeemed before opening the spinning wheel
          await this.markReturnGiftAsRedeemed();
          
          // Open the spinning wheel
          this.openSpinningWheelById(wheelId);
        }
      });
    });
  }

  // Mark return gift as redeemed
  async markReturnGiftAsRedeemed() {
    try {
      // Get the phone number from the form
      const phoneInput = document.querySelector('input[name="customer_phone"]');
      const phoneNumber = phoneInput ? phoneInput.value.trim() : null;
      
      if (!phoneNumber) {
        return;
      }

      const API_BASE_URL = window.API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/bookings/mark-return-gift-redeemed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: phoneNumber })
      });

      if (response.ok) {
        // Clear the phone-specific session flag so the user can proceed with booking
        const sessionKey = `hasShownReturningCustomerPopup_${phoneNumber}`;
        sessionStorage.removeItem(sessionKey);
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Close the returning customer modal
  closeReturningCustomerModal() {
    const modal = document.getElementById('returningCustomerModal');
    if (modal) {
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  }

  // Open the appropriate spinning wheel by ID
  openSpinningWheelById(wheelId) {
    // Close the returning customer modal
    this.closeReturningCustomerModal();
    
    // Open the spinning wheel modal
    this.openSpinningWheelModal(wheelId);
  }

  // Open the spinning wheel modal
  openSpinningWheelModal(wheelId) {
    // Check if the universal spinning wheel is available
    if (window.UniversalSpinningWheel && window.UniversalSpinningWheel.show) {
      // Get the phone number from the form
      const phoneInput = document.querySelector('input[name="customer_phone"]');
      const phoneNumber = phoneInput ? phoneInput.value.trim() : null;
      
      // Debug: Log the phone number being passed
      console.log('Opening spinning wheel with phone number:', phoneNumber, 'wheelId:', wheelId);
      
      // Show the spinning wheel modal with the specified wheel ID, skipping phone step
      window.UniversalSpinningWheel.show({
        skipPhoneStep: true,
        phoneNumber: phoneNumber,
        wheelId: wheelId
      });
    } else {
      // Fallback: open the spinning wheel page directly
      const wheelUrl = `spinning-wheel-standalone.html?wheel=${wheelId}`;
      window.open(wheelUrl, '_blank');
    }
  }
}

// Export for use in other files
window.BookingFormHandler = BookingFormHandler; 