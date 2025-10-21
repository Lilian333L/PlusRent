/**
 * ========== ФИКС СКРОЛЛА ДЛЯ БУРГЕР МЕНЮ ==========
 * Специальное решение для блокировки фона при открытом меню
 */

(function() {
    'use strict';
    
    let scrollPosition = 0;
    let isMenuOpen = false;
    let initialTouchY = 0;
    
    /**
     * Блокирует скролл страницы при открытии меню
     */
    function lockPageScroll() {
        if (isMenuOpen) return;
        
        scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.width = '100%';
        document.body.style.height = '100vh';
        
        const wrapper = document.getElementById('wrapper');
        if (wrapper) {
            wrapper.style.position = 'fixed';
            wrapper.style.width = '100%';
            wrapper.style.overflow = 'hidden';
            wrapper.style.height = '100vh';
            wrapper.style.top = `-${scrollPosition}px`;
        }
        
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
        if (!isMenuOpen) return;
        
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('top');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('height');
        
        const wrapper = document.getElementById('wrapper');
        if (wrapper) {
            wrapper.style.removeProperty('position');
            wrapper.style.removeProperty('width');
            wrapper.style.removeProperty('overflow');
            wrapper.style.removeProperty('height');
            wrapper.style.removeProperty('top');
        }
        
        document.documentElement.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('position');
        document.documentElement.style.removeProperty('width');
        document.documentElement.style.removeProperty('height');
        
        window.scrollTo(0, scrollPosition);
        
        isMenuOpen = false;
    }
    
    /**
     * ГЛАВНЫЙ БЛОКИРОВЩИК - перехватывает ВСЁ
     */
    function blockAllScrollEvents(e) {
        if (!document.body.classList.contains('de-menu-open')) return;
        
        const sidebar = document.getElementById('de-sidebar');
        const target = e.target;
        
        // Если event НЕ внутри sidebar - блокируем ВСЕГДА
        if (!sidebar || !sidebar.contains(target)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
        
        // Если внутри sidebar - проверяем границы скролла для touchmove
        if (e.type === 'touchmove' && sidebar.contains(target)) {
            const scrollTop = sidebar.scrollTop;
            const scrollHeight = sidebar.scrollHeight;
            const clientHeight = sidebar.clientHeight;
            const touchY = e.touches[0].clientY;
            const deltaY = touchY - initialTouchY;
            
            // Если скроллим вверх и уже в начале
            if (deltaY > 0 && scrollTop === 0) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Если скроллим вниз и уже в конце
            if (deltaY < 0 && scrollTop + clientHeight >= scrollHeight) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    }
    
    /**
     * Сохраняем начальную позицию touch
     */
    function saveTouchStart(e) {
        if (document.body.classList.contains('de-menu-open') && e.touches && e.touches[0]) {
            initialTouchY = e.touches[0].clientY;
        }
    }
    
    /**
     * Инициализация
     */
    function init() {
        // ========== НАБЛЮДАТЕЛЬ ЗА КЛАССОМ ==========
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
        
        // ========== КНОПКА МЕНЮ ==========
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', function() {
                setTimeout(function() {
                    if (document.body.classList.contains('de-menu-open')) {
                        lockPageScroll();
                    } else {
                        unlockPageScroll();
                    }
                }, 50);
            });
        }
        
        // ========== КНОПКА ЗАКРЫТИЯ ==========
        const closeMenuBtn = document.querySelector('.de-click-menu-close');
        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', function() {
                setTimeout(unlockPageScroll, 100);
            });
        }
        
        // ========== АГРЕССИВНЫЕ БЛОКИРОВКИ СОБЫТИЙ ==========
        
        // touchstart - сохраняем начальную позицию
        document.addEventListener('touchstart', saveTouchStart, { passive: true, capture: true });
        
        // touchmove - МАКСИМАЛЬНЫЙ ПРИОРИТЕТ
        document.addEventListener('touchmove', blockAllScrollEvents, { passive: false, capture: true });
        
        // wheel - для десктопа
        document.addEventListener('wheel', blockAllScrollEvents, { passive: false, capture: true });
        
        // scroll - на всякий случай
        window.addEventListener('scroll', function(e) {
            if (document.body.classList.contains('de-menu-open')) {
                e.preventDefault();
                e.stopPropagation();
                window.scrollTo(0, scrollPosition);
                return false;
            }
        }, { passive: false, capture: true });
        
        // ========== БЛОКИРОВКА НА WRAPPER ==========
        const wrapper = document.getElementById('wrapper');
        if (wrapper) {
            ['touchmove', 'wheel', 'scroll'].forEach(function(eventType) {
                wrapper.addEventListener(eventType, function(e) {
                    if (document.body.classList.contains('de-menu-open')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                    }
                }, { passive: false, capture: true });
            });
        }
        
        // ========== БЛОКИРОВКА НА CONTENT ==========
        const content = document.getElementById('content');
        if (content) {
            ['touchmove', 'wheel', 'scroll'].forEach(function(eventType) {
                content.addEventListener(eventType, function(e) {
                    if (document.body.classList.contains('de-menu-open')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                    }
                }, { passive: false, capture: true });
            });
        }
        
        // ========== ESC ЗАКРЫТИЕ ==========
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.body.classList.contains('de-menu-open')) {
                document.body.classList.remove('de-menu-open');
                unlockPageScroll();
            }
        });
        
        // ========== ОЧИСТКА ==========
        window.addEventListener('beforeunload', unlockPageScroll);
        
        // ========== ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА - ПЕРЕХВАТ НА document ==========
        document.addEventListener('touchmove', function(e) {
            if (document.body.classList.contains('de-menu-open')) {
                const sidebar = document.getElementById('de-sidebar');
                if (!sidebar || !sidebar.contains(e.target)) {
                    e.preventDefault();
                    return false;
                }
            }
        }, { passive: false });
        
        document.addEventListener('wheel', function(e) {
            if (document.body.classList.contains('de-menu-open')) {
                const sidebar = document.getElementById('de-sidebar');
                if (!sidebar || !sidebar.contains(e.target)) {
                    e.preventDefault();
                    return false;
                }
            }
        }, { passive: false });
    }
    
    // Инициализируем сразу если DOM готов
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Экспортируем
    window.lockBurgerMenuScroll = lockPageScroll;
    window.unlockBurgerMenuScroll = unlockPageScroll;
    
})();
