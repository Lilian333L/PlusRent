// i18n-init.js

// Wait for i18next to be available
function initI18n() {
  if (typeof i18next === 'undefined') {
    console.log('i18next not loaded yet, retrying in 100ms...');
    setTimeout(initI18n, 100);
    return;
  }

  // Always default to Romanian unless user explicitly picks another language
  const savedLang = localStorage.getItem('lang');
  const defaultLang = 'ro';
  let initialLang = savedLang || defaultLang;

  if (!savedLang) {
    localStorage.setItem('lang', defaultLang);
    initialLang = defaultLang;
  }

  i18next
    .use(i18nextHttpBackend)
    .init({
      lng: initialLang,
      fallbackLng: 'ro',
      debug: false,
      backend: {
        loadPath: 'js/locales/{{lng}}.json'
      },
      interpolation: {
        escapeValue: false // allow HTML in translations
      },
      parseMissingKeyHandler: function(key) { 
        console.warn('Missing translation key:', key);
        return key; 
      }
    }, function(err, t) {
      if (err) {
        console.error('i18n initialization error:', err);
        // Fallback: try to load with a different approach
        loadFallbackTranslations(initialLang);
      } else {
        console.log('i18n initialized successfully with language:', initialLang);
        if (!savedLang) {
          i18next.changeLanguage(defaultLang, function() {
            updateContent();
            updateLangPickerUI();
          });
        } else {
          updateContent();
          updateLangPickerUI();
        }
      }
    });
}

function updateContent() {
  console.log('Updating content with i18n...');
  const elements = document.querySelectorAll('[data-i18n]');
  console.log('Found', elements.length, 'elements with data-i18n attributes');
  
  // Test specific problematic keys
  console.log('=== TRANSLATION KEY TESTS ===');
  console.log('cars.filter_cars available:', i18next.exists('cars.filter_cars'));
  console.log('cars.apply_filters available:', i18next.exists('cars.apply_filters'));
  console.log('cars.filter_clear available:', i18next.exists('cars.filter_clear'));
  console.log('Current language:', i18next.language);
  console.log('Available languages:', i18next.languages);
  console.log('Loaded namespaces:', i18next.reportNamespaces.getUsedNamespaces());
  console.log('=== END TESTS ===');
  
  elements.forEach(function(el, index) {
    var key = el.getAttribute('data-i18n');
    var date = el.getAttribute('data-i18n-date');
    
    console.log(`Processing element ${index + 1}:`, key, 'Element:', el.tagName, el.className);
    
    if (date) {
      // Handle custom interpolation for unavailable badges
      var value = i18next.t(key, { date: date });
    } else {
      var value = i18next.t(key);
    }
    
    console.log(`Translation for "${key}":`, value);
    
    if (el.childElementCount === 0) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.setAttribute('placeholder', value);
        if (el.type === 'submit' || el.type === 'button') {
          el.value = value;
        }
      } else {
        el.innerHTML = value;
      }
    } else {
      Array.from(el.childNodes).forEach(function(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = value;
        }
      });
    }
  });
  
  // Handle dynamic car type translations
  document.querySelectorAll('[data-i18n^="car_types."]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var value = i18next.t(key);
    if (el.childElementCount === 0) {
      el.innerHTML = value;
    } else {
      Array.from(el.childNodes).forEach(function(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = value;
        }
      });
    }
  });
  
  updateLangPickerUI();
}

function updateLangPickerUI() {
  var lang = i18next.language || 'ro';
  var flag = '🇷🇴', code = 'RO';
  if (lang === 'en') { flag = '🇬🇧'; code = 'EN'; }
  if (lang === 'ru') { flag = '🇷🇺'; code = 'RU'; }
  var flagEl = document.getElementById('langFlag');
  var codeEl = document.getElementById('langCode');
  if (flagEl) flagEl.textContent = flag;
  if (codeEl) codeEl.textContent = code;
  // Highlight selected in dropdown
  var opts = document.querySelectorAll('.lang-option');
  opts.forEach(function(opt) {
    if (opt.getAttribute('data-lang') === lang) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
}

// Initialize i18next event listeners once it's loaded
function setupI18nEvents() {
  if (typeof i18next === 'undefined') {
    setTimeout(setupI18nEvents, 100);
    return;
  }

  i18next.on('languageChanged', () => {
    updateContent();
    localStorage.setItem('lang', i18next.language);
    updateLangPickerUI();
    
    // Send language change message to spinning wheel iframe
    const wheelIframe = document.querySelector('.wheel-container iframe');
    if (wheelIframe && wheelIframe.contentWindow) {
      try {
        wheelIframe.contentWindow.postMessage({
          type: 'languageChange',
          language: i18next.language
        }, '*');
      } catch (e) {
        console.log('Could not send message to iframe:', e);
      }
    }
  });
}

// Enhanced initialization with multiple fallback strategies
function initializeI18nWithFallbacks() {
  console.log('Starting i18n initialization with fallbacks...');
  
  // Strategy 1: Try normal initialization
  initI18n();
  
  // Strategy 2: Set up a backup timer to force fallback if needed
  setTimeout(function() {
    if (typeof i18next === 'undefined' || !i18next.isInitialized) {
      console.warn('i18n failed to initialize normally, forcing fallback...');
      const savedLang = localStorage.getItem('lang') || 'ro';
      loadFallbackTranslations(savedLang);
    }
  }, 2000);
  
  // Strategy 3: Set up DOMContentLoaded backup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        if (typeof i18next === 'undefined' || !i18next.isInitialized) {
          console.warn('i18n still not ready after DOMContentLoaded, forcing fallback...');
          const savedLang = localStorage.getItem('lang') || 'ro';
          loadFallbackTranslations(savedLang);
        } else {
          updateContent();
        }
      }, 500);
    });
  } else {
    // DOM already loaded
    setTimeout(function() {
      if (typeof i18next === 'undefined' || !i18next.isInitialized) {
        console.warn('i18n not ready, forcing fallback...');
        const savedLang = localStorage.getItem('lang') || 'ro';
        loadFallbackTranslations(savedLang);
      } else {
        updateContent();
      }
    }, 500);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Custom Language Picker logic
  var langBtn = document.getElementById('langPickerBtn');
  var langDropdown = document.getElementById('langDropdown');
  var langOptions = document.querySelectorAll('.lang-option');
  var closeDropdown = function() {
    langDropdown.classList.remove('open');
    langBtn.setAttribute('aria-expanded', 'false');
  };
  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = langDropdown.classList.contains('open');
      document.querySelectorAll('.lang-picker-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
      if (!isOpen) {
        langDropdown.classList.add('open');
        langBtn.setAttribute('aria-expanded', 'true');
        // Focus first option
        setTimeout(function() {
          var sel = langDropdown.querySelector('.lang-option.selected') || langDropdown.querySelector('.lang-option');
          if (sel) sel.focus();
        }, 50);
      } else {
        closeDropdown();
      }
    });
    // Keyboard navigation
    langBtn.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        langDropdown.classList.add('open');
        langBtn.setAttribute('aria-expanded', 'true');
        var sel = langDropdown.querySelector('.lang-option.selected') || langDropdown.querySelector('.lang-option');
        if (sel) sel.focus();
      }
    });
    langOptions.forEach(function(opt) {
      opt.addEventListener('click', function(e) {
        var lang = opt.getAttribute('data-lang');
        if (typeof i18next !== 'undefined') {
          i18next.changeLanguage(lang);
        }
        closeDropdown();
      });
      opt.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          opt.click();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          var next = opt.nextElementSibling || langDropdown.querySelector('.lang-option');
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          var prev = opt.previousElementSibling || langDropdown.querySelector('.lang-option:last-child');
          if (prev) prev.focus();
        } else if (e.key === 'Escape') {
          closeDropdown();
          langBtn.focus();
        }
      });
    });
    // Close on outside click
    document.addEventListener('click', function(e) {
      if (!langDropdown.contains(e.target) && e.target !== langBtn) {
        closeDropdown();
      }
    });
    // Close on ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeDropdown();
    });
  }
  
  // Setup i18next events and UI
  setupI18nEvents();
  updateLangPickerUI();
  
  // Final check and update
  setTimeout(function() {
    if (typeof i18next !== 'undefined' && i18next.isInitialized) {
      updateContent();
    } else {
      console.warn('i18n not ready after DOMContentLoaded, using fallback...');
      const savedLang = localStorage.getItem('lang') || 'ro';
      loadFallbackTranslations(savedLang);
    }
  }, 1000);
});

// Fallback translations in case locale files fail to load
function loadFallbackTranslations(lang) {
  console.log('Loading fallback translations for language:', lang);
  const fallbackTranslations = {
    ro: {
      common: {
        loading: "Se încarcă..."
      },
      cars: {
        filter_cars: "Filtrează Mașinile",
        filter_clear: "Șterge toate filtrele",
        apply_filters: "Aplică Filtrele",
        loading_filters: "Se încarcă filtrele...",
        filter_make: "Marca",
        filter_gear: "Cutie de viteze",
        filter_fuel: "Combustibil",
        filter_type: "Tip",
        filter_doors: "Uși",
        filter_passengers: "Pasageri",
        filter_price: "Preț",
        filter_price_from: "De la",
        filter_price_to: "Până la"
      },
      menu: {
        home: "Acasă",
        cars: "Mașini",
        about: "Despre noi",
        contact: "Contact"
      }
    },
    en: {
      common: {
        loading: "Loading..."
      },
      cars: {
        filter_cars: "Filter Cars",
        filter_clear: "Clear all filters",
        apply_filters: "Apply Filters",
        loading_filters: "Loading filters...",
        filter_make: "Make",
        filter_gear: "Gear",
        filter_fuel: "Fuel",
        filter_type: "Type",
        filter_doors: "Doors",
        filter_passengers: "Passengers",
        filter_price: "Price",
        filter_price_from: "From",
        filter_price_to: "To"
      },
      menu: {
        home: "Home",
        cars: "Cars",
        about: "About Us",
        contact: "Contact"
      }
    },
    ru: {
      common: {
        loading: "Загрузка..."
      },
      cars: {
        filter_cars: "Фильтровать автомобили",
        filter_clear: "Очистить все фильтры",
        apply_filters: "Применить фильтры",
        loading_filters: "Загрузка фильтров...",
        filter_make: "Марка",
        filter_gear: "Коробка передач",
        filter_fuel: "Топливо",
        filter_type: "Тип",
        filter_doors: "Двери",
        filter_passengers: "Пассажиры",
        filter_price: "Цена",
        filter_price_from: "От",
        filter_price_to: "До"
      },
      menu: {
        home: "Главная",
        cars: "Автомобили",
        about: "О нас",
        contact: "Контакты"
      }
    }
  };

  // Add fallback translations to i18next
  if (fallbackTranslations[lang]) {
    if (typeof i18next !== 'undefined') {
      i18next.addResourceBundle(lang, 'translation', fallbackTranslations[lang], true, true);
      i18next.changeLanguage(lang, function() {
        updateContent();
        updateLangPickerUI();
      });
    } else {
      // If i18next is not available, manually update the DOM
      console.log('i18next not available, manually updating DOM...');
      const translations = fallbackTranslations[lang];
      document.querySelectorAll('[data-i18n]').forEach(function(el) {
        const key = el.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = translations;
        for (const k of keys) {
          if (value && value[k]) {
            value = value[k];
          } else {
            value = key; // fallback to key if translation not found
            break;
          }
        }
        
        if (el.childElementCount === 0) {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.setAttribute('placeholder', value);
            if (el.type === 'submit' || el.type === 'button') {
              el.value = value;
            }
          } else {
            el.innerHTML = value;
          }
        } else {
          Array.from(el.childNodes).forEach(function(node) {
            if (node.nodeType === Node.TEXT_NODE) {
              node.textContent = value;
            }
          });
        }
      });
    }
  }
}

// Start the initialization with enhanced fallback strategies
initializeI18nWithFallbacks(); 