const { query } = require('../config/database');
const { logger } = require('../utils/logger');

const createTables = async () => {
  try {
    logger.info('Starting database migration...');

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        language VARCHAR(10) DEFAULT 'en',
        currency VARCHAR(3) DEFAULT 'USD',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        phone_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Business profiles table with country-aware fields
    await query(`
      CREATE TABLE IF NOT EXISTS business_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        business_name VARCHAR(255) NOT NULL,
        country VARCHAR(2) NOT NULL, -- ISO country code
        state VARCHAR(10), -- Only for India, contains state code
        address_line TEXT,
        city VARCHAR(100),
        pincode VARCHAR(20),
        tax_id VARCHAR(50), -- GSTIN, EIN, VAT, etc.
        verification_status VARCHAR(20) DEFAULT 'Individual' CHECK (verification_status IN ('Individual', 'Pending', 'Verified', 'Rejected')),
        business_type VARCHAR(50), -- 'Individual', 'Partnership', 'Company', etc.
        industry VARCHAR(100),
        logo_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        unit VARCHAR(50) NOT NULL,
        scrap_value DECIMAL(10,2) DEFAULT 0,
        opening_stock DECIMAL(10,2) DEFAULT 0,
        current_stock DECIMAL(10,2) DEFAULT 0,
        selling_price DECIMAL(10,2),
        target_margin_percent DECIMAL(5,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product materials table
    await query(`
      CREATE TABLE IF NOT EXISTS product_materials (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        material_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product job work table
    await query(`
      CREATE TABLE IF NOT EXISTS product_job_work (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product additional costs table
    await query(`
      CREATE TABLE IF NOT EXISTS product_additional_costs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        cost_type VARCHAR(100) NOT NULL, -- 'Transport', 'Packing', 'Other'
        description TEXT,
        cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Overheads table
    await query(`
      CREATE TABLE IF NOT EXISTS overheads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL CHECK (category IN ('Fixed', 'Variable', 'Recurring', 'One-time')),
        subcategory VARCHAR(100),
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        expense_date DATE NOT NULL,
        receipt_url VARCHAR(500),
        is_recurring BOOLEAN DEFAULT false,
        recurring_frequency VARCHAR(20), -- 'Monthly', 'Quarterly', 'Yearly'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stock movements table
    await query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
        quantity DECIMAL(10,3) NOT NULL,
        reference VARCHAR(100), -- Invoice number, adjustment reason, etc.
        notes TEXT,
        movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      )
    `);

    // Sales table
    await query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        sale_date DATE NOT NULL,
        customer_name VARCHAR(255),
        invoice_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Document verification table
    await query(`
      CREATE TABLE IF NOT EXISTS document_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL, -- 'PAN', 'GST', 'EIN', etc.
        document_number VARCHAR(100) NOT NULL,
        document_url VARCHAR(500) NOT NULL,
        ocr_data JSONB, -- PostgreSQL JSONB for structured data
        verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
        verification_notes TEXT,
        verified_by INTEGER REFERENCES users(id),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, document_type)
      )
    `);

    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_overheads_user_id ON overheads(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)`);

    // Create updated_at trigger function for PostgreSQL
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add triggers for updated_at (PostgreSQL syntax)
    const tables = ['users', 'business_profiles', 'products', 'product_materials', 'product_job_work', 'product_additional_costs', 'overheads', 'sales'];
    
    for (const table of tables) {
      await query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  createTables()
    .then(() => {
      logger.info('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables };