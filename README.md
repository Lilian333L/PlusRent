# Rentaly - Car Rental Website

A modern car rental website with admin panel and authentication system.

## 🏗️ **Project Structure**

```
Rentaly/
├── server.js                 # Main server file
├── config/
│   └── database.js          # Database configuration
├── models/
│   └── admin.js             # Admin user model
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── cars.js              # Car management routes
│   └── coupons.js           # Coupon management routes
├── scripts/
│   └── create-admin.js      # Admin user creation script
├── uploads/                 # Car images storage
└── Rentaly HTML/            # Frontend files
    ├── index.html           # Homepage
    ├── cars.html            # Car listing
    ├── car-single.html      # Single car details
    ├── login.html           # Admin login
    ├── account-dashboard.html # Admin panel
    └── js/
        ├── config.js        # API configuration
        └── price-calculator.js # Price calculation logic
```

## 🚀 **Quick Start**

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Admin User
```bash
node scripts/create-admin.js
```
Default credentials: `admin` / `admin123`

### 3. Start Server
```bash
node server.js
```

### 4. Access the Application
- **Website**: http://localhost:3001
- **Cars**: http://localhost:3001/cars.html
- **Admin Login**: http://localhost:3001/login.html
- **Admin Panel**: http://localhost:3001/account-dashboard.html
- **About**: http://localhost:3001/about.html
- **Contact**: http://localhost:3001/contact.html

## 🔐 **Authentication System**

### Features:
- **JWT-based authentication** for admin access
- **Password hashing** with bcrypt
- **Token verification** on protected routes
- **Automatic logout** on token expiration
- **Session management** with localStorage

### Admin Routes:
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/register` - Create new admin (protected)
- `GET /api/auth/users` - List all admins (protected)
- `DELETE /api/auth/users/:id` - Delete admin (protected)

## 🚗 **Car Management**

### Features:
- **CRUD operations** for cars
- **Image upload** (head image + gallery)
- **Advanced filtering** (make, model, year, price, etc.)
- **Price policies** with JSON storage
- **Insurance pricing** (RCA & Casco)
- **Optional fields** (luggage, mileage, drive, etc.)

### Car Routes:
- `GET /api/cars` - List cars with filtering
- `GET /api/cars/:id` - Get single car
- `POST /api/cars` - Add new car
- `PUT /api/cars/:id` - Update car
- `DELETE /api/cars/:id` - Delete car
- `POST /api/cars/:id/images` - Upload car images
- `DELETE /api/cars/:id/images` - Delete car image

## 🎫 **Coupon Management**

### Features:
- **Discount codes** with percentage-based discounts
- **Expiration dates** for coupons
- **Active/inactive** status
- **Validation** for price calculator

### Coupon Routes:
- `GET /api/coupons` - List all coupons
- `GET /api/coupons/:id` - Get single coupon
- `POST /api/coupons` - Add new coupon
- `PUT /api/coupons/:id` - Update coupon
- `DELETE /api/coupons/:id` - Delete coupon
- `GET /api/coupons/validate/:code` - Validate coupon code

## 💰 **Price Calculator**

### Features:
- **Dynamic pricing** based on rental duration
- **Insurance costs** (RCA & Casco)
- **Location fees** (airport pickup/dropoff)
- **Outside hours fees** (additional €15)
- **Discount codes** with real-time validation
- **24-hour time format** for pickup/return
- **Separate pickup/dropoff locations**

## 🛠️ **Technology Stack**

### Backend:
- **Node.js** with Express.js
- **SQLite** database
- **JWT** for authentication
- **bcrypt** for password hashing
- **multer** for file uploads

### Frontend:
- **HTML5** with Bootstrap
- **JavaScript** (ES6+)
- **jQuery** for DOM manipulation
- **Slick Carousel** for image galleries

## 🔧 **Development**

### Database Schema:
```sql
-- Cars table
CREATE TABLE cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  make_name TEXT,
  model_name TEXT,
  production_year INTEGER,
  gear_type TEXT,
  fuel_type TEXT,
  engine_capacity REAL NULL,
  car_type TEXT,
  num_doors INTEGER,
  num_passengers INTEGER,
  price_policy TEXT,
  booked INTEGER DEFAULT 0,
  booked_until TEXT,
  head_image TEXT,
  gallery_images TEXT,
  luggage TEXT,
  mileage INTEGER,
  drive TEXT,
  fuel_economy REAL,
  exterior_color TEXT,
  interior_color TEXT,
  rca_insurance_price REAL,
  casco_insurance_price REAL
);

-- Admin users table
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Coupon codes table
CREATE TABLE coupon_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_percentage REAL NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);
```

### Environment Variables:
```bash
PORT=3001                    # Server port
JWT_SECRET=your-secret-key   # JWT secret (change in production)
```

## 🚀 **Deployment**

### Production Considerations:
1. **Change JWT secret** in `middleware/auth.js`
2. **Use environment variables** for sensitive data
3. **Set up proper SSL/TLS** for HTTPS
4. **Configure database backups**
5. **Set up monitoring** and logging
6. **Use a production database** (PostgreSQL, MySQL)

### Security Features:
- **Password hashing** with bcrypt
- **JWT token expiration** (24 hours)
- **Input validation** on all endpoints
- **SQL injection protection** with parameterized queries
- **File upload restrictions** and validation

## 📝 **API Documentation**

### Authentication Headers:
```javascript
// For protected routes
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### Example API Calls:
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});

// Get cars with filters
const cars = await fetch('/api/cars?make_name=BMW&min_price=50');

// Add new car (requires auth)
const newCar = await fetch('/api/cars', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(carData)
});
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.

---

## 🌐 **Vercel Deployment**

This application is configured for deployment on Vercel with the following setup:

- **Framework**: Node.js
- **Build Command**: `npm install`
- **Output Directory**: Static files served from `Rentaly HTML/`
- **Environment Variables**: Configured for Supabase integration
- **Database**: Supabase PostgreSQL with REST API

**Live URL**: https://carrental-rho-rose.vercel.app 