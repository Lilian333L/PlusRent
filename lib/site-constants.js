// lib/site-constants.js
module.exports = {
  reviews: {
    google: { count: 18, rating: 5.0 },
    trustpilot: { count: 7, rating: 5.0 },
    tripadvisor: { count: 4, rating: 5.0 },
    total: 29, // sum — used in aggregateRating.reviewCount
    asOf: '2026-06-08'
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
    completedOrders: 439
  }
};
