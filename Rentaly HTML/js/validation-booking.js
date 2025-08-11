$(document).ready(function(){
    // Initialize booking form handler
    const bookingForm = $('#booking_form');
    const submitButton = $('#send_message');
    const successMessage = $('#success_message');
    const errorMessage = $('#error_message');
    const mailFail = $('#mail_fail');
    
    // API base URL from config
    const apiBaseUrl = window.API_BASE_URL || 'http://localhost:3001';
    
    // Enhanced form validation
    function validateForm() {
        let isValid = true;
        const errors = [];
        
        // Clear previous error states
        $('.error_input').removeClass('error_input');
        $('.field-error').remove();
        
        // Required fields validation
        const requiredFields = {
            'name': 'Name',
            'email': 'Email',
            'phone': 'Phone',
            'vehicle_type': 'Vehicle',
            'pickup_location': 'Pickup Location',
            'destination': 'Destination',
            'pickup_date': 'Pickup Date',
            'pickup_time': 'Pickup Time',
            'return_date': 'Return Date',
            'return_time': 'Return Time'
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
        
        // Date validation
        const pickupDate = new Date($('#date-picker').val());
        const returnDate = new Date($('#date-picker-2').val());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (pickupDate < today) {
            $('#date-picker').addClass('error_input');
            $('#date-picker').after('<div class="field-error text-danger small mt-1">Pickup date must be today or in the future</div>');
            errors.push('Pickup date must be today or in the future');
            isValid = false;
        }
        
        if (returnDate <= pickupDate) {
            $('#date-picker-2').addClass('error_input');
            $('#date-picker-2').after('<div class="field-error text-danger small mt-1">Return date must be after pickup date</div>');
            errors.push('Return date must be after pickup date');
            isValid = false;
        }
        
        // Vehicle selection validation
        const vehicleSelect = $('#vehicle_type');
        if (vehicleSelect.val() === '' || vehicleSelect.val() === null) {
            vehicleSelect.addClass('error_input');
            vehicleSelect.after('<div class="field-error text-danger small mt-1">Please select a vehicle</div>');
            errors.push('Please select a vehicle');
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
            pickup_location: $('#pickup_location').val(),
            dropoff_location: $('#destination').val(),
            special_instructions: $('#message').val().trim() || null,
            insurance_type: 'RCA', // Default insurance
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
        mailFail.text(message).fadeIn(500);
        setTimeout(() => {
            mailFail.fadeOut(500);
        }, 5000);
    }
    
    // Clear error states when user starts typing
    $('input, select, textarea').on('input change', function() {
        $(this).removeClass('error_input');
        $(this).siblings('.field-error').remove();
    });
    
    // Handle form submission
    submitButton.click(function(e) {
        e.preventDefault();
        
        // Hide any existing messages
        successMessage.hide();
        errorMessage.hide();
        mailFail.hide();
        
        // Validate form
        const validation = validateForm();
        if (!validation.isValid) {
            showError('Please fix the following issues:\n' + validation.errors.join('\n'));
            return;
        }
        
        // Show loading state
        showLoading();
        
        // Collect form data
        const bookingData = collectFormData();
        console.log('Submitting booking data:', bookingData);
        
        // Submit to API
        $.ajax({
            url: `${apiBaseUrl}/api/bookings`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(bookingData),
            success: function(response) {
                console.log('Booking successful:', response);
                hideLoading();
                showSuccess(bookingData);
                
                // Send confirmation email (optional)
                sendConfirmationEmail(bookingData);
            },
            error: function(xhr, status, error) {
                console.error('Booking failed:', xhr.responseText);
                hideLoading();
                
                let errorMsg = 'An error occurred while processing your booking. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                }
                showError(errorMsg);
            }
        });
    });
    
    // Send confirmation email (optional enhancement)
    function sendConfirmationEmail(bookingData) {
        // This could be handled by the backend or a separate service
        console.log('Sending confirmation email for booking:', bookingData);
    }
    
    // Initialize date pickers with better UX
    function initializeDatePickers() {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        $('#date-picker').attr('min', today);
        $('#date-picker-2').attr('min', today);
        
        // Auto-set return date to pickup date + 1 day
        $('#date-picker').on('change', function() {
            const pickupDate = new Date($(this).val());
            const returnDate = new Date(pickupDate);
            returnDate.setDate(returnDate.getDate() + 1);
            $('#date-picker-2').val(returnDate.toISOString().split('T')[0]);
        });
    }
    
    // Initialize price calculator
    function initializePriceCalculator() {
        // Add event listeners for price calculation
        $('#vehicle_type, #date-picker, #date-picker-2').on('change', calculatePrice);
        
        // Initial calculation
        setTimeout(calculatePrice, 1000);
    }
    
    // Calculate and display price
    function calculatePrice() {
        const vehicleSelect = $('#vehicle_type');
        const pickupDate = $('#date-picker').val();
        const returnDate = $('#date-picker-2').val();
        
        if (!vehicleSelect.val() || !pickupDate || !returnDate) {
            $('#price-summary').hide();
            return;
        }
        
        const selectedOption = vehicleSelect.find('option:selected');
        const dailyPrice = parseFloat(selectedOption.attr('data-daily-price')) || 0;
        
        if (dailyPrice <= 0) {
            $('#price-summary').hide();
            return;
        }
        
        // Calculate rental duration
        const start = new Date(pickupDate);
        const end = new Date(returnDate);
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (duration <= 0) {
            $('#price-summary').hide();
            return;
        }
        
        // Calculate costs
        const baseCost = dailyPrice * duration;
        const insuranceCost = 15 * duration; // €15 per day for RCA insurance
        const totalCost = baseCost + insuranceCost;
        
        // Update price display
        $('#daily-rate').text(`€${dailyPrice}`);
        $('#rental-duration').text(`${duration} day${duration > 1 ? 's' : ''}`);
        $('#insurance-cost').text(`€${insuranceCost}`);
        $('#total-estimate').text(`€${totalCost}`);
        
        // Show price summary
        $('#price-summary').show();
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
});

// Price Calculator Modal Functions
function initializePriceCalculatorModal() {
    // Quick book calculator button click handler
    $('#quick-book-calculator').on('click', function() {
        openPriceCalculator();
    });
    
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
    // Populate modal with current form data
    const pickupDate = $('#date-picker').val();
    const returnDate = $('#date-picker-2').val();
    const selectedVehicle = $('#vehicle_type option:selected');
    
    if (!pickupDate || !returnDate) {
        alert('Please select pickup and return dates first.');
        return;
    }
    
    if (!selectedVehicle.val()) {
        alert('Please select a vehicle first.');
        return;
    }
    
    // Populate modal fields
    $('#modal-pickup-date').val(pickupDate);
    $('#modal-return-date').val(returnDate);
    
    // Populate vehicle info
    if (selectedVehicle.attr('data-car-details')) {
        const carDetails = JSON.parse(selectedVehicle.attr('data-car-details'));
        $('#modal-vehicle-image').attr('src', carDetails.head_image ? window.API_BASE_URL + carDetails.head_image : window.API_BASE_URL + '/uploads/placeholder.png');
        $('#modal-vehicle-name').text(carDetails.make_name + ' ' + carDetails.model_name);
        $('#modal-vehicle-details').text(`${carDetails.num_passengers || '-'} passengers • ${carDetails.num_doors || '-'} doors • ${carDetails.car_type || '-'}`);
        $('#modal-vehicle-price').text('€' + (carDetails.price_policy ? carDetails.price_policy['1-2'] : '0'));
    }
    
    // Calculate and display prices in modal
    calculateModalPrice();
    
    // Show modal
    $('#price-calculator-modal').fadeIn(300);
    $('body').addClass('modal-open');
}

function closePriceCalculator() {
    $('#price-calculator-modal').fadeOut(300);
    $('body').removeClass('modal-open');
}

function calculateModalPrice() {
    const pickupDate = new Date($('#modal-pickup-date').val());
    const returnDate = new Date($('#modal-return-date').val());
    const selectedVehicle = $('#vehicle_type option:selected');
    
    if (!selectedVehicle.val() || !pickupDate || !returnDate) {
        return;
    }
    
    const carDetails = JSON.parse(selectedVehicle.attr('data-car-details'));
    const dailyRate = carDetails.price_policy ? carDetails.price_policy['1-2'] : 0;
    
    // Calculate duration
    const timeDiff = returnDate.getTime() - pickupDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Calculate night hours and premium
    const pickupTime = $('#pickup_time').val();
    const returnTime = $('#return_time').val();
    const nightHours = calculateNightHours(pickupDate, returnDate, pickupTime, returnTime);
    const nightPremium = (nightHours * dailyRate * 0.15) / 24; // 15% premium for night hours
    
    // Calculate insurance (10% of total daily rate)
    const insuranceCost = (dailyRate * daysDiff) * 0.1;
    
    // Calculate total
    const baseCost = dailyRate * daysDiff;
    const totalCost = baseCost + nightPremium + insuranceCost;
    
    // Update modal display
    $('#modal-daily-rate').text('€' + dailyRate);
    $('#modal-rental-duration').text(daysDiff + ' day' + (daysDiff !== 1 ? 's' : ''));
    $('#modal-night-hours').text(nightHours + ' hour' + (nightHours !== 1 ? 's' : ''));
    $('#modal-night-premium').text('€' + nightPremium.toFixed(2));
    $('#modal-insurance-cost').text('€' + insuranceCost.toFixed(2));
    $('#modal-total-estimate').text('€' + totalCost.toFixed(2));
}

function calculateNightHours(pickupDate, returnDate, pickupTime, returnTime) {
    let nightHours = 0;
    
    // Convert time strings to hours
    const pickupHour = parseInt(pickupTime.split(':')[0]);
    const returnHour = parseInt(returnTime.split(':')[0]);
    
    // Night hours are between 22:00 (10 PM) and 06:00 (6 AM)
    const nightStart = 22;
    const nightEnd = 6;
    
    // Calculate night hours for pickup day
    if (pickupHour >= nightStart || pickupHour < nightEnd) {
        if (pickupHour >= nightStart) {
            nightHours += (24 - pickupHour) + nightEnd;
        } else {
            nightHours += nightEnd - pickupHour;
        }
    }
    
    // Calculate night hours for return day
    if (returnHour >= nightStart || returnHour < nightEnd) {
        if (returnHour >= nightStart) {
            nightHours += returnHour - nightStart;
        } else {
            nightHours += returnHour + (24 - nightStart);
        }
    }
    
    // Add night hours for full days in between
    const fullDays = Math.floor((returnDate.getTime() - pickupDate.getTime()) / (1000 * 3600 * 24)) - 1;
    if (fullDays > 0) {
        nightHours += fullDays * 8; // 8 hours of night time per day
    }
    
    return Math.max(0, nightHours);
}

function applyModalCalculation() {
    // Apply the modal calculation to the main form
    calculatePrice();
    
    // Show the compact price summary
    $('#price-summary').show();
    
    // Close the modal
    closePriceCalculator();
    
    // Scroll to the price summary
    $('#price-summary')[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
}