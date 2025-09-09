const Joi = require('joi');

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const field = error.details[0].path.join('.');
      
      // Provide user-friendly error messages for common fields
      let userFriendlyMessage = errorMessage;
      if (field === 'customer_phone') {
        userFriendlyMessage = 'errors.validation.phone_invalid';
      } else if (field === 'customer_email') {
        userFriendlyMessage = 'errors.validation.email_invalid';
      } else if (field === 'customer_age') {
        userFriendlyMessage = 'errors.validation.age_invalid';
      } else if (field === 'pickup_date' || field === 'return_date') {
        userFriendlyMessage = 'errors.validation.dates_invalid';
      } else if (field === 'pickup_time' || field === 'return_time') {
        userFriendlyMessage = 'errors.validation.times_invalid';
      } else if (field === 'pickup_location' || field === 'dropoff_location') {
        userFriendlyMessage = 'errors.validation.locations_invalid';
      }
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: userFriendlyMessage,
        field: field
      });
    }
    
    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// Validation middleware for query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ 
        error: 'Query validation error', 
        details: errorMessage,
        field: error.details[0].path.join('.')
      });
    }
    
    req.query = value;
    next();
  };
};

// Validation middleware for URL parameters
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ 
        error: 'Parameter validation error', 
        details: errorMessage,
        field: error.details[0].path.join('.')
      });
    }
    
    req.params = value;
    next();
  };
};

// Authentication schemas
const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().trim(),
  password: Joi.string().min(6).max(100).required()
});

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().trim(),
  password: Joi.string().min(8).max(100).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  email: Joi.string().email().required().trim()
});

// Car schemas
const carCreateSchema = Joi.object({
  make_name: Joi.string().min(1).max(100).required().trim(),
  model_name: Joi.string().min(1).max(100).required().trim(),
  production_year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required(),
  gear_type: Joi.string().valid('Manual', 'Automatic').required(),
  fuel_type: Joi.string().valid('Gasoline', 'Diesel', 'Hybrid', 'Electric').required(),
  engine_capacity: Joi.when('fuel_type', {
    is: 'Electric',
    then: Joi.number().allow(null),
    otherwise: Joi.number().positive().required()
  }),
  car_type: Joi.string().min(1).max(50).required().trim(),
  num_doors: Joi.number().integer().min(2).max(5).required(),
  num_passengers: Joi.number().integer().min(1).max(15).required(),
  price_policy: Joi.object({
    '1-2': Joi.number().positive().required(),
    '3-7': Joi.number().positive().required(),
    '8-20': Joi.number().positive().required(),
    '21-45': Joi.number().positive().required(),
    '46+': Joi.number().positive().required()
  }).required(),
  booked_until: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
  ).allow(null, ''),
  luggage: Joi.string().valid(
    '1_small', '2_small', '1_large', '2_large', '3_large',
    '1_small_1_large', '2_small_1_large', '1_small_2_large', 
    '2_small_2_large', '3_small_1_large', '4_small', '5_small',
    '4_large', '5_large',
    // Legacy values for backward compatibility
    'Small', 'Medium', 'Large'
  ).allow(null, ''),
  mileage: Joi.number().integer().min(0).max(1000000).allow(null, ''),
  drive: Joi.string().valid('Front Wheel Drive', 'Rear Wheel Drive', 'All Wheel Drive', '4 Wheel Drive', 'AWD').allow(null, ''),
  fuel_economy: Joi.number().positive().max(50).allow(null, ''),
  exterior_color: Joi.string().max(50).trim().allow(null,''),
  interior_color: Joi.string().max(50).trim().allow(null,''),
  air_conditioning: Joi.boolean().allow(null,''),
  min_age: Joi.number().integer().min(18).max(80).allow(null,''),
  deposit: Joi.number().positive().max(10000).allow(null,''),
  insurance_cost: Joi.number().positive().max(1000).allow(null,''),
  rca_insurance_price: Joi.number().positive().max(10000).allow(null,''),
  casco_insurance_price: Joi.number().positive().max(10000).allow(null,''),
  likes: Joi.number().integer().min(0).default(0),
  description_en: Joi.string().max(2000).trim().allow(null,''),
  description_ro: Joi.string().max(2000).trim().allow(null,''),
  description_ru: Joi.string().max(2000).trim().allow(null,''),
  head_image: Joi.object({
    data: Joi.string().base64().required(),
    extension: Joi.string().valid('jpg', 'jpeg', 'png', 'webp').required()
  }).allow(null,''),
  gallery_images: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        data: Joi.string().base64().required(),
        extension: Joi.string().valid('jpg', 'jpeg', 'png', 'webp').required()
      })
    ),
    Joi.string().allow('').empty('').default([]),
    Joi.allow(null).default([])
  ).default([])
});

const carUpdateSchema = Joi.object({
  make_name: Joi.string().min(1).max(100).trim(),
  model_name: Joi.string().min(1).max(100).trim(),
  production_year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1),
  gear_type: Joi.string().valid('Manual', 'Automatic'),
  fuel_type: Joi.string().valid('Gasoline', 'Diesel', 'Hybrid', 'Electric'),
  engine_capacity: Joi.when('fuel_type', {
    is: 'Electric',
    then: Joi.number().allow(null),
    otherwise: Joi.number().positive()
  }),
  car_type: Joi.string().min(1).max(50).trim(),
  num_doors: Joi.number().integer().min(2).max(5),
  num_passengers: Joi.number().integer().min(1).max(15),
  price_policy: Joi.object({
    '1-2': Joi.number().positive(),
    '3-7': Joi.number().positive(),
    '8-20': Joi.number().positive(),
    '21-45': Joi.number().positive(),
    '46+': Joi.number().positive()
  }),
  booked: Joi.boolean(),
  booked_until: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
  ).allow(null, ''),
  gallery_images: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        data: Joi.string().base64().required(),
        extension: Joi.string().valid('jpg', 'jpeg', 'png', 'webp').required()
      })
    ),
    Joi.string().allow('').empty('').default([]),
    Joi.allow(null).default([])
  ).default([]),
  luggage: Joi.string().valid(
    '1_small', '2_small', '1_large', '2_large', '3_large',
    '1_small_1_large', '2_small_1_large', '1_small_2_large', 
    '2_small_2_large', '3_small_1_large', '4_small', '5_small',
    '4_large', '5_large',
    // Legacy values for backward compatibility
    'Small', 'Medium', 'Large'
  ).allow(null, ''),
  mileage: Joi.number().integer().min(0).max(1000000).allow(null,''),
  drive: Joi.string().valid('Front Wheel Drive', 'Rear Wheel Drive', 'All Wheel Drive', '4 Wheel Drive', 'AWD').allow(null, ''),
  fuel_economy: Joi.number().positive().max(50).allow(null,''),
  exterior_color: Joi.string().max(50).trim().allow(null,''),
  interior_color: Joi.string().max(50).trim().allow(null,''),
  air_conditioning: Joi.boolean().allow(null,''),
  min_age: Joi.number().integer().min(18).max(80).allow(null,''),
  deposit: Joi.number().positive().max(10000).allow(null,''),
  insurance_cost: Joi.number().positive().max(1000).allow(null,''),
  rca_insurance_price: Joi.number().positive().max(10000).allow(null,''),
  casco_insurance_price: Joi.number().positive().max(10000).allow(null,''),
  likes: Joi.number().integer().min(0),
  description_en: Joi.string().max(2000).trim().allow(null,''),
  description_ro: Joi.string().max(2000).trim().allow(null,''),
  description_ru: Joi.string().max(2000).trim().allow(null,''),
  head_image: Joi.alternatives().try(
    Joi.object({
      data: Joi.string().base64().required(),
      extension: Joi.string().valid('jpg', 'jpeg', 'png', 'webp').required()
    }),
    Joi.string().allow(''),
    Joi.allow(null)
  )
});

const carIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const carReorderSchema = Joi.object({
  carOrder: Joi.array().items(
    Joi.number().integer().positive()
  ).min(1).required()
});

// Booking schemas
const bookingCreateSchema = Joi.object({
  car_id: Joi.number().integer().positive().required(),
  pickup_date: Joi.date().iso().required().custom((value, helpers) => {
    const now = new Date();
    const pickupDate = new Date(value);
    
    // Set both dates to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pickupDay = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate());
    
    if (pickupDay < today) {
      return helpers.error('any.invalid', { message: 'Pickup date must be today or in the future' });
    }
    
    return value;
  }),
  pickup_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  return_date: Joi.date().iso().greater(Joi.ref('pickup_date')).required(),
  return_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  discount_code: Joi.string().max(50).trim().allow(null, ''),
  pickup_location: Joi.string().min(1).max(200).required().trim(),
  dropoff_location: Joi.string().min(1).max(200).required().trim(),
  special_instructions: Joi.string().max(1000).trim().allow(null, ''),
  total_price: Joi.number().positive().required(),
  price_breakdown: Joi.object().required(),
  customer_name: Joi.string().min(1).max(100).trim().allow(null, ''),
  customer_email: Joi.string().email().trim().allow(null, ''),
  customer_phone: Joi.string().pattern(/^[\+]?[0-9\s\-\(\)]{8,20}$/).required()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number.',
      'any.required': 'Phone number is required'
    }),
  customer_age: Joi.number().integer().min(18).max(100).required()
});

const bookingStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'finished').required()
});

const bookingIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const bookingRejectSchema = Joi.object({
  reason: Joi.string().min(1).max(500).required().trim()
});

// Coupon schemas
const couponCreateSchema = Joi.object({
  code: Joi.string().min(3).max(50).pattern(/^[A-Z0-9\-_]+$/).required().trim(),
  type: Joi.string().valid('percentage', 'fixed', 'free_days').required(),
  discount_percentage: Joi.when('type', {
    is: 'percentage',
    then: Joi.number().min(1).max(100).required(),
    otherwise: Joi.number().allow(null)
  }),
  free_days: Joi.when('type', {
    is: 'free_days',
    then: Joi.number().integer().min(1).max(30).required(),
    otherwise: Joi.number().allow(null)
  }),
  description: Joi.string().max(500).trim().allow(null, ''),
  expires_at: Joi.alternatives().try(
    Joi.date().iso().greater('now'),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Invalid date format');
      if (date <= new Date()) throw new Error('Date must be in the future');
      return date.toISOString();
    }),
    Joi.string().allow('').custom(() => null)
  ).allow(null)
});

const couponUpdateSchema = Joi.object({
  code: Joi.string().min(3).max(50).pattern(/^[A-Z0-9\-_]+$/).trim(),
  type: Joi.string().valid('percentage', 'fixed', 'free_days'),
  discount_percentage: Joi.when('type', {
    is: 'percentage',
    then: Joi.number().min(1).max(100),
    otherwise: Joi.number().allow(null)
  }),
  free_days: Joi.when('type', {
    is: 'free_days',
    then: Joi.number().integer().min(1).max(30),
    otherwise: Joi.number().allow(null)
  }),
  description: Joi.string().max(500).trim().allow(null, ''),
  is_active: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('0', '1', 'true', 'false').custom((value) => {
      if (value === '1' || value === 'true') return true;
      if (value === '0' || value === 'false') return false;
      return value;
    })
  ),
  expires_at: Joi.alternatives().try(
    Joi.date().iso().greater('now'),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Invalid date format');
      if (date <= new Date()) throw new Error('Date must be in the future');
      return date.toISOString();
    }),
    Joi.string().allow('').custom(() => null)
  ).allow(null)
});

const couponIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const couponUseSchema = Joi.object({
  coupon_id: Joi.number().integer().positive().required(),
  redemption_code: Joi.string().min(1).max(50).required().trim(),
  customer_phone: Joi.string().pattern(/^[\+]?[0-9\s\-\(\)]{8,20}$/).required()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number.',
      'any.required': 'Phone number is required'
    })
});

const couponWheelSchema = Joi.object({
  wheelId: Joi.number().integer().positive().required(),
  percentage: Joi.number().min(0).max(100).required()
});

// Spinning wheel schemas
const spinningWheelCreateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().trim(),
  description: Joi.string().max(500).trim().allow(null)
});

const spinningWheelUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).trim(),
  description: Joi.string().max(500).trim().allow(null)
});

const spinningWheelIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const spinningWheelCouponSchema = Joi.object({
  coupon_id: Joi.number().integer().positive().required(),
  percentage: Joi.number().min(0).max(100).required()
});

const spinningWheelBulkCouponsSchema = Joi.object({
  percentages: Joi.array().items(
    Joi.object({
      coupon_id: Joi.number().integer().positive().required(),
      percentage: Joi.number().min(0).max(100).required()
    })
  ).min(1).required()
});

const phoneNumberSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^[\+]?[0-9\s\-\(\)]{8,20}$/).required()
});

// Export all schemas and middleware
module.exports = {
  validate,
  validateQuery,
  validateParams,
  
  // Authentication
  loginSchema,
  registerSchema,
  
  // Cars
  carCreateSchema,
  carUpdateSchema,
  carIdSchema,
  carReorderSchema,
  
  // Bookings
  bookingCreateSchema,
  bookingStatusSchema,
  bookingIdSchema,
  bookingRejectSchema,
  
  // Coupons
  couponCreateSchema,
  couponUpdateSchema,
  couponIdSchema,
  couponUseSchema,
  couponWheelSchema,
  
  // Spinning Wheels
  spinningWheelCreateSchema,
  spinningWheelUpdateSchema,
  spinningWheelIdSchema,
  spinningWheelCouponSchema,
  spinningWheelBulkCouponsSchema,
  
  // Phone numbers
  phoneNumberSchema
}; 