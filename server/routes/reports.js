const express = require('express');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const router = express.Router();

// Generate product cost report
router.get('/product-cost/:productId', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const productId = req.params.productId;
    const { format = 'json' } = req.query;

    // Get product details with cost breakdown
    const productResult = await query(
      `SELECT p.*, 
              COALESCE(SUM(pm.total_cost), 0) as materials_total,
              COALESCE(SUM(pjw.cost), 0) as job_work_total,
              COALESCE(SUM(pac.cost), 0) as additional_costs_total
       FROM products p
       LEFT JOIN product_materials pm ON p.id = pm.product_id
       LEFT JOIN product_job_work pjw ON p.id = pjw.product_id
       LEFT JOIN product_additional_costs pac ON p.id = pac.product_id
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
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

    const materialsTotal = parseFloat(product.materials_total);
    const jobWorkTotal = parseFloat(product.job_work_total);
    const additionalCostsTotal = parseFloat(product.additional_costs_total);
    const totalCost = materialsTotal + jobWorkTotal + additionalCostsTotal;

    const reportData = {
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        unit: product.unit,
        scrapValue: parseFloat(product.scrap_value),
        sellingPrice: product.selling_price ? parseFloat(product.selling_price) : null,
        targetMarginPercent: product.target_margin_percent ? parseFloat(product.target_margin_percent) : null
      },
      materials: materialsResult.rows.map(material => ({
        name: material.material_name,
        quantity: parseFloat(material.quantity),
        unit: material.unit,
        unitCost: parseFloat(material.unit_cost),
        totalCost: parseFloat(material.total_cost)
      })),
      jobWork: jobWorkResult.rows.map(job => ({
        description: job.description,
        cost: parseFloat(job.cost)
      })),
      additionalCosts: additionalCostsResult.rows.map(cost => ({
        type: cost.cost_type,
        description: cost.description,
        cost: parseFloat(cost.cost)
      })),
      costBreakdown: {
        materialsTotal,
        jobWorkTotal,
        additionalCostsTotal,
        totalCost,
        netCost: totalCost - parseFloat(product.scrap_value)
      }
    };

    if (format === 'pdf') {
      return generateProductCostPDF(res, reportData);
    } else if (format === 'excel') {
      return generateProductCostExcel(res, reportData);
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    logger.error('Generate product cost report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate product cost report'
    });
  }
});

// Generate overhead report
router.get('/overheads', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, category, format = 'json' } = req.query;

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

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      queryParams.push(category);
    }

    const result = await query(
      `SELECT * FROM overheads 
       ${whereClause}
       ORDER BY expense_date DESC`,
      queryParams
    );

    // Get summary by category
    const summaryResult = await query(
      `SELECT category, SUM(amount) as total_amount, COUNT(*) as count
       FROM overheads 
       ${whereClause}
       GROUP BY category
       ORDER BY total_amount DESC`,
      queryParams
    );

    const reportData = {
      overheads: result.rows.map(overhead => ({
        id: overhead.id,
        category: overhead.category,
        subcategory: overhead.subcategory,
        description: overhead.description,
        amount: parseFloat(overhead.amount),
        expenseDate: overhead.expense_date,
        isRecurring: overhead.is_recurring,
        recurringFrequency: overhead.recurring_frequency
      })),
      summary: summaryResult.rows.map(row => ({
        category: row.category,
        totalAmount: parseFloat(row.total_amount),
        count: parseInt(row.count)
      })),
      totalAmount: result.rows.reduce((sum, overhead) => sum + parseFloat(overhead.amount), 0),
      totalCount: result.rows.length
    };

    if (format === 'pdf') {
      return generateOverheadPDF(res, reportData);
    } else if (format === 'excel') {
      return generateOverheadExcel(res, reportData);
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    logger.error('Generate overhead report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate overhead report'
    });
  }
});

// Generate profitability analysis
router.get('/profitability', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    let whereClause = 'WHERE p.user_id = $1';
    let queryParams = [req.user.id];
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

    // Get product profitability
    const profitabilityResult = await query(
      `SELECT 
         p.id, p.name, p.unit,
         COALESCE(SUM(s.quantity), 0) as total_quantity_sold,
         COALESCE(SUM(s.total_amount), 0) as total_sales,
         COALESCE(AVG(s.unit_price), 0) as avg_selling_price,
         COALESCE(SUM(pm.total_cost), 0) as total_material_cost,
         COALESCE(SUM(pjw.cost), 0) as total_job_work_cost,
         COALESCE(SUM(pac.cost), 0) as total_additional_cost
       FROM products p
       LEFT JOIN sales s ON p.id = s.product_id ${startDate || endDate ? 'AND s.sale_date BETWEEN $2 AND $3' : ''}
       LEFT JOIN product_materials pm ON p.id = pm.product_id
       LEFT JOIN product_job_work pjw ON p.id = pjw.product_id
       LEFT JOIN product_additional_costs pac ON p.id = pac.product_id
       ${whereClause}
       GROUP BY p.id, p.name, p.unit
       HAVING COALESCE(SUM(s.quantity), 0) > 0
       ORDER BY total_sales DESC`,
      queryParams
    );

    const reportData = {
      products: profitabilityResult.rows.map(product => {
        const totalCost = parseFloat(product.total_material_cost) + 
                         parseFloat(product.total_job_work_cost) + 
                         parseFloat(product.total_additional_cost);
        const totalSales = parseFloat(product.total_sales);
        const profit = totalSales - totalCost;
        const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

        return {
          id: product.id,
          name: product.name,
          unit: product.unit,
          totalQuantitySold: parseFloat(product.total_quantity_sold),
          totalSales,
          avgSellingPrice: parseFloat(product.avg_selling_price),
          totalCost,
          profit,
          profitMargin: Math.round(profitMargin * 100) / 100
        };
      }),
      summary: {
        totalProducts: profitabilityResult.rows.length,
        totalSales: profitabilityResult.rows.reduce((sum, p) => sum + parseFloat(p.total_sales), 0),
        totalCost: profitabilityResult.rows.reduce((sum, p) => 
          sum + parseFloat(p.total_material_cost) + parseFloat(p.total_job_work_cost) + parseFloat(p.total_additional_cost), 0),
        totalProfit: 0 // Will be calculated
      }
    };

    reportData.summary.totalProfit = reportData.summary.totalSales - reportData.summary.totalCost;
    reportData.summary.overallProfitMargin = reportData.summary.totalSales > 0 ? 
      (reportData.summary.totalProfit / reportData.summary.totalSales) * 100 : 0;

    if (format === 'pdf') {
      return generateProfitabilityPDF(res, reportData);
    } else if (format === 'excel') {
      return generateProfitabilityExcel(res, reportData);
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    logger.error('Generate profitability report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate profitability report'
    });
  }
});

// Helper functions for PDF generation
function generateProductCostPDF(res, data) {
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=product-cost-report.pdf');
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('Product Cost Report', 50, 50);
  doc.fontSize(12).text(`Product: ${data.product.name}`, 50, 80);
  doc.text(`Unit: ${data.product.unit}`, 50, 95);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 50, 110);

  let y = 140;

  // Materials section
  if (data.materials.length > 0) {
    doc.fontSize(14).text('Materials', 50, y);
    y += 20;
    
    doc.text('Name', 50, y);
    doc.text('Qty', 200, y);
    doc.text('Unit Cost', 250, y);
    doc.text('Total', 350, y);
    y += 20;

    data.materials.forEach(material => {
      doc.text(material.name, 50, y);
      doc.text(material.quantity.toString(), 200, y);
      doc.text(material.unitCost.toFixed(2), 250, y);
      doc.text(material.totalCost.toFixed(2), 350, y);
      y += 15;
    });

    doc.text(`Materials Total: ${data.costBreakdown.materialsTotal.toFixed(2)}`, 350, y);
    y += 30;
  }

  // Job Work section
  if (data.jobWork.length > 0) {
    doc.fontSize(14).text('Job Work', 50, y);
    y += 20;

    data.jobWork.forEach(job => {
      doc.text(job.description, 50, y);
      doc.text(job.cost.toFixed(2), 350, y);
      y += 15;
    });

    doc.text(`Job Work Total: ${data.costBreakdown.jobWorkTotal.toFixed(2)}`, 350, y);
    y += 30;
  }

  // Additional Costs section
  if (data.additionalCosts.length > 0) {
    doc.fontSize(14).text('Additional Costs', 50, y);
    y += 20;

    data.additionalCosts.forEach(cost => {
      doc.text(`${cost.type}: ${cost.description}`, 50, y);
      doc.text(cost.cost.toFixed(2), 350, y);
      y += 15;
    });

    doc.text(`Additional Costs Total: ${data.costBreakdown.additionalCostsTotal.toFixed(2)}`, 350, y);
    y += 30;
  }

  // Summary
  doc.fontSize(16).text('Cost Summary', 50, y);
  y += 20;
  doc.text(`Total Cost: ${data.costBreakdown.totalCost.toFixed(2)}`, 50, y);
  y += 15;
  doc.text(`Scrap Value: ${data.product.scrapValue.toFixed(2)}`, 50, y);
  y += 15;
  doc.text(`Net Cost: ${data.costBreakdown.netCost.toFixed(2)}`, 50, y);

  if (data.product.sellingPrice) {
    y += 15;
    doc.text(`Selling Price: ${data.product.sellingPrice.toFixed(2)}`, 50, y);
    y += 15;
    const profit = data.product.sellingPrice - data.costBreakdown.netCost;
    doc.text(`Profit: ${profit.toFixed(2)}`, 50, y);
    y += 15;
    const margin = (profit / data.product.sellingPrice) * 100;
    doc.text(`Margin: ${margin.toFixed(2)}%`, 50, y);
  }

  doc.end();
}

// Helper functions for Excel generation
function generateProductCostExcel(res, data) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Product Cost Report');

  // Header
  worksheet.addRow(['Product Cost Report']);
  worksheet.addRow([`Product: ${data.product.name}`]);
  worksheet.addRow([`Unit: ${data.product.unit}`]);
  worksheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
  worksheet.addRow([]);

  // Materials section
  if (data.materials.length > 0) {
    worksheet.addRow(['Materials']);
    worksheet.addRow(['Name', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost']);
    
    data.materials.forEach(material => {
      worksheet.addRow([
        material.name,
        material.quantity,
        material.unit,
        material.unitCost,
        material.totalCost
      ]);
    });
    
    worksheet.addRow(['', '', '', 'Materials Total:', data.costBreakdown.materialsTotal]);
    worksheet.addRow([]);
  }

  // Job Work section
  if (data.jobWork.length > 0) {
    worksheet.addRow(['Job Work']);
    worksheet.addRow(['Description', 'Cost']);
    
    data.jobWork.forEach(job => {
      worksheet.addRow([job.description, job.cost]);
    });
    
    worksheet.addRow(['Job Work Total:', data.costBreakdown.jobWorkTotal]);
    worksheet.addRow([]);
  }

  // Additional Costs section
  if (data.additionalCosts.length > 0) {
    worksheet.addRow(['Additional Costs']);
    worksheet.addRow(['Type', 'Description', 'Cost']);
    
    data.additionalCosts.forEach(cost => {
      worksheet.addRow([cost.type, cost.description, cost.cost]);
    });
    
    worksheet.addRow(['', 'Additional Costs Total:', data.costBreakdown.additionalCostsTotal]);
    worksheet.addRow([]);
  }

  // Summary
  worksheet.addRow(['Cost Summary']);
  worksheet.addRow(['Total Cost:', data.costBreakdown.totalCost]);
  worksheet.addRow(['Scrap Value:', data.product.scrapValue]);
  worksheet.addRow(['Net Cost:', data.costBreakdown.netCost]);

  if (data.product.sellingPrice) {
    worksheet.addRow(['Selling Price:', data.product.sellingPrice]);
    const profit = data.product.sellingPrice - data.costBreakdown.netCost;
    worksheet.addRow(['Profit:', profit]);
    const margin = (profit / data.product.sellingPrice) * 100;
    worksheet.addRow(['Margin %:', margin]);
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=product-cost-report.xlsx');
  
  workbook.xlsx.write(res).then(() => {
    res.end();
  });
}

// Placeholder functions for other report formats
function generateOverheadPDF(res, data) {
  // Implementation for overhead PDF
  res.json({ success: false, message: 'PDF generation not implemented yet' });
}

function generateOverheadExcel(res, data) {
  // Implementation for overhead Excel
  res.json({ success: false, message: 'Excel generation not implemented yet' });
}

function generateProfitabilityPDF(res, data) {
  // Implementation for profitability PDF
  res.json({ success: false, message: 'PDF generation not implemented yet' });
}

function generateProfitabilityExcel(res, data) {
  // Implementation for profitability Excel
  res.json({ success: false, message: 'Excel generation not implemented yet' });
}

module.exports = router;
