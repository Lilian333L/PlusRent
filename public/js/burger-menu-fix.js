// ========== УНИВЕРСАЛЬНЫЙ ФИКС СКРОЛЛА ДЛЯ БУРГЕР-МЕНЮ ==========
(function() {
  'use strict';
  
  if (window.innerWidth > 991) return; // Только для мобильных
  
  const menuBtn = document.getElementById('menu-btn');
  const header = document.querySelector('header');
  
  if (!menuBtn || !header) return;
  
  let isMenuOpen = false;
  
  // Функция блокировки скролла
  function lockBodyScroll() {
    const scrollY = window.scrollY;
    document.body.dataset.scrollY = scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('burger-menu-open');
    document.body.addEventListener('touchmove', preventScroll, { passive: false });
  }
  
  // Функция разблокировки скролла
  function unlockBodyScroll() {
    document.body.removeEventListener('touchmove', preventScroll);
    const scrollY = document.body.dataset.scrollY || '0';
    document.body.classList.remove('burger-menu-open');
    document.body.style.top = '';
    window.scrollTo(0, parseInt(scrollY));
  }
  
  // Предотвращаем скролл фона, разрешаем в меню
  function preventScroll(e) {
    const sidebar = document.getElementById('de-sidebar');
    const mainmenu = document.getElementById('mainmenu');
    
    if ((sidebar && sidebar.contains(e.target)) || 
        (mainmenu && mainmenu.contains(e.target))) {
      return; // Разрешаем скролл в меню
    }
    
    e.preventDefault(); // Блокируем скролл фона
  }
  
  // Отслеживаем клик по кнопке меню
  menuBtn.addEventListener('click', function() {
    setTimeout(function() {
      isMenuOpen = header.classList.contains('menu-open');
      
      if (isMenuOpen) {
        lockBodyScroll();
      } else {
        unlockBodyScroll();
      }
    }, 100);
  });
  
  // Отслеживаем изменения класса на header
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'class') {
        const menuOpen = header.classList.contains('menu-open');
        
        if (menuOpen !== isMenuOpen) {
          isMenuOpen = menuOpen;
          
          if (isMenuOpen) {
            lockBodyScroll();
          } else {
            unlockBodyScroll();
          }
        }
      }
    });
  });
  
  observer.observe(header, { attributes: true });
  
  // Закрытие меню при клике вне его
  document.addEventListener('click', function(e) {
    if (isMenuOpen && 
        !menuBtn.contains(e.target) && 
        !document.getElementById('de-sidebar')?.contains(e.target) &&
        !document.getElementById('mainmenu')?.contains(e.target)) {
      
      setTimeout(function() {
        if (!header.classList.contains('menu-open')) {
          unlockBodyScroll();
        }
      }, 100);
    }
  });
  
})();