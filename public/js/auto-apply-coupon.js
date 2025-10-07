/**
 * Auto-Apply Coupon Script
 * Automatically applies saved coupon codes from localStorage to car single pages
 * and removes them after successful booking
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

  // Translations for notifications
  const TRANSLATIONS = {
    en: {
      couponApplied: "Coupon Applied!",
      code: "Code",
      couponUsed: "Coupon Used!",
      thankYou: "Thank you!",
    },
    ro: {
      couponApplied: "Cupon Aplicat!",
      code: "Cod",
      couponUsed: "Cupon Utilizat!",
      thankYou: "Mulțumim!",
    },
    ru: {
      couponApplied: "Купон Применён!",
      code: "Код",
      couponUsed: "Купон Использован!",
      thankYou: "Спасибо!",
    },
  };

  // Detect current language from the website
  function getCurrentLanguage() {
    try {
      // Method 1: Check #langCode element (primary method for this site)
      const langCodeElement = document.querySelector("#langCode");
      if (langCodeElement) {
        const langText = langCodeElement.textContent.toLowerCase().trim();
        if (["en", "ro", "ru"].includes(langText)) {
          return langText;
        }
      }

      // Method 2: Check selected language option with data-lang
      const activeLangOption = document.querySelector('.lang-option.active, .lang-option[aria-selected="true"]');
      if (activeLangOption) {
        const dataLang = activeLangOption.getAttribute("data-lang");
        if (dataLang && ["en", "ro", "ru"].includes(dataLang.toLowerCase())) {
          return dataLang.toLowerCase();
        }
      }

      // Method 3: Check localStorage for saved language preference
      const savedLang = localStorage.getItem("selectedLanguage") || 
                       localStorage.getItem("language") ||
                       localStorage.getItem("lang") ||
                       localStorage.getItem("userLanguage");
      if (savedLang && ["en", "ro", "ru"].includes(savedLang.toLowerCase())) {
        return savedLang.toLowerCase();
      }

      // Method 4: Check HTML lang attribute
      const htmlLang = document.documentElement.lang;
      if (htmlLang && ["en", "ro", "ru"].includes(htmlLang.toLowerCase().substring(0, 2))) {
        return htmlLang.toLowerCase().substring(0, 2);
      }

      // Method 5: Check for any data-lang attribute in the document
      const langElement = document.querySelector("[data-lang]");
      if (langElement) {
        const dataLang = langElement.getAttribute("data-lang");
        if (dataLang && ["en", "ro", "ru"].includes(dataLang.toLowerCase())) {
          return dataLang.toLowerCase();
        }
      }

      // Method 6: Check for i18next or similar translation library
      if (window.i18next && window.i18next.language) {
        const i18nLang = window.i18next.language.substring(0, 2).toLowerCase();
        if (["en", "ro", "ru"].includes(i18nLang)) {
          return i18nLang;
        }
      }

      // Default to Romanian (RO) since that's the default on the site
      return "ro";
    } catch (error) {
      console.error("Error detecting language:", error);
      return "ro";
    }
  }

  // Get translated text
  function getTranslation(key) {
    const lang = getCurrentLanguage();
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key];
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

      // Show feedback notification
      showCouponAppliedFeedback(savedCoupon);
    } catch (error) {
      console.error("Error auto-applying coupon:", error);
    }
  }

  // Show visual feedback that coupon was auto-applied - UPDATED MODERN DESIGN
  function showCouponAppliedFeedback(couponCode) {
    try {
      // Create notification element with modern glassmorphism design
      const notification = document.createElement("div");
      notification.id = "auto-coupon-notification";
      notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(40, 167, 69, 0.2);
        color: #1a1a1a;
        padding: 16px 20px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(40, 167, 69, 0.15), 
                    0 2px 8px rgba(0, 0, 0, 0.08);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        max-width: 340px;
        min-width: 280px;
        animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        transform-origin: right center;
      `;

      // Add animation keyframes
      if (!document.getElementById("auto-coupon-styles")) {
        const style = document.createElement("style");
        style.id = "auto-coupon-styles";
        style.textContent = `
          @keyframes slideInRight {
            from { 
              transform: translateX(120%) scale(0.8);
              opacity: 0;
            }
            to { 
              transform: translateX(0) scale(1);
              opacity: 1;
            }
          }
          @keyframes slideOutRight {
            from { 
              transform: translateX(0) scale(1);
              opacity: 1;
            }
            to { 
              transform: translateX(120%) scale(0.8);
              opacity: 0;
            }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            #auto-coupon-notification,
            #coupon-used-notification {
              background: rgba(30, 30, 30, 0.95) !important;
              border-color: rgba(40, 167, 69, 0.3) !important;
              color: #ffffff !important;
            }
          }
          
          /* Mobile responsiveness */
          @media (max-width: 480px) {
            #auto-coupon-notification,
            #coupon-used-notification {
              right: 12px !important;
              top: 12px !important;
              max-width: calc(100vw - 24px) !important;
              min-width: unset !important;
            }
          }
        `;
        document.head.appendChild(style);
      }

      // Get translated texts
      const couponAppliedText = getTranslation("couponApplied");
      const codeText = getTranslation("code");

      // Set notification content with modern design
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: linear-gradient(135deg, #28a745, #20c997);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            animation: pulse 0.6s ease-in-out;
          ">
            🎉
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-weight: 600;
              font-size: 15px;
              margin-bottom: 4px;
              color: #1a1a1a;
              letter-spacing: -0.01em;
            ">${couponAppliedText}</div>
            <div style="
              font-size: 13px;
              color: #666;
              display: flex;
              align-items: center;
              gap: 6px;
            ">
              <span style="opacity: 0.8;">${codeText}:</span>
              <span style="
                font-weight: 600;
                color: #28a745;
                background: rgba(40, 167, 69, 0.1);
                padding: 2px 8px;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
              ">${couponCode}</span>
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            border: none;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #666;
            transition: all 0.2s ease;
            padding: 0;
          " onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.05)'">
            ×
          </button>
        </div>
      `;

      // Add to page
      document.body.appendChild(notification);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = "slideOutRight 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 5000);
    } catch (error) {
      console.error("Error showing coupon feedback:", error);
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

      const couponToShow = savedCoupon || spinningWheelCoupon;

      if (!savedCoupon && !spinningWheelCoupon) {
        return;
      }

      // Show feedback before removing
      if (couponToShow) {
        showCouponUsedFeedback(couponToShow);
      }

      // Remove the coupon and reward received flag
      localStorage.removeItem(CONFIG.storageKey);
      localStorage.removeItem("spinningWheelWinningCoupon");
      localStorage.removeItem("spinningWheelRewardReceived");
    } catch (error) {
      console.error("Error removing coupon:", error);
    }
  }

  // Show feedback that coupon was used - UPDATED MODERN DESIGN
  function showCouponUsedFeedback(couponCode) {
    try {
      // Create notification element with modern design
      const notification = document.createElement("div");
      notification.id = "coupon-used-notification";
      notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(23, 162, 184, 0.2);
        color: #1a1a1a;
        padding: 16px 20px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(23, 162, 184, 0.15), 
                    0 2px 8px rgba(0, 0, 0, 0.08);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        max-width: 340px;
        min-width: 280px;
        animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        transform-origin: right center;
      `;

      // Get translated texts
      const couponUsedText = getTranslation("couponUsed");
      const codeText = getTranslation("code");
      const thankYouText = getTranslation("thankYou");

      // Set notification content
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: linear-gradient(135deg, #17a2b8, #138496);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            animation: pulse 0.6s ease-in-out;
          ">
            ✅
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-weight: 600;
              font-size: 15px;
              margin-bottom: 4px;
              color: #1a1a1a;
              letter-spacing: -0.01em;
            ">${couponUsedText}</div>
            <div style="
              font-size: 13px;
              color: #666;
              display: flex;
              align-items: center;
              gap: 6px;
              flex-wrap: wrap;
            ">
              <span style="opacity: 0.8;">${codeText}:</span>
              <span style="
                font-weight: 600;
                color: #17a2b8;
                background: rgba(23, 162, 184, 0.1);
                padding: 2px 8px;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
              ">${couponCode}</span>
              <span style="opacity: 0.8;">- ${thankYouText}</span>
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            border: none;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #666;
            transition: all 0.2s ease;
            padding: 0;
          " onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.05)'">
            ×
          </button>
        </div>
      `;

      // Add to page
      document.body.appendChild(notification);

      // Auto-remove after 6 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = "slideOutRight 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 6000);
    } catch (error) {
      console.error("Error showing coupon used feedback:", error);
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
    getCurrentLanguage: getCurrentLanguage,
  };
})();
