const Joi = require('joi');

// GSTIN validation for India
const validateGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== 'string') return false;
  
  // GSTIN format: 2 digits (state code) + 10 characters (PAN) + 1 character (entity number) + 1 character (Z) + 1 character (checksum)
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(gstin)) return false;
  
  // Extract PAN from GSTIN (positions 2-11)
  const pan = gstin.substring(2, 12);
  
  // PAN validation
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan)) return false;
  
  // Checksum validation (simplified)
  const checksum = gstin.charAt(14);
  const gstinWithoutChecksum = gstin.substring(0, 14);
  
  // Calculate checksum (simplified algorithm)
  let sum = 0;
  let factor = 1;
  
  for (let i = gstinWithoutChecksum.length - 1; i >= 0; i--) {
    let codePoint = gstinWithoutChecksum.charCodeAt(i);
    if (codePoint >= 48 && codePoint <= 57) { // 0-9
      codePoint -= 48;
    } else if (codePoint >= 65 && codePoint <= 90) { // A-Z
      codePoint -= 55;
    }
    
    sum += codePoint * factor;
    factor = factor === 1 ? 2 : 1;
  }
  
  const remainder = sum % 36;
  const calculatedChecksum = remainder < 10 ? remainder.toString() : String.fromCharCode(remainder - 10 + 65);
  
  return calculatedChecksum === checksum;
};

// State codes for India
const INDIAN_STATE_CODES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh'
};

// Validation schemas
const schemas = {
  // User registration
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[+]?[1-9]\d{1,14}$/).optional(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    language: Joi.string().valid('en', 'hi', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'mr', 'or', 'pa', 'ur').default('en'),
    currency: Joi.string().length(3).default('USD')
  }),

  // Business profile
  businessProfile: Joi.object({
    businessName: Joi.string().min(2).max(255).required(),
    country: Joi.string().length(2).required(),
    state: Joi.string().when('country', {
      is: 'IN',
      then: Joi.string().valid(...Object.keys(INDIAN_STATE_CODES)).required(),
      otherwise: Joi.string().optional()
    }),
    addressLine: Joi.string().max(500).optional(),
    city: Joi.string().max(100).optional(),
    pincode: Joi.string().max(20).optional(),
    taxId: Joi.string().max(50).optional(),
    businessType: Joi.string().max(50).optional(),
    industry: Joi.string().max(100).optional()
  }),

  // Product
  product: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(1000).optional(),
    unit: Joi.string().max(50).required(),
    scrapValue: Joi.number().min(0).default(0),
    openingStock: Joi.number().min(0).default(0),
    sellingPrice: Joi.number().min(0).optional(),
    targetMarginPercent: Joi.number().min(0).max(100).optional()
  }),

  // Product material
  productMaterial: Joi.object({
    materialName: Joi.string().min(2).max(255).required(),
    quantity: Joi.number().min(0).required(),
    unit: Joi.string().max(50).required(),
    unitCost: Joi.number().min(0).required()
  }),

  // Overhead
  overhead: Joi.object({
    category: Joi.string().valid('Fixed', 'Variable', 'Recurring', 'One-time').required(),
    subcategory: Joi.string().max(100).optional(),
    description: Joi.string().min(2).max(500).required(),
    amount: Joi.number().min(0).required(),
    expenseDate: Joi.date().required(),
    isRecurring: Joi.boolean().default(false),
    recurringFrequency: Joi.string().valid('Monthly', 'Quarterly', 'Yearly').when('isRecurring', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  // Stock movement
  stockMovement: Joi.object({
    productId: Joi.number().integer().positive().required(),
    movementType: Joi.string().valid('IN', 'OUT', 'ADJUSTMENT').required(),
    quantity: Joi.number().required(),
    reference: Joi.string().max(100).optional(),
    notes: Joi.string().max(500).optional()
  }),

  // Sale
  sale: Joi.object({
    productId: Joi.number().integer().positive().required(),
    quantity: Joi.number().min(0).required(),
    unitPrice: Joi.number().min(0).required(),
    saleDate: Joi.date().required(),
    customerName: Joi.string().max(255).optional(),
    invoiceNumber: Joi.string().max(100).optional(),
    notes: Joi.string().max(500).optional()
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessage
      });
    }
    
    req.body = value;
    next();
  };
};

module.exports = {
  validateGSTIN,
  INDIAN_STATE_CODES,
  schemas,
  validate
};
