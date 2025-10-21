/**
 * ========== УНИВЕРСАЛЬНЫЙ МЕНЕДЖЕР БЛОКИРОВКИ СКРОЛЛА ==========
 * Блокирует скролл основной страницы при открытии модалов/меню
 * Поддержка iOS и всех современных браузеров
 */

(function() {
    'use strict';
    
    // Сохраняем текущую позицию скролла
    let scrollPosition = 0;
    
    /**
     * Блокирует скролл страницы
     */
    function lockScroll() {
        // Сохраняем текущую позицию
        scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        // Применяем стили к body
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.width = '100%';
        document.body.style.height = '100vh';
        
        // Дополнительно для iOS
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.position = 'fixed';
        document.documentElement.style.width = '100%';
        document.documentElement.style.height = '100vh';
    }
    
    /**
     * Разблокирует скролл страницы
     */
    function unlockScroll() {
        // Убираем стили с body
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('top');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('height');
        
        // Убираем стили с documentElement
        document.documentElement.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('position');
        document.documentElement.style.removeProperty('width');
        document.documentElement.style.removeProperty('height');
        
        // Восстанавливаем позицию скролла
        window.scrollTo(0, scrollPosition);
    }
    
    /**
     * Проверяет, открыт ли какой-либо модал
     */
    function isAnyModalOpen() {
        const contactPopup = document.getElementById('contactPopup');
        const priceCalcModal = document.getElementById('price-calculator-modal');
        const burgerMenu = document.body.classList.contains('de-menu-open');
        
        const isContactOpen = contactPopup && contactPopup.style.display === 'flex';
        const isPriceCalcOpen = priceCalcModal && priceCalcModal.style.display === 'flex';
        
        return isContactOpen || isPriceCalcOpen || burgerMenu;
    }
    
    // ========== CONTACT POPUP ==========
    const originalOpenContactPopup = window.openContactPopup;
    window.openContactPopup = function() {
        if (originalOpenContactPopup) {
            originalOpenContactPopup.call(this);
        } else {
            const popup = document.getElementById('contactPopup');
            if (popup) {
                popup.style.display = 'flex';
            }
        }
        lockScroll();
    };
    
    const originalCloseContactPopup = window.closeContactPopup;
    window.closeContactPopup = function() {
        const popup = document.getElementById('contactPopup');
        if (popup) {
            popup.style.display = 'none';
        }
        if (originalCloseContactPopup) {
            originalCloseContactPopup.call(this);
        }
        
        // Разблокируем только если нет других открытых модалов
        setTimeout(() => {
            if (!isAnyModalOpen()) {
                unlockScroll();
            }
        }, 50);
    };
    
    // ========== PRICE CALCULATOR MODAL ==========
    const originalOpenPriceCalculator = window.openPriceCalculator;
    window.openPriceCalculator = function() {
        if (originalOpenPriceCalculator) {
            originalOpenPriceCalculator.call(this);
        } else {
            const modal = document.getElementById('price-calculator-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        }
        lockScroll();
    };
    
    const originalClosePriceCalculator = window.closePriceCalculator;
    window.closePriceCalculator = function() {
        const modal = document.getElementById('price-calculator-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        if (originalClosePriceCalculator) {
            originalClosePriceCalculator.call(this);
        }
        
        // Разблокируем только если нет других открытых модалов
        setTimeout(() => {
            if (!isAnyModalOpen()) {
                unlockScroll();
            }
        }, 50);
    };
    
    // ========== BURGER MENU ==========
    document.addEventListener('DOMContentLoaded', function() {
        const menuBtn = document.getElementById('menu-btn');
        
        if (menuBtn) {
            // Наблюдаем за изменениями класса de-menu-open
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.attributeName === 'class') {
                        if (document.body.classList.contains('de-menu-open')) {
                            lockScroll();
                        } else {
                            setTimeout(() => {
                                if (!isAnyModalOpen()) {
                                    unlockScroll();
                                }
                            }, 50);
                        }
                    }
                });
            });
            
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            // Также отслеживаем клик по кнопке закрытия меню
            const closeBtn = document.querySelector('.de-click-menu-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    setTimeout(() => {
                        if (!isAnyModalOpen()) {
                            unlockScroll();
                        }
                    }, 300);
                });
            }
        }
        
        // ========== БЛОКИРОВКА СКРОЛЛА OVERLAY ==========
        // Предотвращаем скролл при клике/тач вне модала
        
        function preventBackgroundScroll(e) {
            const target = e.target;
            
            // Contact Popup
            const contactPopup = document.getElementById('contactPopup');
            if (contactPopup && contactPopup.style.display === 'flex') {
                const contactContent = contactPopup.querySelector('.contact-popup');
                if (contactContent && !contactContent.contains(target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
            
            // Price Calculator
            const priceCalcModal = document.getElementById('price-calculator-modal');
            if (priceCalcModal && priceCalcModal.style.display === 'flex') {
                const calcContent = priceCalcModal.querySelector('.price-calculator-content');
                if (calcContent && !calcContent.contains(target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        }
        
        // Блокируем touchmove на overlay
        document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
        
        // Блокируем wheel на overlay
        document.addEventListener('wheel', function(e) {
            if (isAnyModalOpen()) {
                const target = e.target;
                
                // Проверяем, находится ли target внутри модального контента
                const contactPopup = document.getElementById('contactPopup');
                const priceCalcModal = document.getElementById('price-calculator-modal');
                const burgerMenu = document.getElementById('de-sidebar');
                
                let isInsideModal = false;
                
                if (contactPopup && contactPopup.style.display === 'flex') {
                    const content = contactPopup.querySelector('.contact-popup');
                    if (content && content.contains(target)) {
                        isInsideModal = true;
                    }
                }
                
                if (priceCalcModal && priceCalcModal.style.display === 'flex') {
                    const content = priceCalcModal.querySelector('.modal-body');
                    if (content && content.contains(target)) {
                        isInsideModal = true;
                    }
                }
                
                if (document.body.classList.contains('de-menu-open')) {
                    if (burgerMenu && burgerMenu.contains(target)) {
                        isInsideModal = true;
                    }
                }
                
                // Если не внутри модала - блокируем
                if (!isInsideModal) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }, { passive: false });
        
        // ========== ЗАКРЫТИЕ ПО КЛИКУ НА OVERLAY ==========
        
        // Contact Popup - закрытие по клику на overlay
        const contactPopup = document.getElementById('contactPopup');
        if (contactPopup) {
            contactPopup.addEventListener('click', function(e) {
                if (e.target === this) {
                    window.closeContactPopup();
                }
            });
        }
        
        // Price Calculator - закрытие по клику на overlay
        const priceCalcModal = document.getElementById('price-calculator-modal');
        if (priceCalcModal) {
            priceCalcModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    window.closePriceCalculator();
                }
            });
        }
        
        // Закрытие по ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (contactPopup && contactPopup.style.display === 'flex') {
                    window.closeContactPopup();
                }
                if (priceCalcModal && priceCalcModal.style.display === 'flex') {
                    window.closePriceCalculator();
                }
                if (document.body.classList.contains('de-menu-open')) {
                    document.body.classList.remove('de-menu-open');
                }
            }
        });
    });
    
    // ========== ОЧИСТКА ПРИ УХОДЕ СО СТРАНИЦЫ ==========
    window.addEventListener('beforeunload', function() {
        unlockScroll();
    });
    
    // Экспортируем функции глобально на случай использования
    window.lockPageScroll = lockScroll;
    window.unlockPageScroll = unlockScroll;
    
})();