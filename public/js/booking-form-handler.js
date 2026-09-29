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
        // Pass field + raw i18n key so page handlers can route specific
        // errors (e.g. coupon/phone restriction) to inline UI.
        this.onValidationError(
          validationResult.error,
          validationResult.field,
          validationResult.errorKey
        );
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
      // the widget keeps the international form in a hidden twin; the visible
      // field holds only what was typed, which has no country code in it
      customer_phone: formData.get('customer_phone_e164') || formData.get('customer_phone'),
      customer_phone_country: formData.get('customer_phone_country') || null,
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
          // Server may return an i18n key (e.g. "coupons.phone_not_authorized")
          // as result.message. Translate it before showing to the user.
          // Keep the raw key around so the page-level handler can route
          // coupon-specific errors to an inline UI instead of a toast/alert.
          const rawKey = (result && typeof result.message === 'string') ? result.message : null;
          let errMsg = result.message || getError('invalidCoupon');
          if (
            typeof errMsg === 'string' &&
            /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(errMsg) &&
            typeof window.i18next !== 'undefined' &&
            typeof window.i18next.t === 'function'
          ) {
            const t = window.i18next.t(errMsg);
            if (t && t !== errMsg) errMsg = t;
          }
          return { isValid: false, error: errMsg, field: 'discount_code', errorKey: rawKey };
        }
      } catch (error) {
        console.error('Error validating coupon:', error);
        return { isValid: false, error: getError('couponError'), field: 'discount_code' };
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
      phoneNumber = phoneInput ? ((window.PhoneInput && window.PhoneInput.full(phoneInput)) || phoneInput.value.trim()) : null;
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
        displayName: index === 0 ? 'Percentage discount wheel' : 'Free days wheel'
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

    // Words for the "up to" line under each wheel (the locale files do not have them)
    const lang = this.getCurrentLanguage();
    const UPTO = { ro: 'până la', ru: 'до', en: 'up to' }[lang] || 'up to';

    const icons = {
      percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>',
      'free-days': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18M9 15.5l2 2 4-4"/></svg>',
      default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.4M12 12 5.6 18.4M12 12H3"/></svg>'
    };

    const wheelOptionsHTML = wheelConfigs.map((config) => `
          <button type="button" class="wheel-button ${config.type}-wheel" data-wheel-id="${config.id}">
            <span class="wheel-icon-circle">${icons[config.type] || icons.default}</span>
            <span class="wheel-text-content">
              <span class="wheel-button-title"></span>
              <span class="wheel-description"></span>
              <span class="pr-rc-range"></span>
            </span>
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>`).join('');

    // Styles: css/spin-wheel.css (scoped to #returningCustomerModal)
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
      <div id="returningCustomerModal" class="returning-customer-modal" role="dialog" aria-modal="true" aria-labelledby="prRcTitle" tabindex="-1">
        <div class="pr-rc-card">
          <button type="button" class="pr-rc-close" aria-label="&times;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
          <div class="pr-rc-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 12v9H4v-9"></path>
              <path d="M22 7H2v5h20V7z"></path>
              <path d="M12 21V7"></path>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
            </svg>
          </div>
          <h2 class="pr-rc-title" id="prRcTitle" data-i18n="wheel.welcome_back_title">Welcome back!</h2>
          <p class="pr-rc-subtitle" data-i18n="wheel.welcome_back_subtitle">Your second booking comes with a gift. Choose a wheel and try your luck.</p>
          <div class="pr-rc-options">
            ${wheelOptionsHTML}
          </div>
        </div>
      </div>
    `;

    const showWhenStyled = (window.UniversalSpinningWheel && window.UniversalSpinningWheel.ensureCss)
      ? window.UniversalSpinningWheel.ensureCss()
      : new Promise((resolve) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = '/css/spin-wheel.min.css?v=5589ba66';
          link.onload = link.onerror = resolve;
          document.head.appendChild(link);
          setTimeout(resolve, 3000);
        });
    await showWhenStyled;
    document.body.appendChild(modalContainer);
    // phones: pull the sheet down to close it (js/universal-spinning-wheel.js)
    if (window.PrSheetSwipe) window.PrSheetSwipe(modalContainer.querySelector('.pr-rc-card'), '.pr-rc-close');

    // What each wheel can give, read from its prizes: "up to 14%", "up to 6 days"
    wheelConfigs.forEach((config) => {
      if (!config.id || config.id === 'active') return;
      fetch(`${API_BASE_URL}/api/spinning-wheels/${config.id}/secure-data`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const segs = data && Array.isArray(data.segments) ? data.segments : [];
          if (!segs.length) return;
          const max = Math.max.apply(null, segs.map((x) => Number(x.value) || 0));
          if (!max) return;
          const days = segs[0].type === 'free_days';
          let label;
          if (days) {
            const key = max === 1 ? '1_day' : `${max}_days`;
            const t = (typeof i18next !== 'undefined' && i18next.t) ? i18next.t(`wheel.wheel_segments.${key}`) : '';
            const word = { ro: max === 1 ? 'zi' : 'zile', ru: max === 1 ? 'день' : max < 5 ? 'дня' : 'дней', en: max === 1 ? 'day' : 'days' }[lang] || 'days';
            label = `${UPTO} ${t && t.indexOf('wheel.') !== 0 ? t.toLowerCase() : `${max} ${word}`}`;
          } else {
            label = `${UPTO} ${max}%`;
          }
          const chip = document.querySelector(`#returningCustomerModal .wheel-button[data-wheel-id="${config.id}"] .pr-rc-range`);
          if (chip) chip.textContent = label;
        })
        .catch(() => {});
    });

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
      modal.querySelectorAll('.wheel-button[aria-busy]').forEach((b) => b.removeAttribute('aria-busy'));
      try { modal.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  updateModalHeaderTranslations() {
    const modal = document.getElementById('returningCustomerModal');
    if (!modal) return;

    // Check if i18next is available
    if (typeof i18next !== 'undefined' && i18next.t) {
      // Update title
      const titleElement = modal.querySelector('[data-i18n="wheel.welcome_back_title"]');
      if (titleElement) {
        const translatedTitle = i18next.t('wheel.welcome_back_title');
        if (translatedTitle && translatedTitle !== 'wheel.welcome_back_title') {
          titleElement.textContent = translatedTitle;
        }
      }

      // Update subtitle
      const subtitleElement = modal.querySelector('[data-i18n="wheel.welcome_back_subtitle"]');
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
            fallbackTitle = 'Percentage discount wheel';
            fallbackDesc = 'Win discount percentages on your rental';
          } else if (isFreeDaysWheel) {
            titleKey = 'wheel.free_days_wheel';
            descKey = 'wheel.free_days_description';
            fallbackTitle = 'Free days wheel';
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

    const closeBtn = modal.querySelector('.pr-rc-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeReturningCustomerModal());

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
          button.setAttribute('aria-busy', 'true');
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
      const phoneNumber = phoneInput ? ((window.PhoneInput && window.PhoneInput.full(phoneInput)) || phoneInput.value.trim()) : null;
      
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
      const phoneNumber = phoneInput ? ((window.PhoneInput && window.PhoneInput.full(phoneInput)) || phoneInput.value.trim()) : null;
      
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
