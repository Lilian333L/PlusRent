/**
 * Cars Filter Modal
 * Handles the automatic opening of filter modal and filter application
 */

class CarsFilterModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
    this.hasShownOnLoad = false;
    this.priceFilterSettings = {
      economy: { min: 0, max: 30 },
      standard: { min: 31, max: 60 },
      premium: { min: 61, max: 999 }
    };
    this.init();
  }

  async init() {
    await this.loadPriceFilterSettings();
    this.createModal();
    this.bindEvents();
    
    // Auto-open modal on page load (every time)
    this.openModal();
    this.hasShownOnLoad = true;
  }

  async loadPriceFilterSettings() {
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/fee-settings/public`);
      if (response.ok) {
        const feeSettings = await response.json();
        
        // Extract price filter settings
        this.priceFilterSettings = {
          economy: {
            min: feeSettings.economy_price_min,
            max: feeSettings.economy_price_max
          },
          standard: {
            min: feeSettings.standard_price_min,
            max: feeSettings.standard_price_max
          },
          premium: {
            min: feeSettings.premium_price_min,
            max: feeSettings.premium_price_max
          }
        };
        
        console.log('🔧 Modal loaded price filter settings:', this.priceFilterSettings);
      }
    } catch (error) {
      console.error('Error loading price filter settings for modal:', error);
      // Keep default values if API fails
    }
  }

  updateModalDescriptions() {
    console.log('🔧 updateModalDescriptions called');
    console.log('🔧 Modal exists:', !!this.modal);
    console.log('🔧 Price filter settings:', this.priceFilterSettings);
    
    if (!this.modal) {
      console.log('🔧 Modal not found, skipping update');
      return;
    }
    
    // Try i18n first, fallback to direct text if it fails
    let useI18n = false;
    if (typeof i18next !== 'undefined' && i18next.isInitialized) {
      useI18n = true;
      console.log('🔧 Using i18n system for translations');
    } else {
      console.log('🔧 i18n not available, using fallback text');
    }
    
    // Update economy description
    const economDesc = this.modal.querySelector('.filter-card.econom .filter-card-description');
    console.log('🔧 Economy desc element found:', !!economDesc);
    if (economDesc) {
      let newText;
      if (useI18n) {
        newText = i18next.t('cars.filter_econom_desc', { 
          max: this.priceFilterSettings.economy.max 
        });
      } else {
        // Fallback text based on current language
        const currentLang = localStorage.getItem('lang') || 'ro';
        if (currentLang === 'ru') {
          newText = `Автомобили до ${this.priceFilterSettings.economy.max} EUR`;
        } else if (currentLang === 'en') {
          newText = `Cars up to ${this.priceFilterSettings.economy.max} EUR`;
        } else {
          newText = `Mașini până la ${this.priceFilterSettings.economy.max} EUR`;
        }
      }
      economDesc.textContent = newText;
      console.log('🔧 Updated economy description to:', newText);
    }
    
    // Update standard description
    const standardDesc = this.modal.querySelector('.filter-card.standard .filter-card-description');
    console.log('🔧 Standard desc element found:', !!standardDesc);
    if (standardDesc) {
      let newText;
      if (useI18n) {
        newText = i18next.t('cars.filter_standard_desc', { 
          min: this.priceFilterSettings.standard.min,
          max: this.priceFilterSettings.standard.max 
        });
      } else {
        // Fallback text based on current language
        const currentLang = localStorage.getItem('lang') || 'ro';
        if (currentLang === 'ru') {
          newText = `Автомобили от ${this.priceFilterSettings.standard.min} до ${this.priceFilterSettings.standard.max} EUR`;
        } else if (currentLang === 'en') {
          newText = `Cars between ${this.priceFilterSettings.standard.min}-${this.priceFilterSettings.standard.max} EUR`;
        } else {
          newText = `Mașini între ${this.priceFilterSettings.standard.min}-${this.priceFilterSettings.standard.max} EUR`;
        }
      }
      standardDesc.textContent = newText;
      console.log('🔧 Updated standard description to:', newText);
    }
    
    // Update premium description
    const premiumDesc = this.modal.querySelector('.filter-card.premium .filter-card-description');
    console.log('🔧 Premium desc element found:', !!premiumDesc);
    if (premiumDesc) {
      let newText;
      if (useI18n) {
        newText = i18next.t('cars.filter_premium_desc', { 
          min: this.priceFilterSettings.premium.min 
        });
      } else {
        // Fallback text based on current language
        const currentLang = localStorage.getItem('lang') || 'ro';
        if (currentLang === 'ru') {
          newText = `Автомобили от ${this.priceFilterSettings.premium.min} EUR и выше`;
        } else if (currentLang === 'en') {
          newText = `Cars ${this.priceFilterSettings.premium.min} EUR and above`;
        } else {
          newText = `Mașini ${this.priceFilterSettings.premium.min} EUR și peste`;
        }
      }
      premiumDesc.textContent = newText;
      console.log('🔧 Updated premium description to:', newText);
    }
    
    console.log('🔧 Updated modal descriptions with dynamic values');
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
              <div class="filter-card econom" data-filter="econom" tabindex="0" role="button" aria-label="Filter economy cars">
                <div class="filter-card-content">
                  <div class="filter-card-icon">
                    <i class="fa fa-leaf"></i>
                  </div>
                  <div class="filter-card-title" data-i18n="cars.filter_econom">Econom</div>
                  <div class="filter-card-description" data-i18n="cars.filter_econom_desc">Cars up to {{max}} EUR</div>
                </div>
              </div>
              
              <div class="filter-card standard" data-filter="standard" tabindex="0" role="button" aria-label="Filter standard cars">
                <div class="filter-card-content">
                  <div class="filter-card-icon">
                    <i class="fa fa-car"></i>
                  </div>
                  <div class="filter-card-title" data-i18n="cars.filter_standard">Standard</div>
                  <div class="filter-card-description" data-i18n="cars.filter_standard_desc">Cars between {{min}}-{{max}} EUR</div>
                </div>
              </div>
              
              <div class="filter-card premium" data-filter="premium" tabindex="0" role="button" aria-label="Filter premium cars">
                <div class="filter-card-content">
                  <div class="filter-card-icon">
                    <i class="fa fa-diamond"></i>
                  </div>
                  <div class="filter-card-title" data-i18n="cars.filter_premium">Premium</div>
                  <div class="filter-card-description" data-i18n="cars.filter_premium_desc">Cars {{min}} EUR and above</div>
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

    // Update descriptions after modal is created
    this.updateModalDescriptions();

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
    // Clear existing price filters
    this.clearPriceFilters();
    
    // Apply new filter based on dynamic settings
    switch (filterType) {
      case 'econom': // HTML uses 'econom' but settings use 'economy'
        this.setPriceFilter(this.priceFilterSettings.economy.min, this.priceFilterSettings.economy.max);
        break;
      case 'standard':
        this.setPriceFilter(this.priceFilterSettings.standard.min, this.priceFilterSettings.standard.max);
        break;
      case 'premium':
        this.setPriceFilter(this.priceFilterSettings.premium.min, this.priceFilterSettings.premium.max);
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
    if (desktopMinPrice) {
      desktopMinPrice.value = minPrice;
    }
    if (desktopMaxPrice) {
      desktopMaxPrice.value = maxPrice || '';
    }
    
    // Set mobile price filters
    const mobileMinPrice = document.getElementById('mobile-filter-price-min');
    const mobileMaxPrice = document.getElementById('mobile-filter-price-max');
    if (mobileMinPrice) {
      mobileMinPrice.value = minPrice;
    }
    if (mobileMaxPrice) {
      mobileMaxPrice.value = maxPrice || '';
    }
  }

  updateCarList() {
    // Check if the existing updateFiltersAndFetch function exists
    if (typeof updateFiltersAndFetch === 'function') {
      updateFiltersAndFetch();
    } else if (typeof fetchAndRenderCars === 'function') {
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
    
    // Update descriptions with dynamic values after modal opens
    this.updateModalDescriptions();
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
  // Wait a bit more to ensure all scripts are loaded
  setTimeout(() => {
    carsFilterModal = new CarsFilterModal();
  }, 100);
});

// Export for global access
window.CarsFilterModal = CarsFilterModal; 