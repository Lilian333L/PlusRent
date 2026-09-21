/**
 * The parts of a car's Offer that are the same wherever the car appears.
 *
 * A car shows up twice in the markup: once on its own page and once inside the
 * fleet list on /cars. Both are Products, so Google asks both the same
 * questions, and when the answers lived in two files they drifted: the car
 * page grew a photograph and a validity window while the fleet list kept
 * neither, and Search Console reported nine cars that could not be shown at
 * all for want of an image.
 *
 * So the answers live here, once.
 */

const ORIGIN = "https://plusrent.md";

/** The logo, for a car with no photograph of its own. */
const FALLBACK_IMAGE = ORIGIN + "/images/LOGO-5-demo.png";

/**
 * The car's photograph, absolute, because structured data is read away from
 * the page it came from.
 */
function carImage(car) {
  const img = car && car.head_image;
  if (!img) return FALLBACK_IMAGE;
  return String(img).startsWith("http") ? img : ORIGIN + img;
}

/** A date as Google wants it, yyyy-mm-dd. */
function day(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * How long the price is stated to hold.
 *
 * Worked out on every render rather than written down. The hand-written date
 * this replaces said 2025-12-31 and had been in the past for nine months,
 * which is how the price came to be reported as no longer valid on every car.
 */
function offerValidity() {
  const now = new Date();
  const later = new Date(now);
  later.setFullYear(later.getFullYear() + 1);
  return { validFrom: day(now), priceValidUntil: day(later) };
}

/**
 * Shipping and returns, which Google asks of a Product offer because it
 * assumes goods in a box.
 *
 * A rental car is neither shipped nor returned for a refund, so both say what
 * is actually true rather than being left out and reported as missing.
 *
 * The car is handed over in Chisinau at no charge. Airport delivery and
 * delivery to another city cost extra and are priced on the page, not here,
 * because this field cannot express a price that depends on how long the
 * rental is.
 */
function offerTerms() {
  return {
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "EUR" },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "MD",
        addressRegion: "Chișinău",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 1,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 1,
          unitCode: "DAY",
        },
      },
    },
    // A rented car goes back at the end of the rental; it is not returned for
    // a refund the way a purchase is.
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "MD",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    },
  };
}

module.exports = { ORIGIN, FALLBACK_IMAGE, carImage, offerValidity, offerTerms };
