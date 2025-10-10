/**
 * Cars Filter Modal
 * Handles the automatic opening of filter modal and filter application
 */

class CarsFilterModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
    this.hasShownOnLoad = false;
    this.touchStartY = 0;
    this.touchEndY = 0;
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
                    <i class="fa fa-crown"></i>
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
      closeBtn.addEventListener('click', () => {
        // На мобильных при закрытии через X также выбираем "Все типы"
        if (this.isMobile()) {
          this.applyFilter('all');
        }
        this.closeModal();
      });
    }

    // Update descriptions after modal is created
    this.updateModalDescriptions();

    // Filter cards
    const filterCards = this.modal.querySelectorAll('.filter-card');
    filterCards.forEach(card => {
      card.addEventListener('click', (e) => this.handleCardClick(e, card));
      card.addEventListener('keydown', (e) => this.handleCardKeydown(e, card));
    });

    // Close on overlay click - НА МОБИЛЬНЫХ АВТОМАТИЧЕСКИ ВЫБИРАЕТ "ВСЕ ТИПЫ"
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        if (this.isMobile()) {
          // На мобильных: применить фильтр "Все типы" и закрыть
          this.applyFilter('all');
          this.closeModal();
        } else {
          // На десктопе: просто закрыть без применения фильтра
          this.closeModal();
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        // На мобильных при Escape также выбираем "Все типы"
        if (this.isMobile()) {
          this.applyFilter('all');
        }
        this.closeModal();
      }
    });

    // Setup touch events for swipe to close on mobile
    this.setupTouchEvents();

    // Prevent body scroll when modal is open
    this.setupScrollLock();
  }

  // Проверка мобильного устройства
  isMobile() {
    return window.innerWidth <= 767;
  }

  setupTouchEvents() {
    const modalBody = this.modal.querySelector('.filter-modal-body');
    const container = this.modal.querySelector('.filter-modal-container');
    
    if (!modalBody || !container) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let isAtTop = false;

    container.addEventListener('touchstart', (e) => {
      // Check if we're at the top of the scrollable content
      isAtTop = modalBody.scrollTop === 0;
      startY = e.touches[0].clientY;
      currentY = startY;
      
      if (isAtTop) {
        isDragging = true;
      }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      // Only allow downward swipes when at top
      if (deltaY > 0 && isAtTop) {
        // Prevent default to stop page scroll
        if (e.cancelable) {
          e.preventDefault();
        }
        
        // Apply transform to container for visual feedback
        const translateY = Math.min(deltaY * 0.5, 200);
        container.style.transform = `translateY(${translateY}px) scale(${1 - translateY / 1000})`;
        container.style.transition = 'none';
      }
    }, { passive: false });

    container.addEventListener('touchend', () => {
      if (!isDragging) return;
      
      isDragging = false;
      const deltaY = currentY - startY;
      
      // If swiped down more than 100px, apply "All Types" and close
      if (deltaY > 100) {
        this.applyFilter('all');
        this.closeModal();
      } else {
        // Reset position
        container.style.transform = '';
        container.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }
    }, { passive: true });
  }

  setupScrollLock() {
    // Prevent background scroll on mobile when modal is open
    const preventScroll = (e) => {
      const modalBody = this.modal.querySelector('.filter-modal-body');
      
      // Allow scrolling inside modal body
      if (modalBody && modalBody.contains(e.target)) {
        return;
      }
      
      // Prevent all other scrolling
      if (this.isOpen) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add event listeners
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventScroll, { passive: false });
    
    // Store for cleanup
    this.preventScrollHandler = preventScroll;
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
    // Check if we have the integrated applyModalFilter function (cars.html page)
    if (typeof window.applyModalFilter === 'function') {
      window.applyModalFilter(filterType);
      return;
    }
    
    // Otherwise, try to integrate with the page's filter system
    const params = new URLSearchParams(window.location.search);
    
    // Clear existing price parameters
    params.delete('min_price');
    params.delete('max_price');
    
    // Apply new filter based on dynamic settings
    switch (filterType) {
      case 'econom':
        params.set('min_price', this.priceFilterSettings.economy.min);
        params.set('max_price', this.priceFilterSettings.economy.max);
        
        // Try to update radio buttons if they exist
        const economyRadio = document.querySelector('input[name="price-category"][value="economy"]');
        if (economyRadio) {
          document.querySelectorAll('input[name="price-category"]').forEach(r => r.checked = false);
          economyRadio.checked = true;
        }
        break;
        
      case 'standard':
        params.set('min_price', this.priceFilterSettings.standard.min);
        params.set('max_price', this.priceFilterSettings.standard.max);
        
        const standardRadio = document.querySelector('input[name="price-category"][value="standard"]');
        if (standardRadio) {
          document.querySelectorAll('input[name="price-category"]').forEach(r => r.checked = false);
          standardRadio.checked = true;
        }
        break;
        
      case 'premium':
        params.set('min_price', this.priceFilterSettings.premium.min);
        params.set('max_price', this.priceFilterSettings.premium.max);
        
        const premiumRadio = document.querySelector('input[name="price-category"][value="premium"]');
        if (premiumRadio) {
          document.querySelectorAll('input[name="price-category"]').forEach(r => r.checked = false);
          premiumRadio.checked = true;
        }
        break;
        
      case 'all':
        // No price filter - show all cars
        const allRadio = document.querySelector('input[name="price-category"][value="all"]');
        if (allRadio) {
          document.querySelectorAll('input[name="price-category"]').forEach(r => r.checked = false);
          allRadio.checked = true;
        }
        break;
    }
    
    // Update URL
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.pushState({}, '', newUrl);
    
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
    // Check if the existing functions exist (cars.html page)
    if (typeof updateFiltersAndFetch === 'function') {
      updateFiltersAndFetch();
    } else if (typeof fetchAndRenderCars === 'function') {
      fetchAndRenderCars();
    } else {
      // Fallback: reload the page with new parameters
      window.location.reload();
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
    
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${window.scrollY}px`;
    
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
    const scrollY = document.body.style.top;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
    
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
    
    // Clean up scroll prevention
    if (this.preventScrollHandler) {
      document.removeEventListener('touchmove', this.preventScrollHandler);
      document.removeEventListener('wheel', this.preventScrollHandler);
      this.preventScrollHandler = null;
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

// Integration function for cars.html page
window.applyModalFilter = function(filterType) {
  // Clear existing price category selections
  document.querySelectorAll('input[name="price-category"]').forEach(radio => {
    radio.checked = false;
  });
  document.querySelectorAll('input[name="mobile-price-category"]').forEach(radio => {
    radio.checked = false;
  });
  
  // Map modal filter types to price categories
  const filterMap = {
    'econom': 'economy',
    'standard': 'standard', 
    'premium': 'premium',
    'all': 'all'
  };
  
  const priceCategory = filterMap[filterType] || 'all';
  
  // Set the appropriate radio button
  const desktopRadio = document.querySelector(`input[name="price-category"][value="${priceCategory}"]`);
  if (desktopRadio) {
    desktopRadio.checked = true;
  }
  
  const mobileRadio = document.querySelector(`input[name="mobile-price-category"][value="${priceCategory}"]`);
  if (mobileRadio) {
    mobileRadio.checked = true;
  }
  
  // Build URL params
  const params = new URLSearchParams();
  
  // Preserve existing filters
  const existingParams = new URLSearchParams(window.location.search);
  for (const [key, value] of existingParams) {
    if (key !== 'min_price' && key !== 'max_price') {
      params.set(key, value);
    }
  }
  
  // Get price settings from modal if available
  const priceSettings = window.carsFilterModal?.priceFilterSettings || {
    economy: { min: 0, max: 30 },
    standard: { min: 31, max: 60 },
    premium: { min: 61, max: 999 }
  };
  
  // Apply price filter based on selection
  if (priceCategory && priceCategory !== 'all') {
    const settings = priceSettings[priceCategory];
    if (settings) {
      params.set('min_price', settings.min);
      params.set('max_price', settings.max);
    }
  }
  
  // Update URL
  const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
  window.history.pushState({}, '', newUrl);
  
  // Fetch and render cars
  if (typeof fetchAndRenderCars === 'function') {
    fetchAndRenderCars();
  } else if (typeof updateFiltersAndFetch === 'function') {
    updateFiltersAndFetch();
  } else {
    // Fallback - reload page
    window.location.reload();
  }
  
  // Update modal visual state
  if (window.carsFilterModal && window.carsFilterModal.modal) {
    window.carsFilterModal.modal.querySelectorAll('.filter-card').forEach(card => {
      card.classList.remove('selected');
    });
    const selectedCard = window.carsFilterModal.modal.querySelector(`.filter-card[data-filter="${filterType}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }
  }
};
