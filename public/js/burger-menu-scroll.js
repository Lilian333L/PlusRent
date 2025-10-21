/**
 * ========== ФИКС СКРОЛЛА ДЛЯ БУРГЕР МЕНЮ ==========
 * Специальное решение для блокировки фона при открытом меню
 */

(function() {
    'use strict';
    
    let scrollPosition = 0;
    let isMenuOpen = false;
    
    /**
     * Блокирует скролл страницы при открытии меню
     */
    function lockPageScroll() {
        if (isMenuOpen) return; // Уже заблокирован
        
        // Сохраняем позицию
        scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        // Блокируем body
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.width = '100%';
        document.body.style.height = '100vh';
        
        // Блокируем wrapper
        const wrapper = document.getElementById('wrapper');
        if (wrapper) {
            wrapper.style.position = 'fixed';
            wrapper.style.width = '100%';
            wrapper.style.overflow = 'hidden';
            wrapper.style.height = '100vh';
            wrapper.style.top = `-${scrollPosition}px`;
        }
        
        // Блокируем html
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.position = 'fixed';
        document.documentElement.style.width = '100%';
        document.documentElement.style.height = '100vh';
        
        isMenuOpen = true;
    }
    
    /**
     * Разблокирует скролл страницы при закрытии меню
     */
    function unlockPageScroll() {
        if (!isMenuOpen) return; // Уже разблокирован
        
        // Разблокируем body
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('top');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('height');
        
        // Разблокируем wrapper
        const wrapper = document.getElementById('wrapper');
        if (wrapper) {
            wrapper.style.removeProperty('position');
            wrapper.style.removeProperty('width');
            wrapper.style.removeProperty('overflow');
            wrapper.style.removeProperty('height');
            wrapper.style.removeProperty('top');
        }
        
        // Разблокируем html
        document.documentElement.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('position');
        document.documentElement.style.removeProperty('width');
        document.documentElement.style.removeProperty('height');
        
        // Восстанавливаем позицию
        window.scrollTo(0, scrollPosition);
        
        isMenuOpen = false;
    }
    
    /**
     * Инициализация после загрузки DOM
     */
    document.addEventListener('DOMContentLoaded', function() {
        
        // ========== ОТСЛЕЖИВАНИЕ КЛАССА de-menu-open ==========
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (document.body.classList.contains('de-menu-open')) {
                        lockPageScroll();
                    } else {
                        unlockPageScroll();
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // ========== ОБРАБОТКА КНОПКИ МЕНЮ ==========
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', function() {
                // Даём время на выполнение оригинального обработчика
                setTimeout(function() {
                    if (document.body.classList.contains('de-menu-open')) {
                        lockPageScroll();
                    } else {
                        unlockPageScroll();
                    }
                }, 50);
            });
        }
        
        // ========== ОБРАБОТКА КНОПКИ ЗАКРЫТИЯ ==========
        const closeMenuBtn = document.querySelector('.de-click-menu-close');
        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', function() {
                setTimeout(function() {
                    unlockPageScroll();
                }, 100);
            });
        }
        
        // ========== БЛОКИРОВКА touchmove ВНЕ МЕНЮ ==========
        document.addEventListener('touchmove', function(e) {
            if (document.body.classList.contains('de-menu-open')) {
                const sidebar = document.getElementById('de-sidebar');
                
                // Если тач НЕ внутри sidebar - блокируем
                if (sidebar && !sidebar.contains(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }
        }, { passive: false, capture: true });
        
        // ========== БЛОКИРОВКА wheel ВНЕ МЕНЮ ==========
        document.addEventListener('wheel', function(e) {
            if (document.body.classList.contains('de-menu-open')) {
                const sidebar = document.getElementById('de-sidebar');
                
                // Если wheel НЕ внутри sidebar - блокируем
                if (sidebar && !sidebar.contains(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }
        }, { passive: false, capture: true });
        
        // ========== БЛОКИРОВКА СКРОЛЛА НА WRAPPER ==========
        const wrapper = document.getElementById('wrapper');
        if (wrapper) {
            wrapper.addEventListener('touchmove', function(e) {
                if (document.body.classList.contains('de-menu-open')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, { passive: false, capture: true });
            
            wrapper.addEventListener('wheel', function(e) {
                if (document.body.classList.contains('de-menu-open')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, { passive: false, capture: true });
        }
        
        // ========== ЗАКРЫТИЕ ПО ESC ==========
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.body.classList.contains('de-menu-open')) {
                document.body.classList.remove('de-menu-open');
                unlockPageScroll();
            }
        });
        
        // ========== ОЧИСТКА ПРИ УХОДЕ ==========
        window.addEventListener('beforeunload', function() {
            unlockPageScroll();
        });
        
    });
    
    // Экспортируем функции глобально
    window.lockBurgerMenuScroll = lockPageScroll;
    window.unlockBurgerMenuScroll = unlockPageScroll;
    
})();