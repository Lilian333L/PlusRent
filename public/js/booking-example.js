// Example usage of BookingFormHandler
// This file shows how to use the booking form handler on different pages

// Example 1: Simple usage on car-single page
function initCarSingleBooking() {
  const urlParams = new URLSearchParams(window.location.search);
  const carId = urlParams.get('id');
  
  if (!carId) return;
  
  const bookingHandler = new BookingFormHandler({
    carId: carId,
    onSuccess: function(response, bookingData) {
      alert('Booking submitted successfully! We will contact you shortly to confirm your reservation.');
      // Optionally redirect to confirmation page
      // window.location.href = 'booking-confirmation.html?id=' + response.booking_id;
    },
    onError: function(errorMessage) {
      alert('Booking failed: ' + errorMessage);
    },
    onValidationError: function(errorMessage) {
      alert('Please fix the following issues:\n' + errorMessage);
    }
  });
  
  // Initialize the booking form
  bookingHandler.initForm('contact_form', 'send_message');
}

// Example 2: Usage with custom success handler (e.g., for quick booking)
function initQuickBooking() {
  const bookingHandler = new BookingFormHandler({
    carId: null, // Will be set dynamically
    onSuccess: function(response, bookingData) {
      // Custom success handling
      showSuccessModal('Booking confirmed! Your booking ID is: ' + response.booking_id);
      // Clear form
      document.getElementById('quick-booking-form').reset();
    },
    onError: function(errorMessage) {
      showErrorModal('Booking failed: ' + errorMessage);
    },
    onValidationError: function(errorMessage) {
      showValidationErrors(errorMessage);
    }
  });
  
  // Initialize the booking form
  const handler = bookingHandler.initForm('quick-booking-form', 'quick-book-button');
  
  // Set car ID dynamically (e.g., when user selects a car)
  function setSelectedCar(carId) {
    handler.setCarId(carId);
  }
  
  return handler;
}

// Example 3: Usage for admin booking management
function initAdminBooking() {
  const bookingHandler = new BookingFormHandler({
    carId: null,
    onSuccess: function(response, bookingData) {
      // Update admin dashboard
      updateBookingList();
      showAdminNotification('New booking created: ' + response.booking_id);
    },
    onError: function(errorMessage) {
      showAdminError('Booking creation failed: ' + errorMessage);
    },
    onValidationError: function(errorMessage) {
      showAdminValidationError(errorMessage);
    }
  });
  
  return bookingHandler.initForm('admin-booking-form', 'create-booking-btn');
}

// Example 4: Usage for modal booking forms
function initModalBooking(modalId, formId, buttonId) {
  const modal = document.getElementById(modalId);
  const form = document.getElementById(formId);
  const button = document.getElementById(buttonId);
  
  if (!modal || !form || !button) return;
  
  const bookingHandler = new BookingFormHandler({
    carId: null,
    onSuccess: function(response, bookingData) {
      // Close modal and show success
      modal.style.display = 'none';
      showSuccessMessage('Booking created successfully!');
    },
    onError: function(errorMessage) {
      showErrorMessage('Booking failed: ' + errorMessage);
    },
    onValidationError: function(errorMessage) {
      showValidationMessage(errorMessage);
    }
  });
  
  // Initialize form
  const handler = bookingHandler.initForm(formId, buttonId);
  
  // Function to open modal with specific car
  function openBookingModal(carId, carData) {
    handler.setCarId(carId);
    // Populate form with car data
    populateBookingForm(carData);
    modal.style.display = 'block';
  }
  
  return { handler, openBookingModal };
}

// Example 5: Usage for inline booking buttons (e.g., on car cards)
function initInlineBooking() {
  // Add click handlers to all "Book Now" buttons
  document.querySelectorAll('.book-now-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const carId = this.dataset.carId;
      const carData = JSON.parse(this.dataset.carData || '{}');
      
      // Create a temporary form for inline booking
      const tempForm = createTemporaryBookingForm(carId, carData);
      
      const bookingHandler = new BookingFormHandler({
        carId: carId,
        onSuccess: function(response, bookingData) {
          showInlineSuccess('Booking submitted! We\'ll contact you soon.');
          tempForm.remove();
        },
        onError: function(errorMessage) {
          showInlineError('Booking failed: ' + errorMessage);
        },
        onValidationError: function(errorMessage) {
          showInlineValidationError(errorMessage);
        }
      });
      
      // Handle the temporary form
      bookingHandler.handleSubmit(tempForm, this);
    });
  });
}

// Helper functions for the examples
function showSuccessModal(message) {
  // Implementation for success modal
  
}

function showErrorModal(message) {
  // Implementation for error modal
  
}

function showValidationErrors(message) {
  // Implementation for validation errors
  
}

function updateBookingList() {
  // Implementation for updating admin booking list
  
}

function showAdminNotification(message) {
  // Implementation for admin notifications
  
}

function showAdminError(message) {
  // Implementation for admin errors
  
}

function showAdminValidationError(message) {
  // Implementation for admin validation errors
  
}

function showSuccessMessage(message) {
  // Implementation for success messages
  
}

function showErrorMessage(message) {
  // Implementation for error messages
  
}

function showValidationMessage(message) {
  // Implementation for validation messages
  
}

function populateBookingForm(carData) {
  // Implementation for populating booking form with car data
  
}

function createTemporaryBookingForm(carId, carData) {
  // Implementation for creating temporary booking form
  const form = document.createElement('form');
  form.id = 'temp-booking-form';
  // Add form fields based on carData
  return form;
}

function showInlineSuccess(message) {
  // Implementation for inline success messages
  
}

function showInlineError(message) {
  // Implementation for inline error messages
  
}

function showInlineValidationError(message) {
  // Implementation for inline validation errors
  
}

// Export functions for use in other files
window.initCarSingleBooking = initCarSingleBooking;
window.initQuickBooking = initQuickBooking;
window.initAdminBooking = initAdminBooking;
window.initModalBooking = initModalBooking;
window.initInlineBooking = initInlineBooking; 