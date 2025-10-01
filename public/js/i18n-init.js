// i18n-init.js

// Wait for i18next to be available
function initI18n() {
  if (typeof i18next === 'undefined') {
    setTimeout(initI18n, 100);
    return;
  }
  
  // Ensure i18nextHttpBackend is also available
  if (typeof i18nextHttpBackend === 'undefined') {
    setTimeout(initI18n, 100);
    return;
  }
  function detectSystemLanguage() {
    // Get browser language
    const browserLang = navigator.language || navigator.userLanguage;
    
    // Extract the language code (e.g., 'en-US' -> 'en', 'ro-RO' -> 'ro')
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // List of supported languages in your application
    const supportedLanguages = ['en', 'ro', 'ru'];
    
    // Check if detected language is supported
    if (supportedLanguages.includes(langCode)) {
      return langCode;
    }
    
    // Default fallback if language not supported
    return 'en';
  }
  

  // Always default to Romanian unless user explicitly picks another language
  const savedLang = localStorage.getItem('lang');
  const defaultLang = detectSystemLanguage();
  let initialLang = savedLang || defaultLang;

  if (!savedLang) {
    localStorage.setItem('lang', defaultLang);
    initialLang = defaultLang;
  }

  try {
    i18next
      .use(i18nextHttpBackend)
      .init({
        lng: initialLang,
        fallbackLng: 'en',
        debug: false,
        backend: {
          loadPath: 'js/locales/{{lng}}.json'
        },
        interpolation: {
          escapeValue: false // allow HTML in translations
        },
        parseMissingKeyHandler: function(key) { 
          return key; 
        }
      }, function(err, t) {
        if (err) {
          console.warn('i18next initialization error:', err);
          // Fallback: try to load with a different approach
          loadFallbackTranslations(initialLang);
        } else {
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
  } catch (error) {
    console.warn('i18next setup error:', error);
    // Ultimate fallback
    loadFallbackTranslations(initialLang);
  }
}

function updateContent() {
  document.querySelectorAll('[data-i18n]').forEach(function(element) {
    const key = element.getAttribute('data-i18n');
    if (i18next.exists(key)) {
      // Check for interpolation options
      let options = {};
      const optionsAttr = element.getAttribute('data-i18n-options');
      if (optionsAttr) {
        try {
          options = JSON.parse(optionsAttr);
        } catch (e) {
          console.warn('Invalid data-i18n-options JSON:', optionsAttr);
        }
      }
      
      const translation = i18next.t(key, options);
      if (element.childNodes.length === 0) {
        // Check if translation contains HTML tags
        if (translation.includes('<') && translation.includes('>')) {
          element.innerHTML = translation;
        } else {
          element.textContent = translation;
        }
      } else {
        // Only update text nodes, preserve other elements
        Array.from(element.childNodes).forEach(function(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = translation;
          }
        });
      }
    }
  });
  
  // Handle placeholder translations
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(element) {
    const key = element.getAttribute('data-i18n-placeholder');
    if (i18next.exists(key)) {
      element.placeholder = i18next.t(key);
    }
  });
  
  // Handle value translations for input elements
  document.querySelectorAll('[data-i18n-value]').forEach(function(element) {
    const key = element.getAttribute('data-i18n-value');
    if (i18next.exists(key)) {
      element.value = i18next.t(key);
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
  updateAboutHeading();
}

// Function to handle the about heading specifically
function updateAboutHeading() {
  const heading = document.getElementById('about-offer-heading');
  if (heading && typeof i18next !== 'undefined') {
    const start = i18next.t('about.offer_complete');
    const commercial = i18next.t('about.offer_commercial');
    const luxury = i18next.t('about.offer_luxury');
    const end = i18next.t('about.offer_end');
    const and = i18next.t('about.and');
    
    heading.innerHTML = `${start} <span class="id-color">${commercial}</span> ${and} <span class="id-color">${luxury}</span> ${end}`;
  }
}

function updateLangPickerUI() {
  // Check if i18next is available before using it
  if (typeof i18next === 'undefined') {
    // Use localStorage as fallback
    var lang = localStorage.getItem('lang') || 'ro';
  } else {
    var lang = i18next.language || 'ro';
  }
  
  // Validate lang is not undefined or empty
  if (!lang || lang === 'undefined') {
    lang = 'ro';
    localStorage.setItem('lang', 'ro');
  }
  
  // Flag images mapping - using images/flags/ path
  var flagImg = 'images/flags/romania.png', code = 'RO';
  if (lang === 'en') { flagImg = 'images/flags/united-kingdom.png'; code = 'EN'; }
  if (lang === 'ru') { flagImg = 'images/flags/russia.png'; code = 'RU'; }
  
  var flagEl = document.getElementById('langFlag');
  var codeEl = document.getElementById('langCode');
  
  if (flagEl) {
    // Use flag image instead of emoji
    flagEl.innerHTML = '<img src="' + flagImg + '" alt="' + code + '" style="width: 20px; height: 15px; border-radius: 2px; object-fit: cover;">';
  }
  
  if (codeEl) {
    codeEl.textContent = code;
  }
  
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
    updateAboutHeading();
    
    // Re-update price breakdown with new language
    if (window.priceCalculator && typeof window.priceCalculator.debouncedRecalculate === 'function') {
      window.priceCalculator.debouncedRecalculate();
    } else if (window.priceCalculator && typeof window.priceCalculator.recalculatePrice === 'function') {
      
      window.priceCalculator.recalculatePrice();
    }
    // No else clause - silently ignore when price calculator is not available
  });
}

// Enhanced initialization with multiple fallback strategies
function initializeI18nWithFallbacks() {
  // Strategy 1: Try normal initialization
  initI18n();
  
  // Strategy 2: Set up a backup timer to force fallback if needed
  setTimeout(function() {
    if (typeof i18next === 'undefined' || !i18next.isInitialized) {
      const savedLang = localStorage.getItem('lang') || 'ro';
      loadFallbackTranslations(savedLang);
    }
  }, 2000);
  
  // Strategy 3: Set up DOMContentLoaded backup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        if (typeof i18next === 'undefined' || !i18next.isInitialized) {
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
        var currentLang = localStorage.getItem('lang') || 'en';
        
        // Only proceed if language is actually changing
        if (lang !== currentLang) {
          // Store the new language preference
          localStorage.setItem('lang', lang);
          
          // Reload the page to prevent copy from getting messed up
          window.location.reload();
        } else {
          // Just close dropdown if same language selected
          closeDropdown();
        }
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
      if (e.target.closest('.flatpickr-calendar') || e.target.closest('.flatpickr-input')) {
        return;
      }
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
      const savedLang = localStorage.getItem('lang') || 'ro';
      loadFallbackTranslations(savedLang);
    }
  }, 1000);
});

// Fallback translations in case locale files fail to load
function loadFallbackTranslations(lang) {
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
        filter_price_to: "Până la",
        discount_code_placeholder: "Introduceți codul de reducere"
      },
      menu: {
        home: "Acasă",
        cars: "Mașini",
        about: "Despre noi",
        contact: "Contact"
      },
      wheel: {
        welcome_back_title: "Bine ai venit înapoi!",
        welcome_back_subtitle: "Ai un cadou neredemat în așteptare!",
        welcome_message: "Ca client care se întoarce, ai un cadou special în așteptare! Alege una dintre roțile de noroc de mai jos pentru a-ți răscumpăra cadoul și pentru a câștiga recompense uimitoare.",
        percentage_discount_wheel: "Roata de Reduceri Procentuale",
        percentage_discount_description: "Câștigă reduceri procentuale la închiriere",
        free_days_wheel: "Roata Zilelor Gratuite",
        free_days_description: "Câștigă zile gratuite de închiriere pentru următoarea rezervare"
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
        filter_price_to: "To",
        discount_code_placeholder: "Enter discount code"
      },
      menu: {
        home: "Home",
        cars: "Cars",
        about: "About Us",
        contact: "Contact"
      },
      wheel: {
        welcome_back_title: "Welcome Back!",
        welcome_back_subtitle: "You have an unredeemed return gift waiting for you!",
        welcome_message: "As a returning customer, you have a special gift waiting! Choose one of the spinning wheels below to redeem your return gift and win amazing rewards.",
        percentage_discount_wheel: "Percentage Discount Wheel",
        percentage_discount_description: "Win discount percentages on your rental",
        free_days_wheel: "Free Days Wheel",
        free_days_description: "Win free rental days for your next booking"
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
        filter_price_to: "До",
        discount_code_placeholder: "Введите код скидки"
      },
      menu: {
        home: "Главная",
        cars: "Автомобили",
        about: "О нас",
        contact: "Контакты"
      },
      wheel: {
        welcome_back_title: "Добро Пожаловать!",
        welcome_back_subtitle: "У вас есть неиспользованный подарок для возвращающихся клиентов!",
        welcome_message: "Как возвращающийся клиент, у вас есть особый подарок! Выберите одно из колес фортуны ниже, чтобы получить свой подарок и выиграть удивительные награды.",
        percentage_discount_wheel: "Колесо Процентных Скидок",
        percentage_discount_description: "Выигрывайте процентные скидки на аренду",
        free_days_wheel: "Колесо Бесплатных Дней",
        free_days_description: "Выигрывайте бесплатные дни аренды для следующего бронирования"
      }
    }
  };

  // Add fallback translations to i18next
  if (fallbackTranslations[lang]) {
    if (typeof i18next !== 'undefined') {
        if(typeof i18next.addResourceBundle === 'function') {
      i18next.addResourceBundle(lang, 'translation', fallbackTranslations[lang], true, true);
        }
      i18next.changeLanguage(lang, function() {
        updateContent();
        updateLangPickerUI();
      });
    } else {
      // If i18next is not available, manually update the DOM
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
            // Check if value contains HTML tags
            if (value.includes('<') && value.includes('>')) {
              el.innerHTML = value;
            } else {
              el.textContent = value;
            }
          }
        } else {
          Array.from(el.childNodes).forEach(function(node) {
            if (node.nodeType === Node.TEXT_NODE) {
              node.textContent = value;
            }
          });
        }
      });
      
      // Handle data-i18n-value attributes in fallback
      document.querySelectorAll('[data-i18n-value]').forEach(function(el) {
        const key = el.getAttribute('data-i18n-value');
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
        el.value = value;
      });
    }
  }
}


// Start the initialization with enhanced fallback strategies
initializeI18nWithFallbacks(); 