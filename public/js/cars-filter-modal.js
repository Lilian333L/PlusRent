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
    
    // Listen for language changes
    this.setupLanguageChangeListener();
    
    // Auto-open modal on page load (every time)
    // Add a small delay to ensure everything is ready
    setTimeout(() => {
      this.openModal();
      this.hasShownOnLoad = true;
    }, 200);
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
      }
    } catch (error) {
      console.error('Error loading price filter settings:', error);
      // Keep default values if API fails
    }
  }

  updateModalDescriptions() {
    if (!this.modal) {
      return;
    }
    
    // Get current language
    const currentLang = localStorage.getItem('lang') || 'ro';
    
    // Update economy description
    const economDesc = this.modal.querySelector('.filter-card.econom .filter-card-description');
    if (economDesc) {
      const maxPrice = this.priceFilterSettings.economy.max;
      let text = '';
      if (currentLang === 'ro') {
        text = `Mașini până la ${maxPrice} EUR`;
      } else if (currentLang === 'ru') {
        text = `Автомобили до ${maxPrice} EUR`;
      } else {
        text = `Cars up to ${maxPrice} EUR`;
      }
      economDesc.textContent = text;
      // Also update the data-i18n attribute to prevent i18n from overriding
      economDesc.setAttribute('data-i18n', '');
    }
    
    // Update standard description
    const standardDesc = this.modal.querySelector('.filter-card.standard .filter-card-description');
    if (standardDesc) {
      const minPrice = this.priceFilterSettings.standard.min;
      const maxPrice = this.priceFilterSettings.standard.max;
      let text = '';
      if (currentLang === 'ro') {
        text = `Mașini între ${minPrice}-${maxPrice} EUR`;
      } else if (currentLang === 'ru') {
        text = `Автомобили от ${minPrice} до ${maxPrice} EUR`;
      } else {
        text = `Cars between ${minPrice}-${maxPrice} EUR`;
      }
      standardDesc.textContent = text;
      // Also update the data-i18n attribute to prevent i18n from overriding
      standardDesc.setAttribute('data-i18n', '');
    }
    
    // Update premium description
    const premiumDesc = this.modal.querySelector('.filter-card.premium .filter-card-description');
    if (premiumDesc) {
      const minPrice = this.priceFilterSettings.premium.min;
      let text = '';
      if (currentLang === 'ro') {
        text = `Mașini ${minPrice} EUR și peste`;
      } else if (currentLang === 'ru') {
        text = `Автомобили от ${minPrice} EUR и выше`;
      } else {
        text = `Cars ${minPrice} EUR and above`;
      }
      premiumDesc.textContent = text;
      // Also update the data-i18n attribute to prevent i18n from overriding
      premiumDesc.setAttribute('data-i18n', '');
    }
  }

  setupLanguageChangeListener() {
    // Listen for custom language change events
    document.addEventListener('languageChanged', () => {
      // Update descriptions after language change
      setTimeout(() => {
        this.updateModalDescriptions();
      }, 200);
    });
    
    // Also listen for i18next language changes
    if (typeof i18next !== 'undefined') {
      i18next.on('languageChanged', () => {
        setTimeout(() => {
          this.updateModalDescriptions();
        }, 200);
      });
    }
    
    // Set up a MutationObserver to watch for content changes
    this.setupContentWatcher();
    
    // Set up periodic checks to ensure prices stay updated
    this.setupPeriodicUpdates();
  }
  
  setupPeriodicUpdates() {
    // Check every 2 seconds if prices need to be updated
    this.priceUpdateInterval = setInterval(() => {
      if (this.modal && this.isOpen) {
        // Check if any descriptions still contain placeholders
        const descriptions = this.modal.querySelectorAll('.filter-card-description');
        let needsUpdate = false;
        
        descriptions.forEach(desc => {
          if (desc.textContent.includes('{{') || desc.textContent.includes('}}')) {
            needsUpdate = true;
          }
        });
        
        if (needsUpdate) {
          this.updateModalDescriptions();
        }
      }
    }, 500);
  }
  
  setupContentWatcher() {
    if (!this.modal) return;
    
    // Watch for changes to the description elements
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          // Check if any of our target elements were modified
          const target = mutation.target;
          if (target.classList && target.classList.contains('filter-card-description')) {
            // Check if the content contains placeholders
            if (target.textContent.includes('{{') || target.textContent.includes('}}')) {
              shouldUpdate = true;
            }
          }
        }
      });
      
      if (shouldUpdate) {
          this.updateModalDescriptions();
      }
    });
    
    // Start observing
    observer.observe(this.modal, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Store observer for cleanup if needed
    this.contentObserver = observer;
  }

  createModal() {
    const modalHTML = `
      <div id="cars-filter-modal" class="filter-modal-overlay">
        <div class="filter-modal-container">
          <div class="filter-modal-header">
            <div class="header-content">
              <h2 data-i18n="cars.filter_modal_title">Choose Your Car Category</h2>
              <p data-i18n="cars.filter_modal_subtitle">Select a category to filter our car collection</p>
            </div>
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
    
    // First update i18n to apply the translations
    if (typeof updateContent === 'function') {
      updateContent();
    }
    
    // Update descriptions with dynamic values BEFORE showing modal
    this.updateModalDescriptions();
    
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      this.isOpen = true;
      this.modal.classList.add('active');
      
      // Focus management
      setTimeout(() => {
        const firstCard = this.modal.querySelector('.filter-card');
        if (firstCard) {
          firstCard.focus();
        }
      }, 300);
    }, 50);
  }

  closeModal() {
    if (!this.modal || !this.isOpen) return;
    
    this.isOpen = false;
    this.modal.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clean up observer if it exists
    if (this.contentObserver) {
      this.contentObserver.disconnect();
      this.contentObserver = null;
    }
    
    // Clean up interval if it exists
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
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