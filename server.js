// require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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
  res.redirect(301, '/cars.html');
});

app.get('/Rentaly%20HTML/car-single.html', (req, res) => {
  res.redirect(301, '/car-single.html');
});

app.get('/Rentaly%20HTML/login.html', (req, res) => {
  res.redirect(301, '/login.html');
});

app.get('/Rentaly%20HTML/account-dashboard.html', (req, res) => {
  res.redirect(301, '/account-dashboard.html');
});

app.get('/Rentaly%20HTML/about.html', (req, res) => {
  res.redirect(301, '/about.html');
});

app.get('/Rentaly%20HTML/contact.html', (req, res) => {
  res.redirect(301, '/contact.html');
});

app.get('/Rentaly%20HTML/booking.html', (req, res) => {
  res.redirect(301, '/booking.html');
});

app.get('/Rentaly%20HTML/index.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/Rentaly%20HTML/spinning-wheel-standalone.html', (req, res) => {
  res.redirect(301, '/spinning-wheel-standalone.html');
});

// Serve HTML files from root path for better URLs
app.get('/cars.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'cars.html'));
});

app.get('/car-single.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'car-single.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'login.html'));
});

// Add route for /login to redirect to login.html
app.get('/login', (req, res) => {
  res.redirect('/login.html');
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

app.get('/all-codes', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rentaly HTML', 'all-codes.html'));
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