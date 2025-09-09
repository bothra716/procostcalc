const express = require('express');
const { query } = require('../config/database');
const { validate, schemas } = require('../utils/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get all overheads for user
router.get('/', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, startDate, endDate, sortBy = 'expense_date', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      queryParams.push(category);
    }

    if (startDate) {
      paramCount++;
      whereClause += ` AND expense_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND expense_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    const result = await query(
      `SELECT * FROM overheads 
       ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...queryParams, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM overheads ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        overheads: result.rows.map(overhead => ({
          id: overhead.id,
          category: overhead.category,
          subcategory: overhead.subcategory,
          description: overhead.description,
          amount: parseFloat(overhead.amount),
          expenseDate: overhead.expense_date,
          receiptUrl: overhead.receipt_url,
          isRecurring: overhead.is_recurring,
          recurringFrequency: overhead.recurring_frequency,
          createdAt: overhead.created_at,
          updatedAt: overhead.updated_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get overheads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get overheads'
    });
  }
});

// Get overhead analytics
router.get('/analytics', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      whereClause += ` AND expense_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND expense_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    // Get total expenses by category
    const categoryResult = await query(
      `SELECT category, SUM(amount) as total_amount, COUNT(*) as count
       FROM overheads 
       ${whereClause}
       GROUP BY category
       ORDER BY total_amount DESC`,
      queryParams
    );

    // Get monthly trends
    const monthlyResult = await query(
      `SELECT DATE_TRUNC('month', expense_date) as month, 
              SUM(amount) as total_amount,
              COUNT(*) as count
       FROM overheads 
       ${whereClause}
       GROUP BY DATE_TRUNC('month', expense_date)
       ORDER BY month`,
      queryParams
    );

    // Get total expenses
    const totalResult = await query(
      `SELECT SUM(amount) as total_amount, COUNT(*) as count
       FROM overheads 
       ${whereClause}`,
      queryParams
    );

    const totalAmount = parseFloat(totalResult.rows[0].total_amount) || 0;
    const totalCount = parseInt(totalResult.rows[0].count) || 0;

    res.json({
      success: true,
      data: {
        totalAmount,
        totalCount,
        byCategory: categoryResult.rows.map(row => ({
          category: row.category,
          totalAmount: parseFloat(row.total_amount),
          count: parseInt(row.count)
        })),
        monthlyTrends: monthlyResult.rows.map(row => ({
          month: row.month,
          totalAmount: parseFloat(row.total_amount),
          count: parseInt(row.count)
        }))
      }
    });
  } catch (error) {
    logger.error('Get overhead analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get overhead analytics'
    });
  }
});

// Get single overhead
router.get('/:id', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const overheadId = req.params.id;

    const result = await query(
      'SELECT * FROM overheads WHERE id = $1 AND user_id = $2',
      [overheadId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Overhead not found'
      });
    }

    const overhead = result.rows[0];

    res.json({
      success: true,
      data: {
        overhead: {
          id: overhead.id,
          category: overhead.category,
          subcategory: overhead.subcategory,
          description: overhead.description,
          amount: parseFloat(overhead.amount),
          expenseDate: overhead.expense_date,
          receiptUrl: overhead.receipt_url,
          isRecurring: overhead.is_recurring,
          recurringFrequency: overhead.recurring_frequency,
          createdAt: overhead.created_at,
          updatedAt: overhead.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Get overhead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get overhead'
    });
  }
});

// Create overhead
router.post('/', require('../middleware/auth').authenticateToken, validate(schemas.overhead), async (req, res) => {
  try {
    const { category, subcategory, description, amount, expenseDate, isRecurring, recurringFrequency } = req.body;
    const userId = req.user.id;

    const result = await query(
      `INSERT INTO overheads (user_id, category, subcategory, description, amount, expense_date, is_recurring, recurring_frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, category, subcategory, description, amount, expenseDate, isRecurring, recurringFrequency]
    );

    const overhead = result.rows[0];

    logger.info(`Overhead created: ${description} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Overhead created successfully',
      data: {
        overhead: {
          id: overhead.id,
          category: overhead.category,
          subcategory: overhead.subcategory,
          description: overhead.description,
          amount: parseFloat(overhead.amount),
          expenseDate: overhead.expense_date,
          receiptUrl: overhead.receipt_url,
          isRecurring: overhead.is_recurring,
          recurringFrequency: overhead.recurring_frequency,
          createdAt: overhead.created_at,
          updatedAt: overhead.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Create overhead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create overhead'
    });
  }
});

// Update overhead
router.put('/:id', require('../middleware/auth').authenticateToken, validate(schemas.overhead), async (req, res) => {
  try {
    const overheadId = req.params.id;
    const { category, subcategory, description, amount, expenseDate, isRecurring, recurringFrequency } = req.body;

    const result = await query(
      `UPDATE overheads 
       SET category = $2, subcategory = $3, description = $4, amount = $5, 
           expense_date = $6, is_recurring = $7, recurring_frequency = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $9
       RETURNING *`,
      [overheadId, category, subcategory, description, amount, expenseDate, isRecurring, recurringFrequency, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Overhead not found'
      });
    }

    const overhead = result.rows[0];

    logger.info(`Overhead updated: ${description} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Overhead updated successfully',
      data: {
        overhead: {
          id: overhead.id,
          category: overhead.category,
          subcategory: overhead.subcategory,
          description: overhead.description,
          amount: parseFloat(overhead.amount),
          expenseDate: overhead.expense_date,
          receiptUrl: overhead.receipt_url,
          isRecurring: overhead.is_recurring,
          recurringFrequency: overhead.recurring_frequency,
          createdAt: overhead.created_at,
          updatedAt: overhead.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Update overhead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update overhead'
    });
  }
});

// Delete overhead
router.delete('/:id', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const overheadId = req.params.id;

    const result = await query(
      'DELETE FROM overheads WHERE id = $1 AND user_id = $2 RETURNING description',
      [overheadId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Overhead not found'
      });
    }

    logger.info(`Overhead deleted: ${result.rows[0].description} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Overhead deleted successfully'
    });
  } catch (error) {
    logger.error('Delete overhead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete overhead'
    });
  }
});

// Upload receipt
router.post('/:id/receipt', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const overheadId = req.params.id;
    const { receiptUrl } = req.body;

    if (!receiptUrl) {
      return res.status(400).json({
        success: false,
        message: 'Receipt URL is required'
      });
    }

    const result = await query(
      'UPDATE overheads SET receipt_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id',
      [receiptUrl, overheadId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Overhead not found'
      });
    }

    res.json({
      success: true,
      message: 'Receipt uploaded successfully',
      data: { receiptUrl }
    });
  } catch (error) {
    logger.error('Upload receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload receipt'
    });
  }
});

module.exports = router;
