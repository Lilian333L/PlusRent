/**
 * Universal Spinning Wheel Modal Trigger - PROFESSIONAL EDITION
 * Полностью оптимизированный дизайн с glassmorphism эффектом
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        delay: 30 * 1000,
        storageKey: 'spinningWheelLastSeen',
        modalId: 'universal-spinning-wheel-modal',
        iframeSrc: 'spinning-wheel-standalone.html',
        zIndex: 9999
    };

    // State management
    let state = {
        modal: null,
        iframe: null,
        timer: null,
        isInitialized: false,
        userClosedModal: false,
        modalCheckInterval: null,
        originalBodyOverflow: '',
        originalBodyPosition: '',
        scrollPosition: 0
    };

    // Check if any modal is open
    function isAnyModalOpen() {
        const modalSelectors = [
            '.modal.show',
            '.modal.active',
            '.modal[style*="display: block"]',
            '.modal[style*="display:block"]',
            '[role="dialog"][style*="display: block"]',
            '[role="dialog"][style*="display:block"]',
            '.popup.open',
            '.popup.active',
            '.lightbox.open',
            '.lightbox.active',
            '#imageLightbox[style*="display: block"]',
            '#imageLightbox[style*="display:block"]'
        ];

        for (const selector of modalSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                for (const element of elements) {
                    if (element.offsetParent !== null || 
                        window.getComputedStyle(element).display !== 'none') {
                        return true;
                    }
                }
            }
        }

        const bodyClasses = ['modal-open', 'no-scroll', 'overflow-hidden'];
        for (const className of bodyClasses) {
            if (document.body.classList.contains(className)) {
                return true;
            }
        }

        if (document.body.style.overflow === 'hidden') {
            return true;
        }

        return false;
    }

    // ✅ НОВАЯ ФУНКЦИЯ: Блокировка скролла страницы
    function disableBodyScroll() {
        state.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        state.originalBodyOverflow = document.body.style.overflow;
        state.originalBodyPosition = document.body.style.position;
        
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${state.scrollPosition}px`;
        document.body.style.width = '100%';
    }

    // ✅ НОВАЯ ФУНКЦИЯ: Разблокировка скролла страницы
    function enableBodyScroll() {
        document.body.style.overflow = state.originalBodyOverflow;
        document.body.style.position = state.originalBodyPosition;
        document.body.style.top = '';
        document.body.style.width = '';
        
        window.scrollTo(0, state.scrollPosition);
    }

    // Get current language
    function getCurrentLanguage() {
        const storedLang = localStorage.getItem('lang') || localStorage.getItem('language') || localStorage.getItem('i18nextLng');
        if (storedLang) {
            const lang = storedLang.split('-')[0];
            if (['en', 'ru', 'ro'].includes(lang)) {
                return lang;
            }
        }
        
        if (typeof i18next !== 'undefined' && i18next.language) {
            const i18nextLang = i18next.language.split('-')[0];
            if (['en', 'ru', 'ro'].includes(i18nextLang)) {
                return i18nextLang;
            }
        }
        
        const htmlLang = document.documentElement.lang;
        if (htmlLang) {
            const lang = htmlLang.split('-')[0];
            if (['en', 'ru', 'ro'].includes(lang)) {
                return lang;
            }
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && ['en', 'ru', 'ro'].includes(urlLang)) {
            return urlLang;
        }
        
        return 'ro';
    }

    // All translations
    const translations = {
        en: {
            title: 'Try Your Luck!',
            subtitle: 'Spin the wheel and win amazing discounts!',
            enterPhoneTitle: 'Enter Your Number',
            phoneDescription: 'We\'ll send you exclusive offers and your lucky discount code!',
            phonePlaceholder: '+373 XX XXX XXX',
            continueButton: 'Continue',
            privacyText: 'Your data is secure',
            emptyPhone: 'Please enter a phone number',
            invalidPhone: 'Please enter a valid phone number (7-15 digits)',
            hasCoupons: 'You have already received a reward for this phone number.'
        },
        ru: {
            title: 'Испытай свою удачу!',
            subtitle: 'Крути колесо и выигрывай удивительные скидки!',
            enterPhoneTitle: 'Введите Ваш Номер',
            phoneDescription: 'Мы отправим вам эксклюзивные предложения и ваш счастливый код скидки!',
            phonePlaceholder: '+373 XX XXX XXX',
            continueButton: 'Продолжить',
            privacyText: 'Ваши данные защищены',
            emptyPhone: 'Пожалуйста, введите номер телефона',
            invalidPhone: 'Пожалуйста, введите корректный номер (7-15 цифр)',
            hasCoupons: 'Вы уже получили награду за этот номер телефона.'
        },
        ro: {
            title: 'Încearcă-ți norocul!',
            subtitle: 'Rotește roata și câștigă reduceri uimitoare!',
            enterPhoneTitle: 'Introdu Numărul Tău',
            phoneDescription: 'Îți vom trimite oferte exclusive și codul tău de reducere norocos!',
            phonePlaceholder: '+373 XX XXX XXX',
            continueButton: 'Continuă',
            privacyText: 'Datele tale sunt securizate',
            emptyPhone: 'Vă rugăm introduceți numărul de telefon',
            invalidPhone: 'Vă rugăm introduceți un număr valid (7-15 cifre)',
            hasCoupons: 'Ai primit deja o recompensă pentru acest număr de telefon.'
        }
    };

    // Get translation
    function t(key) {
        const lang = getCurrentLanguage();
        return translations[lang][key] || translations['ro'][key] || key;
    }

    // Check if user has seen the modal today
    function hasSeenModalToday() {
        const rewardReceived = localStorage.getItem('spinningWheelRewardReceived');
        if (rewardReceived === 'true') {
            return true;
        }
        
        const lastSeen = localStorage.getItem(CONFIG.storageKey);
        if (!lastSeen) return false;
        
        const lastSeenDate = new Date(lastSeen);
        const today = new Date();
        
        return lastSeenDate.toDateString() === today.toDateString();
    }

    // Track total time spent on website
    function getTotalWebsiteTime() {
        const startTime = localStorage.getItem('websiteStartTime');
        const storedTotalTime = localStorage.getItem('websiteTotalTime');
        
        if (!startTime) return 0;
        
        let baseTime = 0;
        if (storedTotalTime) {
            baseTime = parseInt(storedTotalTime);
        }
        
        const now = Date.now();
        const currentSessionTime = now - parseInt(startTime);
        
        return baseTime + currentSessionTime;
    }

    // Set website start time
    function setWebsiteStartTime() {
        if (!localStorage.getItem('websiteStartTime')) {
            localStorage.setItem('websiteStartTime', Date.now().toString());
        }
    }

    // Mark modal as seen
    function markModalAsSeen() {
        localStorage.setItem(CONFIG.storageKey, new Date().toISOString());
        localStorage.removeItem('websiteStartTime');
        localStorage.removeItem('websiteTotalTime');
    }

    // Create modal HTML
    function createModalHTML() {
        return `
            <div id="${CONFIG.modalId}" class="spinning-wheel-modal" style="display: none;">
                <div class="spinning-wheel-modal-backdrop"></div>
                <div class="spinning-wheel-modal-content">
                    <div class="spinning-wheel-modal-close">&times;</div>
                    
                    <div class="spinning-wheel-modal-header" id="universalModalHeader">
                        <div class="header-gift-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 12v10H4V12"></path>
                                <path d="M22 7H2v5h20V7z"></path>
                                <path d="M12 22V7"></path>
                                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                            </svg>
                        </div>
                        <h2 class="spinning-wheel-modal-title">${t('title')}</h2>
                        <p class="spinning-wheel-modal-subtitle">${t('subtitle')}</p>
                    </div>
                    
                    <div class="spinning-wheel-wheel-content">
                        <div class="spinning-wheel-phone-step" id="universalPhoneStep">
                            <div class="phone-input-container">
                                <div class="phone-icon-circle">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                    </svg>
                                </div>
                                <h3 class="phone-step-title">${t('enterPhoneTitle')}</h3>
                                <p class="phone-description">${t('phoneDescription')}</p>
                                <form class="phone-form" id="universalPhoneForm">
                                    <div class="input-wrapper">
                                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        <input type="tel" class="phone-input" id="universalPhoneInput" 
                                               placeholder="${t('phonePlaceholder')}" required>
                                    </div>
                                    <button type="submit" class="phone-submit-btn">
                                        <span class="phone-btn-text">${t('continueButton')}</span>
                                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="12 5 19 12 12 19"></polyline>
                                        </svg>
                                    </button>
                                    <div class="privacy-badge">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        <span class="privacy-text">${t('privacyText')}</span>
                                    </div>
                                </form>
                            </div>
                        </div>
                        
                        <div class="spinning-wheel-wheel-step" id="universalWheelStep" style="display: none;">
                            <iframe id="universalSpinningWheelIframe" 
                                    src="${CONFIG.iframeSrc}" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    style="width: 100%; height: 100%; border: none; border-radius: 12px;">
                            </iframe>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create modal CSS - PROFESSIONAL GLASSMORPHISM DESIGN
    function createModalCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* ===== ПРОФЕССИОНАЛЬНЫЙ GLASSMORPHISM ДИЗАЙН ===== */
            
            .spinning-wheel-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: ${CONFIG.zIndex};
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.4s ease;
                padding: 0;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
            }

            .spinning-wheel-modal.show {
                opacity: 1;
            }

            /* ✅ ПРОФЕССИОНАЛЬНЫЙ GRADIENT BACKDROP */
            .spinning-wheel-modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, 
                    rgba(245, 158, 11, 0.95) 0%, 
                    rgba(217, 119, 6, 0.95) 100%);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                z-index: -1;
            }

            /* ✅ КОНТЕЙНЕР БЕЗ БЕЛОГО ФОНА */
            .spinning-wheel-modal-content {
                background: transparent;
                border-radius: 0;
                width: 100%;
                height: 100%;
                max-width: 100%;
                max-height: 100%;
                position: relative;
                overflow: hidden;
                transform: scale(0.95);
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                display: flex;
                flex-direction: column;
                box-shadow: none;
            }

            .spinning-wheel-modal.show .spinning-wheel-modal-content {
                transform: scale(1);
            }

            /* ✅ КНОПКА ЗАКРЫТИЯ */
            .spinning-wheel-modal-close {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                cursor: pointer;
                color: white;
                z-index: 10001;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.15);
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
                font-weight: 300;
                line-height: 1;
            }

            .spinning-wheel-modal-close:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: rotate(90deg) scale(1.1);
                border-color: rgba(255, 255, 255, 0.5);
            }

            /* ✅ ЗАГОЛОВОК С ПРОЗРАЧНЫМ ФОНОМ */
            .spinning-wheel-modal-header {
                background: transparent;
                color: white;
                padding: 40px 24px 30px;
                text-align: center;
                position: relative;
                z-index: 1;
            }

            .header-gift-icon {
                width: 72px;
                height: 72px;
                margin: 0 auto 20px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: bounce 2s ease-in-out infinite;
                border: 3px solid rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            .header-gift-icon svg {
                width: 36px;
                height: 36px;
                filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            .spinning-wheel-modal-title {
                font-size: 2.2rem;
                font-weight: 800;
                margin: 0 0 12px 0;
                text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                color: white;
                letter-spacing: -0.5px;
            }

            .spinning-wheel-modal-subtitle {
                font-size: 1.1rem;
                margin: 0;
                opacity: 0.95;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                color: white;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            /* ✅ КОНТЕНТ С ПРОЗРАЧНЫМ ФОНОМ */
            .spinning-wheel-wheel-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: transparent;
                padding: 20px;
                overflow-y: auto;
                overflow-x: hidden;
            }

            .spinning-wheel-phone-step {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            /* ✅ GLASSMORPHISM КОНТЕЙНЕР ДЛЯ ВВОДА ТЕЛЕФОНА */
            .phone-input-container {
                width: 100%;
                max-width: 480px;
                text-align: center;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(30px) saturate(180%);
                -webkit-backdrop-filter: blur(30px) saturate(180%);
                border-radius: 24px;
                padding: 40px 32px;
                box-shadow: 
                    0 8px 32px 0 rgba(0, 0, 0, 0.37),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.18);
                border: 1px solid rgba(255, 255, 255, 0.25);
                position: relative;
                overflow: hidden;
            }

            /* ✅ ДЕКОРАТИВНЫЙ БЛИК НА GLASSMORPHISM */
            .phone-input-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: -50%;
                width: 200%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.1),
                    transparent
                );
                animation: shine-glass 6s infinite;
                pointer-events: none;
            }

            @keyframes shine-glass {
                0% {
                    transform: translateX(-100%);
                }
                50%, 100% {
                    transform: translateX(100%);
                }
            }

            .phone-icon-circle {
                width: 80px;
                height: 80px;
                margin: 0 auto 24px;
                background: rgba(255, 255, 255, 0.25);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 
                    0 8px 24px rgba(0, 0, 0, 0.2),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.3);
                border: 2px solid rgba(255, 255, 255, 0.3);
            }

            .phone-icon-circle svg {
                width: 40px;
                height: 40px;
                color: white;
                filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
            }

            .phone-step-title {
                color: white;
                font-size: 1.65rem;
                margin: 0 0 12px 0;
                font-weight: 800;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
                position: relative;
            }

            .phone-description {
                color: rgba(255, 255, 255, 0.9);
                font-size: 1rem;
                margin: 0 0 32px 0;
                line-height: 1.6;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                position: relative;
            }

            .phone-form {
                width: 100%;
                position: relative;
            }

            .input-wrapper {
                position: relative;
                margin-bottom: 20px;
            }

            .input-icon {
                position: absolute;
                left: 18px;
                top: 50%;
                transform: translateY(-50%);
                width: 22px;
                height: 22px;
                color: rgba(255, 255, 255, 0.7);
                pointer-events: none;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
            }

            /* ✅ GLASSMORPHISM INPUT */
            .phone-input {
                width: 100%;
                padding: 18px 18px 18px 52px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                background: rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-radius: 14px;
                font-size: 1.05rem;
                transition: all 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                box-sizing: border-box;
                color: white;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .phone-input:focus {
                outline: none;
                border-color: rgba(255, 255, 255, 0.6);
                background: rgba(255, 255, 255, 0.25);
                box-shadow: 
                    0 0 0 4px rgba(255, 255, 255, 0.15),
                    0 8px 24px rgba(0, 0, 0, 0.2);
            }

            .phone-input::placeholder {
                color: rgba(255, 255, 255, 0.6);
                text-shadow: none;
            }

            .phone-input-error {
                border-color: rgba(239, 68, 68, 0.8) !important;
                background: rgba(239, 68, 68, 0.15) !important;
                box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2) !important;
            }

            .phone-error-message {
                color: #fecaca;
                font-size: 0.9rem;
                margin-top: 10px;
                text-align: left;
                padding-left: 4px;
                font-weight: 600;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                background: rgba(239, 68, 68, 0.2);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                padding: 10px 14px;
                border-radius: 10px;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }

            /* ✅ GLASSMORPHISM BUTTON */
            .phone-submit-btn {
                width: 100%;
                padding: 18px;
                background: rgba(255, 255, 255, 0.25);
                backdrop-filter: blur(10px) saturate(180%);
                -webkit-backdrop-filter: blur(10px) saturate(180%);
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 14px;
                font-size: 1.1rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                box-shadow: 
                    0 8px 24px rgba(0, 0, 0, 0.2),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            }

            .phone-submit-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
                transition: left 0.5s ease;
            }

            .phone-submit-btn:hover {
                transform: translateY(-3px);
                background: rgba(255, 255, 255, 0.35);
                border-color: rgba(255, 255, 255, 0.6);
                box-shadow: 
                    0 12px 32px rgba(0, 0, 0, 0.3),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.3);
            }

            .phone-submit-btn:hover::before {
                left: 100%;
            }

            .phone-submit-btn:active {
                transform: translateY(-1px);
            }

            .btn-icon {
                width: 22px;
                height: 22px;
                transition: transform 0.3s ease;
                filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
            }

            .phone-submit-btn:hover .btn-icon {
                transform: translateX(5px);
            }

            /* ✅ GLASSMORPHISM PRIVACY BADGE */
            .privacy-badge {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 20px;
                color: rgba(255, 255, 255, 0.9);
                font-size: 0.9rem;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                padding: 10px 16px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            }

            .privacy-badge svg {
                width: 18px;
                height: 18px;
                color: #86efac;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
            }

            /* ✅ КОЛЕСО В ПОЛНЫЙ ЭКРАН */
            .spinning-wheel-wheel-step {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 0;
                min-height: 100%;
            }

            #universalSpinningWheelIframe {
                flex: 1;
                border-radius: 0;
                width: 100%;
                height: 100%;
            }

            /* ===== АДАПТИВНЫЕ СТИЛИ ===== */
            
            /* Desktop */
            @media (min-width: 1024px) {
                .spinning-wheel-modal-content {
                    padding: 40px;
                }

                .spinning-wheel-wheel-content {
                    padding: 40px;
                }

                .phone-input-container {
                    max-width: 520px;
                    padding: 48px 40px;
                }
            }

            /* Tablet */
            @media (max-width: 1023px) and (min-width: 768px) {
                .spinning-wheel-modal-close {
                    top: 16px;
                    right: 16px;
                    width: 40px;
                    height: 40px;
                    font-size: 26px;
                }

                .spinning-wheel-modal-header {
                    padding: 32px 20px 24px;
                }

                .header-gift-icon {
                    width: 64px;
                    height: 64px;
                }

                .spinning-wheel-modal-title {
                    font-size: 1.9rem;
                }

                .phone-input-container {
                    max-width: 460px;
                    padding: 36px 28px;
                }
            }

            /* Mobile */
            @media (max-width: 767px) {
                .spinning-wheel-modal-close {
                    top: 12px;
                    right: 12px;
                    width: 38px;
                    height: 38px;
                    font-size: 24px;
                }

                .spinning-wheel-modal-header {
                    padding: 28px 16px 20px;
                }

                .header-gift-icon {
                    width: 56px;
                    height: 56px;
                    margin-bottom: 16px;
                }

                .header-gift-icon svg {
                    width: 28px;
                    height: 28px;
                }

                .spinning-wheel-modal-title {
                    font-size: 1.6rem;
                    margin-bottom: 10px;
                }

                .spinning-wheel-modal-subtitle {
                    font-size: 0.95rem;
                }

                .spinning-wheel-wheel-content {
                    padding: 12px;
                }

                .phone-input-container {
                    padding: 32px 24px;
                    border-radius: 20px;
                }

                .phone-icon-circle {
                    width: 68px;
                    height: 68px;
                }

                .phone-step-title {
                    font-size: 1.4rem;
                }

                .phone-description {
                    font-size: 0.9rem;
                    margin-bottom: 28px;
                }

                .phone-input,
                .phone-submit-btn {
                    padding: 16px;
                    font-size: 1rem;
                }

                .phone-input {
                    padding-left: 48px;
                }
            }

            /* Extra small mobile */
            @media (max-width: 400px) {
                .spinning-wheel-modal-title {
                    font-size: 1.4rem;
                }

                .spinning-wheel-modal-subtitle {
                    font-size: 0.85rem;
                }

                .phone-input-container {
                    padding: 28px 20px;
                }

                .phone-icon-circle {
                    width: 60px;
                    height: 60px;
                }

                .phone-step-title {
                    font-size: 1.25rem;
                }

                .phone-description {
                    font-size: 0.85rem;
                }
            }
        `;
        return style;
    }

    // Update translations
    function updateModalTranslations() {
        if (!state.modal) return;
        
        const titleElement = state.modal.querySelector('.spinning-wheel-modal-title');
        if (titleElement) titleElement.textContent = t('title');
        
        const subtitleElement = state.modal.querySelector('.spinning-wheel-modal-subtitle');
        if (subtitleElement) subtitleElement.textContent = t('subtitle');
        
        const phoneTitleElement = state.modal.querySelector('.phone-step-title');
        if (phoneTitleElement) phoneTitleElement.textContent = t('enterPhoneTitle');
        
        const phoneDescElement = state.modal.querySelector('.phone-description');
        if (phoneDescElement) phoneDescElement.textContent = t('phoneDescription');
        
        const phoneInputElement = state.modal.querySelector('#universalPhoneInput');
        if (phoneInputElement) phoneInputElement.placeholder = t('phonePlaceholder');
        
        const phoneBtnText = state.modal.querySelector('.phone-btn-text');
        if (phoneBtnText) phoneBtnText.textContent = t('continueButton');
        
        const privacyText = state.modal.querySelector('.privacy-text');
        if (privacyText) privacyText.textContent = t('privacyText');
    }

    // Show modal
    function showModal(options = {}) {
        if (!state.modal) return;
        
        if (state.userClosedModal) {
            console.log('⏸️ User manually closed modal');
            return;
        }
        
        if (isAnyModalOpen()) {
            console.log('⏳ Another modal is open, delaying...');
            
            if (state.modalCheckInterval) {
                clearInterval(state.modalCheckInterval);
            }
            
            state.modalCheckInterval = setInterval(() => {
                if (!isAnyModalOpen() && !state.userClosedModal) {
                    console.log('✅ Showing spinning wheel now');
                    clearInterval(state.modalCheckInterval);
                    state.modalCheckInterval = null;
                    showModal(options);
                }
            }, 1000);
            
            return;
        }
        
        updateModalTranslations();
        
        const { skipPhoneStep = false, phoneNumber = null, wheelType = 'percent' } = options;
        
        if (options.wheelId) {
            const iframe = document.getElementById('universalSpinningWheelIframe');
            if (iframe) {
                const baseSrc = CONFIG.iframeSrc;
                const separator = baseSrc.includes('?') ? '&' : '?';
                iframe.src = `${baseSrc}${separator}wheel=${options.wheelId}`;
            }
        }
        
        const modalHeader = document.getElementById('universalModalHeader');
        
        if (skipPhoneStep) {
            const phoneStep = document.getElementById('universalPhoneStep');
            const wheelStep = document.getElementById('universalWheelStep');
            
            if (phoneStep && wheelStep) {
                phoneStep.style.display = 'none';
                wheelStep.style.display = 'flex';
                
                if (modalHeader) {
                    modalHeader.style.display = 'none';
                }
                
                if (phoneNumber) {
                    localStorage.setItem('spinningWheelPhone', phoneNumber);
                    localStorage.setItem('spinningWheelPhoneEntered', 'true');
                    
                    setTimeout(() => {
                        const iframe = document.getElementById('universalSpinningWheelIframe');
                        if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage({
                                type: 'phoneNumberEntered',
                                phoneNumber: phoneNumber,
                                wheelType: wheelType
                            }, '*');
                        }
                    }, 500);
                }
            }
        } else {
            const phoneStep = document.getElementById('universalPhoneStep');
            const wheelStep = document.getElementById('universalWheelStep');
            
            if (phoneStep && wheelStep) {
                phoneStep.style.display = 'flex';
                wheelStep.style.display = 'none';
                
                if (modalHeader) {
                    modalHeader.style.display = 'block';
                }
            }
        }
        
        disableBodyScroll();
        
        state.modal.style.display = 'flex';
        state.modal.offsetHeight;
        
        setTimeout(() => {
            state.modal.classList.add('show');
        }, 10);
        
        console.log('🎡 Spinning wheel modal shown');
    }

    // Close modal
    function closeModal() {
        if (!state.modal) return;
        
        state.userClosedModal = true;
        console.log('❌ User closed modal');
        
        if (state.modalCheckInterval) {
            clearInterval(state.modalCheckInterval);
            state.modalCheckInterval = null;
        }
        
        state.modal.classList.remove('show');
        
        setTimeout(() => {
            state.modal.style.display = 'none';
            enableBodyScroll();
        }, 400);
    }

    // Cleanup
    function cleanup() {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        
        if (state.modalCheckInterval) {
            clearInterval(state.modalCheckInterval);
            state.modalCheckInterval = null;
        }
        
        if (state.modal) {
            state.modal.removeEventListener('click', handleOutsideClick);
        }
        document.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('message', handleWheelMessage);
        
        enableBodyScroll();
    }

    // Validate phone number
    function validatePhoneNumber(phoneNumber) {
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        if (cleaned.startsWith('+')) {
            const digits = cleaned.substring(1);
            return digits.length >= 7 && digits.length <= 15 && /^\d+$/.test(digits);
        } else {
            return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
        }
    }

    // Format phone number
    function formatPhoneNumber(phoneNumber) {
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        if (cleaned.startsWith('+')) {
            return cleaned;
        } else {
            const digits = cleaned;
            if (digits.length >= 10) {
                return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
            }
            return digits;
        }
    }

    // Handle phone input
    function handlePhoneInput(event) {
        const input = event.target;
        let value = input.value;
        
        value = value.replace(/[^\d+\-\(\)\s]/g, '');
        
        if (value.length > 20) {
            value = value.substring(0, 20);
        }
        
        input.value = value;
        input.classList.remove('phone-input-error');
        
        const existingError = input.parentNode.parentNode.querySelector('.phone-error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    function showPhoneError(input, message) {
        input.classList.add('phone-input-error');
    
        const existingError = input.parentNode.parentNode.querySelector('.phone-error-message');
        if (existingError) {
            existingError.remove();
        }
    
        const errorDiv = document.createElement('div');
        errorDiv.className = 'phone-error-message';
        errorDiv.textContent = message;
        input.parentNode.parentNode.insertBefore(errorDiv, input.parentNode.nextSibling);
    }

    // Handle phone form submission
    async function handlePhoneSubmit(event) {
        event.preventDefault();

        const phoneInput = document.getElementById('universalPhoneInput');
        const phoneNumber = phoneInput.value.trim();

        phoneInput.classList.remove('phone-input-error');
        const existingError = phoneInput.parentNode.parentNode.querySelector('.phone-error-message');
        if (existingError) existingError.remove();

        if (!phoneNumber) {
            showPhoneError(phoneInput, t('emptyPhone'));
            return;
        }

        if (!validatePhoneNumber(phoneNumber)) {
            showPhoneError(phoneInput, t('invalidPhone'));
            return;
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);

        try {
            const API_BASE_URL = window.location.origin;
            const response = await fetch(`${API_BASE_URL}/api/spinning-wheels/check-available-coupons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: formattedPhone })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.hasCoupons) {
                    showPhoneError(phoneInput, t('hasCoupons'));
                    return;
                }
            }
        } catch (error) {}

        localStorage.setItem('spinningWheelPhone', formattedPhone);
        localStorage.setItem('spinningWheelPhoneEntered', 'true');

        try {
            const API_BASE_URL = window.location.origin;
            fetch(`${API_BASE_URL}/api/spinning-wheels/track-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: formattedPhone })
            }).catch(err => {});
        } catch (err) {}

        const modalHeader = document.getElementById('universalModalHeader');
        if (modalHeader) {
            modalHeader.style.display = 'none';
        }

        document.getElementById('universalPhoneStep').style.display = 'none';
        document.getElementById('universalWheelStep').style.display = 'flex';

        const iframe = document.getElementById('universalSpinningWheelIframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
                { type: 'phoneNumberEntered', phoneNumber: formattedPhone },
                '*'
            );
        }
    }

    // Handle iframe messages
    function handleWheelMessage(event) {
        if (event.data && event.data.type === 'closeModal') {
            autoApplyWinningCoupon();
            closeModal();
            markModalAsSeen();
        } else if (event.data && event.data.type === 'autoApplyCoupon') {
            handleAutoApplyCoupon(event.data.couponCode);
        } else if (event.data && event.data.type === 'closeSpinningWheel') {
            closeModal();
            markModalAsSeen();
        }
    }

    // Auto-apply winning coupon
    function autoApplyWinningCoupon() {
        try {
            const savedCouponCode = localStorage.getItem('spinningWheelWinningCoupon');
            if (savedCouponCode) {
                handleAutoApplyCoupon(savedCouponCode);
            }
        } catch (error) {}
    }

    // Handle auto-apply coupon
    function handleAutoApplyCoupon(couponCode) {
        try {
            localStorage.setItem('autoApplyCoupon', couponCode);
            
            if (window.AutoApplyCoupon && window.AutoApplyCoupon.autoApply) {
                setTimeout(() => {
                    window.AutoApplyCoupon.autoApply();
                }, 100);
            }
            
            showCouponAppliedNotification(couponCode);
        } catch (error) {}
    }

    // Show coupon notification
    function showCouponAppliedNotification(couponCode) {
        const currentLang = getCurrentLanguage();
        
        const notificationTranslations = {
            en: {
                title: 'Coupon Applied!',
                codeLabel: 'Code:',
                readyMessage: 'Ready to use on your next booking!'
            },
            ru: {
                title: 'Купон Применён!',
                codeLabel: 'Код:',
                readyMessage: 'Готов к использованию при следующем бронировании!'
            },
            ro: {
                title: 'Cupon Aplicat!',
                codeLabel: 'Cod:',
                readyMessage: 'Gata de utilizare la următoarea rezervare!'
            }
        };
        
        const nt = notificationTranslations[currentLang] || notificationTranslations['ro'];
        
        const notification = document.createElement('div');
        notification.id = 'coupon-applied-notification';
        notification.className = 'coupon-notification-container';
        
        const confettiColors = ['#f59e0b', '#fb923c', '#fdba74', '#fbbf24', '#d97706', '#ea580c'];
        let confettiHTML = '';
        for (let i = 0; i < 8; i++) {
            const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            const left = Math.random() * 100;
            const delay = Math.random() * 0.5;
            const duration = 1 + Math.random() * 1;
            confettiHTML += `<div class="confetti" style="
                left: ${left}%;
                background: ${color};
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
            "></div>`;
        }
        
        notification.innerHTML = `
            <div class="confetti-container">${confettiHTML}</div>
            <div class="coupon-notification-card">
                <div class="coupon-gift-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 12v10H4V12"></path>
                        <path d="M22 7H2v5h20V7z"></path>
                        <path d="M12 22V7"></path>
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                    </svg>
                </div>
                <div class="coupon-notification-content">
                    <div class="coupon-title">
                        <span class="sparkle">✨</span>
                        ${nt.title}
                        <span class="sparkle">✨</span>
                    </div>
                    <div class="coupon-code-container">
                        <span class="coupon-label">${nt.codeLabel}</span>
                        <span class="coupon-code">${couponCode}</span>
                    </div>
                    <div class="coupon-message">
                        <span class="check-icon">✓</span>
                        ${nt.readyMessage}
                    </div>
                </div>
                <div class="coupon-shine"></div>
            </div>
        `;
        
        if (!document.getElementById('coupon-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'coupon-notification-styles';
            style.textContent = `
                .coupon-notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    animation: slideInNotification 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                
                .coupon-notification-card {
                    position: relative;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border-radius: 20px;
                    padding: 24px;
                    box-shadow: 0 12px 40px rgba(245, 158, 11, 0.5);
                    max-width: 380px;
                    overflow: hidden;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                }
                
                .coupon-shine {
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(
                        45deg,
                        transparent 30%,
                        rgba(255, 255, 255, 0.4) 50%,
                        transparent 70%
                    );
                    transform: rotate(45deg);
                    animation: shine 3s infinite;
                }
                
                .coupon-gift-icon {
                    width: 56px;
                    height: 56px;
                    margin: 0 auto 16px;
                    background: rgba(255, 255, 255, 0.25);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: bounceIcon 1.2s infinite;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                
                .coupon-gift-icon svg {
                    width: 28px;
                    height: 28px;
                    color: white;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                }
                
                .coupon-notification-content {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                    color: white;
                }
                
                .coupon-title {
                    font-size: 1.4rem;
                    font-weight: 800;
                    margin-bottom: 14px;
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    line-height: 1.3;
                }
                
                .sparkle {
                    display: inline-block;
                    animation: sparkleAnimation 1.5s infinite;
                    font-size: 1.1rem;
                }
                
                .coupon-code-container {
                    background: rgba(255, 255, 255, 0.95);
                    border: 2px solid rgba(255, 255, 255, 1);
                    border-radius: 14px;
                    padding: 16px 14px;
                    margin: 14px 0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .coupon-label {
                    display: block;
                    font-size: 0.8rem;
                    color: #d97706;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    font-weight: 700;
                }
                
                .coupon-code {
                    display: block;
                    font-size: 1.65rem;
                    font-weight: 900;
                    letter-spacing: 2.5px;
                    font-family: 'Courier New', monospace;
                    color: #f59e0b;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                .coupon-message {
                    font-size: 0.95rem;
                    line-height: 1.5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    opacity: 0.98;
                    font-weight: 500;
                }
                
                .check-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 22px;
                    height: 22px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    font-size: 14px;
                    font-weight: bold;
                }
                
                .confetti-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    overflow: hidden;
                }
                
                .confetti {
                    position: absolute;
                    top: -10px;
                    width: 10px;
                    height: 10px;
                    opacity: 0;
                    animation: confettiFall 2.5s ease-in-out forwards;
                    border-radius: 2px;
                }
                
                @keyframes slideInNotification {
                    0% {
                        transform: translateX(450px) scale(0.6);
                        opacity: 0;
                    }
                    60% {
                        transform: translateX(-25px) scale(1.05);
                        opacity: 1;
                    }
                    80% {
                        transform: translateX(10px) scale(0.98);
                    }
                    100% {
                        transform: translateX(0) scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes shine {
                    0%, 100% {
                        transform: translateX(-100%) translateY(-100%) rotate(45deg);
                    }
                    50% {
                        transform: translateX(100%) translateY(100%) rotate(45deg);
                    }
                }
                
                @keyframes bounceIcon {
                    0%, 100% {
                        transform: translateY(0) scale(1);
                    }
                    50% {
                        transform: translateY(-10px) scale(1.1);
                    }
                }
                
                @keyframes sparkleAnimation {
                    0%, 100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.4) rotate(180deg);
                        opacity: 0.7;
                    }
                }
                
                @keyframes confettiFall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(500px) rotate(720deg);
                        opacity: 0;
                    }
                }
                
                @media (max-width: 1024px) and (min-width: 769px) {
                    .coupon-notification-container {
                        top: 18px;
                        right: 18px;
                    }
                    
                    .coupon-notification-card {
                        max-width: 360px;
                        padding: 22px;
                    }
                    
                    .coupon-gift-icon {
                        width: 52px;
                        height: 52px;
                    }
                    
                    .coupon-title {
                        font-size: 1.3rem;
                    }
                    
                    .coupon-code {
                        font-size: 1.55rem;
                        letter-spacing: 2.2px;
                    }
                }
                
                @media (max-width: 768px) {
                    .coupon-notification-container {
                        top: 16px;
                        right: 16px;
                        left: 16px;
                        max-width: calc(100% - 32px);
                    }
                    
                    .coupon-notification-card {
                        max-width: 100%;
                        padding: 20px 18px;
                        border-radius: 18px;
                    }
                    
                    .coupon-gift-icon {
                        width: 48px;
                        height: 48px;
                        margin-bottom: 14px;
                    }
                    
                    .coupon-gift-icon svg {
                        width: 24px;
                        height: 24px;
                    }
                    
                    .coupon-title {
                        font-size: 1.2rem;
                        gap: 8px;
                        margin-bottom: 12px;
                    }
                    
                    .sparkle {
                        font-size: 1rem;
                    }
                    
                    .coupon-code-container {
                        padding: 14px 12px;
                        margin: 12px 0;
                    }
                    
                    .coupon-label {
                        font-size: 0.75rem;
                        margin-bottom: 5px;
                    }
                    
                    .coupon-code {
                        font-size: 1.4rem;
                        letter-spacing: 2px;
                    }
                    
                    .coupon-message {
                        font-size: 0.875rem;
                    }
                    
                    .check-icon {
                        width: 20px;
                        height: 20px;
                        font-size: 13px;
                    }
                }
                
                @media (max-width: 480px) {
                    .coupon-notification-container {
                        top: 12px;
                        right: 12px;
                        left: 12px;
                    }
                    
                    .coupon-notification-card {
                        padding: 18px 16px;
                        border-radius: 16px;
                    }
                    
                    .coupon-gift-icon {
                        width: 44px;
                        height: 44px;
                        margin-bottom: 12px;
                    }
                    
                    .coupon-gift-icon svg {
                        width: 22px;
                        height: 22px;
                    }
                    
                    .coupon-title {
                        font-size: 1.1rem;
                        gap: 6px;
                    }
                    
                    .sparkle {
                        font-size: 0.9rem;
                    }
                    
                    .coupon-code-container {
                        padding: 12px 10px;
                    }
                    
                    .coupon-label {
                        font-size: 0.7rem;
                    }
                    
                    .coupon-code {
                        font-size: 1.25rem;
                        letter-spacing: 1.5px;
                    }
                    
                    .coupon-message {
                        font-size: 0.8rem;
                    }
                }
                
                @media (max-width: 360px) {
                    .coupon-notification-container {
                        top: 10px;
                        right: 10px;
                        left: 10px;
                    }
                    
                    .coupon-notification-card {
                        padding: 16px 14px;
                    }
                    
                    .coupon-gift-icon {
                        width: 40px;
                        height: 40px;
                    }
                    
                    .coupon-title {
                        font-size: 1rem;
                    }
                    
                    .coupon-code {
                        font-size: 1.15rem;
                        letter-spacing: 1.2px;
                    }
                    
                    .coupon-message {
                        font-size: 0.75rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInNotification 0.5s ease-out reverse';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, 6000);
    }

    function handleOutsideClick(event) {}
    function handleKeydown(event) {}
    function handleResize() {}

    function handleVisibilityChange() {
        if (document.hidden) {
            if (state.timer) {
                clearTimeout(state.timer);
                state.timer = null;
            }
        } else {
            if (!state.modal || state.modal.style.display === 'none') {
                startTimer();
            }
        }
    }

    function handleBeforeUnload() {
        const currentTime = Date.now();
        const startTime = localStorage.getItem('websiteStartTime');
        
        if (startTime) {
            const totalTime = currentTime - parseInt(startTime);
            localStorage.setItem('websiteTotalTime', totalTime.toString());
        }
    }

    async function fetchCorrectWheel() {
        try {
            const API_BASE_URL = window.API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/api/spinning-wheels/enabled-configs`);
            
            if (!response.ok) {
                return null;
            }
            
            const wheelConfigs = await response.json();
            const nonPremiumWheels = wheelConfigs.filter(wheel => !wheel.is_premium);
            
            if (nonPremiumWheels.length === 0) {
                if (wheelConfigs.length > 0) {
                    return wheelConfigs[0];
                }
                return null;
            }
            
            if (nonPremiumWheels.length === 1) {
                return nonPremiumWheels[0];
            }
            
            const percentWheels = nonPremiumWheels.filter(wheel => wheel.type === 'percent');
            if (percentWheels.length > 0) {
                return percentWheels[0];
            }
            
            const freeDaysWheels = nonPremiumWheels.filter(wheel => wheel.type === 'free-days');
            if (freeDaysWheels.length > 0) {
                return freeDaysWheels[0];
            }
            
            return nonPremiumWheels[0];
            
        } catch (error) {
            return null;
        }
    }

    function startTimer() {
        if (hasSeenModalToday()) return;
        
        setWebsiteStartTime();
        
        const totalTime = getTotalWebsiteTime();
        if (totalTime >= CONFIG.delay) {
            showModalWithCorrectWheel();
            return;
        }
        
        const remainingTime = CONFIG.delay - totalTime;
        
        state.timer = setTimeout(() => {
            showModalWithCorrectWheel();
        }, remainingTime);
    }

    async function showModalWithCorrectWheel() {
        const correctWheel = await fetchCorrectWheel();
        
        if (correctWheel) {
            showModal({ wheelId: correctWheel.id, wheelType: correctWheel.type });
        } else {
            showModal();
        }
    }

    function init() {
        if (state.isInitialized) return;
        
        if (window.location.pathname.includes('spinning-wheel')) {
            return;
        }

        const modalHTML = createModalHTML();
        const modalCSS = createModalCSS();
        
        document.head.appendChild(modalCSS);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        state.modal = document.getElementById(CONFIG.modalId);
        state.iframe = document.getElementById('universalSpinningWheelIframe');
        
        if (!state.modal) return;
        
        const closeBtn = state.modal.querySelector('.spinning-wheel-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                autoApplyWinningCoupon();
                closeModal();
                markModalAsSeen();
            });
        }
        
        const phoneForm = document.getElementById('universalPhoneForm');
        if (phoneForm) {
            phoneForm.addEventListener('submit', handlePhoneSubmit);
        }
        
        const phoneInput = document.getElementById('universalPhoneInput');
        if (phoneInput) {
            phoneInput.addEventListener('input', handlePhoneInput);
        }
        
        window.addEventListener('message', handleWheelMessage);
        state.modal.addEventListener('click', handleOutsideClick);
        document.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        if (typeof i18next !== 'undefined') {
            i18next.on('languageChanged', updateModalTranslations);
        }
        
        setTimeout(updateModalTranslations, 1000);
        
        const existingPhone = localStorage.getItem('spinningWheelPhone');
        if (existingPhone) {
            const modalHeader = document.getElementById('universalModalHeader');
            if (modalHeader) {
                modalHeader.style.display = 'none';
            }
            document.getElementById('universalPhoneStep').style.display = 'none';
            document.getElementById('universalWheelStep').style.display = 'flex';
        }
        
        state.isInitialized = true;
        
        startTimer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function fetchWheelIdByType(wheelType) {
        try {
            const API_BASE_URL = window.API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/api/spinning-wheels/by-type/${wheelType}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const wheelData = await response.json();
            return wheelData.id;
        } catch (error) {
            return null;
        }
    }

    window.UniversalSpinningWheel = {
        show: showModal,
        close: closeModal,
        init: init,
        fetchWheelIdByType: fetchWheelIdByType
    };

})();
