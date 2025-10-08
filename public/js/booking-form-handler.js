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

  // Get current language helper
  getCurrentLanguage() {
    const storedLang = localStorage.getItem('lang') || localStorage.getItem('language') || localStorage.getItem('i18nextLng');
    if (storedLang) {
      const lang = storedLang.split('-')[0];
      if (['en', 'ru', 'ro'].includes(lang)) return lang;
    }
    if (typeof i18next !== 'undefined' && i18next.language) {
      const i18nextLang = i18next.language.split('-')[0];
      if (['en', 'ru', 'ro'].includes(i18nextLang)) return i18nextLang;
    }
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      const lang = htmlLang.split('-')[0];
      if (['en', 'ru', 'ro'].includes(lang)) return lang;
    }
    return 'ro';
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
    this.setButtonLoading(submitButton);

    try {
      // Collect and validate form data
      const bookingData = this.collectFormData(formElement);

      const validationResult = await this.validateBookingData(bookingData);
      
      if (!validationResult.isValid) {
        // Call validation error handler directly instead of throwing
        this.onValidationError(validationResult.error);
        return; // Exit early without proceeding to server submission
      }

      // Check if customer is returning (has exactly one booking - second booking)
      if (bookingData.customer_phone) {
        const isReturningCustomer = await this.checkReturningCustomer(bookingData.customer_phone);
        
        if (isReturningCustomer) {
          const shouldShowPopup = await this.showReturningCustomerAlert(bookingData.customer_phone);
          if (shouldShowPopup) {
            return; // Exit early for returning customers on their second booking
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
          
          if (typeof i18next !== 'undefined' && i18next.t) {
            // Use the translation key that the backend sends
            const translationKey = response.details;
            const translatedMessage = i18next.t(translationKey);
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
      const lang = this.getCurrentLanguage();
      const unexpectedError = {
        en: 'An unexpected error occurred',
        ru: 'Произошла непредвиденная ошибка',
        ro: 'A apărut o eroare neașteptată'
      };
      this.onError(error.message || unexpectedError[lang] || unexpectedError['ro']);
    } finally {
      // Restore button state
      this.setButtonNormal(submitButton, originalText);
    }
  }

  // Add this helper function at the top of the class or as a static method
  convertDateFormatToISO(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert dd-mm-yyyy to YYYY-MM-DD
    }
    return dateStr;
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
    
    const result = {
      car_id: carId,
      pickup_date: this.convertDateFormatToISO(formData.get('Pick Up Date')),
      pickup_time: formData.get('Pick Up Time'),
      return_date: this.convertDateFormatToISO(formData.get('Collection Date')),
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
    
    return result;
  }

  // Validate booking data
  async validateBookingData(bookingData) {
    const lang = this.getCurrentLanguage();

    // Error messages in all languages
    const errors = {
      selectCar: {
        en: 'Please select a car',
        ru: 'Пожалуйста, выберите автомобиль',
        ro: 'Vă rugăm să selectați o mașină'
      },
      selectDates: {
        en: 'Please select pickup and return dates',
        ru: 'Пожалуйста, выберите даты получения и возврата',
        ro: 'Vă rugăm să selectați datele de ridicare și returnare'
      },
      selectTimes: {
        en: 'Please select pickup and return times',
        ru: 'Пожалуйста, выберите время получения и возврата',
        ro: 'Vă rugăm să selectați orele de ridicare și returnare'
      },
      selectLocations: {
        en: 'Please select pickup and dropoff locations',
        ru: 'Пожалуйста, выберите места получения и возврата',
        ro: 'Vă rugăm să selectați locațiile de ridicare și returnare'
      },
      enterPhone: {
        en: 'Please enter your phone number',
        ru: 'Пожалуйста, введите ваш номер телефона',
        ro: 'Vă rugăm să introduceți numărul dvs. de telefon'
      },
      validPhone: {
        en: 'Please enter a valid phone number',
        ru: 'Пожалуйста, введите корректный номер телефона',
        ro: 'Vă rugăm să introduceți un număr de telefon valid'
      },
      enterAge: {
        en: 'Please enter your age',
        ru: 'Пожалуйста, введите ваш возраст',
        ro: 'Vă rugăm să introduceți vârsta dvs.'
      },
      validAge: {
        en: 'Age must be between 18 and 100 years',
        ru: 'Возраст должен быть от 18 до 100 лет',
        ro: 'Vârsta trebuie să fie între 18 și 100 de ani'
      },
      validEmail: {
        en: 'Please enter a valid email address',
        ru: 'Пожалуйста, введите корректный адрес электронной почты',
        ro: 'Vă rugăm să introduceți o adresă de email validă'
      },
      futureDate: {
        en: 'Pickup date must be today or in the future',
        ru: 'Дата получения должна быть сегодня или в будущем',
        ro: 'Data de ridicare trebuie să fie astăzi sau în viitor'
      },
      phoneRequired: {
        en: 'Phone number is required for outside hours pickup/dropoff',
        ru: 'Номер телефона обязателен для получения/возврата в нерабочее время',
        ro: 'Numărul de telefon este necesar pentru ridicare/returnare în afara programului'
      },
      invalidCoupon: {
        en: 'Invalid coupon code',
        ru: 'Неверный код купона',
        ro: 'Cod cupon invalid'
      },
      couponError: {
        en: 'Error validating coupon code',
        ru: 'Ошибка при проверке кода купона',
        ro: 'Eroare la validarea codului cupon'
      }
    };

    // Helper to get error message
    const getError = (key) => errors[key][lang] || errors[key]['ro'];

    // Check required fields
    if (!bookingData.car_id) {
      return { isValid: false, error: getError('selectCar') };
    }
    
    if (!bookingData.pickup_date || !bookingData.return_date) {
      return { isValid: false, error: getError('selectDates') };
    }
    
    if (!bookingData.pickup_time || !bookingData.return_time) {
      return { isValid: false, error: getError('selectTimes') };
    }
    
    if (!bookingData.pickup_location || !bookingData.dropoff_location) {
      return { isValid: false, error: getError('selectLocations') };
    }

    // Customer information validation
    if (!bookingData.customer_phone) {
      return { isValid: false, error: getError('enterPhone') };
    }

    // Validate phone format (very lenient - just check it's not empty and has some digits)
    const phoneRegex = /.*[0-9].*/;
    if (!phoneRegex.test(bookingData.customer_phone)) {
      return { isValid: false, error: getError('validPhone') };
    }
    
    // Validate age
    if (!bookingData.customer_age) {
      return { isValid: false, error: getError('enterAge') };
    }
    const age = parseInt(bookingData.customer_age);
    if (isNaN(age) || age < 18 || age > 100) {
      return { isValid: false, error: getError('validAge') };
    }

    // Validate email format if provided
    if (bookingData.customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(bookingData.customer_email)) {
        return { isValid: false, error: getError('validEmail') };
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
      return { isValid: false, error: getError('futureDate') };
    }

    // Check if outside hours fields are required
    const pickupTime = new Date(`2000-01-01T${bookingData.pickup_time}`);
    const returnTime = new Date(`2000-01-01T${bookingData.return_time}`);
    const isOutsideHours = pickupTime.getHours() < 8 || pickupTime.getHours() >= 18 || 
                          returnTime.getHours() < 8 || returnTime.getHours() >= 18;
    
    if (isOutsideHours && !bookingData.customer_phone) {
      return { isValid: false, error: getError('phoneRequired') };
    }

    // Validate coupon code if provided
    if (bookingData.discount_code && bookingData.discount_code.trim()) {
      try {
        const couponCode = bookingData.discount_code.trim();
        const customerPhone = bookingData.customer_phone;
        
        // Use the new lookup endpoint
        const lookupUrl = customerPhone
          ? `${this.apiBaseUrl}/api/coupons/lookup/${couponCode}?phone=${encodeURIComponent(customerPhone)}`
          : `${this.apiBaseUrl}/api/coupons/lookup/${couponCode}`;
        
        const response = await fetch(lookupUrl);
        const result = await response.json();
        
        if (!response.ok || !result.valid) {
          // Use server message if available, otherwise use localized default
          return { isValid: false, error: result.message || getError('invalidCoupon') };
        }
      } catch (error) {
        console.error('Error validating coupon:', error);
        return { isValid: false, error: getError('couponError') };
      }
    }

    return { isValid: true };
  }

  // Check car availability for specific dates
  async checkCarAvailability(carId, pickupDate, returnDate) {
    const lang = this.getCurrentLanguage();

    const errorMessages = {
      en: 'Unable to check availability. Please try again.',
      ru: 'Не удалось проверить доступность. Пожалуйста, попробуйте еще раз.',
      ro: 'Nu se poate verifica disponibilitatea. Vă rugăm să încercați din nou.'
    };

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
      return { 
        available: false, 
        reason: errorMessages[lang] || errorMessages['ro']
      };
    }
  }

  // Submit booking to server
  async submitBooking(bookingData) {
    const lang = this.getCurrentLanguage();
    
    const errorMessages = {
      invalidResponse: {
        en: 'Invalid server response',
        ru: 'Неверный ответ сервера',
        ro: 'Răspuns invalid de la server'
      }
    };

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
        return { 
          error: true, 
          details: errorMessages.invalidResponse[lang] || errorMessages.invalidResponse['ro']
        };
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
  setButtonLoading(button) {
    const lang = this.getCurrentLanguage();

    const loadingText = {
      en: 'Processing...',
      ru: 'Обработка...',
      ro: 'Se procesează...'
    };

    button.disabled = true;
    const displayText = loadingText[lang] || loadingText['ro'];
    
    if (button.tagName === 'INPUT') {
      button.value = displayText;
    } else {
      button.textContent = displayText;
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
    
    // Clear returning customer popup session storage for this phone number
    // This allows the popup to show again for the next booking
    if (bookingData && bookingData.customer_phone) {
      this.clearReturningCustomerSessionStorage(bookingData.customer_phone);
    }
    
    // Clear auto-applied coupon from localStorage after successful booking
    this.clearAutoAppliedCoupon();
    
    // Dispatch booking success event for other components (like auto-apply coupon cleanup)
    document.dispatchEvent(new CustomEvent('bookingSuccess', { 
      detail: { bookingData: bookingData } 
    }));
  }

  // Clear returning customer session storage for a phone number
  clearReturningCustomerSessionStorage(phoneNumber) {
    if (!phoneNumber) return;
    
    // Clear all session storage keys that start with the phone number pattern
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(`hasShownReturningCustomerPopup_${phoneNumber}_`)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all matching keys
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
  }

  // Clear auto-applied coupon from localStorage
  clearAutoAppliedCoupon() {
    // Remove the auto-applied coupon from localStorage
    localStorage.removeItem('autoApplyCoupon');
    
    // Also clear any spinning wheel related coupon storage
    localStorage.removeItem('spinningWheelWinningCoupon');
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
      const lang = this.getCurrentLanguage();
      const alertPrefix = {
        en: 'Please fix the following issues:\n',
        ru: 'Пожалуйста, исправьте следующие проблемы:\n',
        ro: 'Vă rugăm să corectați următoarele probleme:\n'
      };
      // Fallback to alert
      alert((alertPrefix[lang] || alertPrefix['ro']) + errorMessage);
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
  async showReturningCustomerAlert(phoneNumber = null) {
    // Use provided phone number or get from form input
    if (!phoneNumber) {
      const phoneInput = document.querySelector('input[name="customer_phone"]');
      phoneNumber = phoneInput ? phoneInput.value.trim() : null;
    }
    
    if (!phoneNumber) {
      return false;
    }
    
    // Get the current booking number from the API response
    let currentBookingNumber = null;
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

      if (response.ok) {
        const data = await response.json();
        currentBookingNumber = data.nextBookingNumber;
      }
    } catch (error) {
      console.error('Error getting booking number:', error);
    }
    
    if (!currentBookingNumber) {
      return false;
    }
    
    // Check if we've already shown the returning customer popup for this specific phone number and booking number
    const sessionKey = `hasShownReturningCustomerPopup_${phoneNumber}_${currentBookingNumber}`;
    const hasShownReturningCustomerPopup = sessionStorage.getItem(sessionKey);
    
    if (hasShownReturningCustomerPopup === 'true') {
      // User has already seen the popup for this phone number and booking number, allow booking to proceed
      return false; // Return false to indicate we should proceed with booking
    }
    
    // Set flag to indicate we've shown the popup for this phone number and booking number
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
        
        // Get translations with fallback
        let title = config.displayName;
        let description = 'Win amazing rewards';
        
        // Set correct fallback descriptions based on wheel type
        if (config.type === 'percent') {
          title = 'Percentage Discount Wheel';
          description = 'Win discount percentages on your rental';
        } else if (config.type === 'free-days') {
          title = 'Free Days Wheel';
          description = 'Win free rental days for your next booking';
        }
        
        if (typeof i18next !== 'undefined' && i18next.t) {
          const translatedTitle = i18next.t(titleKey);
          const translatedDesc = i18next.t(descKey);
          
          if (translatedTitle && translatedTitle !== titleKey) {
            title = translatedTitle;
          }
          if (translatedDesc && translatedDesc !== descKey) {
            description = translatedDesc;
          }
        }
        
        wheelOptionsHTML += `
          <button class="wheel-button ${config.type}-wheel" data-wheel-id="${config.id}">
            <div class="wheel-icon-circle">
              ${config.type === 'percent' ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 8l8 8"></path>
                  <circle cx="9" cy="9" r="1"></circle>
                  <circle cx="15" cy="15" r="1"></circle>
                </svg>
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              `}
            </div>
            <div class="wheel-text-content">
              <div class="wheel-button-title">${title}</div>
              <div class="wheel-description">${description}</div>
            </div>
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        `;
      });
    } else {
      // Fallback if no configurations found
      wheelOptionsHTML = `
        <button class="wheel-button default-wheel" data-wheel-id="active">
          <div class="wheel-icon-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <div class="wheel-text-content">
            <div class="wheel-button-title">Spinning Wheel</div>
            <div class="wheel-description">Win amazing rewards</div>
          </div>
          <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
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
            <div class="gift-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 12v10H4V12"></path>
                <path d="M22 7H2v5h20V7z"></path>
                <path d="M12 22V7"></path>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
            </div>
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
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        opacity: 0;
        transition: opacity 0.3s ease;
        padding: 20px;
      }

      .returning-customer-modal.show {
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
      }
      
      .returning-customer-modal.show .modal-content {
        transform: scale(1);
        animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .modal-content {
        background: white;
        border-radius: 24px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        position: relative;
        overflow: hidden;
        transform: scale(0.9);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        color: white;
        z-index: 10;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        border: none;
        outline: none;
        box-shadow: none;
      }
      
      .modal-close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(90deg);
        border: none;
        outline: none;
        box-shadow: none;
      }

      .modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 32px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }

      .modal-header::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        animation: pulse 3s ease-in-out infinite;
      }

      .gift-icon {
        width: 72px;
        height: 72px;
        margin: 0 auto 20px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: bounce 2s ease-in-out infinite;
        position: relative;
        z-index: 1;
      }

      .gift-icon svg {
        width: 36px;
        height: 36px;
        color: white;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }

      .modal-title {
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 12px 0;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        color: white;
        position: relative;
        z-index: 1;
      }

      .modal-subtitle {
        font-size: 1.1rem;
        margin: 0;
        opacity: 0.95;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        color: white;
        position: relative;
        z-index: 1;
        line-height: 1.5;
      }

      .modal-body {
        padding: 40px 32px;
        text-align: center;
        background: white;
      }

      .welcome-message {
        font-size: 1.1rem;
        color: #4a5568;
        margin-bottom: 32px;
        line-height: 1.7;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }

      .wheel-options {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 32px;
      }

      .wheel-button {
        padding: 24px;
        border: none;
        border-radius: 16px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        text-align: left;
        position: relative;
        overflow: hidden;
      }

      .wheel-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s ease;
      }

      .wheel-button:hover::before {
        left: 100%;
      }

      .wheel-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      }

      .wheel-button:active {
        transform: translateY(0);
      }

      .wheel-button.percent-wheel {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .wheel-button.free-days-wheel {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
      }

      .wheel-button.default-wheel {
        background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        color: white;
      }

      .wheel-icon-circle {
        width: 56px;
        height: 56px;
        min-width: 56px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
      }

      .wheel-icon-circle svg {
        width: 28px;
        height: 28px;
        color: white;
      }

      .wheel-text-content {
        flex: 1;
      }

      .wheel-button-title {
        font-size: 1.15rem;
        font-weight: 700;
        margin-bottom: 6px;
        line-height: 1.3;
      }
      
      .wheel-description {
        font-size: 0.9rem;
        opacity: 0.9;
        line-height: 1.4;
      }

      .arrow-icon {
        width: 20px;
        height: 20px;
        min-width: 20px;
        opacity: 0.7;
        transition: transform 0.3s ease;
      }

      .wheel-button:hover .arrow-icon {
        transform: translateX(4px);
      }

      /* Animations */
      @keyframes modalSlideIn {
        0% {
          transform: translateY(-50px) scale(0.9);
          opacity: 0;
        }
        60% {
          transform: translateY(10px) scale(1.02);
          opacity: 1;
        }
        100% {
          transform: translateY(0) scale(1);
        }
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.5;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.8;
        }
      }

      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-8px);
        }
      }

      /* Desktop styles */
      @media (min-width: 1024px) {
        .modal-content {
          max-width: 700px;
        }

        .modal-header {
          padding: 48px 40px;
        }

        .gift-icon {
          width: 80px;
          height: 80px;
          margin-bottom: 24px;
        }

        .gift-icon svg {
          width: 40px;
          height: 40px;
        }

        .modal-title {
          font-size: 2.25rem;
        }

        .modal-subtitle {
          font-size: 1.2rem;
        }

        .modal-body {
          padding: 48px 40px;
        }

        .welcome-message {
          font-size: 1.15rem;
          margin-bottom: 40px;
        }

        .wheel-options {
          gap: 20px;
        }

        .wheel-button {
          padding: 28px;
        }
      }

      /* Tablet styles */
      @media (min-width: 768px) and (max-width: 1023px) {
        .modal-content {
          max-width: 650px;
        }

        .modal-header {
          padding: 36px 28px;
        }

        .modal-body {
          padding: 36px 28px;
        }
      }

      /* Mobile styles */
      @media (max-width: 767px) {
        .returning-customer-modal {
          padding: 12px;
        }

        .modal-content {
          border-radius: 20px;
          max-height: 92vh;
        }

        .modal-close {
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          font-size: 22px;
        }

        .modal-header {
          padding: 28px 24px;
        }

        .gift-icon {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
        }

        .gift-icon svg {
          width: 32px;
          height: 32px;
        }

        .modal-title {
          font-size: 1.5rem;
          margin-bottom: 10px;
        }

        .modal-subtitle {
          font-size: 0.95rem;
        }

        .modal-body {
          padding: 28px 20px;
        }

        .welcome-message {
          font-size: 0.95rem;
          margin-bottom: 24px;
        }

        .wheel-options {
          gap: 12px;
          margin-top: 24px;
        }

        .wheel-button {
          padding: 20px;
          gap: 12px;
        }

        .wheel-icon-circle {
          width: 48px;
          height: 48px;
          min-width: 48px;
        }

        .wheel-icon-circle svg {
          width: 24px;
          height: 24px;
        }

        .wheel-button-title {
          font-size: 1rem;
          margin-bottom: 4px;
        }

        .wheel-description {
          font-size: 0.85rem;
        }

        .arrow-icon {
          width: 16px;
          height: 16px;
          min-width: 16px;
        }
      }

      /* Extra small mobile */
      @media (max-width: 400px) {
        .returning-customer-modal {
          padding: 8px;
        }

        .modal-header {
          padding: 24px 20px;
        }

        .gift-icon {
          width: 56px;
          height: 56px;
        }

        .modal-title {
          font-size: 1.3rem;
        }

        .modal-subtitle {
          font-size: 0.875rem;
        }

        .modal-body {
          padding: 24px 16px;
        }

        .welcome-message {
          font-size: 0.875rem;
        }

        .wheel-button {
          padding: 16px;
        }

        .wheel-button-title {
          font-size: 0.95rem;
        }

        .wheel-description {
          font-size: 0.8rem;
        }
      }

      body.modal-open {
        overflow: hidden;
      }
    `;

    // Add styles and modal to document
    document.head.appendChild(modalStyles);
    document.body.appendChild(modalContainer);

    // Update translations for modal header
    this.updateModalHeaderTranslations();

    // Add event listeners
    this.setupReturningCustomerModalEvents();

    // Update wheel button translations
    this.updateWheelButtonTranslations();

    // Set up translation event listeners
    if (typeof i18next !== 'undefined') {
      i18next.on('initialized', () => {
        this.updateModalHeaderTranslations();
        this.updateWheelButtonTranslations();
      });
      i18next.on('languageChanged', () => {
        this.updateModalHeaderTranslations();
        this.updateWheelButtonTranslations();
      });
    }

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

  updateWheelButtonTranslations() {
    const modal = document.getElementById('returningCustomerModal');
    if (!modal) return;

    // Check if i18next is available
    if (typeof i18next !== 'undefined' && i18next.t) {
      const wheelButtons = modal.querySelectorAll('.wheel-button');

      wheelButtons.forEach((button, index) => {
        const titleElement = button.querySelector('.wheel-button-title');
        const descElement = button.querySelector('.wheel-description');
        
        if (titleElement && descElement) {
          // Determine the type based on button class
          const isPercentWheel = button.classList.contains('percent-wheel');
          const isFreeDaysWheel = button.classList.contains('free-days-wheel');
          
          let titleKey, descKey, fallbackTitle, fallbackDesc;
          if (isPercentWheel) {
            titleKey = 'wheel.percentage_discount_wheel';
            descKey = 'wheel.percentage_discount_description';
            fallbackTitle = 'Percentage Discount Wheel';
            fallbackDesc = 'Win discount percentages on your rental';
          } else if (isFreeDaysWheel) {
            titleKey = 'wheel.free_days_wheel';
            descKey = 'wheel.free_days_description';
            fallbackTitle = 'Free Days Wheel';
            fallbackDesc = 'Win free rental days for your next booking';
          } else {
            titleKey = 'wheel.title';
            descKey = 'wheel.subtitle';
            fallbackTitle = 'Spinning Wheel';
            fallbackDesc = 'Win amazing rewards';
          }

          const translatedTitle = i18next.t(titleKey);
          const translatedDesc = i18next.t(descKey);

          // Apply title
          if (translatedTitle && translatedTitle !== titleKey) {
            titleElement.textContent = translatedTitle;
          } else {
            titleElement.textContent = fallbackTitle;
          }
          
          // Apply description
          if (translatedDesc && translatedDesc !== descKey) {
            descElement.textContent = translatedDesc;
          } else {
            descElement.textContent = fallbackDesc;
          }
        }
      });
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
