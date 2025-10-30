/**
 * Auto-Apply Coupon Script with Phone Validation
 * Automatically applies saved coupon codes and validates them with phone numbers
 * Prevents duplicate error notifications
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
    validationCooldown: 1000, // 1 second between validations
  };

  // Global state to prevent duplicate validations
  let validationState = {
    inProgress: false,
    lastValidationTime: 0,
    lastErrorMessage: null,
    lastErrorTime: 0,
  };

  // Debounce utility
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Show error message (with duplicate prevention)
  function showCouponError(message) {
    const now = Date.now();
    
    // Prevent showing the same error multiple times within cooldown period
    if (
      validationState.lastErrorMessage === message &&
      now - validationState.lastErrorTime < CONFIG.validationCooldown
    ) {
      console.log('⏱️ Duplicate error prevented:', message);
      return;
    }
    
    validationState.lastErrorMessage = message;
    validationState.lastErrorTime = now;
    
    const errorContainer = document.getElementById('coupon-error-message');
    if (errorContainer) {
      // Clear previous message
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
      
      // Show new message after small delay for smoothness
      setTimeout(() => {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          if (errorContainer.textContent === message) {
            errorContainer.style.display = 'none';
          }
        }, 5000);
      }, 50);
    }
    
    // Show toast notification (only once per message)
    if (typeof window.showError === 'function') {
      window.showError(message);
    }
  }

  // Clear error message
  function clearCouponError() {
    validationState.lastErrorMessage = null;
    validationState.lastErrorTime = 0;
    
    const errorContainer = document.getElementById('coupon-error-message');
    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
    }
  }

  // Validate coupon with phone number
  async function validateCouponWithPhone(couponCode, phoneNumber) {
    const now = Date.now();
    
    // Prevent duplicate validations
    if (validationState.inProgress) {
      console.log('⏳ Validation already in progress, skipping...');
      return null;
    }
    
    if (now - validationState.lastValidationTime < CONFIG.validationCooldown) {
      console.log('⏱️ Validation cooldown active, skipping...');
      return null;
    }
    
    if (!couponCode || !phoneNumber) {
      return null;
    }
    
    validationState.inProgress = true;
    validationState.lastValidationTime = now;
    
    try {
      console.log('🔍 Validating coupon:', couponCode, 'for phone:', phoneNumber);
      
      const response = await fetch(`${window.API_BASE_URL}/api/coupons/validate-with-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode,
          phone: phoneNumber
        })
      });
      
      const data = await response.json();
      
      if (data.valid) {
        console.log('✅ Coupon valid:', data);
        clearCouponError();
        return data;
      } else {
        console.log('❌ Coupon invalid:', data.message);
        showCouponError(data.message || 'Invalid coupon code');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Coupon validation error:', error);
      showCouponError('Failed to validate coupon. Please try again.');
      return null;
      
    } finally {
      validationState.inProgress = false;
    }
  }

  // Debounced validation (500ms delay)
  const debouncedValidation = debounce(async function(couponCode, phoneNumber) {
    await validateCouponWithPhone(couponCode, phoneNumber);
  }, 500);

  // Setup coupon validation listeners
  function setupCouponValidation() {
    const couponInput = document.getElementById('modal-discount-code');
    const phoneInput = document.getElementById('phone');
    
    if (!couponInput || !phoneInput) {
      console.log('⚠️ Coupon or phone input not found');
      return;
    }
    
    // Remove existing listeners by cloning nodes
    const newCouponInput = couponInput.cloneNode(true);
    couponInput.parentNode.replaceChild(newCouponInput, couponInput);
    
    const newPhoneInput = phoneInput.cloneNode(true);
    phoneInput.parentNode.replaceChild(newPhoneInput, phoneInput);
    
    // Add single input listener with debounce
    newCouponInput.addEventListener('input', function() {
      const code = this.value.trim();
      const phone = newPhoneInput.value.trim();
      
      if (code && phone) {
        debouncedValidation(code, phone);
      } else if (!code) {
        clearCouponError();
      }
    });
    
    // Add phone input listener with debounce
    newPhoneInput.addEventListener('input', function() {
      const phone = this.value.trim();
      const code = newCouponInput.value.trim();
      
      if (code && phone) {
        debouncedValidation(code, phone);
      }
    });
    
    console.log('✅ Coupon validation setup complete');
  }

  // Auto-apply coupon when page loads
  function autoApplyCoupon() {
    try {
      // Don't auto-apply if already applied once or if form is being submitted
      if (
        window.__autoCouponAppliedOnce ||
        document.querySelector('form[data-submitting="true"]')
      ) {
        return;
      }

      // Check if there's a saved coupon
      let savedCoupon = localStorage.getItem(CONFIG.storageKey);

      if (!savedCoupon) {
        savedCoupon = localStorage.getItem("spinningWheelWinningCoupon");
      }

      if (!savedCoupon) {
        return;
      }

      // Find the discount code input
      const selectors = CONFIG.discountCodeInputSelector.split(", ");
      let discountInput = null;

      for (const selector of selectors) {
        discountInput = document.querySelector(selector);
        if (discountInput) {
          break;
        }
      }

      if (!discountInput) {
        return;
      }

      // Only apply if field is empty and not focused
      if (discountInput.value && discountInput.value.trim().length > 0) {
        return;
      }

      if (document.activeElement === discountInput) {
        return;
      }

      // Apply the coupon code
      discountInput.value = savedCoupon;
      window.__autoCouponAppliedOnce = true;

      if (
        window.priceCalculator &&
        typeof window.priceCalculator.validateAndShowCoupon === "function"
      ) {
        window.priceCalculator.validateAndShowCoupon(savedCoupon);
      } else {
        // Trigger blur event for validation (only once)
        setTimeout(() => {
          discountInput.dispatchEvent(new Event("blur", { bubbles: true }));
        }, 100);
      }

      // Trigger change event (only once)
      setTimeout(() => {
        discountInput.dispatchEvent(new Event("change", { bubbles: true }));
      }, 150);

    } catch (error) {
      console.error("Error auto-applying coupon:", error);
    }
  }

  // Remove coupon from localStorage after successful booking
  function removeCouponAfterBooking() {
    try {
      const savedCoupon = localStorage.getItem(CONFIG.storageKey);
      const spinningWheelCoupon = localStorage.getItem("spinningWheelWinningCoupon");

      if (!savedCoupon && !spinningWheelCoupon) {
        return;
      }

      localStorage.removeItem(CONFIG.storageKey);
      localStorage.removeItem("spinningWheelWinningCoupon");
      localStorage.removeItem("spinningWheelRewardReceived");
      
      showCouponUsedNotification(savedCoupon || spinningWheelCoupon);
    } catch (error) {
      console.error("Error removing coupon:", error);
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
    
    return 'en';
  }

  // Show coupon used notification
  function showCouponUsedNotification(couponCode) {
    try {
      if (document.getElementById('coupon-used-notification')) {
        return;
      }

      const currentLang = getCurrentLanguage();
      
      const translations = {
        en: {
          title: 'Coupon Used!',
          message: 'Thank you for your booking!'
        },
        ru: {
          title: 'Купон Использован!',
          message: 'Спасибо за бронирование!'
        },
        ro: {
          title: 'Cupon Utilizat!',
          message: 'Mulțumim pentru rezervare!'
        }
      };
      
      const t = translations[currentLang] || translations.en;

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
        confettiHTML += `<div class="confetti" style="
          left: ${left}%;
          background: ${color};
          animation-delay: ${delay}s;
          animation-duration: ${duration}s;
        "></div>`;
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
            <div class="coupon-title">
              <span class="sparkle">✨</span>
              ${t.title}
              <span class="sparkle">✨</span>
            </div>
            <div class="coupon-code-container">
              <span class="coupon-label">Code:</span>
              <span class="coupon-code">${couponCode}</span>
            </div>
            <div class="coupon-message">
              <span class="check-icon">✓</span>
              ${t.message}
            </div>
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
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 400);
        }
      }, 5000);
    } catch (error) {
      console.error("Error showing coupon used notification:", error);
    }
  }

  // Monitor for successful booking completion
  function setupBookingSuccessListener() {
    document.addEventListener("bookingSuccess", function (event) {
      removeCouponAfterBooking();
    });

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (
                node.id === "booking-success-modal" ||
                (node.querySelector &&
                  node.querySelector(CONFIG.successModalSelector))
              ) {
                removeCouponAfterBooking();
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Listen for spinning wheel submit button clicks
  function setupSpinningWheelListener() {
    document.addEventListener("click", function (event) {
      if (
        event.target &&
        (event.target.textContent === "TRIMITE" ||
          event.target.textContent === "Submit" ||
          event.target.textContent === "Trimite" ||
          event.target.textContent === "Apply to Booking" ||
          event.target.textContent === "Aplică la Rezervare" ||
          (event.target.closest("button") &&
            (event.target.closest("button").textContent.includes("TRIMITE") ||
              event.target
                .closest("button")
                .textContent.includes("Apply to Booking") ||
              event.target
                .closest("button")
                .textContent.includes("Aplică la Rezervare"))))
      ) {
        const isSpinningWheelContinue =
          event.target.closest(".spinning-wheel-phone-step") ||
          event.target.closest("#universalPhoneStep");

        if (!isSpinningWheelContinue) {
          setTimeout(() => {
            autoApplyCoupon();
          }, 500);
        }
      }
    });

    const checkForApplyModalCalculation = () => {
      if (window.applyModalCalculation) {
        const originalApplyModalCalculation = window.applyModalCalculation;
        window.applyModalCalculation = function () {
          const result = originalApplyModalCalculation.apply(this, arguments);
          setTimeout(() => {
            autoApplyCoupon();
          }, 100);
          return result;
        };
      } else {
        setTimeout(checkForApplyModalCalculation, 100);
      }
    };

    checkForApplyModalCalculation();
  }

  // Listen for price calculator modal opening
  function setupPriceCalculatorListener() {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const priceCalculator = node.querySelector
                ? node.querySelector("#price-calculator-content")
                : node.id === "price-calculator-content"
                ? node
                : null;

              if (
                priceCalculator ||
                (node.classList &&
                  node.classList.contains("price-calculator-content"))
              ) {
                setTimeout(() => {
                  autoApplyCoupon();
                  setupCouponValidation();
                }, 200);
              }
            }
          });
        }

        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          const target = mutation.target;
          if (
            target.id === "price-calculator-content" ||
            target.classList.contains("price-calculator-content")
          ) {
            const style = target.style.display;
            if (style === "block" || style === "flex" || !style) {
              setTimeout(() => {
                autoApplyCoupon();
                setupCouponValidation();
              }, 200);
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  // Initialize
  function init() {
    setupSpinningWheelListener();
    setupBookingSuccessListener();
    setupPriceCalculatorListener();
    setupCouponValidation();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          autoApplyCoupon();
          setupCouponValidation();
        }, 500);
      });
    } else {
      setTimeout(() => {
        autoApplyCoupon();
        setupCouponValidation();
      }, 500);
    }
  }

  init();

  window.AutoApplyCoupon = {
    autoApply: autoApplyCoupon,
    removeAfterBooking: removeCouponAfterBooking,
    validateCoupon: validateCouponWithPhone,
  };
})();
