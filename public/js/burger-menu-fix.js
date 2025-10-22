// ========== УНИВЕРСАЛЬНАЯ БЛОКИРОВКА СКРОЛЛА ДЛЯ ВСЕХ МОДАЛОК ==========
(function() {
  'use strict';
  
  let scrollY = 0;
  
  // Функция блокировки скролла
  function lockScroll() {
    scrollY = window.scrollY;
    document.body.dataset.scrollY = scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('scroll-locked');
    document.body.addEventListener('touchmove', preventScroll, { passive: false });
  }
  
  // Функция разблокировки скролла
  function unlockScroll() {
    document.body.removeEventListener('touchmove', preventScroll);
    const savedScrollY = document.body.dataset.scrollY || '0';
    document.body.classList.remove('scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, parseInt(savedScrollY));
  }
  
  // Предотвращаем скролл фона, разрешаем внутри модалок
  function preventScroll(e) {
    // Список всех контейнеров, где разрешен скролл
    const scrollableContainers = [
      document.getElementById('de-sidebar'),
      document.getElementById('mainmenu'),
      document.querySelector('.mobile-filter-content'),
      document.querySelector('.contact-popup-content'),
      document.querySelector('.modal-body'),
      document.querySelector('.popup-content'),
      document.getElementById('mobile-filter-overlay'),
      document.querySelector('[class*="modal"]'),
      document.querySelector('[class*="popup"]')
    ];
    
    // Проверяем, находится ли элемент внутри разрешенного контейнера
    for (let container of scrollableContainers) {
      if (container && container.contains(e.target)) {
        return; // Разрешаем скролл
      }
    }
    
    e.preventDefault(); // Блокируем скролл фона
  }
  
  // ========== 1. БУРГЕР-МЕНЮ ==========
  if (window.innerWidth <= 991) {
    const menuBtn = document.getElementById('menu-btn');
    const header = document.querySelector('header');
    
    if (menuBtn && header) {
      let isMenuOpen = false;
      
      menuBtn.addEventListener('click', function() {
        setTimeout(function() {
          isMenuOpen = header.classList.contains('menu-open');
          isMenuOpen ? lockScroll() : unlockScroll();
        }, 100);
      });
      
      // Отслеживаем изменения класса на header
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.attributeName === 'class') {
            const menuOpen = header.classList.contains('menu-open');
            if (menuOpen !== isMenuOpen) {
              isMenuOpen = menuOpen;
              isMenuOpen ? lockScroll() : unlockScroll();
            }
          }
        });
      });
      
      observer.observe(header, { attributes: true });
    }
  }
  
  // ========== 2. МОБИЛЬНЫЙ ФИЛЬТР ==========
  const mobileFilterOverlay = document.getElementById('mobile-filter-overlay');
  if (mobileFilterOverlay) {
    const filterObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class') {
          const isActive = mobileFilterOverlay.classList.contains('active');
          isActive ? lockScroll() : unlockScroll();
        }
      });
    });
    
    filterObserver.observe(mobileFilterOverlay, { attributes: true });
  }
  
  // ========== 3. CONTACT POPUP ==========
  const contactPopup = document.getElementById('contact-popup');
  if (contactPopup) {
    const contactObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          const isVisible = contactPopup.classList.contains('active') || 
                           contactPopup.style.display === 'flex' ||
                           contactPopup.style.display === 'block';
          isVisible ? lockScroll() : unlockScroll();
        }
      });
    });
    
    contactObserver.observe(contactPopup, { 
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
  
  // ========== 4. PRICE CALCULATOR MODAL ==========
  const priceModal = document.getElementById('price-calculator-modal');
  if (priceModal) {
    const priceObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          const isVisible = priceModal.classList.contains('active') || 
                           priceModal.classList.contains('show') ||
                           priceModal.style.display === 'flex' ||
                           priceModal.style.display === 'block';
          isVisible ? lockScroll() : unlockScroll();
        }
      });
    });
    
    priceObserver.observe(priceModal, { 
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
  
  // ========== 5. ЛЮБЫЕ ДРУГИЕ МОДАЛКИ (УНИВЕРСАЛЬНО) ==========
  // Отслеживаем все элементы с классом modal, popup и т.д.
  document.addEventListener('click', function(e) {
    // Проверяем все модалки через короткий интервал
    setTimeout(function() {
      const anyModalOpen = 
        document.querySelector('.modal.show') ||
        document.querySelector('.popup.active') ||
        document.querySelector('[style*="display: block"]') ||
        document.querySelector('[style*="display: flex"]') ||
        document.querySelector('.mobile-filter-overlay.active') ||
        document.querySelector('header.menu-open');
      
      // Если хоть одна модалка открыта - блокируем
      if (anyModalOpen && !document.body.classList.contains('scroll-locked')) {
        lockScroll();
      }
    }, 100);
  });
  
  // Глобальная функция для ручной блокировки/разблокировки
  window.lockBodyScroll = lockScroll;
  window.unlockBodyScroll = unlockScroll;
  
})();
