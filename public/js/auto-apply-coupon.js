/**
 * Auto-Apply Coupon Script
 * Automatically applies saved coupon codes from localStorage to car single pages
 * and removes them after successful booking
 * 
 * NOTE: This script works together with universal-spinning-wheel-modal.js
 * It uses the notification system from that file to avoid duplicate notifications
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
  };

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

      // Check if there's a saved coupon (check both keys)
      let savedCoupon = localStorage.getItem(CONFIG.storageKey);

      // If no coupon in autoApplyCoupon, check spinningWheelWinningCoupon
      if (!savedCoupon) {
        savedCoupon = localStorage.getItem("spinningWheelWinningCoupon");
      }

      if (!savedCoupon) {
        return;
      }

      // Find the discount code input (try multiple selectors)
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
        return; // Don't overwrite user input
      }

      if (document.activeElement === discountInput) {
        return; // Don't overwrite while user is typing
      }

      // Apply the coupon code
      discountInput.value = savedCoupon;
      window.__autoCouponAppliedOnce = true; // Mark as applied

      if (
        window.priceCalculator &&
        typeof window.priceCalculator.validateAndShowCoupon === "function"
      ) {
        window.priceCalculator.validateAndShowCoupon(savedCoupon);
      } else {
        // Fallback: trigger blur event for validation
        setTimeout(() => {
          discountInput.dispatchEvent(new Event("blur"));
        }, 100);
      }

      // Trigger change event to notify other scripts
      const changeEvent = new Event("change", { bubbles: true });
      discountInput.dispatchEvent(changeEvent);

      // Also trigger input event
      const inputEvent = new Event("input", { bubbles: true });
      discountInput.dispatchEvent(inputEvent);
    } catch (error) {
      console.error("Error auto-applying coupon:", error);
    }
  }

  // Remove coupon from localStorage after successful booking
  function removeCouponAfterBooking() {
    try {
      // Check if there's a saved coupon
      const savedCoupon = localStorage.getItem(CONFIG.storageKey);
      const spinningWheelCoupon = localStorage.getItem(
        "spinningWheelWinningCoupon"
      );

      if (!savedCoupon && !spinningWheelCoupon) {
        return;
      }

      // Remove the coupon and reward received flag
      localStorage.removeItem(CONFIG.storageKey);
      localStorage.removeItem("spinningWheelWinningCoupon");
      localStorage.removeItem("spinningWheelRewardReceived");
      
      // Show "coupon used" notification
      showCouponUsedNotification(savedCoupon || spinningWheelCoupon);
    } catch (error) {
      console.error("Error removing coupon:", error);
    }
  }

  // Get current language from multiple sources
  function getCurrentLanguage() {
    // 1. Check localStorage
    const storedLang = localStorage.getItem('lang') || localStorage.getItem('language') || localStorage.getItem('i18nextLng');
    if (storedLang) {
      const lang = storedLang.split('-')[0];
      if (['en', 'ru', 'ro'].includes(lang)) {
        return lang;
      }
    }
    
    // 2. Check i18next if available
    if (typeof i18next !== 'undefined' && i18next.language) {
      const i18nextLang = i18next.language.split('-')[0];
      if (['en', 'ru', 'ro'].includes(i18nextLang)) {
        return i18nextLang;
      }
    }
    
    // 3. Check HTML lang attribute
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      const lang = htmlLang.split('-')[0];
      if (['en', 'ru', 'ro'].includes(lang)) {
        return lang;
      }
    }
    
    // 4. Default to English
    return 'en';
  }

  // Show feedback that coupon was used (after booking completion)
  function showCouponUsedNotification(couponCode) {
    try {
      // Check if notification already exists to prevent duplicates
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

      // Create notification element
      const notification = document.createElement("div");
      notification.id = "coupon-used-notification";
      notification.className = 'coupon-notification-container';
      
      // Create confetti elements (less confetti for "used" notification)
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

      // Add to page
      document.body.appendChild(notification);

      // Auto-remove after 5 seconds
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
    // Listen for booking success events
    document.addEventListener("bookingSuccess", function (event) {
      removeCouponAfterBooking();
    });

    // Also monitor for success modal appearance
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if success modal was added
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

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Initialize the auto-apply functionality
  function init() {
    // Setup spinning wheel submit button listener
    setupSpinningWheelListener();

    // Setup booking success monitoring
    setupBookingSuccessListener();

    // Setup price calculator modal listener
    setupPriceCalculatorListener();

    // Auto-apply on page load (for single car pages)
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          autoApplyCoupon();
        }, 500);
      });
    } else {
      setTimeout(() => {
        autoApplyCoupon();
      }, 500);
    }
  }

  // Listen for spinning wheel submit button clicks
  function setupSpinningWheelListener() {
    // Listen for clicks on booking form submit buttons
    document.addEventListener("click", function (event) {
      // Check if it's a booking form submit button (not the spinning wheel phone form)
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
        // Make sure it's not the spinning wheel phone form continue button
        const isSpinningWheelContinue =
          event.target.closest(".spinning-wheel-phone-step") ||
          event.target.closest("#universalPhoneStep");

        if (!isSpinningWheelContinue) {
          // Small delay to ensure the form is ready
          setTimeout(() => {
            autoApplyCoupon();
          }, 500);
        }
      }
    });

    // Hook into the quickbook modal's applyModalCalculation function
    // Wait for the function to be available
    const checkForApplyModalCalculation = () => {
      if (window.applyModalCalculation) {
        const originalApplyModalCalculation = window.applyModalCalculation;
        window.applyModalCalculation = function () {
          // Call the original function first
          const result = originalApplyModalCalculation.apply(this, arguments);
          // Then trigger auto-apply
          setTimeout(() => {
            autoApplyCoupon();
          }, 100);
          return result;
        };
      } else {
        setTimeout(checkForApplyModalCalculation, 100);
      }
    };

    // Start checking for the function
    checkForApplyModalCalculation();
  }

  // Listen for price calculator modal opening
  function setupPriceCalculatorListener() {
    // Use MutationObserver to detect when the price calculator modal is opened
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if price calculator modal was added or made visible
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
                // Small delay to ensure the modal is fully rendered
                setTimeout(() => {
                  autoApplyCoupon();
                }, 200);
              }
            }
          });
        }

        // Also check for style changes that might show the modal
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
              }, 200);
            }
          }
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  // Initialize when script loads
  init();

  // Export for global access if needed
  window.AutoApplyCoupon = {
    autoApply: autoApplyCoupon,
    removeAfterBooking: removeCouponAfterBooking,
  };
})();
