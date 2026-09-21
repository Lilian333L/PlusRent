// lib/site-constants.js
module.exports = {
  reviews: {
    // Verified by the owner on the live profiles
    google: { count: 50, rating: 5.0 },
    // TrustScore is 4.4 even though all 11 reviews are 5★ (Trustpilot weights recency/volume)
    trustpilot: { count: 11, rating: 4.4 },
    tripadvisor: { count: 6, rating: 5.0 },
    // aggregateRating in JSON-LD uses the Google profile only (google.count / google.rating)
    total: 67,
    asOf: '2026-09-21'
  },
  contact: {
    phone: '+373 60 000 500',
    phoneE164: '+37360000500',
    phoneSchema: '+373-60-000-500', // schema.org canonical format
    email: 'support@plusrent.md',
    address: 'str. Meșterul Manole 20, Chișinău, MD-2044, Moldova',
    lat: 47.013737,
    lng: 28.886408,
    foundingDate: '2022',
    completedOrders: 1754
  }
};
