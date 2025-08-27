$(document).ready(function(){
    // Initialize booking form handler
    const bookingForm = $('#booking_form');
    const submitButton = $('#send_message');
    const successMessage = $('#success_message');
    const errorMessage = $('#error_message');
    const mailFail = $('#mail_fail');
    
    // API base URL from config
    const apiBaseUrl = window.API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `https://${window.location.hostname}`);
    
    // Debug: Check if radio buttons are accessible on page load
    console.log('=== PAGE LOAD DEBUG ===');
    console.log('Pickup location radios on load:', $('input[name="pickup_location"]').length);
    console.log('Destination radios on load:', $('input[name="destination"]').length);
    console.log('Checked pickup on load:', $('input[name="pickup_location"]:checked').val());
    console.log('Checked destination on load:', $('input[name="destination"]:checked').val());
    console.log('=== END PAGE LOAD DEBUG ===');
    
    // Enhanced form validation
    function validateForm() {
        let isValid = true;
        const errors = [];
        
        // Clear previous error states
        $('.error_input').removeClass('error_input');
        $('.field-error').remove();
        
        // Required fields validation (removed date/time fields since they're now in modal)
        const requiredFields = {
            'name': 'Name',
            'phone': 'Phone',
            'vehicle_type': 'Vehicle'
        };
        
        // Check required fields
        Object.keys(requiredFields).forEach(fieldId => {
            const field = $(`#${fieldId}`);
            const value = field.val();
            
            if (!value || value.trim() === '') {
                field.addClass('error_input');
                field.after(`<div class="field-error text-danger small mt-1">${requiredFields[fieldId]} is required</div>`);
                errors.push(`${requiredFields[fieldId]} is required`);
                isValid = false;
            }
        });
        
        // Email validation
        const email = $('#email').val();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            $('#email').addClass('error_input');
            $('#email').after('<div class="field-error text-danger small mt-1">Please enter a valid email address</div>');
            errors.push('Please enter a valid email address');
            isValid = false;
        }
        
        // Phone validation
        const phone = $('#phone').val();
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
        if (phone && !phoneRegex.test(phone)) {
            $('#phone').addClass('error_input');
            $('#phone').after('<div class="field-error text-danger small mt-1">Please enter a valid phone number</div>');
            errors.push('Please enter a valid phone number');
            isValid = false;
        }
        
        // Date and time validation is now handled in the modal
        const pickupDateStr = $('#modal-pickup-date').val();
        const returnDateStr = $('#modal-return-date').val();
        const pickupTime = $('#modal-pickup-time').val();
        const returnTime = $('#modal-return-time').val();
        
        if (pickupDateStr && returnDateStr) {
            const pickupDate = new Date(pickupDateStr + 'T00:00:00');
            const returnDate = new Date(returnDateStr + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (pickupDate < today) {
                errors.push('Pickup date must be today or in the future');
                isValid = false;
            }
            
            if (returnDate <= pickupDate) {
                errors.push('Return date must be after pickup date');
                isValid = false;
            }
        }
        
        // Time validation for same-day rentals
        if (pickupTime && returnTime && pickupDateStr && returnDateStr) {
            const pickupDateTime = new Date(pickupDateStr + 'T' + pickupTime);
            const returnDateTime = new Date(returnDateStr + 'T' + returnTime);
            
            if (pickupDateStr === returnDateStr && returnDateTime <= pickupDateTime) {
                errors.push('Return time must be after pickup time on the same day');
                isValid = false;
            }
        }
        
        // Additional validation for minimum rental duration
        if (pickupDateStr && returnDateStr) {
            const pickup = new Date(pickupDateStr);
            const return_dt = new Date(returnDateStr);
            const duration = Math.ceil((return_dt - pickup) / (1000 * 60 * 60 * 24));
            
            if (duration < 1) {
                $('#date-picker-2').addClass('error_input');
                $('#date-picker-2').after('<div class="field-error text-danger small mt-1">Minimum rental duration is 1 day</div>');
                errors.push('Minimum rental duration is 1 day');
                isValid = false;
            }
        }
        
        // Vehicle selection validation
        const vehicleSelect = $('#vehicle_type');
        if (vehicleSelect.val() === '' || vehicleSelect.val() === null) {
            vehicleSelect.addClass('error_input');
            vehicleSelect.after('<div class="field-error text-danger small mt-1">Please select a vehicle</div>');
            errors.push('Please select a vehicle');
            isValid = false;
        }
        
        // Pickup location validation (radio buttons)
        const pickupLocationRadios = $('input[name="pickup_location"]');
        const pickupLocation = $('input[name="pickup_location"]:checked').val();
        console.log('Pickup location radios found:', pickupLocationRadios.length);
        console.log('Pickup location selected:', pickupLocation);
        console.log('All pickup location values:', pickupLocationRadios.map(function() { return $(this).val(); }).get());
        console.log('Checked pickup location:', pickupLocationRadios.filter(':checked').val());
        
        if (!pickupLocation) {
            $('.radio-group:has(input[name="pickup_location"])').addClass('error_input');
            $('.radio-group:has(input[name="pickup_location"])').after('<div class="field-error text-danger small mt-1">Please select a pickup location</div>');
            errors.push('Please select a pickup location');
            isValid = false;
        }
        
        // Dropoff location validation (radio buttons)
        const dropoffLocationRadios = $('input[name="destination"]');
        const dropoffLocation = $('input[name="destination"]:checked').val();
        console.log('Dropoff location radios found:', dropoffLocationRadios.length);
        console.log('Dropoff location selected:', dropoffLocation);
        console.log('All dropoff location values:', dropoffLocationRadios.map(function() { return $(this).val(); }).get());
        console.log('Checked dropoff location:', dropoffLocationRadios.filter(':checked').val());
        
        if (!dropoffLocation) {
            $('.radio-group:has(input[name="destination"])').addClass('error_input');
            $('.radio-group:has(input[name="destination"])').after('<div class="field-error text-danger small mt-1">Please select a dropoff location</div>');
            errors.push('Please select a dropoff location');
            isValid = false;
        }
        
        return { isValid, errors };
    }
    
         // Collect form data for API submission
     window.collectFormData = function() {
         const vehicleSelect = $('#vehicle_type');
         const selectedOption = vehicleSelect.find('option:selected');
         
         return {
             car_id: selectedOption.attr('data-car-id'),
             customer_name: $('#name').val().trim(),
             customer_email: $('#email').val().trim(),
             customer_phone: $('#phone').val().trim(),
             customer_age: $('#modal-customer-age').val().trim() || $('#customer_age').val().trim(),
             pickup_date: $('#modal-pickup-date').val(),
             pickup_time: $('#modal-pickup-time').val(),
             return_date: $('#modal-return-date').val(),
             return_time: $('#modal-return-time').val(),
             pickup_location: $('input[name="pickup_location"]:checked').val(),
             dropoff_location: $('input[name="destination"]:checked').val(),
             insurance_type: 'basic', // Default insurance type (required by backend)
             special_instructions: $('#message').val().trim() || null,
             total_price: parseFloat($('#total_price').val()) || 0, // Get from hidden field
             price_breakdown: {}
         };
     }
    
         // Show loading state
     window.showLoading = function() {
         const submitButton = $('#send_message');
         submitButton.attr('disabled', true).val('Processing...');
         submitButton.css('opacity', '0.7');
         submitButton.prepend('<span class="loading-spinner"></span>');
     }
     
     // Hide loading state
     window.hideLoading = function() {
         const submitButton = $('#send_message');
         submitButton.attr('disabled', false).val('Submit');
         submitButton.css('opacity', '1');
         submitButton.find('.loading-spinner').remove();
     }
    
    // Show success message - This function is now defined later in the file with the professional modal
    
         // Show error message
     window.showError = function(message) {
         const errorMessage = $('#error_message');
         const successMessage = $('#success_message');
         const mailFail = $('#mail_fail');
         
         errorMessage.html(message).show().addClass('show');
         successMessage.hide();
         mailFail.hide();
         
         // Scroll to error message
         $('html, body').animate({
             scrollTop: errorMessage.offset().top - 100
         }, 500);
     }
    
    // Clear error states when user starts typing
    $('input, select, textarea').on('input change', function() {
        $(this).removeClass('error_input');
        $(this).siblings('.field-error').remove();
        
        // Hide error message when user starts interacting
        errorMessage.hide().removeClass('show');
    });
    
    // Clear error states for radio buttons
    $('input[type="radio"]').on('change', function() {
        const name = $(this).attr('name');
        const value = $(this).val();
        console.log('Radio button changed:', name, '=', value);
        
        $('.radio-group:has(input[name="' + name + '"])').removeClass('error_input');
        $('.radio-group:has(input[name="' + name + '"])').siblings('.field-error').remove();
        
        // Hide error message when user starts interacting
        errorMessage.hide().removeClass('show');
    });
    
    // Handle form submission - now opens price calculator modal
    submitButton.click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔍 Submit button clicked');
        console.log('🔍 Form validation starting...');
        
        // Debug: Check radio button values
        console.log('Pickup location checked:', $('input[name="pickup_location"]:checked').val());
        console.log('Destination checked:', $('input[name="destination"]:checked').val());
        console.log('All pickup_location radios:', $('input[name="pickup_location"]').length);
        console.log('All destination radios:', $('input[name="destination"]').length);
        
        // Additional debugging
        console.log('Document ready state:', $(document).readyState);
        console.log('Radio buttons exist in DOM:', $('input[name="pickup_location"]').length > 0);
        console.log('Radio buttons exist in DOM:', $('input[name="destination"]').length > 0);
        
        // Test direct jQuery selector
        const testPickup = $('input[name="pickup_location"]');
        const testDest = $('input[name="destination"]');
        console.log('Direct selector test - pickup:', testPickup.length, 'destination:', testDest.length);
        
        // Hide any existing messages
        successMessage.hide();
        errorMessage.hide();
        mailFail.hide();
        
        // Validate form
        const validation = validateForm();
        console.log('Validation result:', validation);
        
        if (!validation.isValid) {
            showError('Please fix the following issues:<br>' + validation.errors.join('<br>'));
            return;
        }
        
        // Open price calculator modal instead of submitting directly
        openPriceCalculator();
    });
    
         // Send confirmation email (optional enhancement)
     window.closeSuccessModal = function() {
    console.log('🔍 closeSuccessModal called');
    
    // Hide the success modal with animation
    $('#booking-success-modal').fadeOut(300, function() {
        // Remove the modal from DOM after animation
        $(this).remove();
        
        // Reset the form
        $('#booking_form')[0].reset();
        $('#total_price').val('0');
        
        // Clear any error states
        $('.error_input').removeClass('error_input');
        $('.field-error').remove();
        
        console.log('🔍 Success modal closed and form reset');
    });
}

function sendConfirmationEmail(bookingData) {
    // This could be handled by the backend or a separate service
    console.log('Sending confirmation email for booking:', bookingData);
}
    
    // Initialize date pickers with better UX
    function initializeDatePickers() {
        // Date picker initialization is now handled in the modal
        // This function is kept for compatibility but doesn't need to do anything
        // since date/time fields are now in the modal
    }
    
    // Initialize price calculator (for modal only)
    function initializePriceCalculator() {
        // Add event listeners for price calculation (but don't show compact summary)
        $('#vehicle_type').on('change', function() {
            // Calculate price but keep compact summary hidden
            calculatePrice();
        });
        
        // Ensure compact summary is hidden on page load
        $('#price-summary').hide();
    }
    
    // Calculate and display price (for modal only - compact summary is hidden)
    function calculatePrice() {
        const vehicleSelect = $('#vehicle_type');
        const pickupDate = $('#modal-pickup-date').val();
        const returnDate = $('#modal-return-date').val();
        
        if (!vehicleSelect.val() || !pickupDate || !returnDate) {
            // Keep compact summary hidden
            $('#price-summary').hide();
            return;
        }
        
        const selectedOption = vehicleSelect.find('option:selected');
        const dailyPrice = parseFloat(selectedOption.attr('data-daily-price')) || 0;
        
        if (dailyPrice <= 0) {
            // Keep compact summary hidden
            $('#price-summary').hide();
            return;
        }
        
        // Calculate rental duration
        const start = new Date(pickupDate);
        const end = new Date(returnDate);
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (duration <= 0) {
            // Keep compact summary hidden
            $('#price-summary').hide();
            return;
        }
        
        // Calculate costs (for internal use only)
        const baseCost = dailyPrice * duration;
        const insuranceCost = 15 * duration; // €15 per day for RCA insurance
        const totalCost = baseCost + insuranceCost;
        
        // Update price display (but keep hidden - only for modal)
        $('#daily-rate').text(`€${dailyPrice}`);
        $('#rental-duration').text(`${duration} day${duration > 1 ? 's' : ''}`);
        $('#insurance-cost').text(`€${insuranceCost}`);
        $('#total-estimate').text(`€${totalCost}`);
        
        // Keep compact summary hidden - only show in modal
        $('#price-summary').hide();
    }
    
    // Initialize form enhancements
    initializeDatePickers();
    
    // Initialize price calculator
    initializePriceCalculator();
    
    // Load saved user preferences
    loadUserPreferences();
    
    // Add real-time validation feedback
    $('#email').on('blur', function() {
        const email = $(this).val();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            $(this).addClass('error_input');
            if (!$(this).siblings('.field-error').length) {
                $(this).after('<div class="field-error text-danger small mt-1">Please enter a valid email address</div>');
            }
        }
    });
    
    $('#phone').on('blur', function() {
        const phone = $(this).val();
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
        if (phone && !phoneRegex.test(phone)) {
            $(this).addClass('error_input');
            if (!$(this).siblings('.field-error').length) {
                $(this).after('<div class="field-error text-danger small mt-1">Please enter a valid phone number</div>');
            }
        }
    });
    
    // Save user preferences
    function saveUserPreferences() {
        const preferences = {
            name: $('#name').val(),
            email: $('#email').val(),
            phone: $('#phone').val(),
            pickup_location: $('#pickup_location').val(),
            destination: $('#destination').val()
        };
        localStorage.setItem('bookingPreferences', JSON.stringify(preferences));
    }
    
    // Load user preferences
    function loadUserPreferences() {
        const saved = localStorage.getItem('bookingPreferences');
        if (saved) {
            try {
                const preferences = JSON.parse(saved);
                if (preferences.name) $('#name').val(preferences.name);
                if (preferences.email) $('#email').val(preferences.email);
                if (preferences.phone) $('#phone').val(preferences.phone);
                if (preferences.pickup_location) $('#pickup_location').val(preferences.pickup_location);
                if (preferences.destination) $('#destination').val(preferences.destination);
            } catch (e) {
                console.error('Error loading preferences:', e);
            }
        }
    }
    
    // Save preferences when form is submitted successfully
    $('input, select').on('change', saveUserPreferences);
    
    // Initialize price calculator modal
    initializePriceCalculatorModal();
    
    // Add real-time validation feedback
    $('#email').on('blur', function() {
        const email = $(this).val();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        $(this).siblings('.field-error').remove();
        
        if (email && !emailRegex.test(email)) {
            $(this).addClass('error_input');
            $(this).after('<div class="field-error text-danger small mt-1">Please enter a valid email address</div>');
        } else {
            $(this).removeClass('error_input');
        }
    });
    
    $('#phone').on('blur', function() {
        const phone = $(this).val();
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
        $(this).siblings('.field-error').remove();
        
        if (phone && !phoneRegex.test(phone)) {
            $(this).addClass('error_input');
            $(this).after('<div class="field-error text-danger small mt-1">Please enter a valid phone number</div>');
        } else {
            $(this).removeClass('error_input');
        }
    });
    
    // Clear error states when user starts typing
    $('input, select').on('input change', function() {
        $(this).removeClass('error_input');
        $(this).siblings('.field-error').remove();
    });
});

// Price Calculator Modal Functions
function initializePriceCalculatorModal() {
    // Close modal when clicking outside
    $('#price-calculator-modal').on('click', function(e) {
        if (e.target === this) {
            closePriceCalculator();
        }
    });
    
    // Close modal with Escape key
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $('#price-calculator-modal').is(':visible')) {
            closePriceCalculator();
        }
    });
}

function openPriceCalculator() {
    console.log('🔍 openPriceCalculator called');
    
    // Since we removed date/time fields from main form, we'll set default values
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const pickupDate = today.toISOString().split('T')[0];
    const returnDate = tomorrow.toISOString().split('T')[0];
    
    const selectedVehicle = $('#vehicle_type option:selected');
    
    if (!selectedVehicle.val()) {
        alert('Please select a vehicle first.');
        return;
    }
    
    // Populate modal fields with default values
    $('#modal-pickup-date').val(pickupDate);
    $('#modal-return-date').val(returnDate);
    $('#modal-pickup-time').val('08:00'); // Default to 8 AM
    $('#modal-return-time').val('18:00'); // Default to 6 PM
    
    // Set minimum dates for modal date fields
    const todayStr = today.toISOString().split('T')[0];
    $('#modal-pickup-date').attr('min', todayStr);
    $('#modal-return-date').attr('min', pickupDate);
    
    // Populate location information
    const pickupLocation = $('input[name="pickup_location"]:checked').val();
    const dropoffLocation = $('input[name="destination"]:checked').val();
    
    $('#modal-pickup-location').text(pickupLocation || 'Not selected');
    $('#modal-dropoff-location').text(dropoffLocation || 'Not selected');
    
    // Populate vehicle info
    if (selectedVehicle.attr('data-car-details')) {
        const carDetails = JSON.parse(selectedVehicle.attr('data-car-details'));
        // Handle both local paths and full URLs for head_image
        let imageUrl;
        if (carDetails.head_image) {
          if (carDetails.head_image.startsWith('http')) {
            // Full URL (Supabase Storage)
            imageUrl = carDetails.head_image;
          } else {
            // Local path (legacy)
            imageUrl = window.API_BASE_URL + carDetails.head_image;
          }
        } else {
          imageUrl = window.API_BASE_URL + '/uploads/placeholder.png';
        }
        $('#modal-vehicle-image').attr('src', imageUrl);
        $('#modal-vehicle-name').text(carDetails.make_name + ' ' + carDetails.model_name);
        $('#modal-vehicle-details').text(`${carDetails.num_passengers || '-'} passengers • ${carDetails.num_doors || '-'} doors • ${carDetails.car_type || '-'}`);
        
        // Show dynamic price based on current rental duration
        const currentPickup = new Date(pickupDate + 'T00:00:00');
        const currentReturn = new Date(returnDate + 'T00:00:00');
        const currentDays = Math.max(1, Math.ceil((currentReturn.getTime() - currentPickup.getTime()) / (1000 * 3600 * 24)));
        
        let displayPrice = '0';
        if (currentDays >= 1 && currentDays <= 2) {
            displayPrice = carDetails.price_policy ? carDetails.price_policy['1-2'] : '0';
        } else if (currentDays >= 3 && currentDays <= 7) {
            displayPrice = carDetails.price_policy ? carDetails.price_policy['3-7'] : '0';
        } else if (currentDays >= 8 && currentDays <= 20) {
            displayPrice = carDetails.price_policy ? carDetails.price_policy['8-20'] : '0';
        } else if (currentDays >= 21 && currentDays <= 45) {
            displayPrice = carDetails.price_policy ? carDetails.price_policy['21-45'] : '0';
        } else {
            displayPrice = carDetails.price_policy ? carDetails.price_policy['46+'] : '0';
        }
        
        $('#modal-vehicle-price').text('€' + displayPrice + ' /day');
    }
    
    // Calculate and display prices in modal
    calculateModalPrice();
    
    // Add event listeners for real-time price updates
    $('#modal-pickup-date, #modal-return-date, #modal-pickup-time, #modal-return-time').off('change').on('change', function() {
        // Validate dates
        const pickupDate = $('#modal-pickup-date').val();
        const returnDate = $('#modal-return-date').val();
        
        if (pickupDate && returnDate) {
            const pickup = new Date(pickupDate);
            const return_dt = new Date(returnDate);
            
            if (return_dt <= pickup) {
                alert('Return date must be after pickup date');
                return;
            }
        }
        
        calculateModalPrice();
        updateVehiclePriceDisplay();
    });
    
    // Show modal
    $('#price-calculator-modal').fadeIn(300);
    $('body').addClass('modal-open');
    
    // Add keyboard event listener for Escape key
    $(document).on('keydown.modal', function(e) {
        if (e.key === 'Escape' && $('#price-calculator-modal').is(':visible')) {
            console.log('🔍 Escape key pressed, closing modal');
            closePriceCalculator();
        }
    });
    
    // Add click event listener to close modal when clicking outside
    // Use setTimeout to prevent immediate triggering from the opening click
    setTimeout(function() {
        $(document).on('click.modal', function(e) {
            if ($(e.target).closest('#price-calculator-modal').length === 0 && 
                $('#price-calculator-modal').is(':visible')) {
                console.log('🔍 Clicked outside modal, closing');
                closePriceCalculator();
            }
        });
    }, 100);
}

function closePriceCalculator() {
    console.log('🔍 closePriceCalculator called');
    
    // Hide the modal
    $('#price-calculator-modal').fadeOut(300);
    
    // Remove modal-open class to restore normal page functionality
    $('body').removeClass('modal-open');
    
    // Ensure body scroll is restored
    $('body').css('overflow', '');
    
    // Remove any remaining modal backdrop if present
    $('.modal-backdrop').remove();
    
    // Re-enable any disabled elements
    $('button, input, select, textarea').prop('disabled', false);
    
    // Remove event listeners to prevent memory leaks
    $(document).off('keydown.modal');
    $(document).off('click.modal');
    
    console.log('🔍 Modal closed successfully');
}

function calculateModalPrice() {
    const pickupDateStr = $('#modal-pickup-date').val();
    const returnDateStr = $('#modal-return-date').val();
    const selectedVehicle = $('#vehicle_type option:selected');
    
    if (!selectedVehicle.val() || !pickupDateStr || !returnDateStr) {
        return;
    }
    
    // Parse dates with proper format
    const pickupDate = new Date(pickupDateStr + 'T00:00:00');
    const returnDate = new Date(returnDateStr + 'T00:00:00');
    
    const carDetails = JSON.parse(selectedVehicle.attr('data-car-details'));
    
    // Calculate duration - fix the calculation
    const timeDiff = returnDate.getTime() - pickupDate.getTime();
    const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    
    // Get base price based on rental days (using backend logic)
    let dailyRate = 0;
    
    if (daysDiff >= 1 && daysDiff <= 2) {
        dailyRate = carDetails.price_policy ? parseFloat(carDetails.price_policy['1-2']) : 0;
    } else if (daysDiff >= 3 && daysDiff <= 7) {
        dailyRate = carDetails.price_policy ? parseFloat(carDetails.price_policy['3-7']) : 0;
    } else if (daysDiff >= 8 && daysDiff <= 20) {
        dailyRate = carDetails.price_policy ? parseFloat(carDetails.price_policy['8-20']) : 0;
    } else if (daysDiff >= 21 && daysDiff <= 45) {
        dailyRate = carDetails.price_policy ? parseFloat(carDetails.price_policy['21-45']) : 0;
    } else {
        dailyRate = carDetails.price_policy ? parseFloat(carDetails.price_policy['46+']) : 0;
    }
    
    // Calculate base cost
    const baseCost = dailyRate * daysDiff;
    
    // Calculate location fees (using backend logic)
    const pickupLocation = $('input[name="pickup_location"]:checked').val();
    const dropoffLocation = $('input[name="destination"]:checked').val();
    
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
    
    // Calculate outside working hours fees (using backend logic)
    const pickupTime = $('#modal-pickup-time').val();
    const returnTime = $('#modal-return-time').val();
    
    let outsideHoursFees = 0;
    
    // Check if pickup is outside working hours (8:00-18:00)
    const pickupHour = parseInt(pickupTime.split(':')[0]);
    if (pickupHour < 8 || pickupHour >= 18) {
        outsideHoursFees += 15; // €15 fee for pickup outside working hours
    }
    
    // Check if return is outside working hours (8:00-18:00)
    const returnHour = parseInt(returnTime.split(':')[0]);
    if (returnHour < 8 || returnHour >= 18) {
        outsideHoursFees += 15; // €15 fee for return outside working hours
    }
    
    // Calculate total (removed insurance as requested)
    const totalCost = baseCost + totalLocationFee + outsideHoursFees;
    
    // Update modal display
    $('#modal-daily-rate').text('€' + dailyRate);
    $('#modal-rental-duration').text(daysDiff + ' day' + (daysDiff !== 1 ? 's' : ''));
    $('#modal-location-fees').text('€' + totalLocationFee.toFixed(2));
    $('#modal-night-premium').text('€' + outsideHoursFees.toFixed(2));
    $('#modal-total-estimate').text('€' + totalCost.toFixed(2));
}

// Update vehicle price display in modal based on current rental duration
function updateVehiclePriceDisplay() {
    const selectedVehicle = $('#vehicle_type option:selected');
    if (!selectedVehicle.attr('data-car-details')) return;
    
    const carDetails = JSON.parse(selectedVehicle.attr('data-car-details'));
    const pickupDateStr = $('#modal-pickup-date').val();
    const returnDateStr = $('#modal-return-date').val();
    
    if (!pickupDateStr || !returnDateStr) return;
    
    const pickupDate = new Date(pickupDateStr + 'T00:00:00');
    const returnDate = new Date(returnDateStr + 'T00:00:00');
    const daysDiff = Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 3600 * 24)));
    
    let displayPrice = '0';
    if (daysDiff >= 1 && daysDiff <= 2) {
        displayPrice = carDetails.price_policy ? carDetails.price_policy['1-2'] : '0';
    } else if (daysDiff >= 3 && daysDiff <= 7) {
        displayPrice = carDetails.price_policy ? carDetails.price_policy['3-7'] : '0';
    } else if (daysDiff >= 8 && daysDiff <= 20) {
        displayPrice = carDetails.price_policy ? carDetails.price_policy['8-20'] : '0';
    } else if (daysDiff >= 21 && daysDiff <= 45) {
        displayPrice = carDetails.price_policy ? carDetails.price_policy['21-45'] : '0';
    } else {
        displayPrice = carDetails.price_policy ? carDetails.price_policy['46+'] : '0';
    }
    
    $('#modal-vehicle-price').text('€' + displayPrice + ' /day');
}



async function applyModalCalculation() {
    console.log('🔍 applyModalCalculation called');
    
    try {
        // Apply the calculated values to the main booking form
        const totalEstimate = document.getElementById('modal-total-estimate').textContent;
        const dailyRate = document.getElementById('modal-daily-rate').textContent;
        const duration = document.getElementById('modal-rental-duration').textContent;
        
        console.log('🔍 Modal values:', { totalEstimate, dailyRate, duration });
        
        // Update the main form with calculated values
        if (document.getElementById('total_price')) {
            document.getElementById('total_price').value = totalEstimate.replace('€', '');
            console.log('🔍 Updated total_price field with:', totalEstimate.replace('€', ''));
        } else {
            console.error('🔍 total_price field not found!');
        }
        
        // Apply customer age from modal to main form
        const modalCustomerAge = $('#modal-customer-age').val().trim();
        
        // Store age in a hidden field for the main form
        if (modalCustomerAge) {
            if (!$('#customer_age').length) {
                $('<input>').attr({
                    type: 'hidden',
                    id: 'customer_age',
                    name: 'customer_age',
                    value: modalCustomerAge
                }).appendTo('#booking_form');
            } else {
                $('#customer_age').val(modalCustomerAge);
            }
            console.log('🔍 Applied customer age from modal:', modalCustomerAge);
        }
        
        // Close the modal properly
        closePriceCalculator();
        
        // Now submit the booking automatically
        console.log('🔍 About to call submitBooking()');
        await submitBooking();
        
        console.log('🔍 applyModalCalculation completed');
    } catch (error) {
        console.error('🔍 Error in applyModalCalculation:', error);
        alert('Error processing booking. Please try again.');
    }
}

async function submitBooking() {
    console.log('🔍 submitBooking called');
    
    try {
        // Collect form data
        const bookingData = collectFormData();
        console.log('🔍 Booking data:', bookingData);
        
        // Validate booking data
        if (!bookingData.car_id || !bookingData.customer_name || !bookingData.customer_phone) {
            console.error('🔍 Missing required booking data');
            alert('Missing required booking information. Please check your form.');
            return;
        }
        
        // Validate age
        if (!bookingData.customer_age) {
            console.error('🔍 Missing customer age');
            alert('Please enter your age. Age is required for booking.');
            return;
        }
        
        const age = parseInt(bookingData.customer_age);
        if (isNaN(age) || age < 18 || age > 100) {
            console.error('🔍 Invalid age:', bookingData.customer_age);
            alert('Age must be between 18 and 100 years.');
            return;
        }
        
        // Validate coupon code if provided
        if (bookingData.discount_code && bookingData.discount_code.trim()) {
            try {
                const couponCode = bookingData.discount_code.trim();
                const customerPhone = bookingData.customer_phone;
                const apiBaseUrl = window.API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `https://${window.location.hostname}`);
                
                // Try redemption code validation first (with phone number if available)
                let response;
                if (customerPhone) {
                    response = await fetch(`${apiBaseUrl}/api/coupons/validate-redemption/${couponCode}?phone=${encodeURIComponent(customerPhone)}`);
                } else {
                    response = await fetch(`${apiBaseUrl}/api/coupons/validate-redemption/${couponCode}`);
                }
                
                let result = await response.json();
                
                // If redemption code validation fails, try regular coupon validation
                if (!result.valid) {
                    response = await fetch(`${apiBaseUrl}/api/coupons/validate/${couponCode}`);
                    result = await response.json();
                }
                
                if (!response.ok || !result.valid) {
                    console.error('🔍 Invalid coupon code:', couponCode);
                    const errorMessage = result.message || result.error || 'Invalid coupon code. Please enter a valid coupon or remove it.';
                    alert(errorMessage);
                    return;
                }
            } catch (error) {
                console.error('🔍 Error validating coupon:', error);
                alert('Error validating coupon code. Please try again.');
                return;
            }
        }
        
        // Show loading state
        showLoading();
        
        // API base URL
        const apiBaseUrl = window.API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `https://${window.location.hostname}`);
        console.log('🔍 API URL:', `${apiBaseUrl}/api/bookings`);
        
        // Submit booking to API
        fetch(`${apiBaseUrl}/api/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        })
        .then(response => {
            console.log('🔍 API Response status:', response.status);
            return response.json();
        })
                 .then(data => {
             console.log('🔍 API Response data:', data);
             hideLoading();
             
             if (data.success) {
                 console.log('🔍 Booking successful, calling showSuccess');
                 showSuccess(bookingData);
                 // Clear form
                 $('#booking_form')[0].reset();
                 $('#total_price').val('0');
             } else {
                 console.error('🔍 Booking failed:', data.message || data.error);
                 showError(data.message || data.error || 'Booking failed. Please try again.');
             }
         })
        .catch(error => {
            console.error('🔍 API Error:', error);
            hideLoading();
            showError('Network error. Please check your connection and try again.');
        });
    } catch (error) {
        console.error('🔍 Error in submitBooking:', error);
        hideLoading();
        alert('Error submitting booking. Please try again.');
    }
}

function showModalSuccessMessage(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
    successDiv.innerHTML = `
        <i class="fa fa-check-circle"></i> ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()" style="float: right;"></button>
    `;
    
    document.body.appendChild(successDiv);
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 3000);
}

// Helper functions for modal submission
// collectFormData is now defined globally above

window.showSuccess = function(bookingData) {
    console.log('🔍 showSuccess called with booking data:', bookingData);
    
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
                    <h2 class="success-title">Booking Confirmed!</h2>
                    <p class="success-subtitle">Your booking has been submitted successfully</p>
                </div>
                
                <div class="success-modal-body">
                    <div class="booking-summary-card">
                        <div class="summary-compact">
                            <div class="summary-main">
                                <div class="vehicle-info">
                                    <span class="vehicle-name">${$('#vehicle_type option:selected').text()}</span>
                                    <span class="customer-name">${bookingData.customer_name}</span>
                                </div>
                                <div class="booking-dates">
                                    <span class="date-range">${bookingData.pickup_date} - ${bookingData.return_date}</span>
                                    <span class="time-range">${bookingData.pickup_time} - ${bookingData.return_time}</span>
                                </div>
                                <div class="location-info">
                                    <span class="location-text">${bookingData.pickup_location} → ${bookingData.dropoff_location}</span>
                                </div>
                            </div>
                            <div class="price-highlight">
                                <span class="price-label">Total Price</span>
                                <span class="price-value">€${bookingData.total_price}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="next-steps-compact">
                        <div class="steps-icon">📞</div>
                        <div class="steps-content">
                            <h5>Next Steps</h5>
                            <p>We'll contact you within 24 hours to confirm your booking</p>
                        </div>
                    </div>
                </div>
                
                <div class="success-modal-footer">
                    <button class="btn-success-primary" onclick="closeSuccessModal()">
                        <i class="fa fa-check"></i> Got it!
                    </button>
                    <button class="btn-success-secondary" onclick="location.reload()">
                        <i class="fa fa-plus"></i> Book Another
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add the modal to the page
    $('body').append(successModalHTML);
    
    // Add CSS for the clean success modal
    const successModalCSS = `
        <style>
            .booking-success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease-out;
            }
            
            .success-modal-content {
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 480px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                animation: slideIn 0.4s ease-out;
            }
            
            .success-modal-header {
                text-align: center;
                padding: 32px 24px 24px;
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                border-radius: 16px 16px 0 0;
                position: relative;
            }
            
            .success-icon {
                margin-bottom: 16px;
                animation: iconBounce 0.6s ease-out;
            }
            
            .success-icon svg {
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
            }
            
            .success-title {
                font-size: 1.75rem;
                font-weight: 700;
                margin: 0 0 8px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .success-subtitle {
                font-size: 0.95rem;
                margin: 0;
                opacity: 0.95;
                font-weight: 400;
            }
            
            .success-modal-body {
                padding: 24px;
            }
            
            .booking-summary-card {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid #e9ecef;
            }
            
            .summary-compact {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .summary-main {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .vehicle-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .vehicle-name {
                font-size: 1.1rem;
                font-weight: 600;
                color: #495057;
            }
            
            .customer-name {
                font-size: 0.95rem;
                color: #6c757d;
                font-weight: 500;
            }
            
            .booking-dates {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .date-range {
                font-size: 0.95rem;
                font-weight: 600;
                color: #495057;
            }
            
            .time-range {
                font-size: 0.85rem;
                color: #6c757d;
            }
            
            .location-info {
                margin-top: 4px;
            }
            
            .location-text {
                font-size: 0.9rem;
                color: #495057;
                font-weight: 500;
            }
            
            .price-highlight {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 16px;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
            }
            
            .price-label {
                font-size: 0.9rem;
            }
            
            .price-value {
                font-size: 1.1rem;
            }
            
            .next-steps-compact {
                background: #e8f5e8;
                border-radius: 12px;
                padding: 16px;
                border-left: 4px solid #28a745;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .steps-icon {
                font-size: 1.4rem;
                flex-shrink: 0;
            }
            
            .steps-content h5 {
                color: #28a745;
                margin: 0 0 4px 0;
                font-weight: 600;
                font-size: 0.95rem;
            }
            
            .steps-content p {
                margin: 0;
                color: #495057;
                font-size: 0.85rem;
                line-height: 1.4;
            }
            
            .success-modal-footer {
                padding: 20px 24px 24px;
                text-align: center;
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .btn-success-primary, .btn-success-secondary {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-success-primary {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            }
            
            .btn-success-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
            }
            
            .btn-success-secondary {
                background: #6c757d;
                color: white;
                box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
            }
            
            .btn-success-secondary:hover {
                background: #5a6268;
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-30px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes iconBounce {
                0% { 
                    transform: scale(0.3);
                    opacity: 0;
                }
                50% { 
                    transform: scale(1.1);
                }
                100% { 
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @media (max-width: 768px) {
                .success-modal-content {
                    width: 95%;
                    margin: 10px;
                    max-height: 90vh;
                }
                
                .success-modal-header {
                    padding: 24px 20px 20px;
                }
                
                .success-icon svg {
                    width: 40px;
                    height: 40px;
                }
                
                .success-title {
                    font-size: 1.5rem;
                }
                
                .success-subtitle {
                    font-size: 0.9rem;
                }
                
                .success-modal-body {
                    padding: 20px;
                }
                
                .booking-summary-card {
                    padding: 16px;
                    margin-bottom: 16px;
                }
                
                .vehicle-name {
                    font-size: 1rem;
                }
                
                .customer-name {
                    font-size: 0.9rem;
                }
                
                .date-range {
                    font-size: 0.9rem;
                }
                
                .time-range {
                    font-size: 0.8rem;
                }
                
                .location-text {
                    font-size: 0.85rem;
                }
                
                .price-highlight {
                    padding: 14px;
                }
                
                .price-value {
                    font-size: 1rem;
                }
                
                .next-steps-compact {
                    padding: 14px;
                    gap: 10px;
                }
                
                .steps-icon {
                    font-size: 1.2rem;
                }
                
                .steps-content h5 {
                    font-size: 0.9rem;
                }
                
                .steps-content p {
                    font-size: 0.8rem;
                }
                
                .success-modal-footer {
                    padding: 16px 20px 20px;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .btn-success-primary, .btn-success-secondary {
                    width: 100%;
                    justify-content: center;
                    padding: 14px 20px;
                    font-size: 0.9rem;
                }
            }
        </style>
    `;
    
    // Add CSS to head if not already present
    if (!$('#success-modal-styles').length) {
        $('head').append(successModalCSS);
    }
    
    // Show the modal with animation
    $('#booking-success-modal').fadeIn(300);
    
    // Update i18n content if available
    if (typeof updateContent === 'function') {
        updateContent();
    }
    
    console.log('🔍 Success modal displayed');
}

function showError(message) {
    const errorMessage = $('#error_message');
    errorMessage.html(message).show().addClass('show');
    
    // Scroll to error message
    $('html, body').animate({
        scrollTop: errorMessage.offset().top - 100
    }, 500);
}

function sendConfirmationEmail(bookingData) {
    // This could be handled by the backend or a separate service
    console.log('Sending confirmation email for booking:', bookingData);
}