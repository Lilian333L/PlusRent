# Booking Form Handler

A reusable JavaScript class for handling car rental booking form submissions across different pages.

## Features

- ✅ **Reusable**: Can be used on any page with booking forms
- ✅ **Validation**: Built-in form validation with custom error messages
- ✅ **Loading States**: Automatic button loading states during submission
- ✅ **Error Handling**: Separate handlers for validation errors vs API errors
- ✅ **Price Integration**: Automatically gets pricing from PriceCalculator
- ✅ **Customizable**: Configurable success/error handlers

## Quick Start

### 1. Include the Script

```html
<script src="js/booking-form-handler.js"></script>
```

### 2. Basic Usage

```javascript
// Initialize booking handler
const bookingHandler = new BookingFormHandler({
  carId: '78', // Car ID from URL or data
  onSuccess: function(response, bookingData) {
    alert('Booking submitted successfully!');
  },
  onError: function(errorMessage) {
    alert('Booking failed: ' + errorMessage);
  },
  onValidationError: function(errorMessage) {
    alert('Please fix: ' + errorMessage);
  }
});

// Initialize the form
bookingHandler.initForm('contact_form', 'send_message');
```

## API Reference

### Constructor Options

```javascript
const handler = new BookingFormHandler({
  carId: '78',                    // Car ID (can be set later)
  apiBaseUrl: 'http://localhost:3001', // API base URL
  onSuccess: function(response, bookingData) { /* ... */ },
  onError: function(errorMessage) { /* ... */ },
  onValidationError: function(errorMessage) { /* ... */ }
});
```

### Methods

#### `initForm(formId, submitButtonId)`
Initializes the booking form with event listeners.

```javascript
const handler = bookingHandler.initForm('my-form', 'submit-btn');
```

#### `setCarId(carId)`
Sets the car ID dynamically (useful when car data loads asynchronously).

```javascript
handler.setCarId('78');
```

#### `handleSubmit(formElement, submitButton)`
Manually handle form submission (used internally by `initForm`).

```javascript
await handler.handleSubmit(form, button);
```

## Usage Examples

### Example 1: Car Single Page

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const carId = urlParams.get('id');
  
  const bookingHandler = new BookingFormHandler({
    carId: carId,
    onSuccess: function(response, bookingData) {
      alert('Booking submitted successfully!');
    }
  });
  
  bookingHandler.initForm('contact_form', 'send_message');
});
```

### Example 2: Quick Booking Modal

```javascript
function initQuickBookingModal() {
  const bookingHandler = new BookingFormHandler({
    carId: null, // Will be set when car is selected
    onSuccess: function(response, bookingData) {
      closeModal();
      showSuccessMessage('Booking created!');
    }
  });
  
  const handler = bookingHandler.initForm('quick-booking-form', 'quick-book-btn');
  
  // Set car ID when user selects a car
  function selectCar(carId) {
    handler.setCarId(carId);
  }
}
```

### Example 3: Admin Booking Management

```javascript
function initAdminBooking() {
  const bookingHandler = new BookingFormHandler({
    carId: null,
    onSuccess: function(response, bookingData) {
      updateBookingList();
      showAdminNotification('New booking: ' + response.booking_id);
    },
    onError: function(errorMessage) {
      showAdminError('Booking failed: ' + errorMessage);
    }
  });
  
  return bookingHandler.initForm('admin-booking-form', 'create-booking-btn');
}
```

### Example 4: Inline Booking Buttons

```javascript
function initInlineBooking() {
  document.querySelectorAll('.book-now-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const carId = this.dataset.carId;
      const tempForm = createTemporaryForm(carId);
      
      const bookingHandler = new BookingFormHandler({
        carId: carId,
        onSuccess: function(response, bookingData) {
          showInlineSuccess('Booking submitted!');
          tempForm.remove();
        }
      });
      
      bookingHandler.handleSubmit(tempForm, this);
    });
  });
}
```

## Form Requirements

Your booking form should have these fields:

```html
<form id="contact_form" method="post">
  <input type="date" name="Pick Up Date" required>
  <input type="time" name="Pick Up Time" required>
  <input type="date" name="Collection Date" required>
  <input type="time" name="Collection Time" required>
  <input type="text" name="discount_code">
  
  <input type="radio" name="insurance_type" value="RCA" required>
  <input type="radio" name="insurance_type" value="Casco" required>
  
  <input type="radio" name="pickup_location" value="Our Office" required>
  <input type="radio" name="pickup_location" value="Chisinau Airport" required>
  <input type="radio" name="pickup_location" value="Iasi Airport" required>
  
  <input type="radio" name="dropoff_location" value="Our Office" required>
  <input type="radio" name="dropoff_location" value="Chisinau Airport" required>
  <input type="radio" name="dropoff_location" value="Iasi Airport" required>
  
  <input type="text" name="contact_person">
  <input type="tel" name="contact_phone">
  <textarea name="special_instructions"></textarea>
  
  <input type="submit" id="send_message" value="Book Now">
</form>
```

## Validation Rules

The handler validates:

- ✅ Required fields (dates, times, insurance, locations)
- ✅ Future pickup dates
- ✅ Return date after pickup date
- ✅ Contact info for outside hours (8:00-18:00)
- ✅ Car availability (checked by server)

## Error Handling

### Validation Errors
Triggered when form data is invalid:
- Missing required fields
- Invalid dates
- Missing contact info for outside hours

### API Errors
Triggered when server request fails:
- Car not available
- Database errors
- Network issues

### Custom Error Handlers

```javascript
const bookingHandler = new BookingFormHandler({
  onValidationError: function(errorMessage) {
    // Handle validation errors
    showValidationErrors(errorMessage);
  },
  onError: function(errorMessage) {
    // Handle API errors
    showErrorMessage(errorMessage);
  }
});
```

## Integration with Price Calculator

The handler automatically integrates with the PriceCalculator:

```javascript
// Gets total price from price calculator
getTotalPrice() {
  if (window.priceCalculator) {
    return window.priceCalculator.getTotalPrice();
  }
  return 0;
}

// Gets price breakdown from price calculator
getPriceBreakdown() {
  if (window.priceCalculator) {
    return window.priceCalculator.getPriceBreakdown();
  }
  return {};
}
```

## Server API

The handler sends data to `/api/bookings`:

```javascript
{
  car_id: "78",
  pickup_date: "2025-08-15",
  pickup_time: "09:00",
  return_date: "2025-08-17",
  return_time: "17:00",
  discount_code: "SAVE10",
  insurance_type: "RCA",
  pickup_location: "Our Office",
  dropoff_location: "Our Office",
  contact_person: "John Doe",
  contact_phone: "+1234567890",
  special_instructions: "Leave key under mat",
  total_price: 150.00,
  price_breakdown: { /* detailed breakdown */ }
}
```

## Files

- `js/booking-form-handler.js` - Main handler class
- `js/booking-example.js` - Usage examples
- `BOOKING_FORM_HANDLER.md` - This documentation

## Browser Support

- ✅ Modern browsers (ES6+)
- ✅ Async/await support
- ✅ Fetch API support 