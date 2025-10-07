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

  // Language detection and translations
  const TRANSLATIONS = {
    en: {
      appliedTitle: "Coupon Applied!",
      appliedCode: "Code",
      usedTitle: "Coupon Used!",
      usedMessage: "Thank you!",
    },
    ro: {
      appliedTitle: "Cupon Aplicat!",
      appliedCode: "Cod",
      usedTitle: "Cupon Utilizat!",
      usedMessage: "Mulțumim!",
    },
    ru: {
      appliedTitle: "Купон Применён!",
      appliedCode: "Код",
      usedTitle: "Купон Использован!",
      usedMessage: "Спасибо!",
    },
  };

  // Detect page language
  function detectLanguage() {
    // Check html lang attribute
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      const lang = htmlLang.toLowerCase().split("-")[0];
      if (TRANSLATIONS[lang]) return lang;
    }

    // Check meta tags
    const metaLang = document.querySelector('meta[http-equiv="content-language"]');
    if (metaLang) {
      const lang = metaLang.content.toLowerCase().split("-")[0];
      if (TRANSLATIONS[lang]) return lang;
    }

    // Check for Romanian-specific text in the page
    const bodyText = document.body.innerText.toLowerCase();
    if (bodyText.includes("rezervare") || bodyText.includes("închiriere") || bodyText.includes("trimite")) {
      return "ro";
    }

    // Check for Russian-specific text
    if (bodyText.includes("бронирование") || bodyText.includes("аренда") || bodyText.includes("отправить")) {
      return "ru";
    }

    // Default to English
    return "en";
  }

  // Get translation
  function getTranslation(key) {
    const lang = detectLanguage();
    return TRANSLATIONS[lang][key] || TRANSLATIONS.en[key];
  }

  // Auto-apply coupon when page loads
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

  // Show visual feedback that coupon was auto-applied
  function showCouponAppliedFeedback(couponCode) {
    try {
      // Create notification element
      const notification = document.createElement("div");
      notification.id = "auto-coupon-notification";
      notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-size: 14px;
                font-weight: 500;
                max-width: 300px;
                animation: slideInRight 0.3s ease-out;
            `;

      // Add animation keyframes
      if (!document.getElementById("auto-coupon-styles")) {
        const style = document.createElement("style");
        style.id = "auto-coupon-styles";
        style.textContent = `
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOutRight {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
        document.head.appendChild(style);
      }

      // Set notification content with translations
      notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">🎉</span>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 2px;">${getTranslation('appliedTitle')}</div>
                        <div style="font-size: 12px; opacity: 0.9;">${getTranslation('appliedCode')}: ${couponCode}</div>
                    </div>
                </div>
            `;

      // Add to page
      document.body.appendChild(notification);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = "slideOutRight 0.3s ease-in";
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 4000);
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

      if (!savedCoupon && !spinningWheelCoupon) {
        return;
      }

      // Remove the coupon and reward received flag
      localStorage.removeItem(CONFIG.storageKey);
      localStorage.removeItem("spinningWheelWinningCoupon");
      localStorage.removeItem("spinningWheelRewardReceived");
    } catch (error) {
      console.error("Error removing coupon:", error);
    }
  }

  // Show feedback that coupon was used
  function showCouponUsedFeedback(couponCode) {
    try {
      // Create notification element
      const notification = document.createElement("div");
      notification.id = "coupon-used-notification";
      notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #17a2b8, #138496);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-size: 14px;
                font-weight: 500;
                max-width: 300px;
                animation: slideInRight 0.3s ease-out;
            `;

      // Set notification content with translations
      notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">✅</span>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 2px;">${getTranslation('usedTitle')}</div>
                        <div style="font-size: 12px; opacity: 0.9;">${getTranslation('appliedCode')}: ${couponCode} - ${getTranslation('usedMessage')}</div>
                    </div>
                </div>
            `;

      // Add to page
      document.body.appendChild(notification);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = "slideOutRight 0.3s ease-in";
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 5000);
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
  };
})();
