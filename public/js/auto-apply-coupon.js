/**
 * Auto-Apply Coupon Script
 * Automatically applies saved coupon codes from localStorage to car single pages
 * and removes them after successful booking
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        storageKey: 'autoApplyCoupon',
        discountCodeInputSelector: 'input[name="discount_code"]',
        bookingFormSelector: '#booking_form',
        successModalSelector: '#booking-success-modal'
    };

    // Auto-apply coupon when page loads
    function autoApplyCoupon() {
        try {
            // Check if there's a saved coupon
            const savedCoupon = localStorage.getItem(CONFIG.storageKey);
            
            if (!savedCoupon) {
                console.log('No saved coupon found');
                return;
            }

            console.log('Auto-applying saved coupon:', savedCoupon);

            // Find the discount code input
            const discountInput = document.querySelector(CONFIG.discountCodeInputSelector);
            
            if (!discountInput) {
                console.warn('Discount code input not found on this page');
                return;
            }

            // Apply the coupon code
            discountInput.value = savedCoupon;
            
            // Trigger change event to notify other scripts
            const changeEvent = new Event('change', { bubbles: true });
            discountInput.dispatchEvent(changeEvent);

            // Show visual feedback
            showCouponAppliedFeedback(savedCoupon);

            console.log('Coupon auto-applied successfully:', savedCoupon);

        } catch (error) {
            console.error('Error auto-applying coupon:', error);
        }
    }

    // Show visual feedback that coupon was auto-applied
    function showCouponAppliedFeedback(couponCode) {
        try {
            // Create notification element
            const notification = document.createElement('div');
            notification.id = 'auto-coupon-notification';
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
            if (!document.getElementById('auto-coupon-styles')) {
                const style = document.createElement('style');
                style.id = 'auto-coupon-styles';
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

            // Set notification content
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">🎉</span>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 2px;">Coupon Applied!</div>
                        <div style="font-size: 12px; opacity: 0.9;">Code: ${couponCode}</div>
                    </div>
                </div>
            `;

            // Add to page
            document.body.appendChild(notification);

            // Auto-remove after 4 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, 4000);

        } catch (error) {
            console.error('Error showing coupon feedback:', error);
        }
    }

    // Remove coupon from localStorage after successful booking
    function removeCouponAfterBooking() {
        try {
            // Check if there's a saved coupon
            const savedCoupon = localStorage.getItem(CONFIG.storageKey);
            
            if (!savedCoupon) {
                return;
            }

            console.log('Removing used coupon from localStorage:', savedCoupon);
            localStorage.removeItem(CONFIG.storageKey);

            // Show confirmation
            showCouponUsedFeedback(savedCoupon);

        } catch (error) {
            console.error('Error removing coupon:', error);
        }
    }

    // Show feedback that coupon was used
    function showCouponUsedFeedback(couponCode) {
        try {
            // Create notification element
            const notification = document.createElement('div');
            notification.id = 'coupon-used-notification';
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

            // Set notification content
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">✅</span>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 2px;">Coupon Used!</div>
                        <div style="font-size: 12px; opacity: 0.9;">Code: ${couponCode} - Thank you!</div>
                    </div>
                </div>
            `;

            // Add to page
            document.body.appendChild(notification);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, 5000);

        } catch (error) {
            console.error('Error showing coupon used feedback:', error);
        }
    }

    // Monitor for successful booking completion
    function setupBookingSuccessListener() {
        // Listen for booking success events
        document.addEventListener('bookingSuccess', function(event) {
            console.log('Booking success detected, removing coupon');
            removeCouponAfterBooking();
        });

        // Also monitor for success modal appearance
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if success modal was added
                            if (node.id === 'booking-success-modal' || 
                                (node.querySelector && node.querySelector(CONFIG.successModalSelector))) {
                                console.log('Success modal detected, removing coupon');
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
            subtree: true
        });
    }

    // Initialize the auto-apply functionality
    function init() {
        console.log('Initializing auto-apply coupon functionality');
        
        // Auto-apply coupon on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoApplyCoupon);
        } else {
            autoApplyCoupon();
        }

        // Setup booking success monitoring
        setupBookingSuccessListener();
    }

    // Initialize when script loads
    init();

    // Export for global access if needed
    window.AutoApplyCoupon = {
        autoApply: autoApplyCoupon,
        removeAfterBooking: removeCouponAfterBooking
    };

})();
