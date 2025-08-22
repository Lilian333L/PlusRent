/**
 * Cars Filter Modal
 * Handles the automatic opening of filter modal and filter application
 */

class CarsFilterModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
    this.hasShownOnLoad = false;
    this.init();
  }

  init() {
    this.createModal();
    this.bindEvents();
    
    // Auto-open modal on page load (every time)
    setTimeout(() => {
      this.openModal();
      this.hasShownOnLoad = true;
    }, 500); // Small delay to ensure page is fully loaded
  }

  createModal() {
    const modalHTML = `
      <div id="cars-filter-modal" class="filter-modal-overlay">
        <div class="filter-modal-container">
          <div class="filter-modal-header">
            <h2 data-i18n="cars.filter_modal_title">Choose Your Car Category</h2>
            <p data-i18n="cars.filter_modal_subtitle">Select a category to filter our car collection</p>
            <button class="filter-modal-close" aria-label="Close modal">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="filter-modal-body">
            <div class="filter-cards-grid">
              <div class="filter-card econom" data-filter="econom" tabindex="0" role="button" aria-label="Filter economy cars up to 30 EUR">
                <div class="filter-card-content">
                  <div class="filter-card-icon">
                    <i class="fa fa-leaf"></i>
                  </div>
                  <div class="filter-card-title" data-i18n="cars.filter_econom">Econom</div>
                  <div class="filter-card-description" data-i18n="cars.filter_econom_desc">Cars up to 30 EUR</div>
                </div>
              </div>
              
              <div class="filter-card standard" data-filter="standard" tabindex="0" role="button" aria-label="Filter standard cars between 31-60 EUR">
                <div class="filter-card-content">
                  <div class="filter-card-icon">
                    <i class="fa fa-car"></i>
                  </div>
                  <div class="filter-card-title" data-i18n="cars.filter_standard">Standard</div>
                  <div class="filter-card-description" data-i18n="cars.filter_standard_desc">Cars between 31-60 EUR</div>
                </div>
              </div>
              
              <div class="filter-card premium" data-filter="premium" tabindex="0" role="button" aria-label="Filter premium cars 61 EUR and above">
                <div class="filter-card-content">
                  <div class="filter-card-icon">
                    <i class="fa fa-diamond"></i>
                  </div>
                  <div class="filter-card-title" data-i18n="cars.filter_premium">Premium</div>
                  <div class="filter-card-description" data-i18n="cars.filter_premium_desc">Cars 61 EUR and above</div>
                </div>
              </div>
              
              <div class="filter-card all-types" data-filter="all" tabindex="0" role="button" aria-label="Show all car types">
                <div class="filter-card-content">
                  <div class="filter-card-icon">
                    <i class="fa fa-th-large"></i>
                  </div>
                  <div class="filter-card-title" data-i18n="cars.filter_all_types">All Types</div>
                  <div class="filter-card-description" data-i18n="cars.filter_all_types_desc">Show all cars</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="filter-modal-footer">
            <p data-i18n="cars.filter_modal_footer">You can change filters anytime using the sidebar</p>
          </div>
        </div>
      </div>
    `;

    // Insert modal into the page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('cars-filter-modal');
  }

  bindEvents() {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('.filter-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // Filter cards
    const filterCards = this.modal.querySelectorAll('.filter-card');
    filterCards.forEach(card => {
      card.addEventListener('click', (e) => this.handleCardClick(e, card));
      card.addEventListener('keydown', (e) => this.handleCardKeydown(e, card));
    });

    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeModal();
      }
    });

    // Prevent body scroll when modal is open
    this.modal.addEventListener('transitionend', () => {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  handleCardClick(e, card) {
    e.preventDefault();
    const filterType = card.getAttribute('data-filter');
    this.applyFilter(filterType);
    this.closeModal();
  }

  handleCardKeydown(e, card) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const filterType = card.getAttribute('data-filter');
      this.applyFilter(filterType);
      this.closeModal();
    }
  }

  applyFilter(filterType) {
    console.log('Applying filter:', filterType);
    
    // Clear existing price filters
    this.clearPriceFilters();
    
    // Apply new filter based on type
    switch (filterType) {
      case 'econom':
        this.setPriceFilter(0, 30);
        break;
      case 'standard':
        this.setPriceFilter(31, 60);
        break;
      case 'premium':
        this.setPriceFilter(61, null);
        break;
      case 'all':
        // No price filter - show all cars
        break;
    }
    
    // Trigger car list update
    this.updateCarList();
  }

  clearPriceFilters() {
    // Clear desktop price filters
    const desktopMinPrice = document.getElementById('filter-price-min');
    const desktopMaxPrice = document.getElementById('filter-price-max');
    if (desktopMinPrice) desktopMinPrice.value = '';
    if (desktopMaxPrice) desktopMaxPrice.value = '';
    
    // Clear mobile price filters
    const mobileMinPrice = document.getElementById('mobile-filter-price-min');
    const mobileMaxPrice = document.getElementById('mobile-filter-price-max');
    if (mobileMinPrice) mobileMinPrice.value = '';
    if (mobileMaxPrice) mobileMaxPrice.value = '';
  }

  setPriceFilter(minPrice, maxPrice) {
    // Set desktop price filters
    const desktopMinPrice = document.getElementById('filter-price-min');
    const desktopMaxPrice = document.getElementById('filter-price-max');
    if (desktopMinPrice) desktopMinPrice.value = minPrice;
    if (desktopMaxPrice) desktopMaxPrice.value = maxPrice || '';
    
    // Set mobile price filters
    const mobileMinPrice = document.getElementById('mobile-filter-price-min');
    const mobileMaxPrice = document.getElementById('mobile-filter-price-max');
    if (mobileMinPrice) mobileMinPrice.value = minPrice;
    if (mobileMaxPrice) mobileMaxPrice.value = maxPrice || '';
  }

  updateCarList() {
    // Check if the existing fetchAndRenderCars function exists
    if (typeof fetchAndRenderCars === 'function') {
      fetchAndRenderCars();
    } else {
      // Fallback: manually update URL and reload
      this.updateURLAndReload();
    }
  }

  updateURLAndReload() {
    const params = new URLSearchParams();
    
    // Get price filters
    const minPrice = document.getElementById('filter-price-min')?.value;
    const maxPrice = document.getElementById('filter-price-max')?.value;
    
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    
    // Update URL
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.pushState({}, '', newUrl);
    
    // Reload the page to apply filters
    window.location.reload();
  }

  openModal() {
    if (!this.modal || this.isOpen) return;
    
    this.isOpen = true;
    this.modal.classList.add('active');
    
    // Focus management
    setTimeout(() => {
      const firstCard = this.modal.querySelector('.filter-card');
      if (firstCard) {
        firstCard.focus();
      }
    }, 300);
    
    // Update i18n if available
    if (typeof updateContent === 'function') {
      updateContent();
    }
  }

  closeModal() {
    if (!this.modal || !this.isOpen) return;
    
    this.isOpen = false;
    this.modal.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
  }

  // Public method to manually open modal
  show() {
    this.openModal();
  }

  // Public method to manually close modal
  hide() {
    this.closeModal();
  }

  // Reset session storage (useful for testing)
  resetSession() {
    sessionStorage.removeItem('filterModalShown');
    this.hasShownOnLoad = false;
  }
}

// Initialize the modal when DOM is ready
let carsFilterModal;

document.addEventListener('DOMContentLoaded', () => {
  carsFilterModal = new CarsFilterModal();
});

// Export for global access
window.CarsFilterModal = CarsFilterModal; 