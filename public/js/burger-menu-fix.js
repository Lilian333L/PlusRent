// ========== УНИВЕРСАЛЬНАЯ БЛОКИРОВКА СКРОЛЛА ДЛЯ ВСЕХ МОДАЛОК ==========
(function() {
  'use strict';
  
  let scrollY = 0;
  let activeModals = 0;
  
  function lockScroll() {
    if (activeModals === 0) {
      scrollY = window.scrollY;
      document.body.dataset.scrollY = scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.classList.add('scroll-locked');
      document.body.addEventListener('touchmove', preventScroll, { passive: false });
    }
    activeModals++;
  }
  
  function unlockScroll() {
    activeModals--;
    if (activeModals <= 0) {
      activeModals = 0;
      document.body.removeEventListener('touchmove', preventScroll);
      const savedScrollY = document.body.dataset.scrollY || '0';
      document.body.classList.remove('scroll-locked');
      document.body.style.top = '';
      window.scrollTo(0, parseInt(savedScrollY));
    }
  }
  
  function preventScroll(e) {
    const scrollableContainers = [
      // Бургер меню
      document.getElementById('de-sidebar'),
      document.getElementById('mainmenu'),
      
      // Мобильный фильтр
      document.querySelector('.mobile-filter-content'),
      document.getElementById('mobile-filter-overlay'),
      
      // Contact popup - ПРАВИЛЬНЫЕ ID
      document.getElementById('contactPopup'),
      document.querySelector('.contact-popup'),
      document.querySelector('.contact-popup-body'),
      
      // Price calculator - скроллируемая часть
      document.getElementById('price-calculator-modal'),
      document.querySelector('.price-calculator-content'),
      document.querySelector('#price-calculator-modal .modal-body'),
      document.querySelector('.modal-body')
    ];
    
    for (let container of scrollableContainers) {
      if (container && container.contains(e.target)) {
        return; // Разрешаем скролл
      }
    }
    
    e.preventDefault();
  }
  
  // ========== БУРГЕР-МЕНЮ ==========
  const menuBtn = document.getElementById('menu-btn');
  const header = document.querySelector('header');
  
  if (menuBtn && header) {
    let isMenuOpen = false;
    
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class') {
          const menuOpen = header.classList.contains('menu-open');
          if (menuOpen !== isMenuOpen) {
            isMenuOpen = menuOpen;
            if (isMenuOpen) {
              lockScroll();
            } else {
              unlockScroll();
            }
          }
        }
      });
    });
    
    observer.observe(header, { attributes: true });
  }
  
  // ========== МОБИЛЬНЫЙ ФИЛЬТР ==========
  const mobileFilterOverlay = document.getElementById('mobile-filter-overlay');
  if (mobileFilterOverlay) {
    let filterWasActive = false;
    
    const filterObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class') {
          const isActive = mobileFilterOverlay.classList.contains('active');
          if (isActive !== filterWasActive) {
            filterWasActive = isActive;
            if (isActive) {
              lockScroll();
            } else {
              unlockScroll();
            }
          }
        }
      });
    });
    
    filterObserver.observe(mobileFilterOverlay, { attributes: true });
  }
  
  // ========== CONTACT POPUP - ПРАВИЛЬНЫЙ ID ==========
  const contactPopup = document.getElementById('contactPopup');
  if (contactPopup) {
    let contactWasVisible = false;
    
    const contactObserver = new MutationObserver(function(mutations) {
      const isVisible = contactPopup.classList.contains('active') || 
                       contactPopup.style.display === 'flex' ||
                       contactPopup.style.display === 'block' ||
                       window.getComputedStyle(contactPopup).display !== 'none';
      
      if (isVisible !== contactWasVisible) {
        contactWasVisible = isVisible;
        if (isVisible) {
          lockScroll();
        } else {
          unlockScroll();
        }
      }
    });
    
    contactObserver.observe(contactPopup, { 
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
  
  // ========== PRICE CALCULATOR MODAL ==========
  const priceModal = document.getElementById('price-calculator-modal');
  if (priceModal) {
    let priceWasVisible = false;
    
    const priceObserver = new MutationObserver(function(mutations) {
      const isVisible = priceModal.classList.contains('active') || 
                       priceModal.classList.contains('show') ||
                       priceModal.style.display === 'flex' ||
                       priceModal.style.display === 'block' ||
                       window.getComputedStyle(priceModal).display !== 'none';
      
      if (isVisible !== priceWasVisible) {
        priceWasVisible = isVisible;
        if (isVisible) {
          lockScroll();
        } else {
          unlockScroll();
        }
      }
    });
    
    priceObserver.observe(priceModal, { 
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
  
  window.lockBodyScroll = lockScroll;
  window.unlockBodyScroll = unlockScroll;
  
})();
