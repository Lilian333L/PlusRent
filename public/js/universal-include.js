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
    script.src = 'js/universal-spinning-wheel.js';
    script.async = true;
    
    // Add error handling
    script.onerror = function() {
        console.error('Failed to load universal spinning wheel script');
    };
    
    // Append to head
    document.head.appendChild(script);
    
})();
