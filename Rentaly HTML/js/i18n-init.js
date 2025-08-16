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
      parseMissingKeyHandler: function(key) { return key; }
    }, function(err, t) {
      if (!savedLang) {
        i18next.changeLanguage(defaultLang, updateContent);
      } else {
        updateContent();
      }
      updateLangPickerUI();
    });
}

function updateContent() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var date = el.getAttribute('data-i18n-date');
    
    if (date) {
      // Handle custom interpolation for unavailable badges
      var value = i18next.t(key, { date: date });
    } else {
      var value = i18next.t(key);
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
});

// Start the initialization
initI18n(); 