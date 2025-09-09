const express = require('express');
const { query } = require('../config/database');
const { validate, schemas } = require('../utils/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get stock movements for a product
router.get('/movements/:productId', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const productId = req.params.productId;
    const { page = 1, limit = 20, movementType } = req.query;
    const offset = (page - 1) * limit;

    // Verify product belongs to user
    const productCheck = await query(
      'SELECT id, name FROM products WHERE id = $1 AND user_id = $2',
      [productId, req.user.id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let whereClause = 'WHERE sm.product_id = $1';
    let queryParams = [productId];
    let paramCount = 1;

    if (movementType) {
      paramCount++;
      whereClause += ` AND sm.movement_type = $${paramCount}`;
      queryParams.push(movementType);
    }

    const result = await query(
      `SELECT sm.*, u.first_name, u.last_name
       FROM stock_movements sm
       LEFT JOIN users u ON sm.created_by = u.id
       ${whereClause}
       ORDER BY sm.movement_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...queryParams, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM stock_movements sm ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        product: {
          id: productCheck.rows[0].id,
          name: productCheck.rows[0].name
        },
        movements: result.rows.map(movement => ({
          id: movement.id,
          movementType: movement.movement_type,
          quantity: parseFloat(movement.quantity),
          reference: movement.reference,
          notes: movement.notes,
          movementDate: movement.movement_date,
          createdBy: movement.first_name ? `${movement.first_name} ${movement.last_name}` : 'System'
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
    logger.error('Get stock movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stock movements'
    });
  }
});

// Add stock movement
router.post('/movements', require('../middleware/auth').authenticateToken, validate(schemas.stockMovement), async (req, res) => {
  try {
    const { productId, movementType, quantity, reference, notes } = req.body;
    const userId = req.user.id;

    // Verify product belongs to user
    const productCheck = await query(
      'SELECT id, name, current_stock FROM products WHERE id = $1 AND user_id = $2',
      [productId, userId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productCheck.rows[0];
    const currentStock = parseFloat(product.current_stock);
    let newStock = currentStock;

    // Calculate new stock based on movement type
    if (movementType === 'IN') {
      newStock = currentStock + quantity;
    } else if (movementType === 'OUT') {
      if (quantity > currentStock) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock for this movement'
        });
      }
      newStock = currentStock - quantity;
    } else if (movementType === 'ADJUSTMENT') {
      newStock = quantity; // Direct adjustment
    }

    // Use transaction to ensure data consistency
    const { transaction } = require('../config/database');
    
    const result = await transaction(async (client) => {
      // Create stock movement
      const movementResult = await client.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [productId, movementType, quantity, reference, notes, userId]
      );

      // Update product stock
      await client.query(
        'UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, productId]
      );

      return movementResult.rows[0];
    });

    logger.info(`Stock movement created: ${movementType} ${quantity} for product ${product.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Stock movement recorded successfully',
      data: {
        movement: {
          id: result.id,
          productId: result.product_id,
          movementType: result.movement_type,
          quantity: parseFloat(result.quantity),
          reference: result.reference,
          notes: result.notes,
          movementDate: result.movement_date
        },
        stockUpdate: {
          previousStock: currentStock,
          newStock: newStock,
          change: newStock - currentStock
        }
      }
    });
  } catch (error) {
    logger.error('Add stock movement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record stock movement'
    });
  }
});

// Get sales for a product
router.get('/sales/:productId', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const productId = req.params.productId;
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    // Verify product belongs to user
    const productCheck = await query(
      'SELECT id, name FROM products WHERE id = $1 AND user_id = $2',
      [productId, req.user.id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let whereClause = 'WHERE s.product_id = $1';
    let queryParams = [productId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      whereClause += ` AND s.sale_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND s.sale_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    const result = await query(
      `SELECT s.*, p.name as product_name
       FROM sales s
       JOIN products p ON s.product_id = p.id
       ${whereClause}
       ORDER BY s.sale_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...queryParams, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM sales s ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        product: {
          id: productCheck.rows[0].id,
          name: productCheck.rows[0].name
        },
        sales: result.rows.map(sale => ({
          id: sale.id,
          productId: sale.product_id,
          productName: sale.product_name,
          quantity: parseFloat(sale.quantity),
          unitPrice: parseFloat(sale.unit_price),
          totalAmount: parseFloat(sale.total_amount),
          saleDate: sale.sale_date,
          customerName: sale.customer_name,
          invoiceNumber: sale.invoice_number,
          notes: sale.notes,
          createdAt: sale.created_at,
          updatedAt: sale.updated_at
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
    logger.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales'
    });
  }
});

// Record sale
router.post('/sales', require('../middleware/auth').authenticateToken, validate(schemas.sale), async (req, res) => {
  try {
    const { productId, quantity, unitPrice, saleDate, customerName, invoiceNumber, notes } = req.body;
    const userId = req.user.id;
    const totalAmount = quantity * unitPrice;

    // Verify product belongs to user
    const productCheck = await query(
      'SELECT id, name, current_stock FROM products WHERE id = $1 AND user_id = $2',
      [productId, userId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productCheck.rows[0];
    const currentStock = parseFloat(product.current_stock);

    if (quantity > currentStock) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock for this sale'
      });
    }

    // Use transaction to ensure data consistency
    const { transaction } = require('../config/database');
    
    const result = await transaction(async (client) => {
      // Record sale
      const saleResult = await client.query(
        `INSERT INTO sales (product_id, quantity, unit_price, total_amount, sale_date, customer_name, invoice_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [productId, quantity, unitPrice, totalAmount, saleDate, customerName, invoiceNumber, notes]
      );

      // Update product stock
      const newStock = currentStock - quantity;
      await client.query(
        'UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, productId]
      );

      // Create stock movement for sale
      await client.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes, created_by)
         VALUES ($1, 'OUT', $2, $3, $4, $5)`,
        [productId, quantity, invoiceNumber || 'Sale', notes || 'Sale transaction', userId]
      );

      return saleResult.rows[0];
    });

    logger.info(`Sale recorded: ${quantity} units of ${product.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: {
        sale: {
          id: result.id,
          productId: result.product_id,
          quantity: parseFloat(result.quantity),
          unitPrice: parseFloat(result.unit_price),
          totalAmount: parseFloat(result.total_amount),
          saleDate: result.sale_date,
          customerName: result.customer_name,
          invoiceNumber: result.invoice_number,
          notes: result.notes,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        stockUpdate: {
          previousStock: currentStock,
          newStock: currentStock - quantity,
          change: -quantity
        }
      }
    });
  } catch (error) {
    logger.error('Record sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record sale'
    });
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { threshold = 10 } = req.query;

    const result = await query(
      `SELECT p.id, p.name, p.unit, p.current_stock, p.opening_stock,
              COALESCE(SUM(s.quantity), 0) as total_sales,
              COALESCE(AVG(s.quantity), 0) as avg_daily_sales
       FROM products p
       LEFT JOIN sales s ON p.id = s.product_id 
         AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'
       WHERE p.user_id = $1 AND p.current_stock <= $2 AND p.is_active = true
       GROUP BY p.id, p.name, p.unit, p.current_stock, p.opening_stock
       ORDER BY p.current_stock ASC`,
      [req.user.id, threshold]
    );

    res.json({
      success: true,
      data: {
        lowStockProducts: result.rows.map(product => ({
          id: product.id,
          name: product.name,
          unit: product.unit,
          currentStock: parseFloat(product.current_stock),
          openingStock: parseFloat(product.opening_stock),
          totalSales: parseFloat(product.total_sales),
          avgDailySales: parseFloat(product.avg_daily_sales),
          suggestedProduction: Math.max(0, Math.ceil(parseFloat(product.avg_daily_sales) * 7 - parseFloat(product.current_stock)))
        }))
      }
    });
  } catch (error) {
    logger.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get low stock alerts'
    });
  }
});

// Get stock summary
router.get('/summary', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         COUNT(*) as total_products,
         SUM(current_stock) as total_stock_value,
         SUM(opening_stock) as total_opening_stock,
         COUNT(CASE WHEN current_stock <= 10 THEN 1 END) as low_stock_count,
         COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock_count
       FROM products 
       WHERE user_id = $1 AND is_active = true`,
      [req.user.id]
    );

    const summary = result.rows[0];

    res.json({
      success: true,
      data: {
        totalProducts: parseInt(summary.total_products),
        totalStockValue: parseFloat(summary.total_stock_value) || 0,
        totalOpeningStock: parseFloat(summary.total_opening_stock) || 0,
        lowStockCount: parseInt(summary.low_stock_count),
        outOfStockCount: parseInt(summary.out_of_stock_count)
      }
    });
  } catch (error) {
    logger.error('Get stock summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stock summary'
    });
  }
});

module.exports = router;
