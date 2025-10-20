/**
 * Universal Spinning Wheel Modal - INTERPLANETARY LEVEL DESIGN V7
 * Лучший дизайн мира для спин-колеса с нуля!
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
        scrollPosition: 0,
        showInstructions: false
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
            title: 'Spin & Win!',
            subtitle: 'Try your luck for amazing discounts',
            enterPhoneTitle: 'Enter Your Number',
            phoneDescription: 'Get exclusive offers sent to you',
            phonePlaceholder: '+373 XX XXX XXX',
            continueButton: 'Continue to Spin',
            privacyText: 'Your data is secure',
            emptyPhone: 'Please enter a phone number',
            invalidPhone: 'Please enter a valid phone number',
            hasCoupons: 'You already have an active reward',
            howToPlay: 'How to Play',
            step1: 'Tap the center button',
            step2: 'Watch it spin',
            step3: 'Get your prize',
            step4: 'Use the code',
            showInstructions: 'How to Play?',
            hideInstructions: 'Close'
        },
        ru: {
            title: 'Крути и Выигрывай!',
            subtitle: 'Испытай удачу и получи скидку',
            enterPhoneTitle: 'Введи Номер',
            phoneDescription: 'Получи эксклюзивные предложения',
            phonePlaceholder: '+373 XX XXX XXX',
            continueButton: 'Крутить Колесо',
            privacyText: 'Данные защищены',
            emptyPhone: 'Введите номер телефона',
            invalidPhone: 'Введите корректный номер',
            hasCoupons: 'У вас уже есть активная награда',
            howToPlay: 'Как играть',
            step1: 'Нажми на кнопку',
            step2: 'Следи за вращением',
            step3: 'Получи приз',
            step4: 'Используй код',
            showInstructions: 'Как играть?',
            hideInstructions: 'Закрыть'
        },
        ro: {
            title: 'Rotește și Câștigă!',
            subtitle: 'Încearcă norocul pentru reduceri',
            enterPhoneTitle: 'Introdu Numărul',
            phoneDescription: 'Primește oferte exclusive',
            phonePlaceholder: '+373 XX XXX XXX',
            continueButton: 'Rotește Roata',
            privacyText: 'Datele sunt securizate',
            emptyPhone: 'Introdu numărul de telefon',
            invalidPhone: 'Introdu un număr valid',
            hasCoupons: 'Ai deja o recompensă activă',
            howToPlay: 'Cum să joci',
            step1: 'Apasă butonul',
            step2: 'Urmărește rotirea',
            step3: 'Primește premiul',
            step4: 'Folosește codul',
            showInstructions: 'Cum să joci?',
            hideInstructions: 'Închide'
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

    // Toggle instructions
    function toggleInstructions() {
        state.showInstructions = !state.showInstructions;
        const instructionsPanel = document.getElementById('instructionsPanel');
        const toggleBtn = document.getElementById('toggleInstructionsBtn');
        
        if (instructionsPanel && toggleBtn) {
            if (state.showInstructions) {
                instructionsPanel.classList.add('show');
                toggleBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>${t('hideInstructions')}</span>
                `;
            } else {
                instructionsPanel.classList.remove('show');
                toggleBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>${t('showInstructions')}</span>
                `;
            }
        }
    }

    // Create modal HTML
    function createModalHTML() {
        return `
            <div id="${CONFIG.modalId}" class="spinning-wheel-modal" style="display: none;">
                <div class="spinning-wheel-modal-backdrop"></div>
                <div class="spinning-wheel-modal-container">
                    <button class="spinning-wheel-modal-close" aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    
                    <div class="spinning-wheel-modal-content">
                        <!-- HEADER -->
                        <div class="spinning-wheel-modal-header" id="universalModalHeader">
                            <div class="header-content">
                                <div class="header-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 6v6l4 2"></path>
                                    </svg>
                                </div>
                                <h2 class="header-title">${t('title')}</h2>
                                <p class="header-subtitle">${t('subtitle')}</p>
                            </div>
                        </div>
                        
                        <!-- MAIN CONTENT -->
                        <div class="spinning-wheel-body">
                            <!-- PHONE STEP -->
                            <div class="phone-step" id="universalPhoneStep">
                                <div class="phone-card">
                                    <div class="phone-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                    </div>
                                    <h3 class="phone-title">${t('enterPhoneTitle')}</h3>
                                    <p class="phone-desc">${t('phoneDescription')}</p>
                                    <form class="phone-form" id="universalPhoneForm">
                                        <div class="form-group">
                                            <input type="tel" class="phone-input" id="universalPhoneInput" 
                                                   placeholder="${t('phonePlaceholder')}" required>
                                        </div>
                                        <button type="submit" class="phone-btn">
                                            <span>${t('continueButton')}</span>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M5 12h14M12 5l7 7-7 7"></path>
                                            </svg>
                                        </button>
                                        <div class="privacy-note">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                            </svg>
                                            <span>${t('privacyText')}</span>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            
                            <!-- WHEEL STEP -->
                            <div class="wheel-step" id="universalWheelStep" style="display: none;">
                                <div class="wheel-main">
                                    <div class="wheel-frame">
                                        <iframe id="universalSpinningWheelIframe" 
                                                src="${CONFIG.iframeSrc}" 
                                                frameborder="0" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                                        </iframe>
                                    </div>
                                    
                                    <!-- Mobile Instructions Toggle -->
                                    <button class="instructions-toggle" id="toggleInstructionsBtn" onclick="window.UniversalSpinningWheel.toggleInstructions()">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                        <span>${t('showInstructions')}</span>
                                    </button>
                                </div>
                                
                                <!-- Desktop Sidebar -->
                                <div class="wheel-sidebar">
                                    <div class="sidebar-content">
                                        <h3 class="sidebar-title">${t('howToPlay')}</h3>
                                        <div class="steps">
                                            <div class="step-item">
                                                <div class="step-num">1</div>
                                                <p>${t('step1')}</p>
                                            </div>
                                            <div class="step-item">
                                                <div class="step-num">2</div>
                                                <p>${t('step2')}</p>
                                            </div>
                                            <div class="step-item">
                                                <div class="step-num">3</div>
                                                <p>${t('step3')}</p>
                                            </div>
                                            <div class="step-item">
                                                <div class="step-num">4</div>
                                                <p>${t('step4')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Mobile Instructions Panel -->
                                <div class="instructions-panel" id="instructionsPanel">
                                    <div class="panel-content">
                                        <h3 class="panel-title">${t('howToPlay')}</h3>
                                        <div class="panel-steps">
                                            <div class="panel-step">
                                                <div class="panel-num">1</div>
                                                <p>${t('step1')}</p>
                                            </div>
                                            <div class="panel-step">
                                                <div class="panel-num">2</div>
                                                <p>${t('step2')}</p>
                                            </div>
                                            <div class="panel-step">
                                                <div class="panel-num">3</div>
                                                <p>${t('step3')}</p>
                                            </div>
                                            <div class="panel-step">
                                                <div class="panel-num">4</div>
                                                <p>${t('step4')}</p>
                                            </div>
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
            /* ===== INTERPLANETARY LEVEL DESIGN V7 ===== */
            
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            
            .spinning-wheel-modal {
                position: fixed;
                inset: 0;
                z-index: ${CONFIG.zIndex};
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.25s ease, visibility 0.25s ease;
            }

            .spinning-wheel-modal.show {
                opacity: 1;
                visibility: visible;
            }

            /* Backdrop */
            .spinning-wheel-modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(16px) saturate(180%);
                -webkit-backdrop-filter: blur(16px) saturate(180%);
                z-index: 1;
            }

            /* Container */
            .spinning-wheel-modal-container {
                position: relative;
                z-index: 2;
                width: 100%;
                max-width: 1200px;
                max-height: 92vh;
                margin: 0 auto;
                padding: 16px;
                transform: scale(0.94);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .spinning-wheel-modal.show .spinning-wheel-modal-container {
                transform: scale(1);
            }

            /* Close Button */
            .spinning-wheel-modal-close {
                position: absolute;
                top: -48px;
                right: 0;
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.95);
                border: none;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .spinning-wheel-modal-close svg {
                width: 18px;
                height: 18px;
                color: #1f2937;
            }

            .spinning-wheel-modal-close:hover {
                background: white;
                transform: rotate(90deg) scale(1.1);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
            }

            /* Main Content */
            .spinning-wheel-modal-content {
                background: white;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 
                    0 20px 60px rgba(0, 0, 0, 0.3),
                    0 0 0 1px rgba(0, 0, 0, 0.05);
                display: flex;
                flex-direction: column;
                max-height: 92vh;
            }

            /* Header */
            .spinning-wheel-modal-header {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                padding: 24px;
                position: relative;
                overflow: hidden;
            }

            .spinning-wheel-modal-header::before {
                content: '';
                position: absolute;
                inset: -50%;
                background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
                animation: headerRotate 15s linear infinite;
            }

            @keyframes headerRotate {
                to { transform: rotate(360deg); }
            }

            .header-content {
                position: relative;
                z-index: 1;
                text-align: center;
            }

            .header-icon {
                width: 48px;
                height: 48px;
                margin: 0 auto 12px;
                background: rgba(255, 255, 255, 0.25);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: iconFloat 3s ease-in-out infinite;
            }

            @keyframes iconFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
            }

            .header-icon svg {
                width: 24px;
                height: 24px;
                color: white;
            }

            .header-title {
                font-size: 1.75rem;
                font-weight: 800;
                color: white;
                margin-bottom: 6px;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }

            .header-subtitle {
                font-size: 0.9375rem;
                color: rgba(255, 255, 255, 0.95);
                text-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
            }

            /* Body */
            .spinning-wheel-body {
                flex: 1;
                padding: 28px;
                min-height: 0;
                overflow: hidden;
            }

            /* Phone Step */
            .phone-step {
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .phone-card {
                width: 100%;
                max-width: 400px;
                text-align: center;
            }

            .phone-icon {
                width: 56px;
                height: 56px;
                margin: 0 auto 16px;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 24px rgba(245, 158, 11, 0.35);
            }

            .phone-icon svg {
                width: 28px;
                height: 28px;
                color: white;
            }

            .phone-title {
                font-size: 1.5rem;
                font-weight: 800;
                color: #111827;
                margin-bottom: 8px;
            }

            .phone-desc {
                font-size: 0.9375rem;
                color: #6b7280;
                margin-bottom: 24px;
            }

            .phone-form {
                width: 100%;
            }

            .form-group {
                margin-bottom: 16px;
            }

            .phone-input {
                width: 100%;
                padding: 14px 16px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1rem;
                color: #111827;
                transition: all 0.2s;
                background: white;
            }

            .phone-input:focus {
                outline: none;
                border-color: #f59e0b;
                box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1);
            }

            .phone-input.error {
                border-color: #ef4444;
                box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
            }

            .phone-error-message {
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 8px;
                text-align: left;
            }

            .phone-btn {
                width: 100%;
                padding: 14px 20px;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s;
                box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
            }

            .phone-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 24px rgba(245, 158, 11, 0.4);
            }

            .phone-btn svg {
                width: 20px;
                height: 20px;
            }

            .privacy-note {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                margin-top: 12px;
                font-size: 0.875rem;
                color: #6b7280;
            }

            .privacy-note svg {
                width: 14px;
                height: 14px;
                color: #10b981;
            }

            /* Wheel Step */
            .wheel-step {
                height: 100%;
                display: grid;
                grid-template-columns: 1fr 320px;
                gap: 24px;
                position: relative;
            }

            .wheel-main {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .wheel-frame {
                flex: 1;
                border-radius: 16px;
                overflow: hidden;
                background: #fafafa;
                min-height: 450px;
            }

            #universalSpinningWheelIframe {
                width: 100%;
                height: 100%;
                border: none;
            }

            /* Desktop Sidebar */
            .wheel-sidebar {
                display: flex;
                flex-direction: column;
                background: #f9fafb;
                border-radius: 16px;
                padding: 24px;
            }

            .sidebar-content {
                flex: 1;
            }

            .sidebar-title {
                font-size: 1.25rem;
                font-weight: 800;
                color: #111827;
                margin-bottom: 16px;
            }

            .steps {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .step-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px;
                background: white;
                border-radius: 10px;
                transition: all 0.2s;
                cursor: pointer;
            }

            .step-item:hover {
                background: #fff;
                transform: translateX(4px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            }

            .step-num {
                width: 32px;
                height: 32px;
                flex-shrink: 0;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 800;
                font-size: 0.875rem;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }

            .step-item p {
                flex: 1;
                color: #4b5563;
                font-size: 0.9375rem;
                line-height: 1.5;
                padding-top: 4px;
            }

            /* Mobile Instructions Toggle */
            .instructions-toggle {
                display: none;
                width: 100%;
                padding: 12px 16px;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                color: #374151;
                font-size: 0.9375rem;
                font-weight: 600;
                cursor: pointer;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s;
            }

            .instructions-toggle svg {
                width: 18px;
                height: 18px;
            }

            .instructions-toggle:hover {
                background: #f9fafb;
                border-color: #d1d5db;
            }

            /* Mobile Instructions Panel */
            .instructions-panel {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: white;
                border-radius: 20px 20px 0 0;
                padding: 24px;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
                z-index: 10;
                max-height: 60vh;
                overflow-y: auto;
                display: none;
            }

            .instructions-panel.show {
                transform: translateY(0);
            }

            .panel-content {
                width: 100%;
            }

            .panel-title {
                font-size: 1.25rem;
                font-weight: 800;
                color: #111827;
                margin-bottom: 16px;
                text-align: center;
            }

            .panel-steps {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .panel-step {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px;
                background: #f9fafb;
                border-radius: 10px;
            }

            .panel-num {
                width: 32px;
                height: 32px;
                flex-shrink: 0;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 800;
                font-size: 0.875rem;
            }

            .panel-step p {
                flex: 1;
                color: #4b5563;
                font-size: 0.9375rem;
                line-height: 1.5;
                padding-top: 4px;
            }

            /* ===== RESPONSIVE ===== */

            /* Desktop Large */
            @media (min-width: 1280px) {
                .spinning-wheel-modal-container {
                    max-width: 1280px;
                }

                .wheel-step {
                    grid-template-columns: 1fr 360px;
                }

                .wheel-frame {
                    min-height: 500px;
                }
            }

            /* Tablet */
            @media (max-width: 1023px) {
                .wheel-step {
                    grid-template-columns: 1fr;
                }

                .wheel-sidebar {
                    display: none;
                }

                .instructions-toggle {
                    display: flex;
                }

                .instructions-panel {
                    display: block;
                }

                .wheel-frame {
                    min-height: 400px;
                }
            }

            /* Mobile */
            @media (max-width: 767px) {
                .spinning-wheel-modal-container {
                    padding: 12px;
                    max-height: 95vh;
                }

                .spinning-wheel-modal-close {
                    top: -44px;
                    width: 38px;
                    height: 38px;
                }

                .spinning-wheel-modal-content {
                    border-radius: 18px;
                }

                .spinning-wheel-modal-header {
                    padding: 20px;
                }

                .header-icon {
                    width: 44px;
                    height: 44px;
                }

                .header-title {
                    font-size: 1.5rem;
                }

                .header-subtitle {
                    font-size: 0.875rem;
                }

                .spinning-wheel-body {
                    padding: 20px;
                }

                .phone-icon {
                    width: 52px;
                    height: 52px;
                }

                .phone-title {
                    font-size: 1.375rem;
                }

                .phone-desc {
                    font-size: 0.875rem;
                }

                .wheel-frame {
                    min-height: 340px;
                }

                .instructions-panel {
                    padding: 20px;
                }
            }

            /* Small Mobile */
            @media (max-width: 480px) {
                .wheel-frame {
                    min-height: 300px;
                }

                .header-title {
                    font-size: 1.375rem;
                }
            }
        `;
        return style;
    }

    // Update translations
    function updateModalTranslations() {
        if (!state.modal) return;
        
        const elements = {
            '.header-title': t('title'),
            '.header-subtitle': t('subtitle'),
            '.phone-title': t('enterPhoneTitle'),
            '.phone-desc': t('phoneDescription'),
            '.phone-btn span': t('continueButton'),
            '.privacy-note span': t('privacyText'),
            '.sidebar-title': t('howToPlay'),
            '.panel-title': t('howToPlay')
        };

        Object.entries(elements).forEach(([selector, text]) => {
            const el = state.modal.querySelector(selector);
            if (el) el.textContent = text;
        });

        const phoneInput = state.modal.querySelector('#universalPhoneInput');
        if (phoneInput) phoneInput.placeholder = t('phonePlaceholder');

        const stepItems = state.modal.querySelectorAll('.step-item p, .panel-step p');
        const steps = [t('step1'), t('step2'), t('step3'), t('step4')];
        stepItems.forEach((el, i) => {
            if (steps[i]) el.textContent = steps[i];
        });
    }

    // Show modal
    function showModal(options = {}) {
        if (!state.modal) return;
        
        if (state.userClosedModal) {
            console.log('⏸️ User closed modal');
            return;
        }
        
        if (isAnyModalOpen()) {
            console.log('⏳ Another modal open, waiting...');
            
            if (state.modalCheckInterval) {
                clearInterval(state.modalCheckInterval);
            }
            
            state.modalCheckInterval = setInterval(() => {
                if (!isAnyModalOpen() && !state.userClosedModal) {
                    console.log('✅ Showing wheel');
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
                const sep = baseSrc.includes('?') ? '&' : '?';
                iframe.src = `${baseSrc}${sep}wheel=${options.wheelId}`;
            }
        }
        
        const modalHeader = document.getElementById('universalModalHeader');
        const phoneStep = document.getElementById('universalPhoneStep');
        const wheelStep = document.getElementById('universalWheelStep');
        
        if (skipPhoneStep) {
            if (phoneStep) phoneStep.style.display = 'none';
            if (wheelStep) wheelStep.style.display = 'grid';
            if (modalHeader) modalHeader.style.display = 'none';
            
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
        } else {
            if (phoneStep) phoneStep.style.display = 'flex';
            if (wheelStep) wheelStep.style.display = 'none';
            if (modalHeader) modalHeader.style.display = 'block';
        }
        
        disableBodyScroll();
        
        state.modal.style.display = 'flex';
        requestAnimationFrame(() => {
            state.modal.classList.add('show');
        });
        
        console.log('🎡 Wheel shown');
    }

    // Close modal
    function closeModal() {
        if (!state.modal) return;
        
        state.userClosedModal = true;
        
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

    // Validate phone
    function validatePhoneNumber(phoneNumber) {
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        if (cleaned.startsWith('+')) {
            const digits = cleaned.substring(1);
            return digits.length >= 7 && digits.length <= 15 && /^\d+$/.test(digits);
        }
        return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
    }

    // Format phone
    function formatPhoneNumber(phoneNumber) {
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        return cleaned.startsWith('+') ? cleaned : cleaned;
    }

    // Handle phone input
    function handlePhoneInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^\d+\-\(\)\s]/g, '');
        
        if (value.length > 20) value = value.substring(0, 20);
        
        input.value = value;
        input.classList.remove('error');
        
        const error = input.parentNode.querySelector('.phone-error-message');
        if (error) error.remove();
    }

    function showPhoneError(input, message) {
        input.classList.add('error');
        
        let error = input.parentNode.querySelector('.phone-error-message');
        if (error) error.remove();
        
        error = document.createElement('div');
        error.className = 'phone-error-message';
        error.textContent = message;
        input.parentNode.appendChild(error);
    }

    // Handle phone submit
    async function handlePhoneSubmit(event) {
        event.preventDefault();

        const phoneInput = document.getElementById('universalPhoneInput');
        const phoneNumber = phoneInput.value.trim();

        phoneInput.classList.remove('error');
        const existingError = phoneInput.parentNode.querySelector('.phone-error-message');
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
            }).catch(() => {});
        } catch (err) {}

        const modalHeader = document.getElementById('universalModalHeader');
        if (modalHeader) modalHeader.style.display = 'none';

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

    // Auto-apply coupon
    function autoApplyWinningCoupon() {
        try {
            const savedCoupon = localStorage.getItem('spinningWheelWinningCoupon');
            if (savedCoupon) handleAutoApplyCoupon(savedCoupon);
        } catch (error) {}
    }

    // Handle auto-apply
    function handleAutoApplyCoupon(couponCode) {
        try {
            localStorage.setItem('autoApplyCoupon', couponCode);
            
            if (window.AutoApplyCoupon && window.AutoApplyCoupon.autoApply) {
                setTimeout(() => window.AutoApplyCoupon.autoApply(), 100);
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
                readyMessage: 'Ready for your next booking!'
            },
            ru: {
                title: 'Купон Применён!',
                codeLabel: 'Код:',
                readyMessage: 'Готов к использованию!'
            },
            ro: {
                title: 'Cupon Aplicat!',
                codeLabel: 'Cod:',
                readyMessage: 'Gata de utilizare!'
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
                    animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                
                .coupon-notification-card {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 8px 32px rgba(245, 158, 11, 0.4);
                    max-width: 340px;
                }
                
                .coupon-gift-icon {
                    width: 44px;
                    height: 44px;
                    margin: 0 auto 14px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .coupon-gift-icon svg {
                    width: 22px;
                    height: 22px;
                    color: white;
                }
                
                .coupon-notification-content {
                    text-align: center;
                    color: white;
                }
                
                .coupon-title {
                    font-size: 1.2rem;
                    font-weight: 800;
                    margin-bottom: 12px;
                }
                
                .coupon-code-container {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 10px;
                    padding: 12px;
                    margin: 10px 0;
                }
                
                .coupon-label {
                    display: block;
                    font-size: 0.7rem;
                    color: #d97706;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 700;
                }
                
                .coupon-code {
                    display: block;
                    font-size: 1.4rem;
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
                    width: 16px;
                    height: 16px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    font-size: 11px;
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
            
            if (!response.ok) return null;
            
            const wheelConfigs = await response.json();
            const nonPremium = wheelConfigs.filter(w => !w.is_premium);
            
            if (nonPremium.length === 0) {
                return wheelConfigs.length > 0 ? wheelConfigs[0] : null;
            }
            
            if (nonPremium.length === 1) return nonPremium[0];
            
            const percent = nonPremium.filter(w => w.type === 'percent');
            if (percent.length > 0) return percent[0];
            
            const freeDays = nonPremium.filter(w => w.type === 'free-days');
            if (freeDays.length > 0) return freeDays[0];
            
            return nonPremium[0];
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
        
        if (window.location.pathname.includes('spinning-wheel')) return;

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
            if (modalHeader) modalHeader.style.display = 'none';
            
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
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
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
        toggleInstructions: toggleInstructions,
        fetchWheelIdByType: fetchWheelIdByType
    };

})();
