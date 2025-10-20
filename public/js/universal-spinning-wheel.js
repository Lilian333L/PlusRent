/**
 * Universal Spinning Wheel Modal Trigger - Orange Theme
 * Optimized for performance with full functionality preserved
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
        modalCheckInterval: null
    };

    // Check for open modals
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

    // Translations
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

    function t(key) {
        const lang = getCurrentLanguage();
        return translations[lang][key] || translations['ro'][key] || key;
    }

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

    function setWebsiteStartTime() {
        if (!localStorage.getItem('websiteStartTime')) {
            localStorage.setItem('websiteStartTime', Date.now().toString());
        }
    }

    function markModalAsSeen() {
        localStorage.setItem(CONFIG.storageKey, new Date().toISOString());
        localStorage.removeItem('websiteStartTime');
        localStorage.removeItem('websiteTotalTime');
    }

    // Create modal HTML
    function createModalHTML() {
        return `
            <div id="${CONFIG.modalId}" class="spinning-wheel-modal" style="display: none;">
                <div class="spinning-wheel-modal-content">
                    <div class="spinning-wheel-modal-close">&times;</div>
                    <div class="spinning-wheel-modal-header">
                        <div class="header-decoration"></div>
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

    // Create modal CSS with orange theme
    function createModalCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .spinning-wheel-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(8px);
                z-index: ${CONFIG.zIndex};
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
                padding: 20px;
            }

            .spinning-wheel-modal.show {
                opacity: 1;
            }

            .spinning-wheel-modal-content {
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(20px);
                border-radius: 24px;
                width: 100%;
                max-width: 480px;
                max-height: 90vh;
                position: relative;
                overflow: hidden;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                transform: scale(0.9);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 20px 60px rgba(245, 158, 11, 0.25),
                            0 0 0 1px rgba(245, 158, 11, 0.1);
            }

            .spinning-wheel-modal.show .spinning-wheel-modal-content {
                transform: scale(1);
            }

            .spinning-wheel-modal-content.wheel-step {
                max-width: 1000px;
                max-height: 95vh;
            }

            .spinning-wheel-modal-close {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                cursor: pointer;
                color: white;
                z-index: 10;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
            }

            .spinning-wheel-modal-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }

            .spinning-wheel-modal-header {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                padding: 32px 24px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .spinning-wheel-modal-header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
                animation: pulse 3s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }

            .header-gift-icon {
                width: 56px;
                height: 56px;
                margin: 0 auto 16px;
                background: rgba(255, 255, 255, 0.25);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: bounce 2s ease-in-out infinite;
                position: relative;
                z-index: 1;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            }

            .header-gift-icon svg {
                width: 28px;
                height: 28px;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
            }

            .spinning-wheel-modal-title {
                font-size: 1.75rem;
                font-weight: 700;
                margin: 0 0 8px 0;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                position: relative;
                z-index: 1;
                color: white;
            }

            .spinning-wheel-modal-subtitle {
                font-size: 1rem;
                margin: 0;
                opacity: 0.95;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                position: relative;
                z-index: 1;
                color: white;
            }

            .spinning-wheel-wheel-content {
                background: transparent;
                display: flex;
                flex-direction: column;
            }

            .spinning-wheel-phone-step {
                padding: 40px 32px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .phone-input-container {
                width: 100%;
                max-width: 400px;
                text-align: center;
            }

            .phone-icon-circle {
                width: 72px;
                height: 72px;
                margin: 0 auto 24px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
            }

            .phone-icon-circle svg {
                width: 36px;
                height: 36px;
                color: white;
            }

            .phone-step-title {
                color: #1a202c;
                font-size: 1.5rem;
                margin: 0 0 12px 0;
                font-weight: 700;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }

            .phone-description {
                color: #718096;
                font-size: 0.95rem;
                margin: 0 0 32px 0;
                line-height: 1.6;
            }

            .phone-form {
                width: 100%;
            }

            .input-wrapper {
                position: relative;
                margin-bottom: 20px;
            }

            .input-icon {
                position: absolute;
                left: 16px;
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 20px;
                color: #a0aec0;
                pointer-events: none;
            }

            .phone-input {
                width: 100%;
                padding: 16px 16px 16px 48px;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                font-size: 1rem;
                transition: all 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                box-sizing: border-box;
                background: white;
            }

            .phone-input:focus {
                outline: none;
                border-color: #f59e0b;
                box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1);
            }

            .phone-input::placeholder {
                color: #cbd5e0;
            }

            .phone-input-error {
                border-color: #ef4444 !important;
                box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
            }

            .phone-error-message {
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 8px;
                text-align: left;
                padding-left: 4px;
            }

            .phone-submit-btn {
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 1.05rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
            }

            .phone-submit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
            }

            .phone-submit-btn:active {
                transform: translateY(0);
            }

            .btn-icon {
                width: 20px;
                height: 20px;
                transition: transform 0.3s ease;
            }

            .phone-submit-btn:hover .btn-icon {
                transform: translateX(4px);
            }

            .privacy-badge {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 20px;
                color: #718096;
                font-size: 0.875rem;
            }

            .privacy-badge svg {
                width: 16px;
                height: 16px;
                color: #48bb78;
            }

            .spinning-wheel-wheel-step {
                padding: 24px;
                min-height: 500px;
                display: flex;
                flex-direction: column;
                background: transparent;
            }

            #universalSpinningWheelIframe {
                flex: 1;
                border-radius: 12px;
            }

            @media (min-width: 1024px) {
                .spinning-wheel-modal {
                    padding: 40px;
                }

                .spinning-wheel-modal-content.wheel-step {
                    max-width: 1200px;
                    height: 85vh;
                }

                .spinning-wheel-wheel-step {
                    padding: 40px;
                    min-height: 600px;
                }

                .spinning-wheel-modal-header {
                    padding: 40px 32px;
                }

                .spinning-wheel-modal-title {
                    font-size: 2rem;
                }

                .spinning-wheel-modal-subtitle {
                    font-size: 1.125rem;
                }
            }

            @media (min-width: 768px) and (max-width: 1023px) {
                .spinning-wheel-modal-content {
                    max-width: 600px;
                }

                .spinning-wheel-modal-content.wheel-step {
                    max-width: 900px;
                }

                .phone-input-container {
                    max-width: 450px;
                }
            }

            @media (max-width: 767px) {
                .spinning-wheel-modal {
                    padding: 12px;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(6px);
                }

                .spinning-wheel-modal-content {
                    background: white;
                    border-radius: 20px;
                    max-height: 92vh;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                }

                .spinning-wheel-modal-content.wheel-step {
                    max-height: 95vh;
                }

                .spinning-wheel-modal-close {
                    top: 12px;
                    right: 12px;
                    width: 32px;
                    height: 32px;
                    font-size: 22px;
                }

                .spinning-wheel-modal-header {
                    padding: 24px 20px;
                }

                .header-gift-icon {
                    width: 48px;
                    height: 48px;
                    margin-bottom: 12px;
                }

                .header-gift-icon svg {
                    width: 24px;
                    height: 24px;
                }

                .spinning-wheel-modal-title {
                    font-size: 1.4rem;
                    margin-bottom: 6px;
                }

                .spinning-wheel-modal-subtitle {
                    font-size: 0.9rem;
                }

                .spinning-wheel-phone-step {
                    padding: 28px 20px;
                }

                .phone-icon-circle {
                    width: 64px;
                    height: 64px;
                    margin-bottom: 20px;
                }

                .phone-icon-circle svg {
                    width: 32px;
                    height: 32px;
                }

                .phone-step-title {
                    font-size: 1.3rem;
                    margin-bottom: 10px;
                }

                .phone-description {
                    font-size: 0.875rem;
                    margin-bottom: 24px;
                }

                .phone-input,
                .phone-submit-btn {
                    padding: 14px;
                    font-size: 1rem;
                }

                .phone-input {
                    padding-left: 44px;
                }

                .spinning-wheel-wheel-step {
                    padding: 16px;
                    min-height: 450px;
                }
            }

            @media (max-width: 400px) {
                .spinning-wheel-modal {
                    padding: 8px;
                    background: rgba(0, 0, 0, 0.35);
                    backdrop-filter: blur(4px);
                }
                
                .spinning-wheel-modal-content {
                    background: white;
                }

                .spinning-wheel-modal-header {
                    padding: 20px 16px;
                }

                .spinning-wheel-modal-title {
                    font-size: 1.25rem;
                }

                .spinning-wheel-modal-subtitle {
                    font-size: 0.85rem;
                }

                .spinning-wheel-phone-step {
                    padding: 24px 16px;
                }

                .phone-icon-circle {
                    width: 56px;
                    height: 56px;
                }

                .phone-step-title {
                    font-size: 1.15rem;
                }

                .phone-description {
                    font-size: 0.8rem;
                }
            }

            @keyframes slideInBounce {
                0% {
                    transform: translateY(-50px) scale(0.9);
                    opacity: 0;
                }
                60% {
                    transform: translateY(10px) scale(1.02);
                    opacity: 1;
                }
                100% {
                    transform: translateY(0) scale(1);
                }
            }
        `;
        return style;
    }

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

    function showModal(options = {}) {
        if (!state.modal) return;
        
        if (state.userClosedModal) {
            console.log('⏸️ User manually closed modal, not showing again');
            return;
        }
        
        if (isAnyModalOpen()) {
            console.log('⏳ Another modal is open, delaying spinning wheel...');
            
            if (state.modalCheckInterval) {
                clearInterval(state.modalCheckInterval);
            }
            
            state.modalCheckInterval = setInterval(() => {
                if (!isAnyModalOpen() && !state.userClosedModal) {
                    console.log('✅ Other modals closed, showing spinning wheel now');
                    clearInterval(state.modalCheckInterval);
                    state.modalCheckInterval = null;
                    showModal(options);
                }
            }, 1000);
            
            return;
        }
        
        // Block body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${window.scrollY}px`;
        
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
        
        const modalContent = state.modal.querySelector('.spinning-wheel-modal-content');
        
        if (skipPhoneStep) {
            const phoneStep = document.getElementById('universalPhoneStep');
            const wheelStep = document.getElementById('universalWheelStep');
            
            if (phoneStep && wheelStep) {
                phoneStep.style.display = 'none';
                wheelStep.style.display = 'flex';
                
                if (modalContent) {
                    modalContent.classList.remove('phone-step');
                    modalContent.classList.add('wheel-step');
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
                
                if (modalContent) {
                    modalContent.classList.remove('wheel-step');
                    modalContent.classList.add('phone-step');
                }
            }
        }
        
        state.modal.style.display = 'flex';
        state.modal.offsetHeight;
        
        setTimeout(() => {
            state.modal.classList.add('show');
        }, 10);
        
        console.log('🎡 Spinning wheel modal shown');
    }

    function closeModal() {
        if (!state.modal) return;
        
        state.userClosedModal = true;
        console.log('❌ User closed modal manually');
        
        if (state.modalCheckInterval) {
            clearInterval(state.modalCheckInterval);
            state.modalCheckInterval = null;
        }
        
        state.modal.classList.remove('show');
        
        setTimeout(() => {
            state.modal.style.display = 'none';
            
            // Restore body scroll
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.overflow = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }, 300);
    }

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
    }

    function validatePhoneNumber(phoneNumber) {
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        if (cleaned.startsWith('+')) {
            const digits = cleaned.substring(1);
            return digits.length >= 7 && digits.length <= 15 && /^\d+$/.test(digits);
        } else {
            return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
        }
    }

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

        document.getElementById('universalPhoneStep').style.display = 'none';
        document.getElementById('universalWheelStep').style.display = 'flex';

        const modalContent = document.querySelector('.spinning-wheel-modal-content');
        if (modalContent) {
            modalContent.classList.remove('phone-step');
            modalContent.classList.add('wheel-step');
        }

        const iframe = document.getElementById('universalSpinningWheelIframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
                { type: 'phoneNumberEntered', phoneNumber: formattedPhone },
                '*'
            );
        }
    }

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

    function autoApplyWinningCoupon() {
        try {
            const savedCouponCode = localStorage.getItem('spinningWheelWinningCoupon');
            if (savedCouponCode) {
                handleAutoApplyCoupon(savedCouponCode);
            }
        } catch (error) {}
    }

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
        
        const confettiColors = ['#f59e0b', '#fb923c', '#fdba74', '#d97706', '#ea580c'];
        let confettiHTML = '';
        for (let i = 0; i < 6; i++) {
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
                    top: 80px;
                    right: 20px;
                    z-index: 10000;
                    animation: slideInNotification 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                
                .coupon-notification-card {
                    position: relative;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 10px 40px rgba(245, 158, 11, 0.4);
                    max-width: 320px;
                    overflow: hidden;
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
                        rgba(255, 255, 255, 0.3) 50%,
                        transparent 70%
                    );
                    transform: rotate(45deg);
                    animation: shine 3s infinite;
                }
                
                .coupon-gift-icon {
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 12px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: bounceIcon 1s infinite;
                }
                
                .coupon-gift-icon svg {
                    width: 24px;
                    height: 24px;
                    color: white;
                }
                
                .coupon-notification-content {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                    color: white;
                }
                
                .coupon-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-bottom: 12px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .sparkle {
                    display: inline-block;
                    animation: sparkleAnimation 1.5s infinite;
                    font-size: 1rem;
                }
                
                .coupon-code-container {
                    background: rgba(255, 255, 255, 0.2);
                    border: 2px dashed rgba(255, 255, 255, 0.5);
                    border-radius: 12px;
                    padding: 12px;
                    margin: 12px 0;
                    backdrop-filter: blur(10px);
                }
                
                .coupon-label {
                    display: block;
                    font-size: 0.75rem;
                    opacity: 0.9;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .coupon-code {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    font-family: 'Courier New', monospace;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }
                
                .coupon-message {
                    font-size: 0.875rem;
                    opacity: 0.95;
                    line-height: 1.5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                
                .check-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    font-size: 12px;
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
                    width: 8px;
                    height: 8px;
                    opacity: 0;
                    animation: confettiFall 2s ease-in-out forwards;
                }
                
                @keyframes slideInNotification {
                    0% {
                        transform: translateX(400px) scale(0.5);
                        opacity: 0;
                    }
                    60% {
                        transform: translateX(-20px) scale(1.05);
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
                        transform: translateY(-8px) scale(1.1);
                    }
                }
                
                @keyframes sparkleAnimation {
                    0%, 100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.3) rotate(180deg);
                        opacity: 0.7;
                    }
                }
                
                @keyframes confettiFall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(400px) rotate(720deg);
                        opacity: 0;
                    }
                }
                
                @media (max-width: 768px) {
                    .coupon-notification-container {
                        top: 70px;
                        right: 16px;
                        left: 16px;
                        max-width: calc(100% - 32px);
                    }
                    
                    .coupon-notification-card {
                        max-width: 100%;
                        padding: 16px;
                    }
                    
                    .coupon-gift-icon {
                        width: 40px;
                        height: 40px;
                    }
                    
                    .coupon-gift-icon svg {
                        width: 20px;
                        height: 20px;
                    }
                    
                    .coupon-title {
                        font-size: 1.1rem;
                        gap: 6px;
                    }
                    
                    .sparkle {
                        font-size: 0.875rem;
                    }
                    
                    .coupon-code {
                        font-size: 1.25rem;
                        letter-spacing: 1.5px;
                    }
                    
                    .coupon-message {
                        font-size: 0.8rem;
                    }
                }
                
                @media (max-width: 400px) {
                    .coupon-notification-container {
                        top: 60px;
                        right: 12px;
                        left: 12px;
                    }
                    
                    .coupon-title {
                        font-size: 1rem;
                    }
                    
                    .coupon-code {
                        font-size: 1.1rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInNotification 0.4s ease-out reverse';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 400);
            }
        }, 5000);
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
