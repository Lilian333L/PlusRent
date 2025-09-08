/**
 * Universal Spinning Wheel Modal Trigger
 * This script automatically injects the spinning wheel modal into any page on the website
 * No need to manually add it to each HTML page
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        delay: 5 * 1000, // 5 seconds for testing
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

    // Check if user has seen the modal today
    function hasSeenModalToday() {
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
                    min-height: 600px !important;
                    border-radius: 10px;
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
        
        // Debug: Log the options received
        console.log('UniversalSpinningWheel.show called with options:', options);
        console.log('skipPhoneStep:', skipPhoneStep, 'phoneNumber:', phoneNumber);
        
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
                    console.log('Storing phone number in localStorage:', phoneNumber);
                    localStorage.setItem('spinningWheelPhone', phoneNumber);
                    localStorage.setItem('spinningWheelPhoneEntered', 'true');
                    
                    // Send phone number to iframe
                    setTimeout(() => {
                        const iframe = document.getElementById('universalSpinningWheelIframe');
                        if (iframe && iframe.contentWindow) {
                            console.log('Sending phone number to iframe:', phoneNumber);
                            iframe.contentWindow.postMessage({
                                type: 'phoneNumberEntered',
                                phoneNumber: phoneNumber,
                                wheelType: wheelType
                            }, '*');
                        } else {
                            console.log('Iframe not ready for phone number message');
                        }
                    }, 500);
                } else {
                    console.log('No phone number provided to skip phone step');
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

    // Handle phone form submission
    function handlePhoneSubmit(event) {
        event.preventDefault();
        
        const phoneInput = document.getElementById('universalPhoneInput');
        const phoneNumber = phoneInput.value.trim();
        
        if (!phoneNumber) {
            alert('Please enter a valid phone number');
            return;
        }

        // Store phone number in localStorage
        localStorage.setItem('spinningWheelPhone', phoneNumber);
        localStorage.setItem('spinningWheelPhoneEntered', 'true');

        // Track phone number in database
        const API_BASE_URL = window.location.origin;
        fetch(`${API_BASE_URL}/api/spinning-wheels/track-phone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber })
        }).catch(error => {
            
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
                phoneNumber: phoneNumber
            }, '*');
        }
    }

    // Handle iframe messages
    function handleWheelMessage(event) {
        if (event.data && event.data.type === 'closeModal') {
            closeModal();
            markModalAsSeen();
        }
    }

    // Handle outside click
    function handleOutsideClick(event) {
        if (event.target === state.modal) {
            closeModal();
            markModalAsSeen();
        }
    }

    // Handle escape key
    function handleKeydown(event) {
        if (event.key === 'Escape' && state.modal && state.modal.style.display !== 'none') {
            closeModal();
            markModalAsSeen();
        }
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

    // Start timer based on cumulative website time
    function startTimer() {
        if (hasSeenModalToday()) return;
        
        // Set website start time if not already set
        setWebsiteStartTime();
        
        // Check if we've already spent enough time on the website
        const totalTime = getTotalWebsiteTime();
        if (totalTime >= CONFIG.delay) {
            // User has been on website long enough, show modal immediately
            showModal();
            return;
        }
        
        // Calculate remaining time needed
        const remainingTime = CONFIG.delay - totalTime;
        
        // Set timer for remaining time
        state.timer = setTimeout(() => {
            showModal();
        }, remainingTime);
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
                closeModal();
                markModalAsSeen();
            });
        }
        
        const phoneForm = document.getElementById('universalPhoneForm');
        if (phoneForm) {
            phoneForm.addEventListener('submit', handlePhoneSubmit);
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