/**
 * Universal Spinning Wheel Modal Trigger
 * This script automatically injects the spinning wheel modal into any page on the website
 * No need to manually add it to each HTML page
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        delay: 30 * 1000, // 30 seconds
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
        isInitialized: false
    };

    // Check if user has seen the modal today or has already received their reward
    function hasSeenModalToday() {
        // First check if user has already received their reward
        const rewardReceived = localStorage.getItem('spinningWheelRewardReceived');
        if (rewardReceived === 'true') {
            return true; // Don't show modal if user already got their reward
        }
        
        const lastSeen = localStorage.getItem(CONFIG.storageKey);
        if (!lastSeen) return false;
        
        const lastSeenDate = new Date(lastSeen);
        const today = new Date();
        
        return lastSeenDate.toDateString() === today.toDateString();
    }

    // Track total time spent on website across all pages
    function getTotalWebsiteTime() {
        const startTime = localStorage.getItem('websiteStartTime');
        const storedTotalTime = localStorage.getItem('websiteTotalTime');
        
        if (!startTime) return 0;
        
        // If we have stored total time, use that as base
        let baseTime = 0;
        if (storedTotalTime) {
            baseTime = parseInt(storedTotalTime);
        }
        
        // Add current session time
        const now = Date.now();
        const currentSessionTime = now - parseInt(startTime);
        
        return baseTime + currentSessionTime;
    }

    // Set website start time if not already set
    function setWebsiteStartTime() {
        if (!localStorage.getItem('websiteStartTime')) {
            localStorage.setItem('websiteStartTime', Date.now().toString());
        }
    }

    // Mark modal as seen today
    function markModalAsSeen() {
        localStorage.setItem(CONFIG.storageKey, new Date().toISOString());
        
        // Reset website timer for next day
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
                        <h2 class="spinning-wheel-modal-title" data-i18n="wheel.title">Try Your Luck!</h2>
                        <p class="spinning-wheel-modal-subtitle" data-i18n="wheel.subtitle">Spin the wheel and win amazing discounts on car rentals!</p>
                    </div>
                    
                    <div class="spinning-wheel-wheel-content">
                        <div class="spinning-wheel-phone-step" id="universalPhoneStep">
                            <div class="phone-input-container">
                                <h3 data-i18n="wheel.enter_phone_title">Enter Your Phone Number</h3>
                                <form class="phone-form" id="universalPhoneForm">
                                    <div class="input-group">
                                        <input type="tel" class="phone-input" id="universalPhoneInput" 
                                               data-i18n-placeholder="wheel.phone_placeholder" placeholder="Enter your phone number" required>
                                        <button type="submit" class="phone-submit-btn" data-i18n="wheel.continue_button">Continue</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        
                        <div class="spinning-wheel-wheel-step" id="universalWheelStep" style="display: none;">
                            <iframe id="universalSpinningWheelIframe" 
                                    src="${CONFIG.iframeSrc}" 
                                    frameborder="0" 
                                    style="width: 100%; height: 100%; border: none; border-radius: 10px;">
                            </iframe>
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
            .spinning-wheel-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: ${CONFIG.zIndex};
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .spinning-wheel-modal.show {
                opacity: 1;
            }

            .spinning-wheel-modal-content {
                background: white;
                border-radius: 20px !important;
                width: 90%;
                max-width: 1000px;
                max-height: 85vh;
                position: relative;
                overflow: hidden;
                transform: scale(0.9);
                transition: all 0.3s ease;
            }

            @media (max-width: 1000px) {
                .wheel-step {
                    overflow: scroll;
                }
            }
            
            /* Smaller modal for phone input step */
            .spinning-wheel-modal-content.phone-step {
                max-width: 500px !important;
                max-height: 60vh !important;
                height: auto !important;
            }
            
            /* Unset min-height for phone step content */
            .spinning-wheel-modal-content.phone-step .spinning-wheel-wheel-content {
                min-height: unset !important;
            }
            
            /* Full size for spinning wheel step */
            .spinning-wheel-modal-content.wheel-step {
                max-width: 1200px !important;
                max-height: 90vh !important;
            }

            .spinning-wheel-modal.show .spinning-wheel-modal-content {
                transform: scale(1);
            }

            .spinning-wheel-modal-close {
                position: absolute;
                top: 15px;
                right: 20px;
                font-size: 28px;
                cursor: pointer;
                color: #FFFFFF;
                z-index: 10;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
                padding-bottom: 4px;
            }

            .spinning-wheel-modal-close:hover {
                background: #f0f0f0;
                color: #333;
            }

            .spinning-wheel-modal-header {
                background: linear-gradient(135deg, #20b2aa 0%, #1e90ff 100%);
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 20px 20px 0 0;
            }

            .spinning-wheel-modal-title {
                font-size: 1.5rem;
                font-weight: 700;
                margin: 0;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
                font-family: Arial, sans-serif;
                color: white;
            }

            .spinning-wheel-modal-subtitle {
                font-size: 1rem;
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-family: Arial, sans-serif;
            }

            .spinning-wheel-wheel-content {
                background: white;
                display: flex;
                min-height: 500px;
            }

            /* Phone step styles */
            .spinning-wheel-phone-step {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                background: white;
            }
            
            .phone-input-container {
                text-align: center;
                max-width: 400px;
                width: 100%;
            }
            
            .phone-input-container h3 {
                color: #333;
                font-size: 1.2rem;
                margin: 0 0 15px 0;
                font-weight: 600;
            }
            
            .phone-info {
                color: #666;
                font-size: 1.1rem;
                margin: 0 0 30px 0;
                line-height: 1.5;
            }
            
            .phone-form {
                margin-bottom: 20px;
            }
            
            .input-group {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .phone-input {
                flex: 1;
                padding: 15px;
                border: 2px solid #e1e5e9;
                border-radius: 10px;
                font-size: 1rem;
                transition: border-color 0.3s ease;
            }
            
            @media (max-width: 768px) {
                .phone-input {
                    border-radius: 10px !important;
                }
                .phone-submit-btn {
                    border-radius: 10px !important;
                }
            }
            
            .phone-input:focus {
                outline: none;
                border-color: #20b2aa;
                box-shadow: 0 0 0 3px rgba(32, 178, 170, 0.1);
            }
            
            .phone-input-error {
                border-color: #e74c3c !important;
                box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1) !important;
            }
            
            .phone-submit-btn {
                padding: 15px 25px;
                background: linear-gradient(135deg, #20b2aa 0%, #1e90ff 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            }
            
            .phone-submit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(32, 178, 170, 0.3);
            }

            /* Wheel step styles */
            .spinning-wheel-wheel-step {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                background: white;
            }
            
            @keyframes spinning-wheel-fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes spinning-wheel-slideIn {
                from { 
                    transform: translateY(-50px) scale(0.9);
                    opacity: 0;
                }
                to { 
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
            }

            /* Responsive design */
            @media (min-width: 1024px) {
                .spinning-wheel-modal-content {
                    width: 80%;
                    max-width: 1200px;
                    max-height: 90vh;
                    height: 80vh;
                }
                
                .spinning-wheel-modal-header {
                    padding: 30px 40px;
                }
                
                .spinning-wheel-modal-content.phone-step .spinning-wheel-wheel-content {
                    min-height: unset !important;
                }
                
                .spinning-wheel-modal-title {
                    font-size: 2rem;
                }
                
                .spinning-wheel-modal-subtitle {
                    font-size: 1.2rem;
                }
                
                .spinning-wheel-wheel-content {
                    min-height: 600px;
                    height: 82%;                  
                }
                
                .spinning-wheel-wheel-step {
                    height: 100%;
                }
                
            iframe {
                height: 100% !important;
            }
                
                .spinning-wheel-phone-step,
                .spinning-wheel-wheel-step {
                    padding: 50px;
                }
            }
            
            /* Tablet and medium devices (768px - 1023px) */
            @media (min-width: 768px) and (max-width: 1023px) {
                .spinning-wheel-modal-content {
                    width: 95% !important;
                    max-width: 1000px !important;
                    max-height: 95vh !important;
                }
                
                .spinning-wheel-modal-header {
                    padding: 25px 30px !important;
                }
                
                .spinning-wheel-modal-title {
                    font-size: 1.8rem !important;
                }
                
                .spinning-wheel-modal-subtitle {
                    font-size: 1.1rem !important;
                }
                
                .spinning-wheel-wheel-content {
                    min-height: 700px !important;
                }
                
                .spinning-wheel-phone-step,
                .spinning-wheel-wheel-step {
                    padding: 20px !important;
                }
                
                .phone-input-container {
                    max-width: 500px !important;
                }
                
                .phone-input-container h3 {
                    font-size: 1.2rem !important;
                }
                
                .phone-input-container p {
                    font-size: 1.2rem !important;
                }

                /* Better spacing for phone input on tablets */
                .phone-input-container {
                    padding: 20px !important;
                }
                
                .input-group {
                    margin-bottom: 25px !important;
                }
                
                .phone-input,
                .phone-submit-btn {
                    padding: 18px 20px !important;
                    font-size: 1.1rem !important;
                }
            }
            
            @media (max-width: 768px) {
                .spinning-wheel-modal-content {
                    margin: 10px;
                    max-width: calc(100vw - 20px);
                    max-height: calc(100vh - 20px);
                    height: calc(100vh - 20px) !important;
                }
                
                .spinning-wheel-modal-content.phone-step {
                    max-width: calc(100vw - 20px) !important;
                    max-height: 50vh !important;
                    height: auto !important;
                }
                
                .spinning-wheel-modal-content.phone-step .spinning-wheel-wheel-content {
                    min-height: unset !important;
                }
                
                .spinning-wheel-modal-content.wheel-step {
                    max-width: calc(100vw - 20px) !important;
                    max-height: calc(100vh - 20px) !important;
                }
                
                .spinning-wheel-modal-header {
                    padding: 15px;
                }
                
                .spinning-wheel-modal-title {
                    font-size: 1.3rem;
                }
                
                .spinning-wheel-modal-subtitle {
                    font-size: 0.9rem;
                }
                
                .spinning-wheel-wheel-content {
                    flex-direction: column;
                    min-height: auto;
                    height: calc(100% - 120px) !important;
                    flex: 1;
                }
                
                .spinning-wheel-phone-step,
                .spinning-wheel-wheel-step {
                    padding: 20px;
                    height: 100% !important;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .input-group {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .phone-submit-btn {
                    width: 100%;
                }
                
                #universalSpinningWheelIframe {
                    height: 100% !important;
                    min-height: 600px !important;
                    border-radius: 10px;
                }
            }
            
            @media (max-width: 390px) {
                .spinning-wheel-modal-content.phone-step {
                    max-height: 60vh !important;
                }
            }
            /* Extra small mobile devices (iPhone 14 Pro Max, etc.) */
            @media (max-width: 430px) {
                .spinning-wheel-modal-content {
                    height: 93vh !important;
                    max-height: 100vh !important;
                    margin: 0;
                    border-radius: 20px !important;
                }
                
                .spinning-wheel-wheel-content {
                    height: calc(100vh - 140px) !important;
                }
                
                .spinning-wheel-modal-content.phone-step .spinning-wheel-wheel-content {
                    height: unset !important;
                }
                
                .spinning-wheel-wheel-step {
                    height: 100% !important;
                    padding: 15px;
                }
                
                #universalSpinningWheelIframe {
                    height: 100% !important;
                    min-height: 650px !important;
                    border-radius: 10px;
                }
            }

            @media (max-width: 400px) and (max-height: 700px) {
                #universalSpinningWheelIframe {
                    margin-top: 128px !important;
                }
            }
        `;
        return style;
    }

    // Update translations in the modal
    function updateModalTranslations() {
        if (!state.modal) return;
        
        // Check if i18next is available
        if (typeof i18next !== 'undefined' && i18next.t) {
            // Update title and subtitle
            const titleElement = state.modal.querySelector('.spinning-wheel-modal-title');
            const subtitleElement = state.modal.querySelector('.spinning-wheel-modal-subtitle');
            
            if (titleElement) {
                const translatedTitle = i18next.t('wheel.title');
                if (translatedTitle && translatedTitle !== 'wheel.title') {
                    titleElement.textContent = translatedTitle;
                }
            }
            if (subtitleElement) {
                const translatedSubtitle = i18next.t('wheel.subtitle');
                if (translatedSubtitle && translatedSubtitle !== 'wheel.subtitle') {
                    subtitleElement.textContent = translatedSubtitle;
                }
            }
            
            // Update phone input elements
            const phoneTitleElement = state.modal.querySelector('[data-i18n="wheel.enter_phone_title"]');
            const phoneInputElement = state.modal.querySelector('#universalPhoneInput');
            const continueButtonElement = state.modal.querySelector('[data-i18n="wheel.continue_button"]');
            
            if (phoneTitleElement) {
                const translatedPhoneTitle = i18next.t('wheel.enter_phone_title');
                if (translatedPhoneTitle && translatedPhoneTitle !== 'wheel.enter_phone_title') {
                    phoneTitleElement.textContent = translatedPhoneTitle;
                }
            }
            if (phoneInputElement) {
                const translatedPhonePlaceholder = i18next.t('wheel.phone_placeholder');
                if (translatedPhonePlaceholder && translatedPhonePlaceholder !== 'wheel.phone_placeholder') {
                    phoneInputElement.placeholder = translatedPhonePlaceholder;
                }
            }
            if (continueButtonElement) {
                const translatedContinueButton = i18next.t('wheel.continue_button');
                if (translatedContinueButton && translatedContinueButton !== 'wheel.continue_button') {
                    continueButtonElement.textContent = translatedContinueButton;
                }
            }
        }
    }

    // Show modal
    function showModal(options = {}) {
        if (!state.modal) return;
        
        // Update translations before showing
        updateModalTranslations();
        
        // Handle options
        const { skipPhoneStep = false, phoneNumber = null, wheelType = 'percent' } = options;
        
        
        
        // Update iframe source with wheel ID if specified
        if (options.wheelId) {
            const iframe = document.getElementById('universalSpinningWheelIframe');
            if (iframe) {
                const baseSrc = CONFIG.iframeSrc;
                const separator = baseSrc.includes('?') ? '&' : '?';
                iframe.src = `${baseSrc}${separator}wheel=${options.wheelId}`;
            }
        }
        
        // Get modal content element for sizing
        const modalContent = state.modal.querySelector('.spinning-wheel-modal-content');
        
        // If we should skip the phone step, hide it and show the wheel directly
        if (skipPhoneStep) {
            const phoneStep = document.getElementById('universalPhoneStep');
            const wheelStep = document.getElementById('universalWheelStep');
            
            if (phoneStep && wheelStep) {
                phoneStep.style.display = 'none';
                wheelStep.style.display = 'flex';
                
                // Set modal to wheel step size
                if (modalContent) {
                    modalContent.classList.remove('phone-step');
                    modalContent.classList.add('wheel-step');
                }
                
                // If we have a phone number, store it and send to iframe
                if (phoneNumber) {
                    
                    localStorage.setItem('spinningWheelPhone', phoneNumber);
                    localStorage.setItem('spinningWheelPhoneEntered', 'true');
                    
                    // Send phone number to iframe
                    setTimeout(() => {
                        const iframe = document.getElementById('universalSpinningWheelIframe');
                        if (iframe && iframe.contentWindow) {
                            
                            iframe.contentWindow.postMessage({
                                type: 'phoneNumberEntered',
                                phoneNumber: phoneNumber,
                                wheelType: wheelType
                            }, '*');
                        } else {
                            
                        }
                    }, 500);
                } else {
                    
                }
            }
        } else {
            // Normal flow - show phone step first
            const phoneStep = document.getElementById('universalPhoneStep');
            const wheelStep = document.getElementById('universalWheelStep');
            
            if (phoneStep && wheelStep) {
                phoneStep.style.display = 'flex';
                wheelStep.style.display = 'none';
                
                // Set modal to phone step size
                if (modalContent) {
                    modalContent.classList.remove('wheel-step');
                    modalContent.classList.add('phone-step');
                }
            }
        }
        
        state.modal.style.display = 'flex';
        
        // Force reflow
        state.modal.offsetHeight;
        
        // Add show class for animation
        setTimeout(() => {
            state.modal.classList.add('show');
        }, 10);

        // CSS media queries handle all responsive styling automatically
    }

    // Close modal
    function closeModal() {
        if (!state.modal) return;
        
        state.modal.classList.remove('show');
        
        setTimeout(() => {
            state.modal.style.display = 'none';
        }, 300);
    }

    // Cleanup function to remove event listeners
    function cleanup() {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        
        // Remove event listeners
        if (state.modal) {
            state.modal.removeEventListener('click', handleOutsideClick);
        }
        document.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('message', handleWheelMessage);
    }

    // Validate phone number format
    function validatePhoneNumber(phoneNumber) {
        // Remove all non-digit characters except + at the beginning
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        // Check if it starts with + (international format)
        if (cleaned.startsWith('+')) {
            // International format: + followed by 7-15 digits
            const digits = cleaned.substring(1);
            return digits.length >= 7 && digits.length <= 15 && /^\d+$/.test(digits);
        } else {
            // Local format: 7-15 digits
            return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
        }
    }

    // Format phone number for display
    function formatPhoneNumber(phoneNumber) {
        // Remove all non-digit characters except + at the beginning
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        if (cleaned.startsWith('+')) {
            return cleaned; // Keep international format as is
        } else {
            // Format local numbers (basic formatting)
            const digits = cleaned;
            if (digits.length >= 10) {
                // Format as XXX-XXX-XXXX or similar
                return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
            }
            return digits;
        }
    }

    // Handle phone input validation
    function handlePhoneInput(event) {
        const input = event.target;
        let value = input.value;
        
        // Allow only numbers, +, -, (, ), and spaces
        value = value.replace(/[^\d+\-\(\)\s]/g, '');
        
        // Limit length to prevent extremely long inputs
        if (value.length > 20) {
            value = value.substring(0, 20);
        }
        
        input.value = value;
        
        // Remove error styling if present
        input.classList.remove('phone-input-error');
        
        // Remove any existing error message
        const existingError = input.parentNode.querySelector('.phone-error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    // Show phone input error
    function showPhoneError(input, message) {
        input.classList.add('phone-input-error');
        
        // Remove any existing error message
        const existingError = input.parentNode.querySelector('.phone-error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'phone-error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = 'color: #e74c3c; font-size: 0.9rem; margin-top: 5px; text-align: center;';
        input.parentNode.appendChild(errorDiv);
    }

    // Handle phone form submission
    async function handlePhoneSubmit(event) {
        event.preventDefault();
        
        const phoneInput = document.getElementById('universalPhoneInput');
        const phoneNumber = phoneInput.value.trim();
        
        // Remove any existing error styling
        phoneInput.classList.remove('phone-input-error');
        const existingError = phoneInput.parentNode.querySelector('.phone-error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Validate phone number
        if (!phoneNumber) {
            showPhoneError(phoneInput, 'Please enter a phone number');
            return;
        }
        
        if (!validatePhoneNumber(phoneNumber)) {
            showPhoneError(phoneInput, 'Please enter a valid phone number (7-15 digits)');
            return;
        }
        
        // Format the phone number
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Check if phone number already has available coupons
        try {
            const API_BASE_URL = window.location.origin;
            const response = await fetch(`${API_BASE_URL}/api/spinning-wheels/check-available-coupons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phoneNumber: formattedPhone })
            });

            if (response.ok) {
                const result = await response.json();
                
                if (result.hasCoupons) {
                    // User already has coupons (available or redeemed), show error
                    let errorMessage = 'You have already received a reward for this phone number.';
                    
                    // Get current language and provide appropriate message
                    const currentLang = localStorage.getItem('lang') || 'en';
                    
                    if (currentLang === 'ro') {
                        errorMessage = 'Ai primit deja o recompensă pentru acest număr de telefon.';
                    } else if (currentLang === 'ru') {
                        errorMessage = 'Вы уже получили награду за этот номер телефона.';
                    }
                    
                    showPhoneError(phoneInput, errorMessage);
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking available coupons:', error);
            // Continue with normal flow if check fails
        }

        // Store phone number in localStorage
        localStorage.setItem('spinningWheelPhone', formattedPhone);
        localStorage.setItem('spinningWheelPhoneEntered', 'true');

        // Track phone number in database
        const API_BASE_URL = window.location.origin;
        fetch(`${API_BASE_URL}/api/spinning-wheels/track-phone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber: formattedPhone })
        }).catch(error => {
            console.error('Error tracking phone number:', error);
        });

        // Switch to wheel step
        document.getElementById('universalPhoneStep').style.display = 'none';
        document.getElementById('universalWheelStep').style.display = 'flex';
        
        // Update modal size for wheel step
        const modalContent = document.querySelector('.spinning-wheel-modal-content');
        if (modalContent) {
            modalContent.classList.remove('phone-step');
            modalContent.classList.add('wheel-step');
        }

        // Send phone number to iframe
        const iframe = document.getElementById('universalSpinningWheelIframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'phoneNumberEntered',
                phoneNumber: formattedPhone
            }, '*');
        }
    }

    // Handle iframe messages
    function handleWheelMessage(event) {
        if (event.data && event.data.type === 'closeModal') {
            // Check if there's a winning coupon to auto-apply before closing
            autoApplyWinningCoupon();
            closeModal();
            markModalAsSeen();
        } else if (event.data && event.data.type === 'autoApplyCoupon') {
            // Handle auto-apply coupon message from spinning wheel
            handleAutoApplyCoupon(event.data.couponCode);
        } else if (event.data && event.data.type === 'closeSpinningWheel') {
            // Handle close message from spinning wheel
            closeModal();
            markModalAsSeen();
        }
    }

    // Auto-apply winning coupon from localStorage
    function autoApplyWinningCoupon() {
        try {
            const savedCouponCode = localStorage.getItem('spinningWheelWinningCoupon');
            if (savedCouponCode) {
                handleAutoApplyCoupon(savedCouponCode);
            }
        } catch (error) {
            console.error('Error auto-applying winning coupon:', error);
        }
    }

    // Handle auto-apply coupon functionality
    function handleAutoApplyCoupon(couponCode) {
        try {
            
            
            // Save coupon code to localStorage for use on booking pages
            localStorage.setItem('autoApplyCoupon', couponCode);
            
            // Trigger auto-apply immediately if the function is available
            if (window.AutoApplyCoupon && window.AutoApplyCoupon.autoApply) {
                
                setTimeout(() => {
                    window.AutoApplyCoupon.autoApply();
                }, 100);
            }
            
            // Show success notification
            showCouponAppliedNotification(couponCode);
            
        } catch (error) {
            console.error('Error handling auto-apply coupon:', error);
        }
    }

    // Get current language from multiple sources
    function getCurrentLanguage() {
        // Try multiple sources to determine the current language
        
        // 1. Check localStorage
        const storedLang = localStorage.getItem('lang') || localStorage.getItem('language') || localStorage.getItem('i18nextLng');
        if (storedLang) {
            const lang = storedLang.split('-')[0]; // Get 'en' from 'en-US'
            if (['en', 'ru', 'ro'].includes(lang)) {
                return lang;
            }
        }
        
        // 2. Check i18next if available
        if (typeof i18next !== 'undefined' && i18next.language) {
            const i18nextLang = i18next.language.split('-')[0]; // Get 'en' from 'en-US'
            if (['en', 'ru', 'ro'].includes(i18nextLang)) {
                return i18nextLang;
            }
        }
        
        // 3. Check HTML lang attribute
        const htmlLang = document.documentElement.lang;
        if (htmlLang) {
            const lang = htmlLang.split('-')[0]; // Get 'en' from 'en-US'
            if (['en', 'ru', 'ro'].includes(lang)) {
                return lang;
            }
        }
        
        // 4. Check URL for language parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && ['en', 'ru', 'ro'].includes(urlLang)) {
            return urlLang;
        }
        
        // 5. Default to English
        return 'en';
    }

    // Show notification that coupon was applied with beautiful design
    function showCouponAppliedNotification(couponCode) {
        // Get current language
        const currentLang = getCurrentLanguage();
        
        // Translations for all languages
        const translations = {
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
        
        const t = translations[currentLang] || translations.en;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'coupon-applied-notification';
        notification.className = 'coupon-notification-container';
        
        // Create confetti elements
        const confettiColors = ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#9370DB', '#32CD32'];
        let confettiHTML = '';
        for (let i = 0; i < 10; i++) {
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
                        ${t.title}
                        <span class="sparkle">✨</span>
                    </div>
                    <div class="coupon-code-container">
                        <span class="coupon-label">${t.codeLabel}</span>
                        <span class="coupon-code">${couponCode}</span>
                    </div>
                    <div class="coupon-message">
                        <span class="check-icon">✓</span>
                        ${t.readyMessage}
                    </div>
                </div>
                <div class="coupon-shine"></div>
            </div>
        `;
        
        // Add styles if not already added
        if (!document.getElementById('coupon-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'coupon-notification-styles';
            style.textContent = `
                .coupon-notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                
                .coupon-notification-card {
                    position: relative;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    padding: 15px;
                    box-shadow: 
                        0 12px 35px rgba(102, 126, 234, 0.4),
                        0 0 0 1px rgba(255, 255, 255, 0.1) inset;
                    max-width: 280px;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
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
                    width: 38px;
                    height: 38px;
                    margin: 0 auto 8px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: bounce 1s infinite;
                }
                
                .coupon-gift-icon svg {
                    width: 22px;
                    height: 22px;
                    color: white;
                }
                
                .coupon-notification-content {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                    color: white;
                }
                
                .coupon-title {
                    font-size: 1rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }
                
                .sparkle {
                    display: inline-block;
                    animation: sparkle 1.5s infinite;
                    font-size: 0.85rem;
                }
                
                .coupon-code-container {
                    background: rgba(255, 255, 255, 0.2);
                    border: 2px dashed rgba(255, 255, 255, 0.5);
                    border-radius: 8px;
                    padding: 8px;
                    margin: 8px 0;
                    backdrop-filter: blur(5px);
                }
                
                .coupon-label {
                    display: block;
                    font-size: 0.7rem;
                    opacity: 0.9;
                    margin-bottom: 2px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .coupon-code {
                    display: block;
                    font-size: 1.05rem;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    font-family: 'Courier New', monospace;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
                }
                
                .coupon-message {
                    font-size: 0.75rem;
                    opacity: 0.95;
                    line-height: 1.3;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }
                
                .check-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 14px;
                    height: 14px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    font-size: 10px;
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
                    width: 6px;
                    height: 6px;
                    opacity: 0;
                    animation: confettiFall 2s ease-in-out forwards;
                }
                
                @keyframes slideInBounce {
                    0% {
                        transform: translateX(100%) scale(0.5);
                        opacity: 0;
                    }
                    60% {
                        transform: translateX(-10px) scale(1.05);
                        opacity: 1;
                    }
                    80% {
                        transform: translateX(5px) scale(0.98);
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
                
                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0) scale(1);
                    }
                    50% {
                        transform: translateY(-6px) scale(1.05);
                    }
                }
                
                @keyframes sparkle {
                    0%, 100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.2) rotate(180deg);
                        opacity: 0.8;
                    }
                }
                
                @keyframes confettiFall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(300px) rotate(720deg);
                        opacity: 0;
                    }
                }
                
                @media (max-width: 480px) {
                    .coupon-notification-container {
                        top: 10px;
                        right: 10px;
                        left: 10px;
                    }
                    
                    .coupon-notification-card {
                        max-width: 100%;
                        padding: 12px;
                    }
                    
                    .coupon-gift-icon {
                        width: 35px;
                        height: 35px;
                        margin-bottom: 6px;
                    }
                    
                    .coupon-gift-icon svg {
                        width: 20px;
                        height: 20px;
                    }
                    
                    .coupon-title {
                        font-size: 0.95rem;
                    }
                    
                    .sparkle {
                        font-size: 0.8rem;
                    }
                    
                    .coupon-code {
                        font-size: 1rem;
                    }
                    
                    .coupon-message {
                        font-size: 0.7rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds with fade out animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInBounce 0.4s ease-out reverse';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 400);
            }
        }, 5000);
    }

    // Handle outside click - disabled to prevent accidental closing
    function handleOutsideClick(event) {
        // Disabled: Modal should only close via X button
        // if (event.target === state.modal) {
        //     closeModal();
        //     markModalAsSeen();
        // }
    }

    // Handle escape key - disabled to prevent accidental closing
    function handleKeydown(event) {
        // Disabled: Modal should only close via X button
        // if (event.key === 'Escape' && state.modal && state.modal.style.display !== 'none') {
        //     closeModal();
        //     markModalAsSeen();
        // }
    }

    // Handle window resize
    function handleResize() {
        if (!state.modal || state.modal.style.display === 'none') return;
        
        const wheelContent = state.modal.querySelector('.spinning-wheel-wheel-content');
        const iframe = state.modal.querySelector('#universalSpinningWheelIframe');
        
        // Let CSS media queries handle responsive design
        // No inline styles needed - CSS will handle all responsive behavior
    }

    // Handle page visibility changes (tab switching, minimizing)
    function handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause the timer
            if (state.timer) {
                clearTimeout(state.timer);
                state.timer = null;
            }
        } else {
            // Page is visible again, restart timer if needed
            if (!state.modal || state.modal.style.display === 'none') {
                startTimer();
            }
        }
    }

    // Handle page unload (navigation to different page)
    function handleBeforeUnload() {
        // Store current time for accurate tracking across page navigation
        const currentTime = Date.now();
        const startTime = localStorage.getItem('websiteStartTime');
        
        if (startTime) {
            // Calculate total time spent and store it
            const totalTime = currentTime - parseInt(startTime);
            localStorage.setItem('websiteTotalTime', totalTime.toString());
        }
    }

    // Fetch the correct enabled, non-premium wheel
    async function fetchCorrectWheel() {
        try {
            const API_BASE_URL = window.API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/api/spinning-wheels/enabled-configs`);
            
            if (!response.ok) {
                console.error('Error fetching enabled wheels:', response.status);
                return null;
            }
            
            const wheelConfigs = await response.json();
            
            
            // Filter for non-premium wheels
            const nonPremiumWheels = wheelConfigs.filter(wheel => !wheel.is_premium);
            
            
            if (nonPremiumWheels.length === 0) {
                console.warn('No non-premium enabled wheels found. Available wheels:', wheelConfigs);
                // Fallback: if no non-premium wheels, use any enabled wheel
                if (wheelConfigs.length > 0) {
                    
                    return wheelConfigs[0];
                }
                return null;
            }
            
            // If there's only one non-premium wheel, use it
            if (nonPremiumWheels.length === 1) {
                
                return nonPremiumWheels[0];
            }
            
            // If there are multiple non-premium wheels, prefer 'percent' type, then 'free-days'
            const percentWheels = nonPremiumWheels.filter(wheel => wheel.type === 'percent');
            if (percentWheels.length > 0) {
                
                return percentWheels[0];
            }
            
            const freeDaysWheels = nonPremiumWheels.filter(wheel => wheel.type === 'free-days');
            if (freeDaysWheels.length > 0) {
                
                return freeDaysWheels[0];
            }
            
            // Fallback to first non-premium wheel
            
            return nonPremiumWheels[0];
            
        } catch (error) {
            console.error('Error fetching correct wheel:', error);
            return null;
        }
    }

    // Start timer based on cumulative website time
    function startTimer() {
        if (hasSeenModalToday()) return;
        
        // Set website start time if not already set
        setWebsiteStartTime();
        
        // Check if we've already spent enough time on the website
        const totalTime = getTotalWebsiteTime();
        if (totalTime >= CONFIG.delay) {
            // User has been on website long enough, show modal immediately
            showModalWithCorrectWheel();
            return;
        }
        
        // Calculate remaining time needed
        const remainingTime = CONFIG.delay - totalTime;
        
        // Set timer for remaining time
        state.timer = setTimeout(() => {
            showModalWithCorrectWheel();
        }, remainingTime);
    }

    // Show modal with the correct wheel
    async function showModalWithCorrectWheel() {
        const correctWheel = await fetchCorrectWheel();
        
        if (correctWheel) {
            showModal({ wheelId: correctWheel.id, wheelType: correctWheel.type });
        } else {
            // Fallback to default behavior if no correct wheel found
            showModal();
        }
    }

    // Initialize the modal system
    function init() {
        if (state.isInitialized) return;
        
        // Don't show on standalone spinning wheel pages
        if (window.location.pathname.includes('spinning-wheel')) {
            return;
        }

        // Create and inject modal
        const modalHTML = createModalHTML();
        const modalCSS = createModalCSS();
        
        document.head.appendChild(modalCSS);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get references
        state.modal = document.getElementById(CONFIG.modalId);
        state.iframe = document.getElementById('universalSpinningWheelIframe');
        
        if (!state.modal) return;
        
        // Add event listeners
        const closeBtn = state.modal.querySelector('.spinning-wheel-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                // Auto-apply winning coupon before closing
                autoApplyWinningCoupon();
                closeModal();
                markModalAsSeen();
            });
        }
        
        const phoneForm = document.getElementById('universalPhoneForm');
        if (phoneForm) {
            phoneForm.addEventListener('submit', handlePhoneSubmit);
        }
        
        // Add input validation for phone number
        const phoneInput = document.getElementById('universalPhoneInput');
        if (phoneInput) {
            phoneInput.addEventListener('input', handlePhoneInput);
        }
        
        // Global event listeners
        window.addEventListener('message', handleWheelMessage);
        state.modal.addEventListener('click', handleOutsideClick);
        document.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', handleResize);
        
        // Track page visibility and unload for better time tracking
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Listen for language changes
        if (typeof i18next !== 'undefined') {
            i18next.on('languageChanged', updateModalTranslations);
        }
        
        // Try to update translations after a delay in case i18next loads later
        setTimeout(updateModalTranslations, 1000);
        
        // Check if user already has a phone number
        const existingPhone = localStorage.getItem('spinningWheelPhone');
        if (existingPhone) {
            document.getElementById('universalPhoneStep').style.display = 'none';
            document.getElementById('universalWheelStep').style.display = 'flex';
        }
        
        state.isInitialized = true;
        
        // Start timer
        startTimer();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Fetch wheel ID by type
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
            console.error('Error fetching wheel ID by type:', error);
            return null;
        }
    }

    // Export for global access if needed
    window.UniversalSpinningWheel = {
        show: showModal,
        close: closeModal,
        init: init,
        fetchWheelIdByType: fetchWheelIdByType
    };

})();
