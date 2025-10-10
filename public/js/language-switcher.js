// js/language-switcher.js
(function() {
    'use strict';
    
    function getCurrentLanguage() {
        return localStorage.getItem('lang') || 'ro';
    }
    
    function updateLanguageDisplay(lang) {
        const langFlag = document.getElementById('langFlag');
        const langCode = document.getElementById('langCode');
        
        const flags = {
            ro: 'images/flags/romania.png',
            en: 'images/flags/united-kingdom.png',
            ru: 'images/flags/russia.png'
        };
        
        const codes = { ro: 'RO', en: 'EN', ru: 'RU' };
        
        if (langFlag && flags[lang]) {
            langFlag.innerHTML = `<img src="${flags[lang]}" alt="${codes[lang]}">`;
        }
        if (langCode && codes[lang]) {
            langCode.textContent = codes[lang];
        }
        
        // Обновить selected класс
        document.querySelectorAll('.lang-option').forEach(option => {
            option.classList.toggle('selected', option.getAttribute('data-lang') === lang);
        });
    }
    
    function initLanguageSwitcher() {
        const langBtn = document.getElementById('langPickerBtn');
        const langDropdown = document.getElementById('langDropdown');
        
        if (!langBtn || !langDropdown) {
            console.error('Language switcher elements not found!');
            return;
        }
        
        // Установить текущий язык
        const currentLang = getCurrentLanguage();
        updateLanguageDisplay(currentLang);
        
        // Toggle dropdown при клике на кнопку
        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = langDropdown.classList.contains('open');
            langDropdown.classList.toggle('open', !isOpen);
            langBtn.setAttribute('aria-expanded', !isOpen);
        });
        
        // Выбор языка
        document.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const lang = option.getAttribute('data-lang');
                if (lang) {
                    localStorage.setItem('lang', lang);
                    updateLanguageDisplay(lang);
                    langDropdown.classList.remove('open');
                    langBtn.setAttribute('aria-expanded', 'false');
                    
                    // Обновить контент страницы
                    updatePageTranslations();
                    initializeDatePickers();
                    
                    // Только для cars.html
                    if (typeof fetchAndRenderCars === 'function') {
                        fetchAndRenderCars();
                    }
                }
            });
        });
        
        // Закрыть при клике вне элемента
        document.addEventListener('click', (e) => {
            if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                langDropdown.classList.remove('open');
                langBtn.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Закрыть по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && langDropdown.classList.contains('open')) {
                langDropdown.classList.remove('open');
                langBtn.setAttribute('aria-expanded', 'false');
                langBtn.focus();
            }
        });
    }

    
    // Экспортировать в глобальную область
    window.LanguageSwitcher = {
        init: initLanguageSwitcher,
        getCurrentLanguage: getCurrentLanguage,
        updateDisplay: updateLanguageDisplay
    };
    
    // Автоматическая инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguageSwitcher);
    } else {
        initLanguageSwitcher();
    }
})();
