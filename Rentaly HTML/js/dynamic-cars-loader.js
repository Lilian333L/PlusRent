// Dynamic Cars Loader for Booking Form
// Loads available cars from the API and populates the vehicle selection dropdown

class DynamicCarsLoader {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || window.API_BASE_URL;
    this.selectElement = options.selectElement || document.getElementById('vehicle_type');
    this.onLoad = options.onLoad || this.defaultOnLoad;
    this.onError = options.onError || this.defaultOnError;
    this.defaultImagePath = 'images/cars-alt/default-car.png';
  }

  // Load available cars from API
  async loadAvailableCars() {
    try {
      console.log('Loading available cars from API...');
      const response = await fetch(`${this.apiBaseUrl}/api/cars/booking/available`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const cars = await response.json();
      console.log('Loaded cars:', cars);
      
      this.populateSelect(cars);
      this.onLoad(cars);
      
    } catch (error) {
      console.error('Error loading cars:', error);
      this.onError(error.message);
    }
  }

        // Populate the select element with car options
      populateSelect(cars) {
        if (!this.selectElement) {
          console.error('Select element not found');
          return;
        }

        // Clear all existing options
        this.selectElement.innerHTML = '';

        // Add car options
        cars.forEach(car => {
          const option = document.createElement('option');
          option.value = car.value;
          option.textContent = car.display_name;
          option.setAttribute('data-src', car.data_src);
          option.setAttribute('data-car-id', car.id);
          option.setAttribute('data-daily-price', car.daily_price);

          this.selectElement.appendChild(option);
        });

        // If no cars were loaded, add a fallback option
        if (cars.length === 0) {
          const fallbackOption = document.createElement('option');
          fallbackOption.value = '';
          fallbackOption.textContent = 'No cars available';
          fallbackOption.disabled = true;
          this.selectElement.appendChild(fallbackOption);
        } else {
          // Automatically select the first car
          this.selectElement.selectedIndex = 0;
        }

        // Trigger change event to update any dependent UI
        this.selectElement.dispatchEvent(new Event('change'));
      }

  // Get selected car data
  getSelectedCar() {
    if (!this.selectElement) return null;
    
    const selectedOption = this.selectElement.options[this.selectElement.selectedIndex];
    if (!selectedOption || !selectedOption.value) return null;
    
    return {
      id: selectedOption.getAttribute('data-car-id'),
      value: selectedOption.value,
      display_name: selectedOption.textContent,
      image_src: selectedOption.getAttribute('data-src'),
      daily_price: selectedOption.getAttribute('data-daily-price')
    };
  }

  // Set selected car by ID
  setSelectedCar(carId) {
    if (!this.selectElement) return false;
    
    const options = this.selectElement.querySelectorAll('option');
    for (let option of options) {
      if (option.getAttribute('data-car-id') === carId.toString()) {
        this.selectElement.value = option.value;
        this.selectElement.dispatchEvent(new Event('change'));
        return true;
      }
    }
    return false;
  }

  // Default success handler
  defaultOnLoad(cars) {
    console.log(`Successfully loaded ${cars.length} cars`);
  }

  // Default error handler
  defaultOnError(errorMessage) {
    console.error('Failed to load cars:', errorMessage);
    // You can add user-facing error handling here
    // For example, show a toast notification or error message
  }

  // Initialize the loader
  init() {
    if (!this.selectElement) {
      console.error('Select element not found. Please provide a valid select element.');
      return;
    }

    // Load cars when the page is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.loadAvailableCars();
      });
    } else {
      this.loadAvailableCars();
    }
  }
}

// Auto-initialize if the script is loaded after DOM is ready
if (document.readyState !== 'loading') {
  // DOM is already ready, initialize immediately
  const carsLoader = new DynamicCarsLoader();
  carsLoader.init();
} else {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    const carsLoader = new DynamicCarsLoader();
    carsLoader.init();
  });
}

// Export for use in other scripts
window.DynamicCarsLoader = DynamicCarsLoader; 