// i18n-init.js

i18next
  .use(i18nextHttpBackend)
  .init({
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    debug: false,
    backend: {
      loadPath: 'js/locales/{{lng}}.json'
    },
    interpolation: {
      escapeValue: false // allow HTML in translations
    },
    parseMissingKeyHandler: function(key) { return key; }
  }, function(err, t) {
    updateContent();
  });

function updateContent() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var value = i18next.t(key);
    // If the element has child elements, only replace the text node, not the inner HTML structure
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
      // For elements with children (e.g., menu items with icons or spans), only replace the first text node
      Array.from(el.childNodes).forEach(function(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = value;
        }
      });
    }
  });
}

i18next.on('languageChanged', () => {
  updateContent();
  // Save language preference
  localStorage.setItem('lang', i18next.language);
});

document.addEventListener('DOMContentLoaded', function() {
  var langSwitcher = document.getElementById('languageSwitcher');
  if (langSwitcher) {
    langSwitcher.value = i18next.language || 'en';
    langSwitcher.addEventListener('change', function(e) {
      i18next.changeLanguage(e.target.value);
    });
  }
}); 