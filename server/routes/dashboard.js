const express = require('express');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get dashboard KPIs
router.get('/kpis', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get product cost summary
    const productCostResult = await query(
      `SELECT 
         COUNT(*) as total_products,
         SUM(pm.total_cost) as total_material_cost,
         SUM(pjw.cost) as total_job_work_cost,
         SUM(pac.cost) as total_additional_cost
       FROM products p
       LEFT JOIN product_materials pm ON p.id = pm.product_id
       LEFT JOIN product_job_work pjw ON p.id = pjw.product_id
       LEFT JOIN product_additional_costs pac ON p.id = pac.product_id
       WHERE p.user_id = $1 AND p.is_active = true`,
      [userId]
    );

    // Get overhead summary
    const overheadResult = await query(
      `SELECT 
         SUM(amount) as total_overheads,
         COUNT(*) as total_expenses
       FROM overheads 
       WHERE user_id = $1`,
      [userId]
    );

    // Get sales summary
    const salesResult = await query(
      `SELECT 
         SUM(s.total_amount) as total_sales,
         COUNT(*) as total_transactions,
         SUM(s.quantity) as total_quantity_sold
       FROM sales s
       JOIN products p ON s.product_id = p.id
       WHERE p.user_id = $1`,
      [userId]
    );

    // Get recent activities
    const recentActivitiesResult = await query(
      `(SELECT 'product' as type, p.name as description, p.created_at as created_at
        FROM products p
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT 5)
       UNION ALL
       (SELECT 'overhead' as type, o.description, o.created_at
        FROM overheads o
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT 5)
       UNION ALL
       (SELECT 'sale' as type, CONCAT('Sale: ', p.name, ' - ', s.quantity, ' units') as description, s.created_at
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE p.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT 5)
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get low stock alerts
    const lowStockResult = await query(
      `SELECT p.id, p.name, p.current_stock, p.unit
       FROM products p
       WHERE p.user_id = $1 AND p.current_stock <= 10 AND p.is_active = true
       ORDER BY p.current_stock ASC
       LIMIT 5`,
      [userId]
    );

    const productCost = productCostResult.rows[0];
    const overhead = overheadResult.rows[0];
    const sales = salesResult.rows[0];

    const totalMaterialCost = parseFloat(productCost.total_material_cost) || 0;
    const totalJobWorkCost = parseFloat(productCost.total_job_work_cost) || 0;
    const totalAdditionalCost = parseFloat(productCost.total_additional_cost) || 0;
    const totalProductCost = totalMaterialCost + totalJobWorkCost + totalAdditionalCost;
    const totalOverheads = parseFloat(overhead.total_overheads) || 0;
    const totalSales = parseFloat(sales.total_sales) || 0;

    // Calculate profit margin
    const totalCost = totalProductCost + totalOverheads;
    const profitMargin = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;

    res.json({
      success: true,
      data: {
        kpis: {
          totalProducts: parseInt(productCost.total_products) || 0,
          totalMaterialCost,
          totalJobWorkCost,
          totalAdditionalCost,
          totalProductCost,
          totalOverheads,
          totalSales,
          profitMargin: Math.round(profitMargin * 100) / 100,
          totalTransactions: parseInt(sales.total_transactions) || 0,
          totalQuantitySold: parseFloat(sales.total_quantity_sold) || 0
        },
        recentActivities: recentActivitiesResult.rows.map(activity => ({
          type: activity.type,
          description: activity.description,
          createdAt: activity.created_at
        })),
        lowStockAlerts: lowStockResult.rows.map(product => ({
          id: product.id,
          name: product.name,
          currentStock: parseFloat(product.current_stock),
          unit: product.unit
        }))
      }
    });
  } catch (error) {
    logger.error('Get dashboard KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
});

// Get monthly trends
router.get('/trends', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const userId = req.user.id;

    // Get sales trends
    const salesTrendResult = await query(
      `SELECT 
         DATE_TRUNC('month', s.sale_date) as month,
         SUM(s.total_amount) as total_sales,
         COUNT(*) as transaction_count,
         SUM(s.quantity) as total_quantity
       FROM sales s
       JOIN products p ON s.product_id = p.id
       WHERE p.user_id = $1 
         AND s.sale_date >= CURRENT_DATE - INTERVAL '${months} months'
       GROUP BY DATE_TRUNC('month', s.sale_date)
       ORDER BY month`,
      [userId]
    );

    // Get overhead trends
    const overheadTrendResult = await query(
      `SELECT 
         DATE_TRUNC('month', expense_date) as month,
         SUM(amount) as total_overheads,
         COUNT(*) as expense_count
       FROM overheads 
       WHERE user_id = $1 
         AND expense_date >= CURRENT_DATE - INTERVAL '${months} months'
       GROUP BY DATE_TRUNC('month', expense_date)
       ORDER BY month`,
      [userId]
    );

    // Get product cost trends (simplified - using creation date)
    const productCostTrendResult = await query(
      `SELECT 
         DATE_TRUNC('month', p.created_at) as month,
         COUNT(*) as products_created,
         SUM(COALESCE(pm.total_cost, 0) + COALESCE(pjw.cost, 0) + COALESCE(pac.cost, 0)) as total_cost
       FROM products p
       LEFT JOIN product_materials pm ON p.id = pm.product_id
       LEFT JOIN product_job_work pjw ON p.id = pjw.product_id
       LEFT JOIN product_additional_costs pac ON p.id = pac.product_id
       WHERE p.user_id = $1 
         AND p.created_at >= CURRENT_DATE - INTERVAL '${months} months'
       GROUP BY DATE_TRUNC('month', p.created_at)
       ORDER BY month`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        salesTrends: salesTrendResult.rows.map(trend => ({
          month: trend.month,
          totalSales: parseFloat(trend.total_sales) || 0,
          transactionCount: parseInt(trend.transaction_count) || 0,
          totalQuantity: parseFloat(trend.total_quantity) || 0
        })),
        overheadTrends: overheadTrendResult.rows.map(trend => ({
          month: trend.month,
          totalOverheads: parseFloat(trend.total_overheads) || 0,
          expenseCount: parseInt(trend.expense_count) || 0
        })),
        productCostTrends: productCostTrendResult.rows.map(trend => ({
          month: trend.month,
          productsCreated: parseInt(trend.products_created) || 0,
          totalCost: parseFloat(trend.total_cost) || 0
        }))
      }
    });
  } catch (error) {
    logger.error('Get dashboard trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trend data'
    });
  }
});

// Get quick stats for dashboard cards
router.get('/quick-stats', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get today's sales
    const todaySalesResult = await query(
      `SELECT 
         SUM(s.total_amount) as total_sales,
         COUNT(*) as transaction_count
       FROM sales s
       JOIN products p ON s.product_id = p.id
       WHERE p.user_id = $1 AND s.sale_date = CURRENT_DATE`,
      [userId]
    );

    // Get this month's overheads
    const monthOverheadsResult = await query(
      `SELECT 
         SUM(amount) as total_overheads,
         COUNT(*) as expense_count
       FROM overheads 
       WHERE user_id = $1 
         AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    // Get low stock count
    const lowStockResult = await query(
      `SELECT COUNT(*) as low_stock_count
       FROM products 
       WHERE user_id = $1 AND current_stock <= 10 AND is_active = true`,
      [userId]
    );

    // Get recent product additions
    const recentProductsResult = await query(
      `SELECT COUNT(*) as recent_products
       FROM products 
       WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    const todaySales = todaySalesResult.rows[0];
    const monthOverheads = monthOverheadsResult.rows[0];
    const lowStock = lowStockResult.rows[0];
    const recentProducts = recentProductsResult.rows[0];

    res.json({
      success: true,
      data: {
        todaySales: {
          amount: parseFloat(todaySales.total_sales) || 0,
          transactions: parseInt(todaySales.transaction_count) || 0
        },
        monthOverheads: {
          amount: parseFloat(monthOverheads.total_overheads) || 0,
          expenses: parseInt(monthOverheads.expense_count) || 0
        },
        lowStockCount: parseInt(lowStock.low_stock_count) || 0,
        recentProducts: parseInt(recentProducts.recent_products) || 0
      }
    });
  } catch (error) {
    logger.error('Get quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quick stats'
    });
  }
});

module.exports = router;
