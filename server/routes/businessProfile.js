const express = require('express');
const { query } = require('../config/database');
const { validate, schemas, validateGSTIN, INDIAN_STATE_CODES } = require('../utils/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Create or update business profile
router.post('/', require('../middleware/auth').authenticateToken, validate(schemas.businessProfile), async (req, res) => {
  try {
    const { businessName, country, state, addressLine, city, pincode, taxId, businessType, industry } = req.body;
    const userId = req.user.id;

    // Validate GSTIN if provided and country is India
    if (country === 'IN' && taxId) {
      if (!validateGSTIN(taxId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GSTIN format'
        });
      }

      // Verify state code matches GSTIN
      const gstinStateCode = taxId.substring(0, 2);
      if (state && gstinStateCode !== state) {
        return res.status(400).json({
          success: false,
          message: `GSTIN state code (${gstinStateCode}) does not match selected state (${state})`
        });
      }
    }

    // Check if business profile already exists
    const existingProfile = await query(
      'SELECT id FROM business_profiles WHERE user_id = $1',
      [userId]
    );

    let verificationStatus = 'Individual';
    if (country === 'IN' && taxId && validateGSTIN(taxId)) {
      verificationStatus = 'Pending';
    } else if (taxId) {
      verificationStatus = 'Pending';
    }

    let result;
    if (existingProfile.rows.length > 0) {
      // Update existing profile
      result = await query(
        `UPDATE business_profiles 
         SET business_name = $2, country = $3, state = $4, address_line = $5, 
             city = $6, pincode = $7, tax_id = $8, verification_status = $9,
             business_type = $10, industry = $11, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [userId, businessName, country, state, addressLine, city, pincode, taxId, verificationStatus, businessType, industry]
      );
    } else {
      // Create new profile
      result = await query(
        `INSERT INTO business_profiles 
         (user_id, business_name, country, state, address_line, city, pincode, tax_id, verification_status, business_type, industry)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [userId, businessName, country, state, addressLine, city, pincode, taxId, verificationStatus, businessType, industry]
      );
    }

    const profile = result.rows[0];

    logger.info(`Business profile ${existingProfile.rows.length > 0 ? 'updated' : 'created'} for user: ${userId}`);

    res.status(existingProfile.rows.length > 0 ? 200 : 201).json({
      success: true,
      message: `Business profile ${existingProfile.rows.length > 0 ? 'updated' : 'created'} successfully`,
      data: {
        profile: {
          id: profile.id,
          businessName: profile.business_name,
          country: profile.country,
          state: profile.state,
          addressLine: profile.address_line,
          city: profile.city,
          pincode: profile.pincode,
          taxId: profile.tax_id,
          verificationStatus: profile.verification_status,
          businessType: profile.business_type,
          industry: profile.industry,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Business profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save business profile'
    });
  }
});

// Get business profile
router.get('/', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM business_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found'
      });
    }

    const profile = result.rows[0];

    res.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          businessName: profile.business_name,
          country: profile.country,
          state: profile.state,
          addressLine: profile.address_line,
          city: profile.city,
          pincode: profile.pincode,
          taxId: profile.tax_id,
          verificationStatus: profile.verification_status,
          businessType: profile.business_type,
          industry: profile.industry,
          logoUrl: profile.logo_url,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Get business profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business profile'
    });
  }
});

// Get Indian states
router.get('/states/india', (req, res) => {
  try {
    const states = Object.entries(INDIAN_STATE_CODES).map(([code, name]) => ({
      code,
      name
    }));

    res.json({
      success: true,
      data: { states }
    });
  } catch (error) {
    logger.error('Get Indian states error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get states'
    });
  }
});

// Validate GSTIN
router.post('/validate-gstin', (req, res) => {
  try {
    const { gstin } = req.body;

    if (!gstin) {
      return res.status(400).json({
        success: false,
        message: 'GSTIN is required'
      });
    }

    const isValid = validateGSTIN(gstin);
    let stateCode = null;
    let stateName = null;

    if (isValid) {
      stateCode = gstin.substring(0, 2);
      stateName = INDIAN_STATE_CODES[stateCode] || 'Unknown State';
    }

    res.json({
      success: true,
      data: {
        isValid,
        stateCode,
        stateName
      }
    });
  } catch (error) {
    logger.error('GSTIN validation error:', error);
    res.status(500).json({
      success: false,
      message: 'GSTIN validation failed'
    });
  }
});

module.exports = router;