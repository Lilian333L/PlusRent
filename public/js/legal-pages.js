// Scripts for /{ro,ru,en}/terms and /{ro,ru,en}/privacy (extracted from terms.html)

        document.addEventListener('DOMContentLoaded', function() {
            const daysInput = document.getElementById('daysInput');
            if (!daysInput) return;
            const totalKm = document.getElementById('totalKm');
            const resultValue = document.getElementById('resultValue');
            const kmPerDay = 200;
            
            function calculateMileage() {
                const days = parseInt(daysInput.value) || 1;
                const total = days * kmPerDay;
                
                // Format with comma separator
                const formattedTotal = total.toLocaleString('en-US');
                
                totalKm.textContent = formattedTotal;
                resultValue.textContent = formattedTotal + ' KM';
                
                // Add animation effect
                totalKm.style.transform = 'scale(1.1)';
                resultValue.style.transform = 'scale(1.05)';
                
                setTimeout(() => {
                    totalKm.style.transform = 'scale(1)';
                    resultValue.style.transform = 'scale(1)';
                }, 200);
            }
            
            // Calculate on input
            daysInput.addEventListener('input', calculateMileage);
            
            // Validate min/max
            daysInput.addEventListener('change', function() {
                if (this.value < 1) this.value = 1;
                if (this.value > 365) this.value = 365;
                calculateMileage();
            });
            
            // Add smooth transition
            totalKm.style.transition = 'transform 0.2s ease';
            resultValue.style.transition = 'transform 0.2s ease';
        });
    

// ========== ПРИНУДИТЕЛЬНЫЙ БЕЛЫЙ ТЕКСТ В МОБИЛЬНОМ МЕНЮ ==========
(function() {
    // Проверяем, что это мобильное устройство
    if (window.innerWidth <= 991) {
        
        // Функция для принудительной установки белого цвета
        function forceWhiteText() {
            // Все ссылки в меню
            const selectors = [
                'header a',
                'header li',
                '#mainmenu a',
                '#mainmenu li',
                '#mainmenu span',
                '#de-sidebar a',
                '#de-sidebar li',
                '#de-sidebar span',
                '.de-menu-profile a',
                '.de-menu-profile li',
                '.de-menu-profile span',
                'nav a',
                'nav li',
                'nav span'
            ];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // Исключаем логотип, переключатель языка и кнопку звонка
                    if (!el.closest('#logo') && 
                        !el.closest('.lang-picker-wrapper') && 
                        !el.closest('.call-now-btn')) {
                        el.style.setProperty('color', '#ffffff', 'important');
                    }
                });
            });
        }
        
        // Применяем сразу при загрузке
        forceWhiteText();
        
        // Применяем через 100ms (на случай задержки)
        setTimeout(forceWhiteText, 100);
        
        // Применяем через 500ms (для полной уверенности)
        setTimeout(forceWhiteText, 500);
        
        // Следим за открытием меню
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', function() {
                setTimeout(forceWhiteText, 50);
                setTimeout(forceWhiteText, 200);
            });
        }
        
        // Следим за изменениями в DOM
        const observer = new MutationObserver(function(mutations) {
            forceWhiteText();
        });
        
        // Наблюдаем за изменениями в body
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // Применяем при изменении размера окна
        window.addEventListener('resize', forceWhiteText);
    }
})();
