/**
 * Master Include Script
 * This script loads all necessary functionality for the website
 * Add this single script to any page to enable all features
 */

(function() {
    'use strict';
    
    // Load universal spinning wheel
    if (!window.UniversalSpinningWheel) {
        const spinningWheelScript = document.createElement('script');
        spinningWheelScript.src = 'js/universal-spinning-wheel.js';
        spinningWheelScript.async = true;
        document.head.appendChild(spinningWheelScript);
    }
    
    // Load other common scripts if they don't exist
    if (!window.i18next) {
        const i18nScript = document.createElement('script');
        i18nScript.src = 'https://unpkg.com/i18next@21.6.16/dist/umd/i18next.min.js';
        i18nScript.async = true;
        document.head.appendChild(i18nScript);
    }
    
    if (!window.i18nextHttpBackend) {
        const i18nBackendScript = document.createElement('script');
        i18nBackendScript.src = 'https://unpkg.com/i18next-http-backend@1.4.3/i18nextHttpBackend.min.js';
        i18nBackendScript.async = true;
        document.head.appendChild(i18nBackendScript);
    }
    
    // Load i18n init if not already loaded
    if (!document.querySelector('script[src*="i18n-init.js"]')) {
        const i18nInitScript = document.createElement('script');
        i18nInitScript.src = 'js/i18n-init.js';
        i18nInitScript.async = true;
        document.head.appendChild(i18nInitScript);
    }
    
    console.log('Master include script loaded successfully');
    
})();
