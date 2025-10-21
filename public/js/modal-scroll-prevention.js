/**
 * ========== ДОПОЛНИТЕЛЬНЫЕ ХЕЛПЕРЫ ДЛЯ МОДАЛОВ ==========
 * Добавляет классы к body/html для CSS блокировки
 */

(function() {
    'use strict';
    
    // ========== УТИЛИТЫ ==========
    
    function addModalClass() {
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');
    }
    
    function removeModalClass() {
        // Проверяем, есть ли ещё открытые модалы
        const contactPopup = document.getElementById('contactPopup');
        const priceCalcModal = document.getElementById('price-calculator-modal');
        const burgerOpen = document.body.classList.contains('de-menu-open');
        
        const hasOpenModals = 
            (contactPopup && contactPopup.style.display === 'flex') ||
            (priceCalcModal && priceCalcModal.style.display === 'flex') ||
            burgerOpen;
        
        if (!hasOpenModals) {
            document.body.classList.remove('modal-open');
            document.documentElement.classList.remove('modal-open');
        }
    }
    
    function addMenuClass() {
        document.documentElement.classList.add('menu-open');
    }
    
    function removeMenuClass() {
        document.documentElement.classList.remove('menu-open');
    }
    
    // ========== БЛОКИРОВКА TOUCHMOVE НА OVERLAY ==========
    
    function preventTouchMove(e) {
        const target = e.target;
        
        // Разрешаем скролл только внутри определённых контейнеров
        const scrollableContainers = [
            '.contact-popup-body',
            '.modal-body',
            '#de-sidebar',
            '.contact-popup',
            '.price-calculator-content'
        ];
        
        let isInsideScrollable = false;
        
        for (let selector of scrollableContainers) {
            const container = document.querySelector(selector);
            if (container && container.contains(target)) {
                // Проверяем, действительно ли контейнер имеет скролл
                if (container.scrollHeight > container.clientHeight) {
                    isInsideScrollable = true;
                    break;
                }
            }
        }
        
        // Если не внутри скроллящегося контейнера - блокируем
        if (!isInsideScrollable) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    
    document.addEventListener('DOMContentLoaded', function() {
        
        // Добавляем обработчик touchmove на document
        document.addEventListener('touchmove', function(e) {
            const contactPopup = document.getElementById('contactPopup');
            const priceCalcModal = document.getElementById('price-calculator-modal');
            const burgerOpen = document.body.classList.contains('de-menu-open');
            
            const isModalOpen = 
                (contactPopup && contactPopup.style.display === 'flex') ||
                (priceCalcModal && priceCalcModal.style.display === 'flex') ||
                burgerOpen;
            
            if (isModalOpen) {
                preventTouchMove(e);
            }
        }, { passive: false });
        
        // ========== CONTACT POPUP РАСШИРЕННАЯ ЛОГИКА ==========
        
        const originalOpenContact = window.openContactPopup;
        window.openContactPopup = function() {
            if (originalOpenContact) {
                originalOpenContact.call(this);
            }
            
            const popup = document.getElementById('contactPopup');
            if (popup) {
                popup.classList.add('open');
                addModalClass();
                
                // Фокус на первый элемент
                setTimeout(() => {
                    const firstButton = popup.querySelector('.contact-option');
                    if (firstButton) {
                        firstButton.focus();
                    }
                }, 100);
            }
        };
        
        const originalCloseContact = window.closeContactPopup;
        window.closeContactPopup = function() {
            if (originalCloseContact) {
                originalCloseContact.call(this);
            }
            
            const popup = document.getElementById('contactPopup');
            if (popup) {
                popup.classList.remove('open');
                setTimeout(removeModalClass, 50);
            }
        };
        
        // ========== PRICE CALCULATOR РАСШИРЕННАЯ ЛОГИКА ==========
        
        const originalOpenCalc = window.openPriceCalculator;
        window.openPriceCalculator = function() {
            if (originalOpenCalc) {
                originalOpenCalc.call(this);
            }
            
            const modal = document.getElementById('price-calculator-modal');
            if (modal) {
                modal.classList.add('open');
                addModalClass();
                
                // Фокус на первый input
                setTimeout(() => {
                    const firstInput = modal.querySelector('input, select');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 100);
            }
        };
        
        const originalCloseCalc = window.closePriceCalculator;
        window.closePriceCalculator = function() {
            if (originalCloseCalc) {
                originalCloseCalc.call(this);
            }
            
            const modal = document.getElementById('price-calculator-modal');
            if (modal) {
                modal.classList.remove('open');
                setTimeout(removeModalClass, 50);
            }
        };
        
        // ========== BURGER MENU ЛОГИКА ==========
        
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            // Оригинальный обработчик
            const originalClick = menuBtn.onclick;
            
            menuBtn.addEventListener('click', function(e) {
                // Даём время на выполнение оригинального обработчика
                setTimeout(() => {
                    if (document.body.classList.contains('de-menu-open')) {
                        addMenuClass();
                        addModalClass();
                    } else {
                        removeMenuClass();
                        removeModalClass();
                    }
                }, 50);
            });
        }
        
        // Кнопка закрытия меню
        const closeMenuBtn = document.querySelector('.de-click-menu-close');
        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', function() {
                setTimeout(() => {
                    removeMenuClass();
                    removeModalClass();
                }, 300);
            });
        }
        
        // ========== ПРЕДОТВРАЩЕНИЕ СКРОЛЛА ЧЕРЕЗ OVERLAY ==========
        
        // Для Contact Popup
        const contactPopup = document.getElementById('contactPopup');
        if (contactPopup) {
            contactPopup.addEventListener('touchmove', function(e) {
                const content = this.querySelector('.contact-popup');
                if (content && !content.contains(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, { passive: false });
        }
        
        // Для Price Calculator
        const priceCalcModal = document.getElementById('price-calculator-modal');
        if (priceCalcModal) {
            priceCalcModal.addEventListener('touchmove', function(e) {
                const content = this.querySelector('.price-calculator-content');
                if (content && !content.contains(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, { passive: false });
        }
        
        // ========== ЗАКРЫТИЕ ПО ESC С ПРАВИЛЬНЫМ ПОРЯДКОМ ==========
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                // Закрываем в правильном порядке (последний открытый)
                const contactPopup = document.getElementById('contactPopup');
                const priceCalcModal = document.getElementById('price-calculator-modal');
                
                if (priceCalcModal && priceCalcModal.style.display === 'flex') {
                    window.closePriceCalculator();
                } else if (contactPopup && contactPopup.style.display === 'flex') {
                    window.closeContactPopup();
                } else if (document.body.classList.contains('de-menu-open')) {
                    document.body.classList.remove('de-menu-open');
                    removeMenuClass();
                    removeModalClass();
                }
            }
        });
        
        // ========== ОЧИСТКА ПРИ УХОДЕ ==========
        
        window.addEventListener('beforeunload', function() {
            document.body.classList.remove('modal-open', 'de-menu-open');
            document.documentElement.classList.remove('modal-open', 'menu-open');
        });
        
        // ========== ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА ОТ СКРОЛЛА ==========
        
        // Предотвращаем скролл колёсиком мыши на overlay
        document.addEventListener('wheel', function(e) {
            const contactPopup = document.getElementById('contactPopup');
            const priceCalcModal = document.getElementById('price-calculator-modal');
            
            const isContactOpen = contactPopup && contactPopup.style.display === 'flex';
            const isPriceCalcOpen = priceCalcModal && priceCalcModal.style.display === 'flex';
            
            if (isContactOpen || isPriceCalcOpen) {
                const target = e.target;
                let isInsideScrollable = false;
                
                // Проверяем, внутри ли скроллящегося контента
                const scrollables = [
                    contactPopup?.querySelector('.contact-popup-body'),
                    priceCalcModal?.querySelector('.modal-body')
                ];
                
                for (let container of scrollables) {
                    if (container && container.contains(target) && 
                        container.scrollHeight > container.clientHeight) {
                        isInsideScrollable = true;
                        break;
                    }
                }
                
                if (!isInsideScrollable) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }, { passive: false });
    });
    
})();