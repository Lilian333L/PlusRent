$(document).ready(function(){
    // Initialize booking form handler
    const bookingForm = $('#booking_form');
    const submitButton = $('#send_message');
    const successMessage = $('#success_message');
    const errorMessage = $('#error_message');
    const mailFail = $('#mail_fail');
    
    // API base URL from config
    const apiBaseUrl = window.API_BASE_URL || 'http://localhost:3001';
    
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
    function collectFormData() {
        const vehicleSelect = $('#vehicle_type');
        const selectedOption = vehicleSelect.find('option:selected');
        
        return {
            car_id: selectedOption.attr('data-car-id'),
            customer_name: $('#name').val().trim(),
            customer_email: $('#email').val().trim(),
            customer_phone: $('#phone').val().trim(),
            pickup_date: $('#date-picker').val(),
            pickup_time: $('#pickup_time').val(),
            return_date: $('#date-picker-2').val(),
            return_time: $('#return_time').val(),
            pickup_location: $('input[name="pickup_location"]:checked').val(),
            dropoff_location: $('input[name="destination"]:checked').val(),
            special_instructions: $('#message').val().trim() || null,
            total_price: 0, // Will be calculated by backend
            price_breakdown: {}
        };
    }
    
    // Show loading state
    function showLoading() {
        submitButton.attr('disabled', true).val('Processing...');
        submitButton.css('opacity', '0.7');
        submitButton.prepend('<span class="loading-spinner"></span>');
    }
    
    // Hide loading state
    function hideLoading() {
        submitButton.attr('disabled', false).val('Submit');
        submitButton.css('opacity', '1');
        submitButton.find('.loading-spinner').remove();
    }
    
    // Show success message
    function showSuccess(bookingData) {
        // Populate booking summary
        const bookingSummary = $('#booking-summary');
        const vehicleSelect = $('#vehicle_type');
        const selectedOption = vehicleSelect.find('option:selected');
        
        const summaryHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Vehicle:</strong> ${selectedOption.text()}</p>
                    <p><strong>Customer:</strong> ${bookingData.customer_name}</p>
                    <p><strong>Email:</strong> ${bookingData.customer_email}</p>
                    <p><strong>Phone:</strong> ${bookingData.customer_phone}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Pickup:</strong> ${bookingData.pickup_date} at ${bookingData.pickup_time}</p>
                    <p><strong>Return:</strong> ${bookingData.return_date} at ${bookingData.return_time}</p>
                    <p><strong>Location:</strong> ${bookingData.pickup_location}</p>
                    <p><strong>Dropoff:</strong> ${bookingData.dropoff_location}</p>
                </div>
            </div>
        `;
        
        bookingSummary.html(summaryHTML);
        
        bookingForm.hide();
        successMessage.fadeIn(500);
        
        // Scroll to success message
        $('html, body').animate({
            scrollTop: successMessage.offset().top - 100
        }, 500);
    }
    
    // Show error message
    function showError(message) {
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
        
        console.log('Submit button clicked');
        
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
        $('#modal-vehicle-image').attr('src', carDetails.head_image ? window.API_BASE_URL + carDetails.head_image : window.API_BASE_URL + '/uploads/placeholder.png');
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
}

function closePriceCalculator() {
    $('#price-calculator-modal').fadeOut(300);
    $('body').removeClass('modal-open');
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
    const pickupLocation = $('#pickup_location').val();
    const dropoffLocation = $('#destination').val();
    
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



function applyModalCalculation() {
    // Close the modal first
    closePriceCalculator();
    
    // Show loading state
    const submitButton = $('#send_message');
    submitButton.attr('disabled', true).val('Processing...');
    submitButton.css('opacity', '0.7');
    submitButton.prepend('<span class="loading-spinner"></span>');
    
    // Collect form data
    const bookingData = collectFormData();
    console.log('Submitting booking data:', bookingData);
    
    // Submit to API
    $.ajax({
        url: `${window.API_BASE_URL || 'http://localhost:3001'}/api/bookings`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(bookingData),
        success: function(response) {
            console.log('Booking successful:', response);
            
            // Hide loading state
            submitButton.attr('disabled', false).val('Submit');
            submitButton.css('opacity', '1');
            submitButton.find('.loading-spinner').remove();
            
            // Show success message
            showSuccess(bookingData);
            
            // Send confirmation email (optional)
            sendConfirmationEmail(bookingData);
        },
        error: function(xhr, status, error) {
            console.error('Booking failed:', xhr.responseText);
            
            // Hide loading state
            submitButton.attr('disabled', false).val('Submit');
            submitButton.css('opacity', '1');
            submitButton.find('.loading-spinner').remove();
            
            let errorMsg = 'An error occurred while processing your booking. Please try again.';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg = xhr.responseJSON.error;
            }
            showError(errorMsg);
        }
    });
}

// Helper functions for modal submission
function collectFormData() {
    const vehicleSelect = $('#vehicle_type');
    const selectedOption = vehicleSelect.find('option:selected');
    
    return {
        car_id: selectedOption.attr('data-car-id'),
        customer_name: $('#name').val().trim(),
        customer_email: $('#email').val().trim(),
        customer_phone: $('#phone').val().trim(),
        pickup_date: $('#modal-pickup-date').val(),
        pickup_time: $('#modal-pickup-time').val(),
        return_date: $('#modal-return-date').val(),
        return_time: $('#modal-return-time').val(),
        pickup_location: $('#pickup_location').val(),
        dropoff_location: $('#destination').val(),
        special_instructions: $('#message').val().trim() || null,
        total_price: 0, // Will be calculated by backend
        price_breakdown: {}
    };
}

function showSuccess(bookingData) {
    const bookingForm = $('#booking_form');
    const successMessage = $('#success_message');
    
    // Populate booking summary
    const bookingSummary = $('#booking-summary');
    const vehicleSelect = $('#vehicle_type');
    const selectedOption = vehicleSelect.find('option:selected');
    
    const summaryHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Vehicle:</strong> ${selectedOption.text()}</p>
                <p><strong>Customer:</strong> ${bookingData.customer_name}</p>
                <p><strong>Email:</strong> ${bookingData.customer_email}</p>
                <p><strong>Phone:</strong> ${bookingData.customer_phone}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Pickup:</strong> ${bookingData.pickup_date} at ${bookingData.pickup_time}</p>
                <p><strong>Return:</strong> ${bookingData.return_date} at ${bookingData.return_time}</p>
                <p><strong>Location:</strong> ${bookingData.pickup_location}</p>
                <p><strong>Dropoff:</strong> ${bookingData.dropoff_location}</p>
            </div>
        </div>
    `;
    
    bookingSummary.html(summaryHTML);
    
    bookingForm.hide();
    successMessage.fadeIn(500);
    
    // Scroll to success message
    $('html, body').animate({
        scrollTop: successMessage.offset().top - 100
    }, 500);
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