const express = require('express');
const { query } = require('../config/database');
const { validate, schemas } = require('../utils/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get all products for user
router.get('/', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'name', sortOrder = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.user_id = $1';
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereClause += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    const result = await query(
      `SELECT p.*, 
              COALESCE(SUM(sm.quantity) FILTER (WHERE sm.movement_type = 'IN'), 0) as total_in,
              COALESCE(SUM(sm.quantity) FILTER (WHERE sm.movement_type = 'OUT'), 0) as total_out,
              COALESCE(SUM(s.quantity), 0) as total_sales
       FROM products p
       LEFT JOIN stock_movements sm ON p.id = sm.product_id
       LEFT JOIN sales s ON p.id = s.product_id
       ${whereClause}
       GROUP BY p.id
       ORDER BY p.${sortBy} ${sortOrder}
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...queryParams, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        products: result.rows.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          unit: product.unit,
          scrapValue: parseFloat(product.scrap_value),
          openingStock: parseFloat(product.opening_stock),
          currentStock: parseFloat(product.current_stock),
          sellingPrice: product.selling_price ? parseFloat(product.selling_price) : null,
          targetMarginPercent: product.target_margin_percent ? parseFloat(product.target_margin_percent) : null,
          isActive: product.is_active,
          totalIn: parseFloat(product.total_in),
          totalOut: parseFloat(product.total_out),
          totalSales: parseFloat(product.total_sales),
          createdAt: product.created_at,
          updatedAt: product.updated_at
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
    logger.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products'
    });
  }
});

// Get single product with full details
router.get('/:id', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product details
    const productResult = await query(
      'SELECT * FROM products WHERE id = $1 AND user_id = $2',
      [productId, req.user.id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productResult.rows[0];

    // Get materials
    const materialsResult = await query(
      'SELECT * FROM product_materials WHERE product_id = $1 ORDER BY created_at',
      [productId]
    );

    // Get job work
    const jobWorkResult = await query(
      'SELECT * FROM product_job_work WHERE product_id = $1 ORDER BY created_at',
      [productId]
    );

    // Get additional costs
    const additionalCostsResult = await query(
      'SELECT * FROM product_additional_costs WHERE product_id = $1 ORDER BY created_at',
      [productId]
    );

    // Calculate total costs
    const materialsTotal = materialsResult.rows.reduce((sum, material) => sum + parseFloat(material.total_cost), 0);
    const jobWorkTotal = jobWorkResult.rows.reduce((sum, job) => sum + parseFloat(job.cost), 0);
    const additionalCostsTotal = additionalCostsResult.rows.reduce((sum, cost) => sum + parseFloat(cost.cost), 0);
    const totalProductCost = materialsTotal + jobWorkTotal + additionalCostsTotal;

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          unit: product.unit,
          scrapValue: parseFloat(product.scrap_value),
          openingStock: parseFloat(product.opening_stock),
          currentStock: parseFloat(product.current_stock),
          sellingPrice: product.selling_price ? parseFloat(product.selling_price) : null,
          targetMarginPercent: product.target_margin_percent ? parseFloat(product.target_margin_percent) : null,
          isActive: product.is_active,
          createdAt: product.created_at,
          updatedAt: product.updated_at
        },
        materials: materialsResult.rows.map(material => ({
          id: material.id,
          materialName: material.material_name,
          quantity: parseFloat(material.quantity),
          unit: material.unit,
          unitCost: parseFloat(material.unit_cost),
          totalCost: parseFloat(material.total_cost)
        })),
        jobWork: jobWorkResult.rows.map(job => ({
          id: job.id,
          description: job.description,
          cost: parseFloat(job.cost)
        })),
        additionalCosts: additionalCostsResult.rows.map(cost => ({
          id: cost.id,
          costType: cost.cost_type,
          description: cost.description,
          cost: parseFloat(cost.cost)
        })),
        costBreakdown: {
          materialsTotal,
          jobWorkTotal,
          additionalCostsTotal,
          totalProductCost
        }
      }
    });
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product'
    });
  }
});

// Create product
router.post('/', require('../middleware/auth').authenticateToken, validate(schemas.product), async (req, res) => {
  try {
    const { name, description, unit, scrapValue, openingStock, sellingPrice, targetMarginPercent } = req.body;
    const userId = req.user.id;

    const result = await query(
      `INSERT INTO products (user_id, name, description, unit, scrap_value, opening_stock, current_stock, selling_price, target_margin_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
       RETURNING *`,
      [userId, name, description, unit, scrapValue, openingStock, sellingPrice, targetMarginPercent]
    );

    const product = result.rows[0];

    // Create initial stock movement for opening stock
    if (openingStock > 0) {
      await query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes)
         VALUES ($1, 'IN', $2, 'Opening Stock', 'Initial stock entry')`,
        [product.id, openingStock]
      );
    }

    logger.info(`Product created: ${name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          unit: product.unit,
          scrapValue: parseFloat(product.scrap_value),
          openingStock: parseFloat(product.opening_stock),
          currentStock: parseFloat(product.current_stock),
          sellingPrice: product.selling_price ? parseFloat(product.selling_price) : null,
          targetMarginPercent: product.target_margin_percent ? parseFloat(product.target_margin_percent) : null,
          isActive: product.is_active,
          createdAt: product.created_at,
          updatedAt: product.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
});

// Update product
router.put('/:id', require('../middleware/auth').authenticateToken, validate(schemas.product), async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, unit, scrapValue, openingStock, sellingPrice, targetMarginPercent } = req.body;

    const result = await query(
      `UPDATE products 
       SET name = $2, description = $3, unit = $4, scrap_value = $5, 
           opening_stock = $6, selling_price = $7, target_margin_percent = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $9
       RETURNING *`,
      [productId, name, description, unit, scrapValue, openingStock, sellingPrice, targetMarginPercent, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = result.rows[0];

    logger.info(`Product updated: ${name} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          unit: product.unit,
          scrapValue: parseFloat(product.scrap_value),
          openingStock: parseFloat(product.opening_stock),
          currentStock: parseFloat(product.current_stock),
          sellingPrice: product.selling_price ? parseFloat(product.selling_price) : null,
          targetMarginPercent: product.target_margin_percent ? parseFloat(product.target_margin_percent) : null,
          isActive: product.is_active,
          createdAt: product.created_at,
          updatedAt: product.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// Add material to product
router.post('/:id/materials', require('../middleware/auth').authenticateToken, validate(schemas.productMaterial), async (req, res) => {
  try {
    const productId = req.params.id;
    const { materialName, quantity, unit, unitCost } = req.body;
    const totalCost = quantity * unitCost;

    // Verify product belongs to user
    const productCheck = await query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [productId, req.user.id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const result = await query(
      `INSERT INTO product_materials (product_id, material_name, quantity, unit, unit_cost, total_cost)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [productId, materialName, quantity, unit, unitCost, totalCost]
    );

    const material = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Material added successfully',
      data: {
        material: {
          id: material.id,
          materialName: material.material_name,
          quantity: parseFloat(material.quantity),
          unit: material.unit,
          unitCost: parseFloat(material.unit_cost),
          totalCost: parseFloat(material.total_cost)
        }
      }
    });
  } catch (error) {
    logger.error('Add material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add material'
    });
  }
});

// Add job work to product
router.post('/:id/job-work', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const { description, cost } = req.body;

    if (!description || cost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Description and cost are required'
      });
    }

    // Verify product belongs to user
    const productCheck = await query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [productId, req.user.id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const result = await query(
      `INSERT INTO product_job_work (product_id, description, cost)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [productId, description, cost]
    );

    const jobWork = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Job work added successfully',
      data: {
        jobWork: {
          id: jobWork.id,
          description: jobWork.description,
          cost: parseFloat(jobWork.cost)
        }
      }
    });
  } catch (error) {
    logger.error('Add job work error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add job work'
    });
  }
});

// Add additional cost to product
router.post('/:id/additional-costs', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const { costType, description, cost } = req.body;

    if (!costType || cost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Cost type and cost are required'
      });
    }

    // Verify product belongs to user
    const productCheck = await query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [productId, req.user.id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const result = await query(
      `INSERT INTO product_additional_costs (product_id, cost_type, description, cost)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [productId, costType, description, cost]
    );

    const additionalCost = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Additional cost added successfully',
      data: {
        additionalCost: {
          id: additionalCost.id,
          costType: additionalCost.cost_type,
          description: additionalCost.description,
          cost: parseFloat(additionalCost.cost)
        }
      }
    });
  } catch (error) {
    logger.error('Add additional cost error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add additional cost'
    });
  }
});

// Delete product
router.delete('/:id', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;

    const result = await query(
      'DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING name',
      [productId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    logger.info(`Product deleted: ${result.rows[0].name} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

module.exports = router;
