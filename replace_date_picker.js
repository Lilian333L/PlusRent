// Script to replace the current date picker implementation with DatePickerManager

// Find the current implementation and replace it with:
const replacementCode = `
// Initialize DatePickerManager
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const carId = urlParams.get('id');
  
  if (carId) {
    const datePickerManager = new DatePickerManager({
      pickupInputId: 'date-picker',
      returnInputId: 'date-picker-2',
      carId: carId,
      dateFormat: 'd-m-Y',
      onDateChange: function() {
        // Trigger price calculator when dates change
        if (window.priceCalculator && typeof window.priceCalculator.recalculatePrice === 'function') {
          window.priceCalculator.recalculatePrice();
        }
      }
    });
    
    // Initialize the date picker
    datePickerManager.initialize();
  }
});
`;

