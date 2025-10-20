/**
 * Universal Spinning Wheel Modal - WORLD-CLASS DESIGN V6
 * ИДЕАЛЬНЫЙ ДИЗАЙН: Всё видно сразу, никакого скролла, мировой уровень!
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

    // Block page scroll
    function disableBodyScroll() {
        state.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        state.originalBodyOverflow = document.body.style.overflow;
        state.originalBodyPosition = document.body.style.position;
        
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${state.scrollPosition}px`;
        document.body.style.width = '100%';
    }

    // Unblock page scroll
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
            hasCoupons: 'You have already received a reward for this phone number.',
            howToPlay: 'How to Play',
            step1: 'Click the button in the center of the wheel',
            step2: 'Watch the wheel spin and stop on your prize',
            step3: 'Copy your discount code',
            step4: 'Use it on your next booking'
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
            hasCoupons: 'Вы уже получили награду за этот номер телефона.',
            howToPlay: 'Как играть',
            step1: 'Нажми кнопку в центре колеса',
            step2: 'Следи за вращением колеса и остановкой на твоем призе',
            step3: 'Скопируй свой код скидки',
            step4: 'Используй его при следующем бронировании'
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
            hasCoupons: 'Ai primit deja o recompensă pentru acest număr de telefon.',
            howToPlay: 'Cum să joci',
            step1: 'Apasă butonul din centrul roții',
            step2: 'Urmărește rotirea roții și oprirea pe premiul tău',
            step3: 'Copiază codul tău de reducere',
            step4: 'Folosește-l la următoarea rezervare'
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
                <div class="spinning-wheel-modal-container">
                    <button class="spinning-wheel-modal-close" aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    
                    <div class="spinning-wheel-modal-content">
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
                        
                        <div class="spinning-wheel-content-wrapper">
                            <!-- PHONE STEP -->
                            <div class="spinning-wheel-phone-step" id="universalPhoneStep">
                                <div class="phone-input-card">
                                    <div class="phone-icon-wrapper">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                            <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                        </svg>
                                    </div>
                                    <h3 class="phone-step-title">${t('enterPhoneTitle')}</h3>
                                    <p class="phone-description">${t('phoneDescription')}</p>
                                    <form class="phone-form" id="universalPhoneForm">
                                        <div class="input-group">
                                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                            </svg>
                                            <input type="tel" class="phone-input" id="universalPhoneInput" 
                                                   placeholder="${t('phonePlaceholder')}" required>
                                        </div>
                                        <button type="submit" class="phone-submit-btn">
                                            <span>${t('continueButton')}</span>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                <polyline points="12 5 19 12 12 19"></polyline>
                                            </svg>
                                        </button>
                                        <div class="privacy-badge">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                            </svg>
                                            <span>${t('privacyText')}</span>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            
                            <!-- WHEEL STEP -->
                            <div class="spinning-wheel-wheel-step" id="universalWheelStep" style="display: none;">
                                <div class="wheel-container">
                                    <iframe id="universalSpinningWheelIframe" 
                                            src="${CONFIG.iframeSrc}" 
                                            frameborder="0" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                                    </iframe>
                                </div>
                                <div class="wheel-sidebar" id="wheelSidebar">
                                    <div class="wheel-instructions">
                                        <h3 class="instructions-title">${t('howToPlay')}</h3>
                                        <div class="instruction-item">
                                            <div class="instruction-number">1</div>
                                            <p>${t('step1')}</p>
                                        </div>
                                        <div class="instruction-item">
                                            <div class="instruction-number">2</div>
                                            <p>${t('step2')}</p>
                                        </div>
                                        <div class="instruction-item">
                                            <div class="instruction-number">3</div>
                                            <p>${t('step3')}</p>
                                        </div>
                                        <div class="instruction-item">
                                            <div class="instruction-number">4</div>
                                            <p>${t('step4')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create modal CSS
    function createModalCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* ===== WORLD-CLASS DESIGN V6 - ИДЕАЛЬНЫЙ ===== */
            
            * {
                box-sizing: border-box;
            }
            
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
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }

            .spinning-wheel-modal.show {
                opacity: 1;
                visibility: visible;
            }

            /* ✨ BACKDROP */
            .spinning-wheel-modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(12px) saturate(120%);
                -webkit-backdrop-filter: blur(12px) saturate(120%);
                z-index: 1;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    backdrop-filter: blur(0px);
                }
                to {
                    opacity: 1;
                    backdrop-filter: blur(12px) saturate(120%);
                }
            }

            /* ✨ CONTAINER */
            .spinning-wheel-modal-container {
                position: relative;
                z-index: 2;
                width: 100%;
                max-width: 1150px;
                max-height: 90vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                transform: scale(0.92);
                transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .spinning-wheel-modal.show .spinning-wheel-modal-container {
                transform: scale(1);
            }

            /* ✨ CLOSE BUTTON */
            .spinning-wheel-modal-close {
                position: absolute;
                top: -52px;
                right: 0;
                width: 44px;
                height: 44px;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.25s ease;
                padding: 0;
                z-index: 10;
            }

            .spinning-wheel-modal-close svg {
                width: 22px;
                height: 22px;
                color: white;
                stroke-width: 3;
            }

            .spinning-wheel-modal-close:hover {
                background: rgba(0, 0, 0, 0.75);
                transform: rotate(90deg) scale(1.1);
                border-color: rgba(255, 255, 255, 0.5);
            }

            /* ✨ MAIN CONTENT */
            .spinning-wheel-modal-content {
                background: white;
                border-radius: 24px;
                box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35), 0 0 1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                width: 100%;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            }

            /* ✨ HEADER */
            .spinning-wheel-modal-header {
                padding: 26px 32px 20px;
                text-align: center;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                position: relative;
                overflow: hidden;
                flex-shrink: 0;
            }

            .spinning-wheel-modal-header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
                animation: rotate 20s linear infinite;
            }

            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .header-gift-icon {
                width: 54px;
                height: 54px;
                margin: 0 auto 13px;
                background: rgba(255, 255, 255, 0.22);
                backdrop-filter: blur(10px);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(255, 255, 255, 0.35);
                animation: float 3s ease-in-out infinite;
                position: relative;
                z-index: 1;
            }

            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-7px); }
            }

            .header-gift-icon svg {
                width: 27px;
                height: 27px;
                color: white;
                filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
            }

            .spinning-wheel-modal-title {
                font-size: 1.7rem;
                font-weight: 800;
                color: white;
                margin: 0 0 6px;
                text-shadow: 0 2px 20px rgba(0, 0, 0, 0.22);
                letter-spacing: -0.5px;
                position: relative;
                z-index: 1;
            }

            .spinning-wheel-modal-subtitle {
                font-size: 0.94rem;
                color: rgba(255, 255, 255, 0.96);
                margin: 0;
                text-shadow: 0 1px 10px rgba(0, 0, 0, 0.12);
                position: relative;
                z-index: 1;
            }

            /* ✨ CONTENT WRAPPER */
            .spinning-wheel-content-wrapper {
                padding: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex: 1;
                min-height: 0;
            }

            .spinning-wheel-phone-step {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* ✨ PHONE INPUT */
            .phone-input-card {
                width: 100%;
                max-width: 420px;
                text-align: center;
            }

            .phone-icon-wrapper {
                width: 54px;
                height: 54px;
                margin: 0 auto 17px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 32px rgba(245, 158, 11, 0.32);
            }

            .phone-icon-wrapper svg {
                width: 27px;
                height: 27px;
                color: white;
            }

            .phone-step-title {
                font-size: 1.38rem;
                font-weight: 800;
                color: #111827;
                margin: 0 0 6px;
                letter-spacing: -0.5px;
            }

            .phone-description {
                font-size: 0.94rem;
                color: #6b7280;
                margin: 0 0 19px;
                line-height: 1.55;
            }

            .phone-form {
                width: 100%;
            }

            .input-group {
                position: relative;
                margin-bottom: 13px;
            }

            .input-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 20px;
                color: #9ca3af;
                pointer-events: none;
            }

            .phone-input {
                width: 100%;
                padding: 13px 14px 13px 44px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1rem;
                color: #111827;
                transition: all 0.2s ease;
                background: white;
            }

            .phone-input:focus {
                outline: none;
                border-color: #f59e0b;
                box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
            }

            .phone-input::placeholder {
                color: #d1d5db;
            }

            .phone-input-error {
                border-color: #ef4444 !important;
                box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12) !important;
            }

            .phone-error-message {
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 8px;
                text-align: left;
                padding-left: 4px;
                font-weight: 500;
            }

            .phone-submit-btn {
                width: 100%;
                padding: 13px 18px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.22s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-shadow: 0 4px 18px rgba(245, 158, 11, 0.32);
            }

            .phone-submit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 26px rgba(245, 158, 11, 0.42);
            }

            .phone-submit-btn svg {
                width: 20px;
                height: 20px;
                transition: transform 0.22s ease;
            }

            .phone-submit-btn:hover svg {
                transform: translateX(4px);
            }

            .privacy-badge {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 13px;
                color: #6b7280;
                font-size: 0.875rem;
            }

            .privacy-badge svg {
                width: 16px;
                height: 16px;
                color: #10b981;
            }

            /* ✨ WHEEL STEP - TWO COLUMNS ON DESKTOP */
            .spinning-wheel-wheel-step {
                width: 100%;
                height: 100%;
                display: grid;
                grid-template-columns: 1.5fr 1fr;
                gap: 30px;
                align-items: stretch;
            }

            .wheel-container {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 480px;
            }

            #universalSpinningWheelIframe {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 12px;
            }

            .wheel-sidebar {
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .wheel-instructions {
                display: flex;
                flex-direction: column;
                gap: 16px;
                animation: slideInRight 0.5s ease;
            }

            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(25px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            .instructions-title {
                font-size: 1.44rem;
                font-weight: 800;
                color: #111827;
                margin: 0 0 8px;
                letter-spacing: -0.5px;
            }

            .instruction-item {
                display: flex;
                align-items: flex-start;
                gap: 13px;
                padding: 15px;
                border-radius: 12px;
                background: #f9fafb;
                transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                animation: fadeInUp 0.48s ease backwards;
            }

            .instruction-item:nth-child(2) { animation-delay: 0.08s; }
            .instruction-item:nth-child(3) { animation-delay: 0.16s; }
            .instruction-item:nth-child(4) { animation-delay: 0.24s; }
            .instruction-item:nth-child(5) { animation-delay: 0.32s; }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(18px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .instruction-item:hover {
                background: #fff;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.09);
                transform: translateY(-2px);
            }

            .instruction-number {
                width: 35px;
                height: 35px;
                flex-shrink: 0;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 800;
                font-size: 0.94rem;
                box-shadow: 0 4px 13px rgba(245, 158, 11, 0.32);
                transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .instruction-item:hover .instruction-number {
                transform: scale(1.12) rotate(360deg);
            }

            .instruction-item p {
                margin: 0;
                color: #4b5563;
                font-size: 0.94rem;
                line-height: 1.58;
                padding-top: 5px;
            }

            /* ===== RESPONSIVE DESIGN ===== */

            /* Desktop Large */
            @media (min-width: 1200px) {
                .spinning-wheel-modal-container {
                    max-width: 1200px;
                }

                .spinning-wheel-content-wrapper {
                    padding: 36px;
                }

                .wheel-container {
                    min-height: 520px;
                }
            }

            /* Desktop Medium */
            @media (min-width: 1024px) and (max-width: 1199px) {
                .spinning-wheel-modal-container {
                    max-width: 1050px;
                }

                .wheel-container {
                    min-height: 460px;
                }
            }

            /* Tablet */
            @media (max-width: 1023px) {
                .spinning-wheel-wheel-step {
                    grid-template-columns: 1fr;
                    gap: 22px;
                }

                .wheel-container {
                    order: 1;
                    min-height: 420px;
                }

                .wheel-sidebar {
                    order: 2;
                }

                .spinning-wheel-modal-container {
                    max-width: 720px;
                    max-height: 88vh;
                }

                .spinning-wheel-modal-close {
                    top: -46px;
                }

                .spinning-wheel-content-wrapper {
                    padding: 26px;
                }
            }

            /* Mobile */
            @media (max-width: 767px) {
                .spinning-wheel-modal-container {
                    max-width: calc(100% - 24px);
                    max-height: 92vh;
                    padding: 12px;
                }

                .spinning-wheel-modal-close {
                    top: -42px;
                    width: 42px;
                    height: 42px;
                    background: rgba(0, 0, 0, 0.62);
                }

                .spinning-wheel-modal-content {
                    border-radius: 22px;
                }

                .spinning-wheel-modal-header {
                    padding: 22px 20px 18px;
                }

                .header-gift-icon {
                    width: 50px;
                    height: 50px;
                }

                .spinning-wheel-modal-title {
                    font-size: 1.42rem;
                }

                .spinning-wheel-modal-subtitle {
                    font-size: 0.88rem;
                }

                .spinning-wheel-content-wrapper {
                    padding: 22px 18px;
                }

                .spinning-wheel-wheel-step {
                    gap: 18px;
                }

                .wheel-container {
                    min-height: 360px;
                }

                .instructions-title {
                    font-size: 1.2rem;
                    text-align: center;
                }

                .instruction-item {
                    padding: 13px;
                    gap: 11px;
                }

                .instruction-number {
                    width: 32px;
                    height: 32px;
                    font-size: 0.88rem;
                }

                .instruction-item p {
                    font-size: 0.88rem;
                    padding-top: 3px;
                }

                .phone-icon-wrapper {
                    width: 50px;
                    height: 50px;
                }

                .phone-step-title {
                    font-size: 1.28rem;
                }

                .phone-description {
                    font-size: 0.88rem;
                }
            }

            /* Small Mobile */
            @media (max-width: 480px) {
                .wheel-container {
                    min-height: 320px;
                }

                .spinning-wheel-modal-title {
                    font-size: 1.28rem;
                }

                .instructions-title {
                    font-size: 1.12rem;
                }

                .instruction-item {
                    padding: 11px;
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
        
        const phoneBtnText = state.modal.querySelector('.phone-submit-btn span');
        if (phoneBtnText) phoneBtnText.textContent = t('continueButton');
        
        const privacyText = state.modal.querySelector('.privacy-badge span');
        if (privacyText) privacyText.textContent = t('privacyText');

        const instructionsTitle = state.modal.querySelector('.instructions-title');
        if (instructionsTitle) instructionsTitle.textContent = t('howToPlay');

        const instructionItems = state.modal.querySelectorAll('.instruction-item p');
        if (instructionItems.length >= 4) {
            instructionItems[0].textContent = t('step1');
            instructionItems[1].textContent = t('step2');
            instructionItems[2].textContent = t('step3');
            instructionItems[3].textContent = t('step4');
        }
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
                wheelStep.style.display = 'grid';
                
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
        requestAnimationFrame(() => {
            state.modal.classList.add('show');
        });
        
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
        }, 300);
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
        document.getElementById('universalWheelStep').style.display = 'grid';

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
        
        notification.innerHTML = `
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
                    <div class="coupon-title">✨ ${nt.title} ✨</div>
                    <div class="coupon-code-container">
                        <span class="coupon-label">${nt.codeLabel}</span>
                        <span class="coupon-code">${couponCode}</span>
                    </div>
                    <div class="coupon-message">
                        <span class="check-icon">✓</span>
                        ${nt.readyMessage}
                    </div>
                </div>
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
                    animation: slideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                
                .coupon-notification-card {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 10px 40px rgba(245, 158, 11, 0.4);
                    max-width: 360px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .coupon-gift-icon {
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 16px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .coupon-gift-icon svg {
                    width: 24px;
                    height: 24px;
                    color: white;
                }
                
                .coupon-notification-content {
                    text-align: center;
                    color: white;
                }
                
                .coupon-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin-bottom: 12px;
                }
                
                .coupon-code-container {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 12px;
                    padding: 14px;
                    margin: 12px 0;
                }
                
                .coupon-label {
                    display: block;
                    font-size: 0.75rem;
                    color: #d97706;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 700;
                }
                
                .coupon-code {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: 900;
                    letter-spacing: 2px;
                    font-family: 'Courier New', monospace;
                    color: #f59e0b;
                }
                
                .coupon-message {
                    font-size: 0.875rem;
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
                
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @media (max-width: 768px) {
                    .coupon-notification-container {
                        top: 16px;
                        right: 16px;
                        left: 16px;
                    }
                    
                    .coupon-notification-card {
                        max-width: 100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    function handleOutsideClick(event) {}
    function handleKeydown(event) {
        if (event.key === 'Escape' && state.modal && state.modal.classList.contains('show')) {
            autoApplyWinningCoupon();
            closeModal();
            markModalAsSeen();
        }
    }
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
            document.getElementById('universalWheelStep').style.display = 'grid';
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
