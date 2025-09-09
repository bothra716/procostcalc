const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

const seedData = async () => {
  try {
    logger.info('Starting database seeding...');

    // Create sample users
    const passwordHash = await bcrypt.hash('password123', 12);
    
    const users = await query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, language, currency, email_verified, phone_verified)
       VALUES 
         ('admin@example.com', '+1234567890', $1, 'Admin', 'User', 'en', 'USD', true, true),
         ('john@example.com', '+1234567891', $1, 'John', 'Doe', 'en', 'USD', true, true),
         ('jane@example.com', '+1234567892', $1, 'Jane', 'Smith', 'en', 'USD', true, true)
       RETURNING id, email, first_name, last_name`,
      [passwordHash]
    );

    logger.info(`Created ${users.rows.length} users`);

    // Create business profiles
    for (const user of users.rows) {
      await query(
        `INSERT INTO business_profiles (user_id, business_name, country, state, address_line, city, pincode, tax_id, verification_status, business_type, industry)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          user.id,
          `${user.first_name}'s Business`,
          'US',
          null,
          '123 Main Street',
          'New York',
          '10001',
          null,
          'Individual',
          'Individual',
          'Manufacturing'
        ]
      );
    }

    // Create sample products for the first user
    const adminUserId = users.rows[0].id;
    
    const products = await query(
      `INSERT INTO products (user_id, name, description, unit, scrap_value, opening_stock, current_stock, selling_price, target_margin_percent)
       VALUES 
         ($1, 'Widget A', 'High-quality widget for industrial use', 'pcs', 5.00, 100, 100, 25.00, 20.00),
         ($1, 'Widget B', 'Standard widget for general use', 'pcs', 2.00, 50, 50, 15.00, 25.00),
         ($1, 'Component X', 'Essential component for assembly', 'kg', 1.00, 200, 200, 8.00, 15.00)
       RETURNING id, name`,
      [adminUserId]
    );

    logger.info(`Created ${products.rows.length} products`);

    // Add materials to products
    for (const product of products.rows) {
      await query(
        `INSERT INTO product_materials (product_id, material_name, quantity, unit, unit_cost, total_cost)
         VALUES 
           ($1, 'Steel', 2.5, 'kg', 3.00, 7.50),
           ($1, 'Plastic', 1.0, 'kg', 2.00, 2.00),
           ($1, 'Screws', 10, 'pcs', 0.25, 2.50)`,
        [product.id]
      );

      await query(
        `INSERT INTO product_job_work (product_id, description, cost)
         VALUES 
           ($1, 'Machining and assembly', 5.00),
           ($1, 'Quality inspection', 2.00)`,
        [product.id]
      );

      await query(
        `INSERT INTO product_additional_costs (product_id, cost_type, description, cost)
         VALUES 
           ($1, 'Transport', 'Delivery to warehouse', 1.50),
           ($1, 'Packing', 'Packaging materials', 1.00)`,
        [product.id]
      );
    }

    // Create sample overheads
    await query(
      `INSERT INTO overheads (user_id, category, subcategory, description, amount, expense_date, is_recurring, recurring_frequency)
       VALUES 
         ($1, 'Fixed', 'Rent', 'Office rent', 2000.00, CURRENT_DATE, true, 'Monthly'),
         ($1, 'Fixed', 'Utilities', 'Electricity and water', 300.00, CURRENT_DATE, true, 'Monthly'),
         ($1, 'Variable', 'Marketing', 'Online advertising', 500.00, CURRENT_DATE, false, null),
         ($1, 'Recurring', 'Software', 'Business software subscription', 100.00, CURRENT_DATE, true, 'Monthly'),
         ($1, 'One-time', 'Equipment', 'New computer purchase', 1200.00, CURRENT_DATE, false, null)`,
      [adminUserId]
    );

    // Create sample sales
    await query(
      `INSERT INTO sales (product_id, quantity, unit_price, total_amount, sale_date, customer_name, invoice_number)
       VALUES 
         ($1, 10, 25.00, 250.00, CURRENT_DATE - INTERVAL '1 day', 'ABC Corp', 'INV-001'),
         ($1, 5, 25.00, 125.00, CURRENT_DATE - INTERVAL '2 days', 'XYZ Ltd', 'INV-002'),
         ($2, 20, 15.00, 300.00, CURRENT_DATE - INTERVAL '3 days', 'DEF Inc', 'INV-003'),
         ($3, 50, 8.00, 400.00, CURRENT_DATE - INTERVAL '1 day', 'GHI Co', 'INV-004')`,
      [products.rows[0].id, products.rows[1].id, products.rows[2].id]
    );

    // Create stock movements
    await query(
      `INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes, created_by)
       VALUES 
         ($1, 'OUT', 10, 'INV-001', 'Sale to ABC Corp', $2),
         ($1, 'OUT', 5, 'INV-002', 'Sale to XYZ Ltd', $2),
         ($2, 'OUT', 20, 'INV-003', 'Sale to DEF Inc', $2),
         ($3, 'OUT', 50, 'INV-004', 'Sale to GHI Co', $2)`,
      [products.rows[0].id, adminUserId]
    );

    // Update product stock
    await query(
      `UPDATE products SET current_stock = current_stock - 15 WHERE id = $1`,
      [products.rows[0].id]
    );
    await query(
      `UPDATE products SET current_stock = current_stock - 20 WHERE id = $1`,
      [products.rows[1].id]
    );
    await query(
      `UPDATE products SET current_stock = current_stock - 50 WHERE id = $1`,
      [products.rows[2].id]
    );

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedData()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };
