/**
 * Universal Spinning Wheel Modal Trigger - Premium Design
 * Полностью обновленный дизайн с поддержкой 3 языков (RO/RU/EN)
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
        isInitialized: false
    };

    // Check if user has seen the modal today or has already received their reward
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

    // Track total time spent on website across all pages
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

    // Set website start time if not already set
    function setWebsiteStartTime() {
        if (!localStorage.getItem('websiteStartTime')) {
            localStorage.setItem('websiteStartTime', Date.now().toString());
        }
    }

    // Mark modal as seen today
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
                        <h2 class="spinning-wheel-modal-title" data-i18n="wheel.title">Încearcă-ți norocul!</h2>
                        <p class="spinning-wheel-modal-subtitle" data-i18n="wheel.subtitle">Rotește roata și câștigă reduceri uimitoare la închirieri auto!</p>
                    </div>
                    
                    <div class="spinning-wheel-wheel-content">
                        <div class="spinning-wheel-phone-step" id="universalPhoneStep">
                            <div class="phone-input-container">
                                <div class="phone-icon-circle">
                                    <i class="fa fa-mobile-alt"></i>
                                </div>
                                <h3 data-i18n="wheel.enter_phone_title">Introdu Numărul Tău</h3>
                                <p class="phone-description" data-i18n="wheel.phone_description">Îți vom trimite oferte exclusive și codul tău de reducere norocos!</p>
                                <form class="phone-form" id="universalPhoneForm">
                                    <div class="input-wrapper">
                                        <i class="fa fa-phone input-icon"></i>
                                        <input type="tel" class="phone-input" id="universalPhoneInput" 
                                               data-i18n-placeholder="wheel.phone_placeholder" placeholder="+373 XX XXX XXX" required>
                                    </div>
                                    <button type="submit" class="phone-submit-btn">
                                        <span data-i18n="wheel.continue_button">Continuă</span>
                                        <i class="fa fa-arrow-right btn-icon"></i>
                                    </button>
                                    <div class="privacy-badge">
                                        <i class="fa fa-shield-alt"></i>
                                        <span data-i18n="wheel.privacy_text">Datele tale sunt securizate</span>
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

    // Create modal CSS
    function createModalCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* ============================================
               ОСНОВНЫЕ СТИЛИ МОДАЛЬНОГО ОКНА
               ============================================ */
            
            .spinning-wheel-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
                z-index: ${CONFIG.zIndex};
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .spinning-wheel-modal.show {
                opacity: 1;
            }

            .spinning-wheel-modal-content {
                background: #ffffff;
                border-radius: 24px;
                width: 90%;
                max-width: 1000px;
                max-height: 90vh;
                position: relative;
                overflow: hidden;
                transform: scale(0.9);
                transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                box-shadow: 
                    0 30px 90px rgba(0, 0, 0, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.1);
            }
            
            .spinning-wheel-modal-content.phone-step {
                max-width: 600px;
                max-height: 70vh;
                height: auto;
            }
            
            .spinning-wheel-modal-content.phone-step .spinning-wheel-wheel-content {
                min-height: unset;
            }
            
            .spinning-wheel-modal-content.wheel-step {
                max-width: 1200px;
                max-height: 92vh;
            }

            .spinning-wheel-modal.show .spinning-wheel-modal-content {
                transform: scale(1);
            }

            /* ============================================
               КНОПКА ЗАКРЫТИЯ
               ============================================ */
            
            .spinning-wheel-modal-close {
                position: absolute;
                top: 16px;
                right: 16px;
                font-size: 32px;
                cursor: pointer;
                color: #ffffff;
                z-index: 100;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                font-weight: 300;
                line-height: 1;
            }

            .spinning-wheel-modal-close:hover {
                background: rgba(255, 255, 255, 0.95);
                color: #1e90ff;
                transform: rotate(90deg) scale(1.1);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }

            /* ============================================
               HEADER (ШАПКА)
               ============================================ */
            
            .spinning-wheel-modal-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
                border-radius: 24px 24px 0 0;
                position: relative;
                overflow: hidden;
            }
            
            .header-decoration {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                opacity: 0.1;
                background-image: 
                    radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
                    radial-gradient(circle at 40% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
            }
            
            .header-gift-icon {
                width: 70px;
                height: 70px;
                margin: 0 auto 20px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: floatBounce 3s ease-in-out infinite;
                position: relative;
                z-index: 1;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
            }
            
            .header-gift-icon svg {
                width: 35px;
                height: 35px;
                color: white;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
            }
            
            @keyframes floatBounce {
                0%, 100% { 
                    transform: translateY(0) scale(1);
                }
                50% { 
                    transform: translateY(-12px) scale(1.05);
                }
            }

            .spinning-wheel-modal-title {
                font-size: 2rem;
                font-weight: 800;
                margin: 0 0 12px 0;
                text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
                font-family: 'Arial', sans-serif;
                color: white;
                position: relative;
                z-index: 1;
                letter-spacing: 0.5px;
            }

            .spinning-wheel-modal-subtitle {
                font-size: 1.1rem;
                margin: 0;
                opacity: 0.95;
                font-family: 'Arial', sans-serif;
                position: relative;
                z-index: 1;
                line-height: 1.5;
                font-weight: 400;
            }

            /* ============================================
               CONTENT AREA
               ============================================ */
            
            .spinning-wheel-wheel-content {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                display: flex;
                min-height: 500px;
            }

            /* ============================================
               PHONE STEP (ШАГ ВВОДА ТЕЛЕФОНА)
               ============================================ */
            
            .spinning-wheel-phone-step {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 50px 40px;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }
            
            .phone-input-container {
                text-align: center;
                max-width: 480px;
                width: 100%;
                animation: slideInUp 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }
            
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .phone-icon-circle {
                width: 90px;
                height: 90px;
                margin: 0 auto 25px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: pulseGlow 2.5s ease-in-out infinite;
                box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
            }
            
            .phone-icon-circle i {
                font-size: 2.5rem;
                color: white;
            }
            
            @keyframes pulseGlow {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
                }
                50% { 
                    transform: scale(1.05);
                    box-shadow: 0 15px 50px rgba(102, 126, 234, 0.6);
                }
            }
            
            .phone-input-container h3 {
                color: #2d3748;
                font-size: 1.8rem;
                margin: 0 0 12px 0;
                font-weight: 700;
                letter-spacing: 0.3px;
            }
            
            .phone-description {
                color: #4a5568;
                font-size: 1rem;
                margin: 0 0 35px 0;
                line-height: 1.6;
                font-weight: 400;
            }
            
            .phone-form {
                margin-bottom: 0;
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
                color: #667eea;
                font-size: 1.2rem;
                z-index: 1;
            }
            
            .phone-input {
                width: 100%;
                padding: 18px 18px 18px 50px;
                border: 2px solid #e2e8f0;
                border-radius: 14px;
                font-size: 1.1rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                background: white;
                font-weight: 500;
                color: #2d3748;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }
            
            .phone-input::placeholder {
                color: #a0aec0;
                font-weight: 400;
            }
            
            .phone-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 
                    0 0 0 4px rgba(102, 126, 234, 0.15),
                    0 4px 12px rgba(102, 126, 234, 0.2);
                transform: translateY(-2px);
            }
            
            .phone-input-error {
                border-color: #fc8181 !important;
                box-shadow: 
                    0 0 0 4px rgba(252, 129, 129, 0.15),
                    0 4px 12px rgba(252, 129, 129, 0.2) !important;
                animation: shakeError 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
            }
            
            @keyframes shakeError {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
                20%, 40%, 60%, 80% { transform: translateX(8px); }
            }
            
            .phone-error-message {
                color: #fc8181;
                font-size: 0.9rem;
                margin-top: 8px;
                text-align: center;
                font-weight: 500;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .phone-submit-btn {
                width: 100%;
                padding: 18px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 14px;
                font-size: 1.15rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                letter-spacing: 0.5px;
                margin-bottom: 20px;
            }
            
            .phone-submit-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5);
            }
            
            .phone-submit-btn:active {
                transform: translateY(-1px);
            }
            
            .btn-icon {
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
                color: #718096;
                font-size: 0.9rem;
                padding: 12px;
                background: rgba(255, 255, 255, 0.6);
                border-radius: 10px;
                backdrop-filter: blur(10px);
            }
            
            .privacy-badge i {
                color: #667eea;
                font-size: 1rem;
            }

            /* ============================================
               WHEEL STEP (ШАГ С КОЛЕСОМ)
               ============================================ */
            
            .spinning-wheel-wheel-step {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                background: white;
            }

            /* ============================================
               АДАПТИВНЫЙ ДИЗАЙН - DESKTOP
               ============================================ */
            
            @media (min-width: 1024px) {
                .spinning-wheel-modal-content {
                    width: 85%;
                    max-width: 1200px;
                    max-height: 92vh;
                    height: 85vh;
                }
                
                .spinning-wheel-modal-header {
                    padding: 50px 40px;
                }
                
                .header-gift-icon {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 24px;
                }
                
                .header-gift-icon svg {
                    width: 40px;
                    height: 40px;
                }
                
                .spinning-wheel-modal-title {
                    font-size: 2.5rem;
                }
                
                .spinning-wheel-modal-subtitle {
                    font-size: 1.25rem;
                }
                
                .spinning-wheel-wheel-content {
                    min-height: 600px;
                    height: calc(100% - 180px);
                }
                
                .spinning-wheel-wheel-step {
                    height: 100%;
                    padding: 50px;
                }
                
                iframe {
                    height: 100% !important;
                }
                
                .spinning-wheel-phone-step {
                    padding: 60px 50px;
                }
            }
            
            /* ============================================
               АДАПТИВНЫЙ ДИЗАЙН - TABLET
               ============================================ */
            
            @media (min-width: 768px) and (max-width: 1023px) {
                .spinning-wheel-modal-content {
                    width: 95%;
                    max-width: 900px;
                    max-height: 95vh;
                }
                
                .spinning-wheel-modal-header {
                    padding: 35px 30px;
                }
                
                .header-gift-icon {
                    width: 65px;
                    height: 65px;
                    margin-bottom: 18px;
                }
                
                .header-gift-icon svg {
                    width: 32px;
                    height: 32px;
                }
                
                .spinning-wheel-modal-title {
                    font-size: 2rem;
                }
                
                .spinning-wheel-modal-subtitle {
                    font-size: 1.1rem;
                }
                
                .spinning-wheel-wheel-content {
                    min-height: 600px;
                }
                
                .spinning-wheel-phone-step {
                    padding: 40px 35px;
                }
                
                .phone-icon-circle {
                    width: 80px;
                    height: 80px;
                }
                
                .phone-icon-circle i {
                    font-size: 2.2rem;
                }
                
                .phone-input-container h3 {
                    font-size: 1.6rem;
                }
                
                .phone-description {
                    font-size: 1rem;
                }
                
                .phone-input,
                .phone-submit-btn {
                    padding: 16px 18px 16px 50px;
                    font-size: 1.05rem;
                }
            }
            
            /* ============================================
               АДАПТИВНЫЙ ДИЗАЙН - MOBILE
               ============================================ */
            
            @media (max-width: 767px) {
                .spinning-wheel-modal-content {
                    margin: 15px;
                    width: calc(100% - 30px);
                    max-width: calc(100vw - 30px);
                    max-height: calc(100vh - 30px);
                    height: auto;
                    border-radius: 20px;
                }
                
                .spinning-wheel-modal-content.phone-step {
                    max-width: calc(100vw - 30px);
                    max-height: 75vh;
                    height: auto;
                }
                
                .spinning-wheel-modal-content.wheel-step {
                    max-width: calc(100vw - 30px);
                    max-height: calc(100vh - 30px);
                    height: calc(100vh - 30px);
                }
                
                .spinning-wheel-modal-close {
                    top: 12px;
                    right: 12px;
                    width: 38px;
                    height: 38px;
                    font-size: 28px;
                }
                
                .spinning-wheel-modal-header {
                    padding: 25px 20px;
                    border-radius: 20px 20px 0 0;
                }
                
                .header-gift-icon {
                    width: 60px;
                    height: 60px;
                    margin-bottom: 15px;
                }
                
                .header-gift-icon svg {
                    width: 30px;
                    height: 30px;
                }
                
                .spinning-wheel-modal-title {
                    font-size: 1.5rem;
                    margin-bottom: 8px;
                }
                
                .spinning-wheel-modal-subtitle {
                    font-size: 0.95rem;
                }
                
                .spinning-wheel-wheel-content {
                    flex-direction: column;
                    min-height: auto;
                    height: auto;
                }
                
                .spinning-wheel-phone-step {
                    padding: 30px 20px;
                }
                
                .phone-icon-circle {
                    width: 70px;
                    height: 70px;
                    margin-bottom: 20px;
                }
                
                .phone-icon-circle i {
                    font-size: 2rem;
                }
                
                .phone-input-container h3 {
                    font-size: 1.4rem;
                    margin-bottom: 10px;
                }
                
                .phone-description {
                    font-size: 0.92rem;
                    margin-bottom: 25px;
                }
                
                .input-wrapper {
                    margin-bottom: 18px;
                }
                
                .input-icon {
                    left: 16px;
                    font-size: 1.1rem;
                }
                
                .phone-input {
                    padding: 15px 15px 15px 45px;
                    font-size: 1rem;
                    border-radius: 12px;
                }
                
                .phone-submit-btn {
                    padding: 15px 25px;
                    font-size: 1.05rem;
                    border-radius: 12px;
                    margin-bottom: 18px;
                }
                
                .privacy-badge {
                    font-size: 0.85rem;
                    padding: 10px;
                }
                
                .spinning-wheel-wheel-step {
                    padding: 20px;
                    height: calc(100vh - 200px);
                    min-height: 500px;
                }
                
                #universalSpinningWheelIframe {
                    height: 100% !important;
                    min-height: 500px;
                    border-radius: 12px;
                }
            }
            
            /* ============================================
               АДАПТИВНЫЙ ДИЗАЙН - SMALL MOBILE
               ============================================ */
            
            @media (max-width: 480px) {
                .spinning-wheel-modal-content {
                    margin: 10px;
                    width: calc(100% - 20px);
                    border-radius: 18px;
                }
                
                .spinning-wheel-modal-content.phone-step {
                    max-height: 80vh;
                }
                
                .spinning-wheel-modal-close {
                    width: 36px;
                    height: 36px;
                    font-size: 26px;
                }
                
                .spinning-wheel-modal-header {
                    padding: 20px 15px;
                }
                
                .header-gift-icon {
                    width: 55px;
                    height: 55px;
                    margin-bottom: 12px;
                }
                
                .header-gift-icon svg {
                    width: 28px;
                    height: 28px;
                }
                
                .spinning-wheel-modal-title {
                    font-size: 1.3rem;
                }
                
                .spinning-wheel-modal-subtitle {
                    font-size: 0.88rem;
                }
                
                .spinning-wheel-phone-step {
                    padding: 25px 18px;
                }
                
                .phone-icon-circle {
                    width: 65px;
                    height: 65px;
                    margin-bottom: 18px;
                }
                
                .phone-icon-circle i {
                    font-size: 1.8rem;
                }
                
                .phone-input-container h3 {
                    font-size: 1.25rem;
                }
                
                .phone-description {
                    font-size: 0.88rem;
                    margin-bottom: 22px;
                }
                
                .phone-input {
                    padding: 14px 14px 14px 42px;
                    font-size: 0.95rem;
                }
                
                .phone-submit-btn {
                    padding: 14px 22px;
                    font-size: 1rem;
                }
                
                .privacy-badge {
                    font-size: 0.8rem;
                    padding: 8px;
                }
                
                .spinning-wheel-wheel-step {
                    padding: 15px;
                    height: calc(100vh - 180px);
                    min-height: 450px;
                }
                
                #universalSpinningWheelIframe {
                    min-height: 450px;
                }
            }
            
            /* ============================================
               LANDSCAPE MODE MOBILE
               ============================================ */
            
            @media (max-width: 767px) and (orientation: landscape) {
                .spinning-wheel-modal-content {
                    max-height: 95vh;
                    height: 95vh;
                }
                
                .spinning-wheel-modal-header {
                    padding: 15px 20px;
                }
                
                .header-gift-icon {
                    width: 50px;
                    height: 50px;
                    margin-bottom: 8px;
                }
                
                .spinning-wheel-modal-title {
                    font-size: 1.2rem;
                    margin-bottom: 5px;
                }
                
                .spinning-wheel-modal-subtitle {
                    font-size: 0.85rem;
                }
                
                .spinning-wheel-phone-step {
                    padding: 20px;
                }
                
                .phone-icon-circle {
                    width: 55px;
                    height: 55px;
                    margin-bottom: 12px;
                }
                
                .phone-input-container h3 {
                    font-size: 1.15rem;
                    margin-bottom: 8px;
                }
                
                .phone-description {
                    font-size: 0.85rem;
                    margin-bottom: 18px;
                }
                
                .spinning-wheel-wheel-step {
                    padding: 15px;
                    height: calc(100vh - 150px);
                }
            }
        `;
        return style;
    }

    // Update translations in the modal
    function updateModalTranslations() {
        if (!state.modal) return;
        
        if (typeof i18next !== 'undefined' && i18next.t) {
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
            
            const phoneTitleElement = state.modal.querySelector('[data-i18n="wheel.enter_phone_title"]');
            const phoneDescElement = state.modal.querySelector('[data-i18n="wheel.phone_description"]');
            const phoneInputElement = state.modal.querySelector('#universalPhoneInput');
            const continueButtonElement = state.modal.querySelector('[data-i18n="wheel.continue_button"]');
            const privacyTextElement = state.modal.querySelector('[data-i18n="wheel.privacy_text"]');
            
            if (phoneTitleElement) {
                const translatedPhoneTitle = i18next.t('wheel.enter_phone_title');
                if (translatedPhoneTitle && translatedPhoneTitle !== 'wheel.enter_phone_title') {
                    phoneTitleElement.textContent = translatedPhoneTitle;
                }
            }
            if (phoneDescElement) {
                const translatedPhoneDesc = i18next.t('wheel.phone_description');
                if (translatedPhoneDesc && translatedPhoneDesc !== 'wheel.phone_description') {
                    phoneDescElement.textContent = translatedPhoneDesc;
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
            if (privacyTextElement) {
                const translatedPrivacy = i18next.t('wheel.privacy_text');
                if (translatedPrivacy && translatedPrivacy !== 'wheel.privacy_text') {
                    privacyTextElement.textContent = translatedPrivacy;
                }
            }
        }
    }

    // Show modal
    function showModal(options = {}) {
        if (!state.modal) return;
        
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
    }

    // Close modal
    function closeModal() {
        if (!state.modal) return;
        
        state.modal.classList.remove('show');
        
        setTimeout(() => {
            state.modal.style.display = 'none';
        }, 300);
    }

    // Cleanup function
    function cleanup() {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
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

    // Show phone error
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
        if (existingError) {
            existingError.remove();
        }
        
        if (!phoneNumber) {
            const currentLang = getCurrentLanguage();
            const errorMessages = {
                en: 'Please enter a phone number',
                ru: 'Пожалуйста, введите номер телефона',
                ro: 'Vă rugăm introduceți numărul de telefon'
            };
            showPhoneError(phoneInput, errorMessages[currentLang] || errorMessages.en);
            return;
        }
        
        if (!validatePhoneNumber(phoneNumber)) {
            const currentLang = getCurrentLanguage();
            const errorMessages = {
                en: 'Please enter a valid phone number (7-15 digits)',
                ru: 'Пожалуйста, введите корректный номер (7-15 цифр)',
                ro: 'Vă rugăm introduceți un număr valid (7-15 cifre)'
            };
            showPhoneError(phoneInput, errorMessages[currentLang] || errorMessages.en);
            return;
        }
        
        const formattedPhone = formatPhoneNumber(phoneNumber);

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
                    const currentLang = getCurrentLanguage();
                    const errorMessages = {
                        en: 'You have already received a reward for this phone number.',
                        ru: 'Вы уже получили награду за этот номер телефона.',
                        ro: 'Ai primit deja o recompensă pentru acest număr de telefon.'
                    };
                    showPhoneError(phoneInput, errorMessages[currentLang] || errorMessages.en);
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking available coupons:', error);
        }

        localStorage.setItem('spinningWheelPhone', formattedPhone);
        localStorage.setItem('spinningWheelPhoneEntered', 'true');

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

        document.getElementById('universalPhoneStep').style.display = 'none';
        document.getElementById('universalWheelStep').style.display = 'flex';
        
        const modalContent = document.querySelector('.spinning-wheel-modal-content');
        if (modalContent) {
            modalContent.classList.remove('phone-step');
            modalContent.classList.add('wheel-step');
        }

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
        } catch (error) {
            console.error('Error auto-applying winning coupon:', error);
        }
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
        } catch (error) {
            console.error('Error handling auto-apply coupon:', error);
        }
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

    // Show coupon applied notification
    function showCouponAppliedNotification(couponCode) {
        const currentLang = getCurrentLanguage();
        
        const translations = {
            en: {
                title: 'Coupon Applied!',
                codeLabel: 'Code:',
                readyMessage: 'Ready to use on your next booking!'
            },
            ru: {
                title: 'Купон Применён!',
                codeLabel: 'Код:',
                readyMessage: 'Готов к использованию при бронировании!'
            },
            ro: {
                title: 'Cupon Aplicat!',
                codeLabel: 'Cod:',
                readyMessage: 'Gata pentru următoarea rezervare!'
            }
        };
        
        const t = translations[currentLang] || translations.ro;
        
        const notification = document.createElement('div');
        notification.id = 'coupon-applied-notification';
        notification.className = 'coupon-notification-container';
        
        const confettiColors = ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#9370DB', '#32CD32'];
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
        
        if (!document.getElementById('coupon-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'coupon-notification-styles';
            style.textContent = `
                .coupon-notification-container {
                    position: fixed;
                    top: 80px;
                    right: 15px;
                    z-index: 10000;
                    animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                
                .coupon-notification-card {
                    position: relative;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                    padding: 12px;
                    box-shadow: 
                        0 10px 30px rgba(102, 126, 234, 0.4),
                        0 0 0 1px rgba(255, 255, 255, 0.1) inset;
                    max-width: 240px;
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
                    width: 32px;
                    height: 32px;
                    margin: 0 auto 6px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: bounce 1s infinite;
                }
                
                .coupon-gift-icon svg {
                    width: 18px;
                    height: 18px;
                    color: white;
                }
                
                .coupon-notification-content {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                    color: white;
                }
                
                .coupon-title {
                    font-size: 0.9rem;
                    font-weight: 700;
                    margin-bottom: 6px;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                }
                
                .sparkle {
                    display: inline-block;
                    animation: sparkle 1.5s infinite;
                    font-size: 0.75rem;
                }
                
                .coupon-code-container {
                    background: rgba(255, 255, 255, 0.2);
                    border: 2px dashed rgba(255, 255, 255, 0.5);
                    border-radius: 6px;
                    padding: 6px;
                    margin: 6px 0;
                    backdrop-filter: blur(5px);
                }
                
                .coupon-label {
                    display: block;
                    font-size: 0.65rem;
                    opacity: 0.9;
                    margin-bottom: 2px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .coupon-code {
                    display: block;
                    font-size: 0.95rem;
                    font-weight: 800;
                    letter-spacing: 1.2px;
                    font-family: 'Courier New', monospace;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
                }
                
                .coupon-message {
                    font-size: 0.68rem;
                    opacity: 0.95;
                    line-height: 1.2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                }
                
                .check-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 12px;
                    height: 12px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    font-size: 9px;
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
                        top: 70px;
                        right: 8px;
                        max-width: 200px;
                    }
                    
                    .coupon-notification-card {
                        max-width: 100%;
                        padding: 10px;
                    }
                    
                    .coupon-gift-icon {
                        width: 28px;
                        height: 28px;
                        margin-bottom: 4px;
                    }
                    
                    .coupon-gift-icon svg {
                        width: 16px;
                        height: 16px;
                    }
                    
                    .coupon-title {
                        font-size: 0.8rem;
                        gap: 3px;
                        margin-bottom: 4px;
                    }
                    
                    .sparkle {
                        font-size: 0.65rem;
                    }
                    
                    .coupon-code-container {
                        padding: 5px;
                        margin: 5px 0;
                    }
                    
                    .coupon-label {
                        font-size: 0.6rem;
                    }
                    
                    .coupon-code {
                        font-size: 0.85rem;
                        letter-spacing: 1px;
                    }
                    
                    .coupon-message {
                        font-size: 0.62rem;
                        gap: 3px;
                    }
                    
                    .check-icon {
                        width: 10px;
                        height: 10px;
                        font-size: 8px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
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

    // Handle outside click
    function handleOutsideClick(event) {
        // Disabled
    }

    // Handle escape key
    function handleKeydown(event) {
        // Disabled
    }

    // Handle window resize
    function handleResize() {
        // CSS handles all responsive behavior
    }

    // Handle visibility change
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

    // Handle before unload
    function handleBeforeUnload() {
        const currentTime = Date.now();
        const startTime = localStorage.getItem('websiteStartTime');
        
        if (startTime) {
            const totalTime = currentTime - parseInt(startTime);
            localStorage.setItem('websiteTotalTime', totalTime.toString());
        }
    }

    // Fetch correct wheel
    async function fetchCorrectWheel() {
        try {
    // Fetch correct wheel
    async function fetchCorrectWheel() {
        try {
            const API_BASE_URL = window.API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/api/spinning-wheels/enabled-configs`);
            
            if (!response.ok) {
                console.error('Error fetching enabled wheels:', response.status);
                return null;
            }
            
            const wheelConfigs = await response.json();
            
            const nonPremiumWheels = wheelConfigs.filter(wheel => !wheel.is_premium);
            
            if (nonPremiumWheels.length === 0) {
                console.warn('No non-premium enabled wheels found');
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
            console.error('Error fetching correct wheel:', error);
            return null;
        }
    }
    }

    // Start timer
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

    // Show modal with correct wheel
    async function showModalWithCorrectWheel() {
        const correctWheel = await fetchCorrectWheel();
        
        if (correctWheel) {
            showModal({ wheelId: correctWheel.id, wheelType: correctWheel.type });
        } else {
            showModal();
        }
    }

    // Initialize
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

    // Export for global access
    window.UniversalSpinningWheel = {
        show: showModal,
        close: closeModal,
        init: init,
        fetchWheelIdByType: fetchWheelIdByType
    };

})();
