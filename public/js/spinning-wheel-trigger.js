/**
 * Spinning Wheel Modal Trigger
 * 
 * This script automatically shows a spinning wheel modal after 5 minutes of browsing.
 * It includes localStorage tracking to ensure users only see it once per day.
 * 
 * Usage: Include this script on any page where you want the modal to appear
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        TRIGGER_DELAY: 5 * 1000, // ⚠️ TESTING MODE: 5 seconds (change to 5 * 60 * 1000 for production)
        STORAGE_KEY: 'spinningWheelLastSeen',
        MODAL_ID: 'spinningWheelModal',
        IFRAME_SRC: 'spinning-wheel-standalone.html',
        Z_INDEX: 9999
    };
    
    // Set API base URL for API calls
    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:3003'
            : window.location.origin;
    }

    // State management
    let modalShown = false;
    let startTime = Date.now();
    let timer = null;

    // Check if user has already seen the modal today
    function hasSeenModalToday() {
        try {
            const lastSeen = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!lastSeen) return false;
            
            const lastSeenDate = new Date(lastSeen);
            const today = new Date();
            
            return lastSeenDate.toDateString() === today.toDateString();
        } catch (error) {
            console.warn('Could not check localStorage:', error);
            return false;
        }
    }

    // Mark modal as seen today
    function markModalAsSeen() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, new Date().toISOString());
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }

    // Create modal HTML
    function createModalHTML() {
        return `
            <div id="${CONFIG.MODAL_ID}" class="spinning-wheel-modal" style="display: none;">
                <div class="spinning-wheel-modal-content">
                    <!-- Close button -->
                    <button class="spinning-wheel-modal-close" onclick="window.closeSpinningWheelModal()">×</button>
                    
                    <!-- Modal header -->
                    <div class="spinning-wheel-modal-header">
                        <h2 class="spinning-wheel-modal-title">🎉 Special Offer!</h2>
                        <p class="spinning-wheel-modal-subtitle">Spin the wheel and win amazing discounts!</p>
                    </div>
                    
                    <!-- Spinning wheel content -->
                    <div class="spinning-wheel-wheel-content">
                        <!-- Phone number input step -->
                        <div class="spinning-wheel-phone-step" id="phoneStep">
                            <div class="phone-input-container">
                                <h3>📱 Enter Your Phone Number</h3>
                                <p>Please provide your phone number to spin the wheel and win amazing discounts!</p>
                                
                                <form id="phoneForm" class="phone-form">
                                    <div class="input-group">
                                        <input type="tel" 
                                               id="phoneInput" 
                                               placeholder="Enter your phone number" 
                                               required 
                                               pattern="[0-9+\-\s\(\)]+"
                                               class="phone-input">
                                        <button type="submit" class="phone-submit-btn">Continue</button>
                                    </div>
                                </form>
                                
                                <div class="phone-info">
                                    <small>We'll use this to send you your discount code</small>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Spinning wheel step (hidden initially) -->
                        <div class="spinning-wheel-wheel-step" id="wheelStep" style="display: none;">
                            <iframe src="${CONFIG.IFRAME_SRC}" 
                                    style="width: 100%; height: 500px; border: none; border-radius: 15px;"
                                    id="spinningWheelIframe">
                            </iframe>
                        </div>
                        

                    </div>
                </div>
            </div>
        `;
    }

    // Create modal CSS
    function createModalCSS() {
        // Add styles to document head for better specificity
        const headStyle = document.createElement('style');
        headStyle.id = 'spinning-wheel-modal-styles';
        headStyle.textContent = `
            /* Tablet and medium devices (768px - 1023px) - Added to head for better specificity */
            @media (min-width: 768px) and (max-width: 1023px) {
                .spinning-wheel-modal-content {
                    width: 95% !important;
                    max-width: 1000px !important;
                    max-height: 95vh !important;
                    height: 80% !important;
                }
                
                .spinning-wheel-wheel-content {
                    height: 85% !important;
                }
                
                .spinning-wheel-wheel-step {
                    height: 100% !important;
                }
                
                #spinningWheelIframe {
                    height: 100% !important;
                }
            }
        `;
        document.head.appendChild(headStyle);
        
        const style = document.createElement('style');
        style.textContent = `
            .spinning-wheel-modal {
                position: fixed;
                z-index: ${CONFIG.Z_INDEX};
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                animation: spinning-wheel-fadeIn 0.3s ease-in-out;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .spinning-wheel-modal-content {
                background: white;
                border-radius: 20px;
                padding: 0;
                width: 95%;
                max-width: 1200px;
                max-height: 90vh;
                overflow: hidden;
                position: relative;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: spinning-wheel-slideIn 0.3s ease-out;
            }

            .spinning-wheel-modal-close {
                position: absolute;
                top: 15px;
                right: 20px;
                background: rgba(255, 255, 255, 0.9);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 20px;
                cursor: pointer;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                font-family: Arial, sans-serif;
            }

            .spinning-wheel-modal-close:hover {
                background: white;
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
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
                font-size: 1.8rem;
                margin: 0 0 15px 0;
                font-weight: 600;
            }
            
            .phone-input-container p {
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
            
            .phone-info {
                color: #888;
                font-size: 0.9rem;
            }
            
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
                    padding: 40px !important;
                }
                
                .phone-input-container {
                    max-width: 500px !important;
                }
                
                .phone-input-container h3 {
                    font-size: 2rem !important;
                }
                
                .phone-input-container p {
                    font-size: 1.2rem !important;
                }
                
                /* Increase iframe height for tablets */
                #spinningWheelIframe {
                    height: 650px !important;
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
                
                #spinningWheelIframe {
                    height: 100% !important;
                    min-height: 500px !important;
                    flex: 1;
                }
            }
            
            /* Extra small mobile devices (iPhone 14 Pro Max, etc.) */
            @media (max-width: 430px) {
                .spinning-wheel-modal-content {
                    height: 92vh !important;
                    max-height: 100vh !important;
                    margin: 0;
                    border-radius: 0;
                }
                
                .spinning-wheel-wheel-content {
                    height: calc(100vh - 140px) !important;
                }
                
                .spinning-wheel-wheel-step {
                    height: 100% !important;
                    padding: 15px;
                }
                
                #spinningWheelIframe {
                    height: 100% !important;
                    min-height: 600px !important;
                    border-radius: 10px;
                }
            }

            body.spinning-wheel-modal-open {
                overflow: hidden;
            }
        `;
        return style;
    }

    // Show the modal
    function showModal() {
        if (modalShown) return;
        
        const modal = document.getElementById(CONFIG.MODAL_ID);
        if (!modal) return;
        
        // Show modal
        modal.style.display = 'flex';
        document.body.classList.add('spinning-wheel-modal-open');
        modalShown = true;
        
        // Force refresh styles for tablets
        setTimeout(() => {
            const modalContent = modal.querySelector('.spinning-wheel-modal-content');
            if (modalContent) {
                // Force a reflow to ensure styles are applied
                modalContent.offsetHeight;
                
                // Apply responsive styles directly if needed
                if (window.innerWidth >= 768 && window.innerWidth <= 1023) {
                    // Tablet styles
                    modalContent.style.width = '95%';
                    modalContent.style.maxWidth = '1000px';
                    modalContent.style.maxHeight = '95vh';
                    
                    const wheelContent = modal.querySelector('.spinning-wheel-wheel-content');
                    if (wheelContent) {
                        wheelContent.style.minHeight = '700px';
                    }
                    
                    const iframe = modal.querySelector('#spinningWheelIframe');
                    if (iframe) {
                        iframe.style.height = '100%';
                    }
                } else if (window.innerWidth <= 430) {
                    // iPhone 14 Pro Max and similar small devices
                    modalContent.style.height = '100vh';
                    modalContent.style.maxHeight = '100vh';
                    modalContent.style.margin = '0';
                    modalContent.style.borderRadius = '0';
                    
                    const wheelContent = modal.querySelector('.spinning-wheel-wheel-content');
                    if (wheelContent) {
                        wheelContent.style.height = 'calc(100vh - 140px)';
                    }
                    
                    const wheelStep = modal.querySelector('.spinning-wheel-wheel-step');
                    if (wheelStep) {
                        wheelStep.style.height = '100%';
                        wheelStep.style.padding = '15px';
                    }
                    
                    const iframe = modal.querySelector('#spinningWheelIframe');
                    if (iframe) {
                        iframe.style.height = '100%';
                        iframe.style.minHeight = '600px';
                        iframe.style.borderRadius = '10px';
                    }
                } else if (window.innerWidth <= 768) {
                    // General mobile styles
                    const wheelContent = modal.querySelector('.spinning-wheel-wheel-content');
                    if (wheelContent) {
                        wheelContent.style.height = 'calc(100% - 120px)';
                    }
                    
                    const iframe = modal.querySelector('#spinningWheelIframe');
                    if (iframe) {
                        iframe.style.height = '100%';
                        iframe.style.minHeight = '500px';
                    }
                }
            }
        }, 50);
        
        // Mark as seen
        markModalAsSeen();
        
        // Listen for messages from the wheel iframe
        window.addEventListener('message', handleWheelMessage);
        
        // Add event listener for phone form
        setTimeout(() => {
            const phoneForm = document.getElementById('phoneForm');
            if (phoneForm) {
                phoneForm.addEventListener('submit', handlePhoneSubmit);
            }
        }, 100);
    }
    
                    // Handle window resize for responsive styles
        function handleResize() {
            if (!modalShown) return;
            
            const modal = document.getElementById(CONFIG.MODAL_ID);
            if (!modal) return;
            
            const modalContent = modal.querySelector('.spinning-wheel-modal-content');
            if (modalContent && window.innerWidth >= 768 && window.innerWidth <= 1023) {
                // Apply tablet-specific styles
                modalContent.style.width = '95%';
                modalContent.style.maxWidth = '1000px';
                modalContent.style.maxHeight = '95vh';
                
                const wheelContent = modal.querySelector('.spinning-wheel-wheel-content');
                if (wheelContent) {
                    wheelContent.style.minHeight = '700px';
                }
                
                const iframe = modal.querySelector('#spinningWheelIframe');
                if (iframe) {
                    iframe.style.height = '100%';
                }
            } else if (window.innerWidth <= 430) {
                // iPhone 14 Pro Max and similar small devices
                modalContent.style.height = '100vh';
                modalContent.style.maxHeight = '100vh';
                modalContent.style.margin = '0';
                modalContent.style.borderRadius = '0';
                
                const wheelContent = modal.querySelector('.spinning-wheel-wheel-content');
                if (wheelContent) {
                    wheelContent.style.height = 'calc(100vh - 140px)';
                }
                
                const wheelStep = modal.querySelector('.spinning-wheel-wheel-step');
                if (wheelStep) {
                    wheelStep.style.height = '100%';
                    wheelStep.style.padding = '15px';
                }
                
                const iframe = modal.querySelector('#spinningWheelIframe');
                if (iframe) {
                    iframe.style.height = '100%';
                    iframe.style.minHeight = '600px';
                    iframe.style.borderRadius = '10px';
                }
            } else if (window.innerWidth <= 768) {
                // General mobile styles
                const wheelContent = modal.querySelector('.spinning-wheel-wheel-content');
                if (wheelContent) {
                    wheelContent.style.height = 'calc(100% - 120px)';
                }
                
                const iframe = modal.querySelector('#spinningWheelIframe');
                if (iframe) {
                    iframe.style.height = '100%';
                    iframe.style.minHeight = '500px';
                }
            }
        }
        
        // Handle phone number submission
        async function handlePhoneSubmit(e) {
            e.preventDefault();
            
            const phoneInput = document.getElementById('phoneInput');
            const phoneNumber = phoneInput.value.trim();
            
            if (!phoneNumber) {
                alert('Please enter a phone number');
                return;
            }
            
            // Basic phone validation
            if (phoneNumber.length < 8) {
                alert('Please enter a valid phone number');
                return;
            }
            
            try {
                // Track phone number in database (same as account dashboard)
                const response = await fetch('/api/spinning-wheels/track-phone', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ phoneNumber: phoneNumber })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Phone number tracked successfully:', result);
                } else {
                    console.error('❌ Failed to track phone number');
                }
            } catch (error) {
                console.error('❌ Error tracking phone number:', error);
            }
            
            // Store phone number (you can modify this to send to your backend)
            localStorage.setItem('spinningWheelPhone', phoneNumber);
            
            // Also set a flag that the spinning wheel can check
            localStorage.setItem('spinningWheelPhoneEntered', 'true');
            
            // Hide phone step and show wheel step
            const phoneStep = document.getElementById('phoneStep');
            const wheelStep = document.getElementById('wheelStep');
            
            if (phoneStep && wheelStep) {
                phoneStep.style.display = 'none';
                wheelStep.style.display = 'flex';
                
                // Wait for iframe to load, then send phone number
                setTimeout(() => {
                    const iframe = document.getElementById('spinningWheelIframe');
                    if (iframe && iframe.contentWindow) {
                        try {
                            // Send phone number to iframe
                            iframe.contentWindow.postMessage({
                                type: 'phoneNumberEntered',
                                phoneNumber: phoneNumber
                            }, '*');
                        } catch (e) {
                            console.log('Could not send message to iframe yet');
                        }
                    }
                }, 500);
            }
        }

            // Close the modal
        function closeModal() {
            const modal = document.getElementById(CONFIG.MODAL_ID);
            if (!modal) return;
            
            modal.style.display = 'none';
            document.body.classList.remove('spinning-wheel-modal-open');
            
            // Remove event listeners
            window.removeEventListener('message', handleWheelMessage);
            window.removeEventListener('resize', handleResize);
        }

    // Handle messages from the spinning wheel iframe
    function handleWheelMessage(event) {
        // Handle any communication from the wheel if needed
        if (event.data && event.data.type === 'wheelClosed') {
            closeModal();
        }
    }

    // Close modal when clicking outside
    function handleOutsideClick(e) {
        if (e.target.id === CONFIG.MODAL_ID) {
            closeModal();
        }
    }

    // Close modal with Escape key
    function handleKeydown(e) {
        if (e.key === 'Escape' && modalShown) {
            closeModal();
        }
    }

    // Start the timer
    function startTimer() {
        timer = setTimeout(() => {
            if (!modalShown && !hasSeenModalToday()) {
                showModal();
            }
        }, CONFIG.TRIGGER_DELAY);
    }

    // Initialize the modal system
    function init() {
        // Don't initialize if already done or if user has seen it today
        if (document.getElementById(CONFIG.MODAL_ID) || hasSeenModalToday()) {
            return;
        }

        // Add CSS
        document.head.appendChild(createModalCSS());
        
        // Add modal HTML
        document.body.insertAdjacentHTML('beforeend', createModalHTML());
        
        // Add event listeners
        const modal = document.getElementById(CONFIG.MODAL_ID);
        modal.addEventListener('click', handleOutsideClick);
        document.addEventListener('keydown', handleKeydown);
        
        // Add resize listener for responsive styles
        window.addEventListener('resize', handleResize);
        
        // Start timer
        startTimer();
    }

    // Public API
    window.showSpinningWheelModal = showModal;
    window.closeSpinningWheelModal = closeModal;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Clean up timer on page unload
    window.addEventListener('beforeunload', function() {
        if (timer) {
            clearTimeout(timer);
        }
    });

})();
