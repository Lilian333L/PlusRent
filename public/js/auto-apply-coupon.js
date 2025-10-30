/**
 * Auto-Apply Coupon Script with Phone Validation
 * Complete duplicate prevention system
 */

(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    storageKey: "autoApplyCoupon",
    discountCodeInputSelector:
      '#modal-discount-code, #discountCode, input[name="discount_code"]',
    bookingFormSelector: "#booking_form",
    successModalSelector: "#booking-success-modal",
    validationCooldown: 3000, // 3 seconds
  };

  // GLOBAL state - prevents ALL duplicate notifications
  window.__couponValidationState = window.__couponValidationState || {
    inProgress: false,
    lastValidationTime: 0,
    lastErrorShownTime: 0,
    lastErrorMessage: null,
    lastValidatedCoupon: null,
    lastValidatedPhone: null,
    notificationQueue: [],
  };

  const validationState = window.__couponValidationState;

  // Translations
  const translations = {
    en: {
      phone_not_authorized: "Phone number not authorized for this coupon",
      invalid_coupon: "Invalid coupon code",
      validation_failed: "Failed to validate coupon. Please try again.",
      coupon_expired: "This coupon has expired",
      coupon_used: "This coupon has already been used",
      coupon_limit_reached: "Coupon usage limit reached"
    },
    ru: {
      phone_not_authorized: "Номер телефона не авторизован для этого купона",
      invalid_coupon: "Неверный код купона",
      validation_failed: "Не удалось проверить купон. Попробуйте еще раз.",
      coupon_expired: "Срок действия купона истек",
      coupon_used: "Этот купон уже использован",
      coupon_limit_reached: "Достигнут лимит использования купона"
    },
    ro: {
      phone_not_authorized: "Numărul de telefon nu este autorizat pentru acest cupon",
      invalid_coupon: "Cod cupon invalid",
      validation_failed: "Validarea cuponului a eșuat. Încercați din nou.",
      coupon_expired: "Acest cupon a expirat",
      coupon_used: "Acest cupon a fost deja folosit",
      coupon_limit_reached: "Limita de utilizare a cuponului a fost atinsă"
    }
  };

  // Get current language
  function getCurrentLanguage() {
    const storedLang = localStorage.getItem('lang') || localStorage.getItem('language') || localStorage.getItem('i18nextLng');
    if (storedLang) {
      const lang = storedLang.split('-')[0];
      if (['en', 'ru', 'ro'].includes(lang)) return lang;
    }
    
    if (typeof i18next !== 'undefined' && i18next.language) {
      const i18nextLang = i18next.language.split('-')[0];
      if (['en', 'ru', 'ro'].includes(i18nextLang)) return i18nextLang;
    }
    
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      const lang = htmlLang.split('-')[0];
      if (['en', 'ru', 'ro'].includes(lang)) return lang;
    }
    
    return 'en';
  }

  // Translate error message
  function translateErrorMessage(messageFromServer) {
    const currentLang = getCurrentLanguage();
    const t = translations[currentLang] || translations.en;
    
    if (!messageFromServer) return t.invalid_coupon;
    
    const lowerMessage = messageFromServer.toLowerCase();
    
    // Check for phone authorization error FIRST (most specific)
    if (lowerMessage.includes('phone') && 
        (lowerMessage.includes('not authorized') || 
         lowerMessage.includes('не авторизован') || 
         lowerMessage.includes('nu este autorizat'))) {
      return t.phone_not_authorized;
    }
    
    if (lowerMessage.includes('expired') || lowerMessage.includes('истек') || lowerMessage.includes('expirat')) {
      return t.coupon_expired;
    }
    
    if (lowerMessage.includes('used') || lowerMessage.includes('использован') || lowerMessage.includes('folosit')) {
      return t.coupon_used;
    }
    
    if (lowerMessage.includes('limit') || lowerMessage.includes('лимит') || lowerMessage.includes('limita')) {
      return t.coupon_limit_reached;
    }
    
    // Default to invalid coupon (but NOT if it's actually a phone error)
    return t.invalid_coupon;
  }

  // OVERRIDE window.showError for coupon errors
  const originalShowError = window.showError;
  window.showError = function(message) {
    // Check if this is a coupon-related error
    const isCouponError = message && (
      message.toLowerCase().includes('coupon') ||
      message.toLowerCase().includes('купон') ||
      message.toLowerCase().includes('cupon') ||
      message.toLowerCase().includes('phone') ||
      message.toLowerCase().includes('телефон') ||
      message.toLowerCase().includes('telefon') ||
      message.toLowerCase().includes('invalid') ||
      message.toLowerCase().includes('неверный') ||
      message.toLowerCase().includes('authorized') ||
      message.toLowerCase().includes('авторизован')
    );
    
    if (isCouponError) {
      console.log('🚫 BLOCKED window.showError for coupon:', message);
      // Don't show - will be handled by showCouponError
      return;
    }
    
    // Call original for non-coupon errors
    if (originalShowError) {
      originalShowError.call(this, message);
    }
  };

  // CENTRALIZED error display - ONLY ENTRY POINT
  function showCouponError(messageFromServer) {
    const now = Date.now();
    const translatedMessage = translateErrorMessage(messageFromServer);
    
    // ABSOLUTE duplicate prevention
    if (validationState.lastErrorMessage === translatedMessage &&
        now - validationState.lastErrorShownTime < CONFIG.validationCooldown) {
      console.log('🚫 DUPLICATE BLOCKED:', translatedMessage, 'Time since last:', now - validationState.lastErrorShownTime, 'ms');
      return;
    }
    
    // Check notification queue
    if (validationState.notificationQueue.includes(translatedMessage)) {
      console.log('🚫 ALREADY IN QUEUE:', translatedMessage);
      return;
    }
    
    console.log('⚠️ SHOWING ERROR:', translatedMessage);
    
    validationState.lastErrorMessage = translatedMessage;
    validationState.lastErrorShownTime = now;
    validationState.notificationQueue.push(translatedMessage);
    
    // Remove from queue after cooldown
    setTimeout(() => {
      const index = validationState.notificationQueue.indexOf(translatedMessage);
      if (index > -1) {
        validationState.notificationQueue.splice(index, 1);
      }
    }, CONFIG.validationCooldown);
    
    // Show in modal error container
    const errorContainer = document.getElementById('coupon-error-message');
    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
      
      setTimeout(() => {
        errorContainer.textContent = translatedMessage;
        errorContainer.style.display = 'block';
        errorContainer.style.color = '#dc3545';
        errorContainer.style.marginTop = '8px';
        errorContainer.style.fontSize = '14px';
        errorContainer.style.fontWeight = '500';
        
        // Auto-hide after 6 seconds
        setTimeout(() => {
          if (errorContainer.textContent === translatedMessage) {
            errorContainer.style.display = 'none';
          }
        }, 6000);
      }, 100);
    } else {
      // Fallback: create toast manually (avoiding window.showError)
      createCouponErrorToast(translatedMessage);
    }
  }

  // Create manual toast notification
  function createCouponErrorToast(message) {
    const toastId = 'coupon-error-toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'toast-notification error-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 99999;
      max-width: 350px;
      animation: slideInRight 0.3s ease-out;
    `;
    
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <i class="fa fa-exclamation-circle" style="font-size: 20px;"></i>
        <div>
          <strong style="display: block; margin-bottom: 4px;">Ошибка</strong>
          <span>${message}</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  // Clear error
  function clearCouponError() {
    validationState.lastErrorMessage = null;
    validationState.lastErrorShownTime = 0;
    
    const errorContainer = document.getElementById('coupon-error-message');
    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
    }
  }

  // Debounce utility
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // SINGLE validation function
  async function validateCouponWithPhone(couponCode, phoneNumber) {
    const now = Date.now();
    
    couponCode = (couponCode || '').trim();
    phoneNumber = (phoneNumber || '').trim();
    
    if (!couponCode || !phoneNumber) {
      console.log('⏭️ Empty input, skipping validation');
      return null;
    }
    
    // STRICT guards
    if (validationState.inProgress) {
      console.log('🚫 Validation in progress');
      return null;
    }
    
    if (now - validationState.lastValidationTime < CONFIG.validationCooldown) {
      console.log('🚫 Cooldown active:', CONFIG.validationCooldown - (now - validationState.lastValidationTime), 'ms remaining');
      return null;
    }
    
    if (validationState.lastValidatedCoupon === couponCode &&
        validationState.lastValidatedPhone === phoneNumber &&
        now - validationState.lastValidationTime < 10000) {
      console.log('🚫 Same values already validated recently');
      return null;
    }
    
    // Lock
    validationState.inProgress = true;
    validationState.lastValidationTime = now;
    validationState.lastValidatedCoupon = couponCode;
    validationState.lastValidatedPhone = phoneNumber;
    
    try {
      console.log('🔍 Validating:', couponCode, 'with phone:', phoneNumber);
      
      const response = await fetch(`${window.API_BASE_URL}/api/coupons/validate-with-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, phone: phoneNumber })
      });
      
      const data = await response.json();
      
      if (data.valid) {
        console.log('✅ Valid');
        clearCouponError();
        return data;
      } else {
        console.log('❌ Invalid:', data.message);
        showCouponError(data.message || 'Invalid coupon code');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Validation error:', error);
      const currentLang = getCurrentLanguage();
      const t = translations[currentLang] || translations.en;
      showCouponError(t.validation_failed);
      return null;
      
    } finally {
      setTimeout(() => {
        validationState.inProgress = false;
      }, 500);
    }
  }

  // Debounced validation
  const debouncedValidation = debounce(function(couponCode, phoneNumber) {
    validateCouponWithPhone(couponCode, phoneNumber);
  }, 1000); // 1 second debounce

  // Setup validation - ONLY ONCE
  function setupCouponValidation() {
    const couponInput = document.getElementById('modal-discount-code');
    const phoneInput = document.getElementById('phone');
    
    if (!couponInput || !phoneInput) {
      console.log('⚠️ Inputs not found');
      return;
    }
    
    if (couponInput.dataset.couponValidationActive === 'true') {
      console.log('⚠️ Already initialized');
      return;
    }
    
    couponInput.dataset.couponValidationActive = 'true';
    phoneInput.dataset.couponValidationActive = 'true';
    
    console.log('✅ Setting up validation');
    
    // SINGLE handler for coupon
    couponInput.addEventListener('input', function() {
      const code = this.value.trim();
      const phone = phoneInput.value.trim();
      
      if (!code) {
        clearCouponError();
        return;
      }
      
      if (code && phone) {
        debouncedValidation(code, phone);
      }
    });
    
    // SINGLE handler for phone
    phoneInput.addEventListener('input', function() {
      const phone = this.value.trim();
      const code = couponInput.value.trim();
      
      if (code && phone) {
        debouncedValidation(code, phone);
      }
    });
  }

  // Auto-apply coupon
  function autoApplyCoupon() {
    try {
      if (window.__autoCouponAppliedOnce || document.querySelector('form[data-submitting="true"]')) {
        return;
      }

      let savedCoupon = localStorage.getItem(CONFIG.storageKey);
      if (!savedCoupon) {
        savedCoupon = localStorage.getItem("spinningWheelWinningCoupon");
      }

      if (!savedCoupon) return;

      const selectors = CONFIG.discountCodeInputSelector.split(", ");
      let discountInput = null;

      for (const selector of selectors) {
        discountInput = document.querySelector(selector);
        if (discountInput) break;
      }

      if (!discountInput) return;
      if (discountInput.value && discountInput.value.trim().length > 0) return;
      if (document.activeElement === discountInput) return;

      discountInput.value = savedCoupon;
      window.__autoCouponAppliedOnce = true;

      setTimeout(() => {
        discountInput.dispatchEvent(new Event("input", { bubbles: true }));
      }, 200);

    } catch (error) {
      console.error("Auto-apply error:", error);
    }
  }

  // Remove coupon after booking
  function removeCouponAfterBooking() {
    try {
      const savedCoupon = localStorage.getItem(CONFIG.storageKey);
      const spinningWheelCoupon = localStorage.getItem("spinningWheelWinningCoupon");

      if (!savedCoupon && !spinningWheelCoupon) return;

      localStorage.removeItem(CONFIG.storageKey);
      localStorage.removeItem("spinningWheelWinningCoupon");
      localStorage.removeItem("spinningWheelRewardReceived");
      
      showCouponUsedNotification(savedCoupon || spinningWheelCoupon);
    } catch (error) {
      console.error("Remove coupon error:", error);
    }
  }

  // Show used notification
  function showCouponUsedNotification(couponCode) {
    try {
      if (document.getElementById('coupon-used-notification')) return;

      const currentLang = getCurrentLanguage();
      const notificationTranslations = {
        en: { title: 'Coupon Used!', message: 'Thank you for your booking!' },
        ru: { title: 'Купон Использован!', message: 'Спасибо за бронирование!' },
        ro: { title: 'Cupon Utilizat!', message: 'Mulțumim pentru rezervare!' }
      };
      
      const t = notificationTranslations[currentLang] || notificationTranslations.en;

      const notification = document.createElement("div");
      notification.id = "coupon-used-notification";
      notification.className = 'coupon-notification-container';
      
      const confettiColors = ['#FFD700', '#00CED1', '#32CD32'];
      let confettiHTML = '';
      for (let i = 0; i < 4; i++) {
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.3;
        const duration = 1 + Math.random() * 0.5;
        confettiHTML += `<div class="confetti" style="left: ${left}%; background: ${color}; animation-delay: ${delay}s; animation-duration: ${duration}s;"></div>`;
      }

      notification.innerHTML = `
        <div class="confetti-container">${confettiHTML}</div>
        <div class="coupon-notification-card" style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);">
          <div class="coupon-gift-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="coupon-notification-content">
            <div class="coupon-title"><span class="sparkle">✨</span>${t.title}<span class="sparkle">✨</span></div>
            <div class="coupon-code-container"><span class="coupon-label">Code:</span><span class="coupon-code">${couponCode}</span></div>
            <div class="coupon-message"><span class="check-icon">✓</span>${t.message}</div>
          </div>
          <div class="coupon-shine"></div>
        </div>
      `;

      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideInBounce 0.4s ease-out reverse';
          notification.style.opacity = '0';
          setTimeout(() => {
            if (notification.parentNode) notification.parentNode.removeChild(notification);
          }, 400);
        }
      }, 5000);
    } catch (error) {
      console.error("Notification error:", error);
    }
  }

  // Setup listeners
  function setupBookingSuccessListener() {
    document.addEventListener("bookingSuccess", removeCouponAfterBooking);

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.id === "booking-success-modal" || (node.querySelector && node.querySelector(CONFIG.successModalSelector))) {
                removeCouponAfterBooking();
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function setupPriceCalculatorListener() {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const isModal = node.id === "price-calculator-modal" || (node.querySelector && node.querySelector("#price-calculator-modal"));
              if (isModal) {
                setTimeout(() => {
                  autoApplyCoupon();
                  setupCouponValidation();
                }, 400);
              }
            }
          });
        }

        if (mutation.type === "attributes" && mutation.attributeName === "style") {
          if (mutation.target.id === "price-calculator-modal") {
            const style = mutation.target.style.display;
            if (style === "block" || style === "flex") {
              setTimeout(() => {
                autoApplyCoupon();
                setupCouponValidation();
              }, 400);
            }
          }
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
  }

  // Initialize
  function init() {
    setupBookingSuccessListener();
    setupPriceCalculatorListener();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          setupCouponValidation();
          autoApplyCoupon();
        }, 700);
      });
    } else {
      setTimeout(() => {
        setupCouponValidation();
        autoApplyCoupon();
      }, 700);
    }
  }

  init();

  window.AutoApplyCoupon = {
    autoApply: autoApplyCoupon,
    removeAfterBooking: removeCouponAfterBooking,
    validateCoupon: validateCouponWithPhone,
  };
})();
