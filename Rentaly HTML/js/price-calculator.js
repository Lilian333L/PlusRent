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
    
    // Location-based delivery fees
    this.locationFees = {
      'Chisinau Airport': 50,
      'Our Office': 0,
      'Iasi Airport': 150
    };
    
    // Insurance costs - use database values if available, otherwise fallback
    this.insuranceCosts = {
      'RCA': car && car.rca_insurance_price ? parseFloat(car.rca_insurance_price) : 0,
      'Casco': car && car.casco_insurance_price ? parseFloat(car.casco_insurance_price) : 25
    };
    
    // Outside working hours fees
    this.outsideHoursFee = 20; // Fee for pickup/dropoff outside working hours
    
    // Discount rates
    this.discountRates = {
      'WELCOME10': 0.10,  // 10% discount
      'SUMMER15': 0.15,   // 15% discount
      'LOYAL20': 0.20     // 20% discount
    };
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

  // Check if time is outside working hours
  isOutsideWorkingHours(time) {
    const hour = parseInt(time.split(':')[0]);
    return hour < this.workingHours.start || hour >= this.workingHours.end;
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

  // Calculate outside hours fees
  calculateOutsideHoursFees(pickupTime, returnTime) {
    let fees = 0;
    
    if (this.isOutsideWorkingHours(pickupTime)) {
      fees += this.outsideHoursFee;
    }
    
    if (this.isOutsideWorkingHours(returnTime)) {
      fees += this.outsideHoursFee;
    }
    
    return fees;
  }

  // Apply discount
  applyDiscount(totalPrice, discountCode) {
    const discountRate = this.discountRates[discountCode];
    if (discountRate) {
      return totalPrice * (1 - discountRate);
    }
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
    
    // Calculate location fee
    const locationFee = this.calculateLocationFee(pickupLocation);
    
    // Calculate insurance cost
    const insuranceCost = this.calculateInsuranceCost(insuranceType, days);
    
    // Calculate outside hours fees
    const outsideHoursFees = this.calculateOutsideHoursFees(pickupTime, returnTime);
    
    // Calculate subtotal
    const subtotal = basePrice + locationFee + insuranceCost + outsideHoursFees;
    
    // Apply discount
    const finalPrice = this.applyDiscount(subtotal, discountCode);
    
    // Return detailed breakdown
    return {
      days,
      basePrice,
      locationFee,
      insuranceCost,
      outsideHoursFees,
      subtotal,
      discount: discountCode ? this.discountRates[discountCode] * subtotal : 0,
      finalPrice,
      breakdown: {
        'Price per day': `${this.basePrice}€`,
        'Total days': `x ${days}`,
        'Location delivery': locationFee > 0 ? `+ ${locationFee} €` : 'Included',
        'Insurance cost': insuranceCost > 0 ? `+ ${insuranceCost} €` : 'Included',
        'Outside hours pickup': this.isOutsideWorkingHours(pickupTime) ? `+ ${this.outsideHoursFee} €` : 'Included',
        'Outside hours return': this.isOutsideWorkingHours(returnTime) ? `+ ${this.outsideHoursFee} €` : 'Included',
        'Discount': discountCode ? `- ${Math.round(this.discountRates[discountCode] * subtotal)} €` : 'None'
      }
    };
  }

  // Validate discount code
  validateDiscountCode(code) {
    return this.discountRates.hasOwnProperty(code);
  }

  // Get available discount codes
  getAvailableDiscountCodes() {
    return Object.keys(this.discountRates);
  }

  // Update price display in the UI
  updatePriceDisplay(priceData) {
    const priceContainer = document.getElementById('price-breakdown');
    if (!priceContainer) return;

    // If no price data, show placeholder
    if (!priceData) {
      priceContainer.innerHTML = `
        <h3 style="font-weight: 700; text-align: center; margin-bottom: 18px;">Final Price</h3>
        <div style="font-size: 16px; text-align: center; color: #666;">
          <p>Please fill in the dates and times to see the price breakdown</p>
        </div>
      `;
      return;
    }

    let html = '<h3 style="font-weight: 700; text-align: center; margin-bottom: 18px;">Final Price</h3>';
    html += '<div style="font-size: 16px;">';
    
    // Always show base price calculation
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Price per day</span><span>${this.basePrice}€</span></div>`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Total days</span><span>x ${priceData.days}</span></div>`;
    
    // Add breakdown items that have costs
    Object.entries(priceData.breakdown).forEach(([label, value]) => {
      if (value !== 'Included' && value !== 'None' && label !== 'Price per day' && label !== 'Total days') {
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${label}</span><span>${value}</span></div>`;
      }
    });
    
    // Add total
    html += '<div style="border-top: 1px solid #ddd; margin: 12px 0;"></div>';
    html += `<div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 18px;"><span>Total price:</span><span>${Math.round(priceData.finalPrice)} €</span></div>`;
    
    html += '</div>';
    priceContainer.innerHTML = html;
  }

  // Initialize calculator with form event listeners
  init() {
    console.log('Price calculator initializing...');
    const form = document.getElementById('contact_form');
    if (!form) {
      console.log('Contact form not found');
      return;
    }
    console.log('Contact form found, setting up event listeners...');

    // Add comprehensive event listeners to form fields
    const priceFields = [
      'date-picker',
      'pickup-time', 
      'date-picker-2',
      'collection-time',
      'discount_code'
    ];

    priceFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        console.log(`Setting up listeners for field: ${fieldId}`);
        // Listen to all possible input events
        const events = ['input', 'change', 'keyup', 'paste', 'cut', 'blur', 'focus'];
        events.forEach(eventType => {
          field.addEventListener(eventType, () => this.debouncedRecalculate());
        });
      } else {
        console.log(`Field not found: ${fieldId}`);
      }
    });

    // Add event listeners to radio buttons
    const radioGroups = ['pickup_location', 'insurance_type'];
    radioGroups.forEach(groupName => {
      const radios = document.querySelectorAll(`input[name="${groupName}"]`);
      console.log(`Found ${radios.length} radio buttons for ${groupName}`);
      radios.forEach(radio => {
        radio.addEventListener('change', () => this.recalculatePrice());
        radio.addEventListener('click', () => this.recalculatePrice());
      });
    });

    // Also listen to form-level events
    form.addEventListener('input', () => this.debouncedRecalculate());
    form.addEventListener('change', () => this.recalculatePrice());

    // Show default calculation
    this.showDefaultCalculation();
    console.log('Price calculator initialized successfully');
  }

  // Show default calculation with default values
  showDefaultCalculation() {
    // Get default dates from date pickers or use today/tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const defaultPickupDate = document.getElementById('date-picker')?.value || this.formatDate(today);
    const defaultReturnDate = document.getElementById('date-picker-2')?.value || this.formatDate(tomorrow);
    const defaultPickupTime = document.getElementById('pickup-time')?.value || '09:00';
    const defaultReturnTime = document.getElementById('collection-time')?.value || '09:00';
    
    // Set default radio button selections
    this.setDefaultRadioSelections();
    
    const defaultRentalData = {
      pickupDate: defaultPickupDate,
      pickupTime: defaultPickupTime,
      returnDate: defaultReturnDate,
      returnTime: defaultReturnTime,
      pickupLocation: 'Our Office',
      insuranceType: 'RCA',
      discountCode: ''
    };

    console.log('Showing default calculation with:', defaultRentalData);
    const priceData = this.calculatePrice(defaultRentalData);
    this.updatePriceDisplay(priceData);
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

  // Format date as YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Debounced recalculation to prevent too many calculations
  debouncedRecalculate() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.recalculatePrice();
    }, 100); // 100ms delay
  }

  // Recalculate price based on current form values
  recalculatePrice() {
    console.log('Recalculating price...');
    const form = document.getElementById('contact_form');
    if (!form) {
      console.log('Form not found in recalculatePrice');
      return;
    }

    // Get form data with fallbacks to default values
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const pickupDate = document.getElementById('date-picker')?.value || this.formatDate(today);
    const pickupTime = document.getElementById('pickup-time')?.value || '09:00';
    const returnDate = document.getElementById('date-picker-2')?.value || this.formatDate(tomorrow);
    const returnTime = document.getElementById('collection-time')?.value || '09:00';
    const pickupLocation = this.getSelectedRadioValue('pickup_location') || 'Our Office';
    const insuranceType = this.getSelectedRadioValue('insurance_type') || 'RCA';
    const discountCode = document.querySelector('input[name="discount_code"]')?.value || '';

    console.log('Form values:', { pickupDate, pickupTime, returnDate, returnTime, pickupLocation, insuranceType, discountCode });

    // Handle discount code validation
    if (discountCode) {
      this.handleDiscountCode(discountCode);
    } else {
      this.hideDiscountMessage();
    }

    const rentalData = {
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      pickupLocation,
      insuranceType,
      discountCode
    };

    // Always calculate price (no validation needed since we have defaults)
    const priceData = this.calculatePrice(rentalData);
    console.log('Calculated price data:', priceData);
    
    // Update display
    this.updatePriceDisplay(priceData);
  }

  // Handle discount code validation and updates
  handleDiscountCode(code) {
    if (code && !this.validateDiscountCode(code)) {
      // Show invalid discount code message
      const discountField = document.querySelector('input[name="discount_code"]');
      if (discountField) {
        discountField.style.borderColor = '#ff4444';
        // Add a small tooltip or message
        this.showDiscountMessage('Invalid discount code', 'error');
      }
    } else {
      // Clear error styling
      const discountField = document.querySelector('input[name="discount_code"]');
      if (discountField) {
        discountField.style.borderColor = '#ddd';
      }
      this.hideDiscountMessage();
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
    const existingMessage = document.getElementById('discount-message');
    if (existingMessage) {
      existingMessage.remove();
    }
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