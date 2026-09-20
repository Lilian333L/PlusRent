/**
 * Car Meta Tags Updater with i18next support
 * Dynamically updates page meta tags when car details are loaded
 */

class CarMetaUpdater {
  constructor() {
    this.defaultImage = 'https://plusrent.md/images/LOGO-5-demo.png';
    this.baseUrl = 'https://plusrent.md';
    
    // Detect current language from i18next or browser
    this.currentLang = this.detectLanguage();
  }

  /**
   * Detect current language
   */
  detectLanguage() {
    // Priority 1: i18next if available
    if (typeof i18next !== 'undefined' && i18next.language) {
      return i18next.language;
    }
    
    // Priority 2: HTML lang attribute
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      return htmlLang;
    }
    
    // Priority 3: Browser language
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0];
    
    // Default to 'ro' if not supported
    return ['ro', 'ru', 'en'].includes(langCode) ? langCode : 'ro';
  }

  /**
   * Get translation for meta tags
   */
  getTranslation(key, fallback) {
    // Use i18next if available
    if (typeof i18next !== 'undefined' && i18next.t) {
      return i18next.t(key) || fallback;
    }
    return fallback;
  }

  /**
   * Update all meta tags with car data
   */
  updateMetaTags(car) {
    if (!car) {
      console.warn('⚠️ No car data provided for meta tag update');
      return;
    }

    // A car page used to be car-single.html?id=, which arrived with no title of
    // its own, so this filled one in. The server writes the real one now, along
    // with the description, the canonical, the alternates and the structured
    // data, and it writes better ones: "Chirie BMW X5 2017 în Chișinău: preț pe
    // zi" rather than "BMW X5 2017 – Închiriere". Google runs this script, so
    // leaving it to overwrite them means the weaker set is what gets indexed.
    if (window.__PR_CAR__) {
      return;
    }

    try {
      // Update document title
      this.updateTitle(car);
      
      // Update meta description
      this.updateDescription(car);
      
      // Update Open Graph tags
      this.updateOpenGraph(car);
      
      // Update Twitter tags
      this.updateTwitter(car);
      
      // Update canonical URL
      this.updateCanonical(car);
      
      // Update language attributes
      this.updateLanguageAttributes();
      
      // Update Schema.org structured data
      this.updateSchema(car);
      
      console.log('✅ Meta tags updated successfully for:', `${car.make_name} ${car.model_name}`, `[${this.currentLang}]`);
    } catch (error) {
      console.error('❌ Error updating meta tags:', error);
    }
  }

  /**
   * Update page title based on language
   */
  updateTitle(car) {
    const titles = {
      ro: `${car.make_name} ${car.model_name} ${car.production_year} – Închiriere | PlusRent`,
      ru: `${car.make_name} ${car.model_name} ${car.production_year} – Аренда | PlusRent`,
      en: `${car.make_name} ${car.model_name} ${car.production_year} – Rental | PlusRent`
    };
    
    document.title = titles[this.currentLang] || titles.ro;
  }

  /**
   * Update meta description based on language
   */
  updateDescription(car) {
    const price = this.getDailyPrice(car);
    
    const descriptions = {
      ro: `Închiriază ${car.make_name} ${car.model_name} ${car.production_year} în Chișinău cu PlusRent. ${car.gear_type}, ${car.fuel_type}, ${car.num_passengers} locuri. Preț: €${price}/zi. Livrare 24/7.`,
      ru: `Арендуй ${car.make_name} ${car.model_name} ${car.production_year} в Кишинёве с PlusRent. ${car.gear_type}, ${car.fuel_type}, ${car.num_passengers} мест. Цена: €${price}/день. Доставка 24/7.`,
      en: `Rent ${car.make_name} ${car.model_name} ${car.production_year} in Chisinau with PlusRent. ${car.gear_type}, ${car.fuel_type}, ${car.num_passengers} seats. Price: €${price}/day. 24/7 delivery.`
    };
    
    const description = descriptions[this.currentLang] || descriptions.ro;
    this.updateMetaTag('name', 'description', description);
  }

  /**
   * Update Open Graph tags
   */
  updateOpenGraph(car) {
    const price = this.getDailyPrice(car);
    const carImage = this.getCarImage(car);
    const carUrl = `${this.baseUrl}/car-single.html?id=${car.id}`;
    
    const ogTitles = {
      ro: `${car.make_name} ${car.model_name} ${car.production_year} – Închiriere | PlusRent`,
      ru: `${car.make_name} ${car.model_name} ${car.production_year} – Аренда | PlusRent`,
      en: `${car.make_name} ${car.model_name} ${car.production_year} – Rental | PlusRent`
    };
    
    const ogDescriptions = {
      ro: `Închiriază ${car.make_name} ${car.model_name} cu PlusRent. ${car.gear_type}, ${car.fuel_type}. Preț: €${price}/zi.`,
      ru: `Арендуй ${car.make_name} ${car.model_name} с PlusRent. ${car.gear_type}, ${car.fuel_type}. Цена: €${price}/день.`,
      en: `Rent ${car.make_name} ${car.model_name} with PlusRent. ${car.gear_type}, ${car.fuel_type}. Price: €${price}/day.`
    };
    
    const ogTags = {
      'og:title': ogTitles[this.currentLang] || ogTitles.ro,
      'og:description': ogDescriptions[this.currentLang] || ogDescriptions.ro,
      'og:image': carImage,
      'og:url': carUrl,
      'og:type': 'product'
    };

    for (const [property, content] of Object.entries(ogTags)) {
      this.updateMetaTag('property', property, content);
    }
  }

  /**
   * Update Twitter Card tags
   */
  updateTwitter(car) {
    const price = this.getDailyPrice(car);
    const carImage = this.getCarImage(car);
    
    const twitterTitles = {
      ro: `${car.make_name} ${car.model_name} ${car.production_year} – PlusRent`,
      ru: `${car.make_name} ${car.model_name} ${car.production_year} – PlusRent`,
      en: `${car.make_name} ${car.model_name} ${car.production_year} – PlusRent`
    };
    
    const twitterDescriptions = {
      ro: `Închiriază ${car.make_name} ${car.model_name}. Preț: €${price}/zi.`,
      ru: `Арендуй ${car.make_name} ${car.model_name}. Цена: €${price}/день.`,
      en: `Rent ${car.make_name} ${car.model_name}. Price: €${price}/day.`
    };
    
    const twitterTags = {
      'twitter:title': twitterTitles[this.currentLang] || twitterTitles.ro,
      'twitter:description': twitterDescriptions[this.currentLang] || twitterDescriptions.ro,
      'twitter:image': carImage
    };

    for (const [name, content] of Object.entries(twitterTags)) {
      this.updateMetaTag('name', name, content);
    }
  }

  /**
   * Update canonical URL
   */
  updateCanonical(car) {
    const canonicalUrl = `${this.baseUrl}/car-single.html?id=${car.id}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    
    canonical.href = canonicalUrl;
  }

  /**
   * Update language attributes
   */
  updateLanguageAttributes() {
    // Update HTML lang attribute
    document.documentElement.lang = this.currentLang;
    
    // Update og:locale
    const localeMap = {
      'ro': 'ro_RO',
      'ru': 'ru_RU',
      'en': 'en_US'
    };
    
    this.updateMetaTag('property', 'og:locale', localeMap[this.currentLang] || 'ro_RO');
  }

  /**
   * Update Schema.org structured data
   */
  updateSchema(car) {
    const price = this.getDailyPrice(car);
    const carImages = this.getAllCarImages(car);
    
    const descriptions = {
      ro: `Închiriază ${car.make_name} ${car.model_name} ${car.production_year} în Chișinău. ${car.gear_type}, ${car.fuel_type}, ${car.num_passengers} locuri.`,
      ru: `Арендуй ${car.make_name} ${car.model_name} ${car.production_year} в Кишинёве. ${car.gear_type}, ${car.fuel_type}, ${car.num_passengers} мест.`,
      en: `Rent ${car.make_name} ${car.model_name} ${car.production_year} in Chisinau. ${car.gear_type}, ${car.fuel_type}, ${car.num_passengers} seats.`
    };
    
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `${car.make_name} ${car.model_name}`,
      "description": descriptions[this.currentLang] || descriptions.ro,
      "brand": {
        "@type": "Brand",
        "name": car.make_name
      },
      "model": car.model_name,
      "productionDate": car.production_year.toString(),
      "category": car.car_type || "Car Rental",
      "image": carImages,
      "offers": {
        "@type": "Offer",
        "availability": car.booked ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        "price": price,
        "priceCurrency": "EUR",
        "priceValidUntil": "2025-12-31",
        "itemCondition": "https://schema.org/UsedCondition",
        "seller": {
          "@type": "Organization",
          "name": "PlusRent",
          "url": "https://plusrent.md",
          "telephone": "+373-60-000-500",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "str. Meșterul Manole 20",
            "addressLocality": "Chișinău",
            "postalCode": "MD-2001",
            "addressCountry": "MD"
          }
        }
      },
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Transmission",
          "value": car.gear_type
        },
        {
          "@type": "PropertyValue",
          "name": "Fuel Type",
          "value": car.fuel_type
        },
        {
          "@type": "PropertyValue",
          "name": "Passengers",
          "value": car.num_passengers
        },
        {
          "@type": "PropertyValue",
          "name": "Doors",
          "value": car.num_doors
        }
      ],
      "inLanguage": this.currentLang
    };

    if (car.engine_capacity) {
      schema.additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Engine Capacity",
        "value": `${car.engine_capacity}L`
      });
    }

    let schemaScript = document.getElementById('car-schema');
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.type = 'application/ld+json';
      schemaScript.id = 'car-schema';
      document.head.appendChild(schemaScript);
    }
    
    schemaScript.textContent = JSON.stringify(schema, null, 2);
  }

  /**
   * Helper: Update meta tag
   */
  updateMetaTag(attribute, attributeValue, content) {
    let meta = document.querySelector(`meta[${attribute}="${attributeValue}"]`);
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, attributeValue);
      document.head.appendChild(meta);
    }
    
    meta.content = content;
  }

  /**
   * Helper: Get daily price from price policy
   */
  getDailyPrice(car) {
    try {
      const pricePolicy = typeof car.price_policy === 'string' 
        ? JSON.parse(car.price_policy) 
        : car.price_policy;
      
      return pricePolicy['1-2'] || pricePolicy['1'] || '25';
    } catch (error) {
      console.error('Error parsing price policy:', error);
      return '25';
    }
  }

  /**
   * Helper: Get main car image
   */
  getCarImage(car) {
    if (car.head_image) {
      return car.head_image;
    }
    
    if (car.gallery_images && car.gallery_images.length > 0) {
      const gallery = typeof car.gallery_images === 'string'
        ? JSON.parse(car.gallery_images)
        : car.gallery_images;
      
      return gallery[0] || this.defaultImage;
    }
    
    return this.defaultImage;
  }

  /**
   * Helper: Get all car images for schema
   */
  getAllCarImages(car) {
    const images = [];
    
    if (car.head_image) {
      images.push(car.head_image);
    }
    
    if (car.gallery_images) {
      const gallery = typeof car.gallery_images === 'string'
        ? JSON.parse(car.gallery_images)
        : car.gallery_images;
      
      if (Array.isArray(gallery)) {
        images.push(...gallery);
      }
    }
    
    return images.length > 0 ? images : [this.defaultImage];
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarMetaUpdater;
}

// Make available globally
window.CarMetaUpdater = CarMetaUpdater;

// Listen to i18next language changes
if (typeof i18next !== 'undefined') {
  i18next.on('languageChanged', function(lng) {
    console.log('🌐 Language changed to:', lng);
    // If metaUpdater exists and car data is loaded, update meta tags
    if (window.metaUpdater && window.currentCarData) {
      window.metaUpdater.currentLang = lng;
      window.metaUpdater.updateMetaTags(window.currentCarData);
    }
  });
}
