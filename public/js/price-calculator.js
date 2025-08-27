// Price Calculator for Car Rental
// Handles pricing logic based on location, insurance, working hours, and discounts

class PriceCalculator {
  constructor(car = null) {
    // Use car's price policy if available, otherwise fallback to default
    this.car = car;
    this.basePrice = car && car.price_policy && car.price_policy['1-2'] 
      ? parseInt(car.price_policy['1-2']) 
      : 60; // Default fallback
    
    this.workingHours = {
      start: 8, // 8:00 AM
      end: 18   // 6:00 PM
    };
    
    // Location-based delivery fees (same for pickup and dropoff)
    this.locationFees = {
      'Chisinau Airport': 25,
      'Our Office': 0,
      'Iasi Airport': 35
    };
    
    // Insurance costs - use database values if available, otherwise fallback
    this.insuranceCosts = {
      'RCA': car && car.rca_insurance_price ? parseFloat(car.rca_insurance_price) : 0,
      'Casco': car && car.casco_insurance_price ? parseFloat(car.casco_insurance_price) : 25
    };
    
    // Outside working hours fees
    this.outsideHoursFee = 15; // Fee for pickup/dropoff outside working hours
    
    // Discount codes are managed via backend API - no hardcoded rates needed
  }

  // Update car data (called when car data is loaded)
  updateCarData(car) {
    this.car = car;
    this.basePrice = car && car.price_policy && car.price_policy['1-2'] 
      ? parseInt(car.price_policy['1-2']) 
      : 60;
    
    // Update insurance costs from database
    this.insuranceCosts = {
      'RCA': car && car.rca_insurance_price ? parseFloat(car.rca_insurance_price) : 0,
      'Casco': car && car.casco_insurance_price ? parseFloat(car.casco_insurance_price) : 25
    };
    
    console.log('Updated car data, base price:', this.basePrice, 'insurance costs:', this.insuranceCosts);
  }

  // Check if time is outside working hours (8:00-18:00)
  isOutsideWorkingHours(time) {
    const hour = parseInt(time.split(':')[0]);
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

  // Calculate base price for the rental period
  calculateBasePrice(days) {
    return this.basePrice * days;
  }

  // Calculate location delivery fee
  calculateLocationFee(location) {
    return this.locationFees[location] || 0;
  }

  // Calculate insurance cost
  calculateInsuranceCost(insuranceType, days) {
    return this.insuranceCosts[insuranceType] * days;
  }

  // Calculate outside working hours fees
  calculateOutsideHoursFees(pickupTime, returnTime) {
    let fees = 0;
    
    // Check if pickup is outside working hours (8:00-18:00)
    if (this.isOutsideWorkingHours(pickupTime)) {
      fees += 15; // €15 fee for pickup outside working hours
    }
    
    // Check if return is outside working hours (8:00-18:00)
    if (this.isOutsideWorkingHours(returnTime)) {
      fees += 15; // €15 fee for return outside working hours
    }
    
    return fees;
  }

  // Apply discount
  applyDiscount(totalPrice, discountCode) {
    // Discount rates are now managed by the backend API
    // This function will need to be updated to call the API for discount calculation
    // For now, it will return the total price as is, as no hardcoded rates are available.
    return totalPrice;
  }

  // Main calculation function
  calculatePrice(rentalData) {
    const {
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      pickupLocation,
      insuranceType,
      discountCode
    } = rentalData;

    // Calculate days
    const days = this.calculateDays(pickupDate, returnDate);
    
    // Calculate base price
    const basePrice = this.calculateBasePrice(days);
    
    // Calculate location fees for both pickup and dropoff
    let pickupLocationFee = 0;
    let dropoffLocationFee = 0;
    let dropoffLocation = "";
    
    if (pickupLocation === 'Chisinau Airport') {
      pickupLocationFee = 25;
    } else if (pickupLocation === 'Iasi Airport') {
      pickupLocationFee = 35;
    }
    
    if (dropoffLocation === 'Chisinau Airport') {
      dropoffLocationFee = 25;
    } else if (dropoffLocation === 'Iasi Airport') {
      dropoffLocationFee = 35;
    }
    
    const totalLocationFee = pickupLocationFee + dropoffLocationFee;
    
    // Calculate insurance cost
    const insuranceCost = this.calculateInsuranceCost(insuranceType, days);
    
    // Calculate outside hours fees
    const outsideHoursFees = this.calculateOutsideHoursFees(pickupTime, returnTime);
    
    // Calculate subtotal
    const subtotal = basePrice + totalLocationFee + insuranceCost + outsideHoursFees;
    
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
      discount: discountCode ? 0 : 0, // No hardcoded discount rates
      finalPrice,
      breakdown: {
        'Price per day': `${this.basePrice}€`,
        'Total days': `x ${days}`,
        'Location delivery': totalLocationFee > 0 ? `+ ${totalLocationFee} €` : 'Included',
        'Insurance cost': insuranceCost > 0 ? `+ ${insuranceCost} €` : 'Included',
        'Outside hours pickup': this.isOutsideWorkingHours(pickupTime) ? `+ ${this.outsideHoursFee} €` : 'Included',
        'Outside hours return': this.isOutsideWorkingHours(returnTime) ? `+ ${this.outsideHoursFee} €` : 'Included',
        'Discount': discountCode ? `- ${Math.round(0)} €` : 'None' // No hardcoded discount rates
      }
    };
  }

  // Validate discount code
  async validateDiscountCode(code) {
    if (!code || code.trim() === '') {
      return { valid: false, message: 'Please enter a discount code' };
    }
    
    try {
      // Get customer phone number for validation
      const customerPhone = document.querySelector('#phone')?.value?.trim() || 
                           document.querySelector('[name="customer_phone"]')?.value?.trim();
      
      // First try to validate as a redemption code (individual codes) with phone number if available
      let redemptionResponse;
      if (customerPhone) {
        redemptionResponse = await fetch(`${window.API_BASE_URL}/api/coupons/validate-redemption/${code.trim()}?phone=${encodeURIComponent(customerPhone)}`);
      } else {
        redemptionResponse = await fetch(`${window.API_BASE_URL}/api/coupons/validate-redemption/${code.trim()}`);
      }
      
      const redemptionResult = await redemptionResponse.json();
      
      if (redemptionResult.valid) {
        return redemptionResult;
      }
      
      // If not a redemption code, try as a main coupon code
      const couponResponse = await fetch(`${window.API_BASE_URL}/api/coupons/validate/${code.trim()}`);
      const couponResult = await couponResponse.json();
      return couponResult;
      
    } catch (error) {
      console.error('Error validating discount code:', error);
      return { valid: false, message: 'Error validating discount code' };
    }
  }

  // Get available discount codes (for reference)
  getAvailableDiscountCodes() {
    return []; // No hardcoded discount codes
  }

  // Update the price display
  updatePriceDisplay(priceData) {
    const priceContainer = document.getElementById('price-content');
    const loadingElement = document.getElementById('price-loading');
    
    console.log('updatePriceDisplay called with:', priceData);
    console.log('priceContainer found:', !!priceContainer);
    console.log('loadingElement found:', !!loadingElement);
    
    if (!priceContainer) {
      console.error('price-content element not found!');
      return;
    }

    // Hide loading state
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }

    // Check if we have valid data
    if (!priceData || priceData.totalPrice === 0) {
      let message = typeof i18next !== 'undefined' ? i18next.t('cars.please_fill_dates') : 'Please fill in the dates and times to see the price breakdown';
      let messageStyle = 'color: #666; background: white; border: 1px solid #ddd;';
      
      // Show specific error message if provided
      if (priceData.error) {
        message = priceData.error;
        messageStyle = 'color: #dc3545; background: #f8d7da; border: 1px solid #f5c6cb;';
      }
      
      // Show specific message if provided (not an error)
      if (priceData.message) {
        message = priceData.message;
        messageStyle = 'color: #666; background: white; border: 1px solid #ddd;';
      }
      
      priceContainer.innerHTML = `<div style="text-align: center; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); ${messageStyle}">${message}</div>`;
      return;
    }

    const t = (key) => {
      const fallbackTranslations = {
        'cars.price_breakdown': 'Price Breakdown',
        'cars.price_per_day': 'Price per day',
        'cars.total_days': 'Total days',
        'cars.pickup': 'Pickup',
        'cars.dropoff': 'Dropoff',
        'cars.insurance': 'Insurance',
        'cars.total_price': 'Total price',
        'cars.please_fill_dates': 'Please fill in the dates and times to see the price breakdown',
        'cars.chisinau_airport': 'Chisinau Airport',
        'cars.iasi_airport': 'Iasi Airport'
      };
      return fallbackTranslations[key] || key;
    };

    let html = '<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">';
    html += '<h5 style="margin-bottom: 15px; color: #333;">Price Breakdown</h5>';

    // Always show base price calculation
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Price per day</span><span>${Math.round(priceData.basePrice / priceData.rentalDays)}€</span></div>`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Total days</span><span>x ${priceData.rentalDays}</span></div>`;
    
    // Add pickup location
    const pickupLocation = this.getSelectedRadioValue('pickup_location') || 'Our Office';
    const dropoffLocation = this.getSelectedRadioValue('dropoff_location') || 'Our Office';
    
    if (pickupLocation !== 'Our Office') {
      const pickupFee = pickupLocation === 'Chisinau Airport' ? 25 : 35;
      const locationName = pickupLocation === 'Chisinau Airport' ? 'Chisinau Airport' : 'Iasi Airport';
      html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Pickup: ${locationName}</span><span>${pickupFee}€</span></div>`;
    }
    
    if (dropoffLocation !== 'Our Office') {
      const dropoffFee = dropoffLocation === 'Chisinau Airport' ? 25 : 35;
      const locationName = dropoffLocation === 'Chisinau Airport' ? 'Chisinau Airport' : 'Iasi Airport';
      html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Dropoff: ${locationName}</span><span>${dropoffFee}€</span></div>`;
    }
    
    // Add breakdown items that have costs
    if (priceData.insuranceCost > 0) {
      const insuranceType = this.getSelectedRadioValue('insurance_type') || 'RCA';
      html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Insurance (${insuranceType})</span><span>${priceData.insuranceCost}€</span></div>`;
    }
    
    if (priceData.outsideHoursFees > 0) {
      const pickupHour = parseInt(priceData.pickupTime.split(':')[0]);
      const returnHour = parseInt(priceData.returnTime.split(':')[0]);
      
      // Show separate fees for pickup and dropoff if both are outside hours
      if ((pickupHour < 8 || pickupHour >= 18) && (returnHour < 8 || returnHour >= 18)) {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Outside hours pickup (${priceData.pickupTime})</span><span>15€</span></div>`;
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Outside hours dropoff (${priceData.returnTime})</span><span>15€</span></div>`;
      } else if (pickupHour < 8 || pickupHour >= 18) {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Outside hours pickup (${priceData.pickupTime})</span><span>15€</span></div>`;
      } else if (returnHour < 8 || returnHour >= 18) {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Outside hours dropoff (${priceData.returnTime})</span><span>15€</span></div>`;
      }
    }
    
    if (priceData.discountAmount > 0) {
      const discountCode = document.querySelector('input[name="discount_code"]')?.value || '';
      html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Discount (${discountCode})</span><span>-${priceData.discountAmount.toFixed(2)}€</span></div>`;
    }
    
    // Add total
    html += '<div style="border-top: 1px solid #ddd; margin: 12px 0;"></div>';
    html += `<div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 18px;"><span>Total price:</span><span>${Math.round(priceData.totalPrice)} €</span></div>`;
    
    html += '</div>';
    priceContainer.innerHTML = html;
  }

  // Update outside hours notice
  updateOutsideHoursNotice(pickupTime, returnTime) {
    const notice = document.getElementById('outside-hours-notice');
    const details = document.getElementById('outside-hours-details');
    
    if (!notice || !details) return;
    
    const pickupHour = parseInt(pickupTime.split(':')[0]);
    const returnHour = parseInt(returnTime.split(':')[0]);
    
    let isOutsideHours = false;
    let detailsText = '';
    
    // Check pickup time
    if (pickupHour < 8 || pickupHour >= 18) {
      isOutsideHours = true;
      detailsText += `• Pickup at ${pickupTime} (outside working hours)<br>`;
    }
    
    // Check return time
    if (returnHour < 8 || returnHour >= 18) {
      isOutsideHours = true;
      detailsText += `• Return at ${returnTime} (outside working hours)<br>`;
    }
    
    if (isOutsideHours) {
      details.innerHTML = detailsText;
      notice.style.display = 'block';
    } else {
      notice.style.display = 'none';
    }
  }

  // Initialize the price calculator
  async init() {
    try {
      // Set up event listeners for form inputs
      const pickupDateInput = document.getElementById('date-picker');
      const returnDateInput = document.getElementById('date-picker-2');
      const pickupTimeSelect = document.getElementById('pickup-time');
      const returnTimeSelect = document.getElementById('collection-time');
      const discountCodeInput = document.querySelector('input[name="discount_code"]');
      const insuranceTypeInputs = document.querySelectorAll('input[name="insurance_type"]');
      const pickupLocationInputs = document.querySelectorAll('input[name="pickup_location"]');
      const dropoffLocationInputs = document.querySelectorAll('input[name="dropoff_location"]');

      // Add event listeners for all form inputs (only one per input)
      if (pickupDateInput) {
        pickupDateInput.addEventListener('change', () => this.debouncedRecalculate());
      }
      if (returnDateInput) {
        returnDateInput.addEventListener('change', () => this.debouncedRecalculate());
      }
      if (pickupTimeSelect) {
        pickupTimeSelect.addEventListener('change', () => this.debouncedRecalculate());
      }
      if (returnTimeSelect) {
        returnTimeSelect.addEventListener('change', () => this.debouncedRecalculate());
      }
      if (discountCodeInput) {
        discountCodeInput.addEventListener('input', () => this.debouncedRecalculate());
      }
      insuranceTypeInputs.forEach(input => {
        input.addEventListener('change', () => this.debouncedRecalculate());
      });
      pickupLocationInputs.forEach(input => {
        input.addEventListener('change', () => this.debouncedRecalculate());
      });
      dropoffLocationInputs.forEach(input => {
        input.addEventListener('change', () => this.debouncedRecalculate());
      });

      await this.showDefaultCalculation();
    } catch (error) {
      console.error('Error initializing price calculator:', error);
    }
  }

  // Show default calculation on page load
  async showDefaultCalculation() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pickupDateInput = document.getElementById('date-picker');
    const returnDateInput = document.getElementById('date-picker-2');

    if (pickupDateInput && returnDateInput) {
      // Set the values in YYYY-MM-DD format
      const todayFormatted = this.formatDate(today);
      const tomorrowFormatted = this.formatDate(tomorrow);
      
      console.log('Setting default dates:', {
        today: todayFormatted,
        tomorrow: tomorrowFormatted
      });
      
      // Set the values directly
      pickupDateInput.value = todayFormatted;
      returnDateInput.value = tomorrowFormatted;
      
      // Set the attribute as well
      pickupDateInput.setAttribute('value', todayFormatted);
      returnDateInput.setAttribute('value', tomorrowFormatted);
      
      console.log('Date inputs after setting:', {
        pickupValue: pickupDateInput.value,
        returnValue: returnDateInput.value
      });
    }

    await this.recalculatePrice();
  }

  // Set default radio button selections
  setDefaultRadioSelections() {
    // Set Our Office as default pickup location
    const ourOfficeRadio = document.querySelector('input[name="pickup_location"][value="Our Office"]');
    if (ourOfficeRadio) {
      ourOfficeRadio.checked = true;
    }
    
    // Set RCA as default insurance
    const rcaRadio = document.querySelector('input[name="insurance_type"][value="RCA"]');
    if (rcaRadio) {
      rcaRadio.checked = true;
    }
  }

  // Ensure date input returns YYYY-MM-DD format
  formatDateInput(dateInput) {
    if (!dateInput.value) return '';
    
    // Parse the date and return in YYYY-MM-DD format
    const date = new Date(dateInput.value);
    if (isNaN(date.getTime())) return '';
    
    return this.formatDate(date);
  }

  // Format date to YYYY-MM-DD for consistency
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Show loading state
  showLoading() {
    const priceContainer = document.getElementById('price-content');
    const loadingElement = document.getElementById('price-loading');
    
    if (priceContainer && loadingElement) {
      loadingElement.style.display = 'flex';
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
      this.recalculatePrice().catch(error => {
        console.error('Error in debounced recalculation:', error);
      });
    }, 300);
  }

  // Recalculate price based on current form values
  async recalculatePrice() {
    console.log('recalculatePrice called');
    try {
      const pickupDateInput = document.getElementById('date-picker');
      const returnDateInput = document.getElementById('date-picker-2');
      const pickupTimeSelect = document.getElementById('pickup-time');
      const returnTimeSelect = document.getElementById('collection-time');
      const discountCodeInput = document.querySelector('input[name="discount_code"]');
      const insuranceTypeInputs = document.querySelectorAll('input[name="insurance_type"]');
      const pickupLocationInputs = document.querySelectorAll('input[name="pickup_location"]');

      if (!pickupDateInput || !returnDateInput || !pickupTimeSelect || !returnTimeSelect) {
        console.error('Required form elements not found');
        return;
      }

      // Get values with proper date formatting
      const pickupDate = pickupDateInput.value;
      const returnDate = returnDateInput.value;
      const pickupTime = pickupTimeSelect.value;
      const returnTime = returnTimeSelect.value;
      const discountCode = discountCodeInput ? discountCodeInput.value.trim() : '';
      const insuranceType = Array.from(insuranceTypeInputs).find(input => input.checked)?.value || 'RCA';
      const pickupLocation = Array.from(pickupLocationInputs).find(input => input.checked)?.value || 'Our Office';
      
      // Get dropoff location
      const dropoffLocationInputs = document.querySelectorAll('input[name="dropoff_location"]');
      const dropoffLocation = Array.from(dropoffLocationInputs).find(input => input.checked)?.value || 'Our Office';

      console.log('Form values:', {
        pickupDate,
        returnDate,
        pickupTime,
        returnTime,
        discountCode,
        insuranceType,
        pickupLocation,
        dropoffLocation
      });

      // Validate dates
      if (!pickupDate || !returnDate) {
        console.log('Missing dates, showing default message');
        this.updatePriceDisplay({ 
          totalPrice: 0, 
          breakdown: [],
          message: 'Please select both pickup and return dates to see pricing'
        });
        return;
      }

      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
      const returnDateTime = new Date(`${returnDate}T${returnTime}`);

      // No validation here - let the booking form handle validation
      console.log('Proceeding with calculation');

      // Calculate rental days - handle edge cases
      let rentalDays = 0;
      
      if (pickupDate && returnDate) {
      const timeDiff = returnDateTime.getTime() - pickupDateTime.getTime();
        rentalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Ensure minimum 1 day rental
        if (rentalDays <= 0) {
          rentalDays = 1;
        }
      }
      
      console.log('Date calculation:', {
        pickupDate,
        returnDate,
        pickupTime,
        returnTime,
        pickupDateTime: pickupDateTime.toISOString(),
        returnDateTime: returnDateTime.toISOString(),
        timeDiff: pickupDate && returnDate ? returnDateTime.getTime() - pickupDateTime.getTime() : 0,
        rentalDays
      });

      // Get base price based on rental days
      console.log('Car data available:', !!this.car);
      console.log('Car price policy:', this.car?.price_policy);
      console.log('Rental days:', rentalDays);
      
      let basePrice = 0;
      if (rentalDays === 0) {
        // No dates selected or invalid dates - show default message
        this.updatePriceDisplay({ 
          totalPrice: 0, 
          breakdown: [],
          message: 'Please select both pickup and return dates to see pricing'
        });
        return;
      } else if (rentalDays >= 1 && rentalDays <= 2) {
        basePrice = this.car.price_policy['1-2'] || 0;
      } else if (rentalDays >= 3 && rentalDays <= 7) {
        basePrice = this.car.price_policy['3-7'] || 0;
      } else if (rentalDays >= 8 && rentalDays <= 20) {
        basePrice = this.car.price_policy['8-20'] || 0;
      } else if (rentalDays >= 21 && rentalDays <= 45) {
        basePrice = this.car.price_policy['21-45'] || 0;
      } else {
        basePrice = this.car.price_policy['46+'] || 0;
      }
      
      console.log('Selected base price:', basePrice);

      // Calculate total base price
      const totalBasePrice = basePrice * rentalDays;

      // Calculate location fees for both pickup and dropoff
      let pickupLocationFee = 0;
      let dropoffLocationFee = 0;
      
      if (pickupLocation === 'Chisinau Airport') {
        pickupLocationFee = 25;
      } else if (pickupLocation === 'Iasi Airport') {
        pickupLocationFee = 35;
      }
      
      if (dropoffLocation === 'Chisinau Airport') {
        dropoffLocationFee = 25;
      } else if (dropoffLocation === 'Iasi Airport') {
        dropoffLocationFee = 35;
      }
      
      const totalLocationFee = pickupLocationFee + dropoffLocationFee;

      // Calculate insurance cost
      let insuranceCost = 0;
      if (insuranceType === 'RCA') {
        insuranceCost = (this.car.rca_insurance_price || 0) * rentalDays;
      } else if (insuranceType === 'Casco') {
        insuranceCost = (this.car.casco_insurance_price || 0) * rentalDays;
      }

      // Calculate outside hours fees
      const outsideHoursFees = this.calculateOutsideHoursFees(pickupTime, returnTime);

      // Calculate discount
      let discountAmount = 0;
      if (discountCode) {
        const discountResult = await this.handleDiscountCode(discountCode);
        if (discountResult.valid && discountResult.discount_percentage) {
          const discountPercentage = parseFloat(discountResult.discount_percentage);
          if (!isNaN(discountPercentage)) {
            discountAmount = (totalBasePrice + totalLocationFee + insuranceCost + outsideHoursFees) * (discountPercentage / 100);
          }
        }
      }

      // Calculate final price
      const finalPrice = totalBasePrice + totalLocationFee + insuranceCost + outsideHoursFees - discountAmount;

      // Update outside hours notice
      this.updateOutsideHoursNotice(pickupTime, returnTime);

      // Return price data with all components
      const priceData = {
        totalPrice: finalPrice,
        basePrice: totalBasePrice,
        locationFee: totalLocationFee,
        insuranceCost: insuranceCost,
        outsideHoursFees: outsideHoursFees,
        discountAmount: discountAmount,
        rentalDays: rentalDays,
        pickupTime: pickupTime,
        returnTime: returnTime
      };

      this.updatePriceDisplay(priceData);
    } catch (error) {
      console.error('Error in recalculatePrice:', error);
      this.updatePriceDisplay({ totalPrice: 0, breakdown: [] });
    }
  }

  // Handle discount code validation and updates
  async handleDiscountCode(code) {
    if (!code || code.trim() === '') {
      // Clear any previous error styling
      const discountField = document.querySelector('input[name="discount_code"]');
      if (discountField) {
        discountField.style.borderColor = '#ddd';
      }
      this.hideDiscountMessage();
      return { valid: false, message: 'Please enter a discount code' };
    }
    
    const validationResult = await this.validateDiscountCode(code);
    if (!validationResult.valid) {
      // Show invalid discount code message
      const discountField = document.querySelector('input[name="discount_code"]');
      if (discountField) {
        discountField.style.borderColor = '#ff4444';
        // Add a small tooltip or message
        this.showDiscountMessage(validationResult.message, 'error');
      }
      return validationResult;
    } else {
      // Valid code - clear error styling
      const discountField = document.querySelector('input[name="discount_code"]');
      if (discountField) {
        discountField.style.borderColor = '#ddd';
      }
      this.hideDiscountMessage();
      return validationResult;
    }
  }

  // Show discount message
  showDiscountMessage(message, type = 'info') {
    let existingMessage = document.getElementById('discount-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const discountField = document.querySelector('input[name="discount_code"]');
    if (discountField) {
      const messageDiv = document.createElement('div');
      messageDiv.id = 'discount-message';
      messageDiv.style.cssText = `
        font-size: 12px;
        margin-top: 5px;
        color: ${type === 'error' ? '#ff4444' : '#28a745'};
      `;
      messageDiv.textContent = message;
      discountField.parentNode.appendChild(messageDiv);
    }
  }

  // Hide discount message
  hideDiscountMessage() {
    const messageElement = document.getElementById('discount-message');
    if (messageElement) {
      messageElement.style.display = 'none';
    }
  }

  // Get total price for booking form
  getTotalPrice() {
    const pickupDate = document.getElementById('date-picker')?.value;
    const returnDate = document.getElementById('date-picker-2')?.value;
    const pickupTime = document.getElementById('pickup-time')?.value;
    const returnTime = document.getElementById('collection-time')?.value;
    const insuranceType = this.getSelectedRadioValue('insurance_type');
    const pickupLocation = this.getSelectedRadioValue('pickup_location');
    const dropoffLocation = this.getSelectedRadioValue('dropoff_location');
    const discountCode = document.querySelector('input[name="discount_code"]')?.value;

    if (!pickupDate || !returnDate || !pickupTime || !returnTime || !insuranceType || !pickupLocation || !dropoffLocation) {
      return 0;
    }

    const rentalData = {
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      insuranceType,
      pickupLocation,
      dropoffLocation,
      discountCode
    };

    const priceData = this.calculatePrice(rentalData);
    return priceData.finalPrice;
  }

  // Get price breakdown for booking form
  getPriceBreakdown() {
    const pickupDate = document.getElementById('date-picker')?.value;
    const returnDate = document.getElementById('date-picker-2')?.value;
    const pickupTime = document.getElementById('pickup-time')?.value;
    const returnTime = document.getElementById('collection-time')?.value;
    const insuranceType = this.getSelectedRadioValue('insurance_type');
    const pickupLocation = this.getSelectedRadioValue('pickup_location');
    const dropoffLocation = this.getSelectedRadioValue('dropoff_location');
    const discountCode = document.querySelector('input[name="discount_code"]')?.value;

    if (!pickupDate || !returnDate || !pickupTime || !returnTime || !insuranceType || !pickupLocation || !dropoffLocation) {
      return {};
    }

    const rentalData = {
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      insuranceType,
      pickupLocation,
      dropoffLocation,
      discountCode
    };

    const priceData = this.calculatePrice(rentalData);
    return priceData.breakdown;
  }

  // Get selected radio button value
  getSelectedRadioValue(name) {
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : null;
  }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.priceCalculator = new PriceCalculator();
  // Don't auto-init, will be called manually with car data
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PriceCalculator;
} 