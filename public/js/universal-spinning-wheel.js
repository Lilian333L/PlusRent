/**
 * Universal Spinning Wheel Modal Trigger - Orange Theme
 * Optimized for performance with full functionality preserved
 */

(function() {
    'use strict';

    // ========== SAFE STORAGE HELPERS ==========
    function safeGetItem(storage, key) {
        try { return storage.getItem(key); } catch(e) { return null; }
    }
    function safeSetItem(storage, key, value) {
        try { storage.setItem(key, value); return true; } catch(e) { return false; }
    }
    function safeRemoveItem(storage, key) {
        try { storage.removeItem(key); } catch(e) {}
    }

    // Configuration
    const CONFIG = {
        delay: 3 * 60 * 1000, // 3 минуты
        storageKey: 'spinningWheelLastSeen',
        modalId: 'universal-spinning-wheel-modal',
        iframeSrc: '/spinning-wheel-standalone.html',
        zIndex: 9999,
        phoneSubmitCooldown: 10000 // 10 секунд между отправками
    };

    // State management
    let state = {
        modal: null,
        iframe: null,
        timer: null,
        isInitialized: false,
        userClosedModal: false,
        modalCheckInterval: null,
        lastPhoneSubmitTime: 0 // rate limiting
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
            '#imageLightbox[style*="display:block"]',
            // PlusRent-specific modals (not covered by generic .modal class)
            '#price-calculator-modal[style*="display: flex"]',
            '#price-calculator-modal[style*="display:flex"]',
            '#price-calculator-modal[style*="display: block"]',
            '.price-calculator-modal[style*="display: flex"]',
            '.contact-popup-overlay[style*="display: flex"]',
            '.contact-popup-overlay[style*="display:flex"]',
            '.contact-popup-overlay.open',
            '#contactPopup[style*="display: flex"]',
            '#contactPopup[style*="display:flex"]'
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

        // PlusRent: when modal locks body via inline position:fixed (top:-Npx)
        if (document.body.style.position === 'fixed' && document.body.style.top) {
            return true;
        }

        return false;
    }

    // Get current language
    function getCurrentLanguage() {
        const storedLang = safeGetItem(localStorage, 'lang') || safeGetItem(localStorage, 'language') || safeGetItem(localStorage, 'i18nextLng');
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
            title: 'Try your luck!',
            subtitle: 'Spin the wheel and win a discount on your rental.',
            enterPhoneTitle: 'Enter your number',
            phoneDescription: 'Your discount code will be linked to this number, so nobody else can use it.',
            phonePlaceholder: '69 123 456',
            continueButton: 'Continue',
            privacyText: 'Your data is secure',
            emptyPhone: 'Please enter a phone number',
            invalidPhone: 'Please enter a valid phone number (7-15 digits)',
            hasCoupons: 'You have already received a reward for this phone number.',
            tooFast: 'Please wait a few seconds before trying again.'
        },
        ru: {
            title: 'Испытайте удачу!',
            subtitle: 'Крутите колесо и выиграйте скидку на аренду автомобиля.',
            enterPhoneTitle: 'Введите ваш номер',
            phoneDescription: 'Код скидки привяжем к этому номеру, так им не сможет воспользоваться никто другой.',
            phonePlaceholder: '69 123 456',
            continueButton: 'Продолжить',
            privacyText: 'Ваши данные защищены',
            emptyPhone: 'Пожалуйста, введите номер телефона',
            invalidPhone: 'Пожалуйста, введите корректный номер (7-15 цифр)',
            hasCoupons: 'Вы уже получили награду за этот номер телефона.',
            tooFast: 'Подождите несколько секунд перед повторной попыткой.'
        },
        ro: {
            title: 'Încearcă-ți norocul!',
            subtitle: 'Învârte roata și câștigă o reducere la închirierea mașinii.',
            enterPhoneTitle: 'Introdu numărul tău',
            phoneDescription: 'Codul de reducere va fi legat de acest număr, așa că nimeni altcineva nu îl poate folosi.',
            phonePlaceholder: '69 123 456',
            continueButton: 'Continuă',
            privacyText: 'Datele tale sunt securizate',
            emptyPhone: 'Vă rugăm introduceți numărul de telefon',
            invalidPhone: 'Vă rugăm introduceți un număr valid (7-15 cifre)',
            hasCoupons: 'Ai primit deja o recompensă pentru acest număr de telefon.',
            tooFast: 'Vă rugăm așteptați câteva secunde înainte de a încerca din nou.'
        }
    };

    function t(key) {
        const lang = getCurrentLanguage();
        return translations[lang][key] || translations['ro'][key] || key;
    }

    // ========== IMPROVED: Проверка — показывать ли модалку ==========
    function hasSeenModalToday() {
        // Если получил награду — не показывать НИКОГДА
        const rewardReceived = safeGetItem(localStorage, 'spinningWheelRewardReceived');
        if (rewardReceived === 'true') {
            return true;
        }

        // Если уже видел модалку (закрыл/крутил) — не показывать НИКОГДА
        const lastSeen = safeGetItem(localStorage, CONFIG.storageKey);
        if (lastSeen) {
            return true;
        }

        return false;
    }

    // ========== IMPROVED: sessionStorage для таймера ==========
    function getTotalWebsiteTime() {
        const startTime = safeGetItem(sessionStorage, 'wheelTimerStart');
        if (!startTime) return 0;
        return Date.now() - parseInt(startTime);
    }

    function setWebsiteStartTime() {
        if (!safeGetItem(sessionStorage, 'wheelTimerStart')) {
            safeSetItem(sessionStorage, 'wheelTimerStart', Date.now().toString());
        }
    }

    function clearWebsiteTimer() {
        safeRemoveItem(sessionStorage, 'wheelTimerStart');
    }

    function markModalAsSeen() {
        safeSetItem(localStorage, CONFIG.storageKey, new Date().toISOString());
        clearWebsiteTimer();
    }

    // Create modal HTML (styles: css/spin-wheel.css, loaded on first show)
    function createModalHTML() {
        return `
            <div id="${CONFIG.modalId}" class="spinning-wheel-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="swmTitle" tabindex="-1">
                <div class="spinning-wheel-modal-content">
                    <button type="button" class="spinning-wheel-modal-close" aria-label="&times;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                    <div class="spinning-wheel-modal-header">
                        <div class="swm-teaser" aria-hidden="true"></div>
                        <h2 class="spinning-wheel-modal-title" id="swmTitle">${t('title')}</h2>
                        <p class="spinning-wheel-modal-subtitle">${t('subtitle')}</p>
                    </div>

                    <div class="spinning-wheel-wheel-content">
                        <div class="spinning-wheel-phone-step" id="universalPhoneStep">
                            <div class="phone-input-container">
                                <h3 class="phone-step-title">${t('enterPhoneTitle')}</h3>
                                <p class="phone-description">${t('phoneDescription')}</p>
                                <form class="phone-form" id="universalPhoneForm">
                                    <div class="input-wrapper">
                                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        <input type="tel" class="phone-input" id="universalPhoneInput" autocomplete="tel"
                                               placeholder="${t('phonePlaceholder')}" aria-label="${t('enterPhoneTitle')}" required>
                                    </div>
                                    <button type="submit" class="phone-submit-btn">
                                        <span class="phone-btn-text">${t('continueButton')}</span>
                                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                                    </button>
                                    <div class="privacy-badge">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        <span class="privacy-text">${t('privacyText')}</span>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div class="spinning-wheel-wheel-step" id="universalWheelStep" style="display: none;">
                            <iframe id="universalSpinningWheelIframe" title="${t('title')}"
                                    allow="clipboard-write"></iframe>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // The country picker (js/phone-input.js) is on the pages with a booking
    // form. On the others the wheel fetches it itself, so the number is always
    // entered with its country and checked ("valid Moldovan number") before a
    // code is tied to it. When phone-input.min.js changes, update its ?v= here.
    const PHONE_WIDGET = '/js/phone-input.min.js?v=5173709e';
    let phoneWidgetPromise = null;
    function enhancePhoneField() {
        const input = document.getElementById('universalPhoneInput');
        if (!input || !window.PhoneInput || !window.PhoneInput.enhance) return;
        window.PhoneInput.enhance(input);
        // The picker stands where the little handset icon used to.
        const icon = state.modal && state.modal.querySelector('.input-wrapper .input-icon');
        if (icon) icon.style.display = 'none';
    }
    function ensurePhoneWidget() {
        if (window.PhoneInput && window.PhoneInput.enhance) {
            enhancePhoneField();
            return Promise.resolve();
        }
        if (phoneWidgetPromise) return phoneWidgetPromise;
        phoneWidgetPromise = new Promise(function (resolve) {
            const script = document.createElement('script');
            script.src = PHONE_WIDGET;
            script.onload = function () { enhancePhoneField(); resolve(); };
            script.onerror = function () { resolve(); };
            document.head.appendChild(script);
            setTimeout(resolve, 4000);
        });
        return phoneWidgetPromise;
    }

    // The modals' styles live in css/spin-wheel.css and are fetched the first
    // time one of them opens (every page carries this script, few open it).
    // When the stylesheet changes, update its ?v= here.
    const WHEEL_CSS = '/css/spin-wheel.min.css?v=56b05975';
    let wheelCssPromise = null;
    function ensureWheelCss() {
        if (wheelCssPromise) return wheelCssPromise;
        wheelCssPromise = new Promise(function (resolve) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = WHEEL_CSS;
            link.onload = function () { resolve(); };
            link.onerror = function () { resolve(); };
            document.head.appendChild(link);
            setTimeout(resolve, 3000);
        });
        return wheelCssPromise;
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
        
        // The country picker owns the placeholder once it has enhanced the
        // field: it shows an example without a dial code, because the code is
        // already displayed to the left of the field.
        const phoneInputElement = state.modal.querySelector('#universalPhoneInput');
        if (phoneInputElement && !phoneInputElement.dataset.prPhone) {
            phoneInputElement.placeholder = t('phonePlaceholder');
        }
        
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
        // PlusRent v6: NEVER force-close another modal to show the wheel.
        // Previously this branch waited 4s then ripped open modals via
        // `style.display = 'none'` + removed body.modal-open class. That
        // showed the wheel on top of an open price-calculator-modal (which
        // also had its scroll-lock listeners still attached → clicks/inputs
        // on the wheel were swallowed → user couldn't interact with either).
        // Now we poll politely: re-check every 3s, show only when no other
        // modal is open. The 4s "force" path is gone.
        console.log('⏳ Another modal is open, will retry in 3 seconds...');
        if (state._waitingForModalClose) return; // already polling
        state._waitingForModalClose = true;
        const retry = () => {
            if (state.userClosedModal) {
                state._waitingForModalClose = false;
                return;
            }
            if (isAnyModalOpen()) {
                setTimeout(retry, 3000);
            } else {
                state._waitingForModalClose = false;
                console.log('✅ Other modal closed, showing wheel now');
                // Give the just-closed modal one extra tick to fully clean up
                setTimeout(() => showModalInternal(options), 250);
            }
        };
        setTimeout(retry, 3000);
        return;
    }
    
    showModalInternal(options);
}

function showBonusNotification() {
    const successModal = document.querySelector('.booking-success-modal, #booking-success-modal, .success-modal');
    if (!successModal) return;
    
    if (document.getElementById('bonus-notification')) return;
    
    const notification = document.createElement('div');
    notification.id = 'bonus-notification';
    notification.style.cssText = `
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #1C1917 0%, #292524 100%);
        color: #f59e0b;
        padding: 11px 22px;
        border-radius: 50px;
        border: 1.5px solid rgba(245, 158, 11, 0.45);
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 6px 22px rgba(0, 0, 0, 0.30), 0 0 0 0 rgba(245, 158, 11, 0.45);
        z-index: 10000;
        animation: bonusPulse 2.4s ease-in-out infinite;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        max-width: calc(100% - 32px);
    `;
    
    notification.innerHTML = `
        <span style="font-size: 18px;" aria-hidden="true">🎁</span>
        <span style="color: #ffffff;">${getCurrentLanguage() === 'ru' ? 'Ваш бонус готов! Открытие через' : getCurrentLanguage() === 'ro' ? 'Bonusul tău este gata! Se deschide în' : 'Your bonus is ready! Opening in'} <span id="bonus-countdown" style="color: #f59e0b; font-weight: 800;">4</span>${getCurrentLanguage() === 'ru' ? ' сек...' : 's...'}</span>
    `;
    
    if (!document.getElementById('bonus-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'bonus-notification-styles';
        style.textContent = `
            @keyframes bonusPulse {
                0%, 100% {
                    transform: translateX(-50%) scale(1);
                    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.30), 0 0 0 0 rgba(245, 158, 11, 0.45);
                }
                65% {
                    transform: translateX(-50%) scale(1.03);
                    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.30), 0 0 0 14px rgba(245, 158, 11, 0);
                }
            }
            @media (prefers-reduced-motion: reduce) {
                #bonus-notification {
                    animation: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    successModal.appendChild(notification);
    
    let seconds = 4;
    const countdownInterval = setInterval(() => {
        seconds--;
        const countdownEl = document.getElementById('bonus-countdown');
        if (countdownEl) {
            countdownEl.textContent = seconds;
        }
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            if (notification.parentElement) {
                notification.remove();
            }
        }
    }, 1000);
}

function showModalInternal(options = {}) {
    const waits = [ensureWheelCss()];
    if (!options.skipPhoneStep) waits.push(ensurePhoneWidget());
    Promise.all(waits).then(function () { showModalNow(options); });
}

function showModalNow(options = {}) {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${window.scrollY}px`;
    state._weOwnBodyLock = true; // PlusRent v6: mark this body lock as ours
    
    updateModalTranslations();
    
    const { skipPhoneStep = false, phoneNumber = null, wheelType = 'percent' } = options;
    
    // Загружаем iframe только при показе модалки
    const iframe = document.getElementById('universalSpinningWheelIframe');
    if (iframe && !iframe.src) {
        const baseSrc = CONFIG.iframeSrc;
        if (options.wheelId) {
            const separator = baseSrc.includes('?') ? '&' : '?';
            iframe.src = `${baseSrc}${separator}wheel=${options.wheelId}`;
        } else {
            iframe.src = baseSrc;
        }
    } else if (iframe && options.wheelId) {
        const baseSrc = CONFIG.iframeSrc;
        const separator = baseSrc.includes('?') ? '&' : '?';
        iframe.src = `${baseSrc}${separator}wheel=${options.wheelId}`;
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
                safeSetItem(localStorage, 'spinningWheelPhone', phoneNumber);
                safeSetItem(localStorage, 'spinningWheelPhoneEntered', 'true');
                
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
        try { state.modal.focus({ preventScroll: true }); } catch (e) {}
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
        
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.overflow = '';
        document.body.style.width = '';
        state._weOwnBodyLock = false; // PlusRent v6: released our body lock
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

        // ========== RATE LIMITING ==========
        const now = Date.now();
        if (now - state.lastPhoneSubmitTime < CONFIG.phoneSubmitCooldown) {
            const phoneInput = document.getElementById('universalPhoneInput');
            showPhoneError(phoneInput, t('tooFast'));
            return;
        }

        const phoneInput = document.getElementById('universalPhoneInput');
        const phoneNumber = phoneInput.value.trim();

        phoneInput.classList.remove('phone-input-error');
        const existingError = phoneInput.parentNode.parentNode.querySelector('.phone-error-message');
        if (existingError) existingError.remove();

        if (!phoneNumber) {
            showPhoneError(phoneInput, t('emptyPhone'));
            return;
        }

        // The picker knows the country and how many digits it uses, so it has
        // the final word; formatPhoneNumber is the fallback for a page where
        // the widget never loaded.
        const widget = phoneInput.prPhone;
        if (widget) {
            const verdict = widget.validate();
            if (!verdict.ok) return;
        } else if (!validatePhoneNumber(phoneNumber)) {
            showPhoneError(phoneInput, t('invalidPhone'));
            return;
        }

        // Stored and tracked with the country code, so the coupon a returning
        // customer earned here is still found when they book.
        const formattedPhone =
            (window.PhoneInput && window.PhoneInput.full(phoneInput)) ||
            formatPhoneNumber(phoneNumber);

        // Disable button during request
        const submitBtn = document.querySelector('.phone-submit-btn');
        if (submitBtn) submitBtn.disabled = true;

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
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }
            }
        } catch (error) {}

        // Mark submit time for rate limiting
        state.lastPhoneSubmitTime = Date.now();

        safeSetItem(localStorage, 'spinningWheelPhone', formattedPhone);
        safeSetItem(localStorage, 'spinningWheelPhoneEntered', 'true');

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

        if (submitBtn) submitBtn.disabled = false;
    }

    function handleWheelMessage(event) {
        if (event.data && event.data.type === 'wheelFrameHeight') {
            const iframe = document.getElementById('universalSpinningWheelIframe');
            const h = Number(event.data.height);
            if (iframe && h > 0 && h < 2000) iframe.style.height = Math.ceil(h) + 'px';
            return;
        }
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
            const savedCouponCode = safeGetItem(localStorage, 'spinningWheelWinningCoupon');
            if (savedCouponCode) {
                handleAutoApplyCoupon(savedCouponCode);
            }
        } catch (error) {}
    }

    function handleAutoApplyCoupon(couponCode) {
        try {
            safeSetItem(localStorage, 'autoApplyCoupon', couponCode);
            
            if (window.AutoApplyCoupon && window.AutoApplyCoupon.autoApply) {
                setTimeout(() => {
                    window.AutoApplyCoupon.autoApply();
                }, 100);
            }
            
            showCouponAppliedNotification(couponCode);
        } catch (error) {}
    }

    // ========== The applied coupon, drawn as a ticket ==========
    // A stub with the value (-14% or +2 days), a perforation, then the words.
    // Dark as the toast after the wheel, light under the code field of the
    // booking forms (car pages, the home page price calculator).
    const TICKET_WORDS = {
        ro: { applied: 'Cupon aplicat', pct: 'Reducere de {v}% aplicată', days1: '1 zi gratuită adăugată', daysN: '{v} zile gratuite adăugate', code: 'Cod', inForm: 'Codul e deja în formularul de rezervare.', saved: 'Codul e salvat și apare singur când rezervi.', daysNote: 'Zilele gratuite se aplică la preluarea mașinii.', day: 'zi', days: 'zile' },
        ru: { applied: 'Купон применён', pct: 'Скидка {v}% применена', days1: 'Добавлен 1 бесплатный день', daysN: 'Добавлено {v} бесплатных {w}', code: 'Код', inForm: 'Код уже стоит в форме бронирования.', saved: 'Код сохранён и сам появится при бронировании.', daysNote: 'Бесплатные дни учтём при выдаче машины.', day: 'день', days: 'дня', days5: 'дней' },
        en: { applied: 'Coupon applied', pct: '{v}% discount applied', days1: '1 free day added', daysN: '{v} free days added', code: 'Code', inForm: 'The code is already in the booking form.', saved: 'The code is saved and fills in when you book.', daysNote: 'Free days are applied when you pick up the car.', day: 'day', days: 'days' }
    };

    function ticketWords() {
        return TICKET_WORDS[getCurrentLanguage()] || TICKET_WORDS.ro;
    }

    function ruDays(n) {
        const w = TICKET_WORDS.ru, m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return w.day;
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return w.days;
        return w.days5;
    }

    const couponLookups = {};
    function lookupCoupon(code) {
        code = String(code || '').trim();
        if (code.length < 3) return Promise.resolve(null);
        if (couponLookups[code]) return couponLookups[code];
        const phone = safeGetItem(localStorage, 'spinningWheelPhone');
        const url = (window.API_BASE_URL || '') + '/api/coupons/lookup/' + encodeURIComponent(code) +
            (phone ? '?phone=' + encodeURIComponent(phone) : '');
        couponLookups[code] = fetch(url)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d || !d.valid) return null;
                return {
                    pct: Number(d.discount_percentage) || 0,
                    days: Number(d.free_days) || 0
                };
            })
            .catch(function () { delete couponLookups[code]; return null; });
        return couponLookups[code];
    }

    function buildTicket(code, info, variant) {
        const w = ticketWords();
        const lang = getCurrentLanguage();
        const el = document.createElement('div');
        el.className = 'pr-ticket pr-ticket--' + variant;

        const stub = document.createElement('span');
        stub.className = 'pr-ticket-stub';
        stub.setAttribute('aria-hidden', 'true');
        const main = document.createElement('span');
        main.className = 'pr-ticket-main';
        const title = document.createElement('span');
        title.className = 'pr-ticket-title';
        const sub = document.createElement('span');
        sub.className = 'pr-ticket-sub';
        const codeEl = document.createElement('span');
        codeEl.className = 'pr-ticket-code';
        codeEl.textContent = code;

        if (info && info.days > 0) {
            stub.innerHTML = '<span class="pr-ticket-value">+' + info.days + '</span><span class="pr-ticket-unit">' +
                (lang === 'ru' ? ruDays(info.days) : info.days === 1 ? w.day : w.days) + '</span>';
            title.textContent = info.days === 1 ? w.days1 : w.daysN.replace('{v}', info.days).replace('{w}', ruDays(info.days));
        } else if (info && info.pct > 0) {
            stub.innerHTML = '<span class="pr-ticket-value">&minus;' + info.pct + '%</span>';
            title.textContent = w.pct.replace('{v}', info.pct);
        } else {
            stub.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
            title.textContent = w.applied;
        }

        sub.append(w.code + ' ', codeEl);
        main.append(title, sub);
        if (variant === 'dark') {
            const note = document.createElement('span');
            note.className = 'pr-ticket-note';
            const hasForm = document.querySelector('input[name="discount_code"], #modal-discount-code');
            note.textContent = hasForm ? w.inForm : w.saved;
            main.append(note);
        } else if (info && info.days > 0) {
            const note = document.createElement('span');
            note.className = 'pr-ticket-note';
            note.textContent = w.daysNote;
            main.append(note);
        }
        el.append(stub, main);
        return el;
    }

    function showCouponAppliedNotification(couponCode) {
        const old = document.getElementById('coupon-applied-notification');
        if (old) old.remove();

        Promise.all([ensureWheelCss(), lookupCoupon(couponCode)]).then(function (res) {
            const notification = document.createElement('div');
            notification.id = 'coupon-applied-notification';
            notification.setAttribute('role', 'status');
            const ticket = buildTicket(couponCode, res[1], 'dark');
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'pr-ticket-close';
            close.setAttribute('aria-label', '\u00d7');
            close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
            ticket.append(close);
            notification.append(ticket);
            document.body.appendChild(notification);

            let timer = null;
            const leave = function () {
                clearTimeout(timer);
                notification.classList.add('is-leaving');
                setTimeout(function () { notification.remove(); }, 320);
            };
            close.addEventListener('click', leave);
            timer = setTimeout(leave, 7000);
        });
    }

    // Under the code field of a booking form: the ticket while the code is valid.
    const CODE_FIELDS = 'input[name="discount_code"], #modal-discount-code';
    const cardTimers = new WeakMap();
    function refreshCouponCard(input) {
        clearTimeout(cardTimers.get(input));
        cardTimers.set(input, setTimeout(function () {
            const code = (input.value || '').trim();
            const next = input.nextElementSibling;
            const card = next && next.classList && next.classList.contains('pr-ticket') ? next : null;
            if (code.length < 3 || input.classList.contains('is-invalid')) {
                if (card) card.remove();
                return;
            }
            Promise.all([ensureWheelCss(), lookupCoupon(code)]).then(function (res) {
                if ((input.value || '').trim() !== code) return;
                const current = input.nextElementSibling;
                if (current && current.classList && current.classList.contains('pr-ticket')) current.remove();
                if (!res[1]) return;
                const fresh = buildTicket(code, res[1], 'light');
                fresh.setAttribute('role', 'status');
                input.insertAdjacentElement('afterend', fresh);
            });
        }, 350));
    }
    function watchCouponFields() {
        ['input', 'change', 'blur'].forEach(function (type) {
            document.addEventListener(type, function (e) {
                const t = e.target;
                if (t && t.matches && t.matches(CODE_FIELDS)) refreshCouponCard(t);
            }, true);
        });
        // a code put in by auto-apply before this ran, or by a page script without events
        const scan = function () {
            document.querySelectorAll(CODE_FIELDS).forEach(function (input) {
                if ((input.value || '').trim().length >= 3) refreshCouponCard(input);
            });
        };
        setTimeout(scan, 1500);
        setTimeout(scan, 4000);
        document.addEventListener('click', function (e) {
            if (e.target && e.target.closest && e.target.closest('[onclick*="openPriceCalculator"], .btn-calculate, #calculate-price-btn')) setTimeout(scan, 900);
        }, true);
    }

    function handleOutsideClick(event) {}
    function handleKeydown(event) {
        if (event.key !== 'Escape' || !state.modal || !state.modal.classList.contains('show')) return;
        autoApplyWinningCoupon();
        closeModal();
        markModalAsSeen();
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

    // ========== IMPROVED: больше не сохраняем в localStorage при закрытии вкладки ==========
    function handleBeforeUnload() {
        // Ничего не сохраняем — sessionStorage очистится автоматически
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

        // ========== IMPROVED: Очищаем старые ключи localStorage от предыдущей версии ==========
        safeRemoveItem(localStorage, 'websiteStartTime');
        safeRemoveItem(localStorage, 'websiteTotalTime');

        const modalHTML = createModalHTML();
        
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
            // The wheel builds its field long after the page has loaded, so the
            // country picker has to be attached here or this one field is the
            // only place on the site where a number can be left without its
            // country code, which is exactly the number we then cannot call.
            if (window.PhoneInput && window.PhoneInput.enhance) enhancePhoneField();
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

        /* PlusRent v6: if any modal opens AFTER the wheel is already shown,
         * hide the wheel until the modal closes. Detects via body.modal-open
         * class (added by validation-booking.js) and body.style.position=fixed
         * (set by inline wrappers). This prevents the wheel from sitting on
         * top of an open price-calculator-modal with no interactive ability. */
        let wheelHiddenByOtherModal = false;
        const checkOtherModalState = () => {
            if (!state.modal) return;
            const wheelIsShown = state.modal.style.display === 'flex' ||
                                 state.modal.classList.contains('show');
            const otherOpen = isAnyModalOpen();
            // Don't count our OWN body.position:fixed as "other modal" — distinguish.
            // showModalInternal sets the same body styles, so isAnyModalOpen() would
            // return true. Check: is the body lock ours? If `state._weOwnBodyLock`
            // is true, it's ours.
            const otherIsTheirs = otherOpen && !state._weOwnBodyLock;

            if (otherIsTheirs && wheelIsShown && !wheelHiddenByOtherModal) {
                // Hide wheel temporarily
                state.modal.dataset.prevDisplay = state.modal.style.display || 'flex';
                state.modal.style.display = 'none';
                wheelHiddenByOtherModal = true;
                console.log('🎡 Wheel hidden because another modal opened');
            } else if (!otherIsTheirs && wheelHiddenByOtherModal) {
                // Restore wheel
                state.modal.style.display = state.modal.dataset.prevDisplay || 'flex';
                wheelHiddenByOtherModal = false;
                console.log('🎡 Wheel restored after other modal closed');
            }
        };
        // Watch body class and inline style for changes
        const bodyObserver = new MutationObserver(checkOtherModalState);
        bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
        
        setTimeout(updateModalTranslations, 1000);
        
        const existingPhone = safeGetItem(localStorage, 'spinningWheelPhone');
        if (existingPhone) {
            document.getElementById('universalPhoneStep').style.display = 'none';
            document.getElementById('universalWheelStep').style.display = 'flex';
        }
        
        watchCouponFields();

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
        fetchWheelIdByType: fetchWheelIdByType,
        ensureCss: ensureWheelCss,
        resetClosedFlag: function() {
            state.userClosedModal = false;
            console.log('✅ Spinning wheel reset - can show again');
        }
    };

})();
