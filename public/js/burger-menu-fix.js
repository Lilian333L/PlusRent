// ========== АГРЕССИВНАЯ БЛОКИРОВКА СКРОЛЛА ДЛЯ ВСЕХ МОДАЛОК ==========
(function() {
  'use strict';
  
  let scrollY = 0;
  let touchStartY = 0;
  
  // Блокировка скролла
  function lockScroll() {
    scrollY = window.scrollY;
    document.body.dataset.scrollY = scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    // Добавляем слушатели для блокировки тач-событий
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('wheel', handleWheel, { passive: false });
  }
  
  // Разблокировка скролла
  function unlockScroll() {
    const savedScrollY = document.body.dataset.scrollY || '0';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, parseInt(savedScrollY));
    
    // Убираем слушатели
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('wheel', handleWheel);
  }
  
  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }
  
  function handleTouchMove(e) {
    // Проверяем, находится ли событие внутри разрешенного контейнера
    if (isInsideScrollableContainer(e.target)) {
      const container = getScrollableContainer(e.target);
      if (container) {
        const touchY = e.touches[0].clientY;
        const touchDelta = touchStartY - touchY;
        
        // Проверяем границы скролла контейнера
        const isAtTop = container.scrollTop === 0;
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight;
        
        // Блокируем только если пытаемся скроллить за границы
        if ((isAtTop && touchDelta < 0) || (isAtBottom && touchDelta > 0)) {
          e.preventDefault();
        }
        return;
      }
    }
    
    // Блокируем все остальное
    e.preventDefault();
  }
  
  function handleWheel(e) {
    if (!isInsideScrollableContainer(e.target)) {
      e.preventDefault();
    }
  }
  
  function isInsideScrollableContainer(element) {
    const containers = [
      '.contact-popup-body',
      '.modal-body',
      '.price-calculator-content',
      '#de-sidebar',
      '#mainmenu',
      '.mobile-filter-content'
    ];
    
    for (let selector of containers) {
      const container = element.closest(selector);
      if (container) return true;
    }
    return false;
  }
  
  function getScrollableContainer(element) {
    const containers = [
      '.contact-popup-body',
      '.modal-body',
      '.price-calculator-content',
      '#de-sidebar',
      '#mainmenu',
      '.mobile-filter-content'
    ];
    
    for (let selector of containers) {
      const container = element.closest(selector);
      if (container) return container;
    }
    return null;
  }
  
  // ========== БУРГЕР-МЕНЮ ==========
  const header = document.querySelector('header');
  if (header) {
    let isMenuOpen = false;
    
    const observer = new MutationObserver(function() {
      const menuOpen = header.classList.contains('menu-open');
      if (menuOpen !== isMenuOpen) {
        isMenuOpen = menuOpen;
        isMenuOpen ? lockScroll() : unlockScroll();
      }
    });
    
    observer.observe(header, { attributes: true, attributeFilter: ['class'] });
  }
  
  // ========== МОБИЛЬНЫЙ ФИЛЬТР ==========
  const mobileFilter = document.getElementById('mobile-filter-overlay');
  if (mobileFilter) {
    let isFilterActive = false;
    
    const filterObserver = new MutationObserver(function() {
      const isActive = mobileFilter.classList.contains('active');
      if (isActive !== isFilterActive) {
        isFilterActive = isActive;
        isActive ? lockScroll() : unlockScroll();
      }
    });
    
    filterObserver.observe(mobileFilter, { attributes: true, attributeFilter: ['class'] });
  }
  
  // ========== CONTACT POPUP ==========
  const contactPopup = document.getElementById('contactPopup');
  if (contactPopup) {
    let isContactVisible = false;
    
    const contactObserver = new MutationObserver(function() {
      const isVisible = window.getComputedStyle(contactPopup).display !== 'none';
      if (isVisible !== isContactVisible) {
        isContactVisible = isVisible;
        isVisible ? lockScroll() : unlockScroll();
      }
    });
    
    contactObserver.observe(contactPopup, { 
      attributes: true, 
      attributeFilter: ['style', 'class'] 
    });
  }
  
  // ========== PRICE CALCULATOR ==========
  const priceModal = document.getElementById('price-calculator-modal');
  if (priceModal) {
    let isPriceVisible = false;
    
    const priceObserver = new MutationObserver(function() {
      const isVisible = window.getComputedStyle(priceModal).display !== 'none';
      if (isVisible !== isPriceVisible) {
        isPriceVisible = isVisible;
        isVisible ? lockScroll() : unlockScroll();
      }
    });
    
    priceObserver.observe(priceModal, { 
      attributes: true, 
      attributeFilter: ['style', 'class'] 
    });
  }
  
})();
