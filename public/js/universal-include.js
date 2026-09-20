/**
 * Universal Include Script for Spinning Wheel
 * Add this single script to any page to enable the spinning wheel modal
 */

(function() {
    'use strict';
    
    // Check if the script is already loaded
    if (window.UniversalSpinningWheel) {
        return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = '/js/universal-spinning-wheel.min.js?v=1a14c295';
    script.async = true;
    
    // Add error handling
    script.onerror = function() {
        
    };
    
    // Append to head
    document.head.appendChild(script);
    
})();
