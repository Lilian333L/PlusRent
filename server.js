// require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import API routes
const authRoutes = require('./routes/auth');
const bookingsRoutes = require('./routes/bookings');
const carsRoutes = require('./routes/cars');
const couponsRoutes = require('./routes/coupons');
const spinningWheelsRoutes = require('./routes/spinning-wheels');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global request logger
app.use((req, res, next) => {
  console.log('🌐 REQUEST:', req.method, req.originalUrl);
  next();
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Redirect old URLs to clean URLs
app.get('/Rentaly%20HTML/cars.html', (req, res) => {
  res.redirect(301, '/cars');
});

app.get('/Rentaly%20HTML/car-single.html', (req, res) => {
  res.redirect(301, '/car-single');
});

app.get('/Rentaly%20HTML/login.html', (req, res) => {
  res.redirect(301, '/login');
});

app.get('/Rentaly%20HTML/account-dashboard.html', (req, res) => {
  res.redirect(301, '/account-dashboard');
});

app.get('/Rentaly%20HTML/about.html', (req, res) => {
  res.redirect(301, '/about');
});

app.get('/Rentaly%20HTML/contact.html', (req, res) => {
  res.redirect(301, '/contact');
});

app.get('/Rentaly%20HTML/booking.html', (req, res) => {
  res.redirect(301, '/booking');
});

app.get('/Rentaly%20HTML/index.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/Rentaly%20HTML/spinning-wheel-standalone.html', (req, res) => {
  res.redirect(301, '/spinning-wheel-standalone');
});

// Clean URL routes (without .html)
app.get('/cars', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'cars.html'));
});

app.get('/car-single', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'car-single.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'login.html'));
});

app.get('/account-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'account-dashboard.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'contact.html'));
});

app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'booking.html'));
});

app.get('/spinning-wheel-standalone', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'spinning-wheel-standalone.html'));
});

// Legacy .html routes (for backward compatibility)
app.get('/cars.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'cars.html'));
});

app.get('/car-single.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'car-single.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'login.html'));
});

app.get('/account-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'account-dashboard.html'));
});

app.get('/about.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'about.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'contact.html'));
});

app.get('/booking.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'booking.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'index.html'));
});

app.get('/spinning-wheel-standalone.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'spinning-wheel-standalone.html'));
});

// Serve static files from Rentaly HTML directory (for CSS, JS, images)
app.use('/Rentaly%20HTML', express.static(path.join(__dirname, 'Rentaly HTML')));
app.use('/Rentaly HTML', express.static(path.join(__dirname, 'Rentaly HTML')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/spinning-wheels', spinningWheelsRoutes);

// Serve static assets from root path for clean URLs
app.use('/css', express.static(path.join(__dirname, 'Rentaly HTML', 'css')));
app.use('/js', express.static(path.join(__dirname, 'Rentaly HTML', 'js')));
app.use('/images', express.static(path.join(__dirname, 'Rentaly HTML', 'images')));
app.use('/fonts', express.static(path.join(__dirname, 'Rentaly HTML', 'fonts')));
app.use('/vendor', express.static(path.join(__dirname, 'Rentaly HTML', 'vendor')));

// Root route to serve the main index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 