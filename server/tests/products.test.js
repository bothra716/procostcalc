const request = require('supertest');
const app = require('../index');
const { query } = require('../config/database');

describe('Products Endpoints', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create a test user and get token
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  beforeEach(async () => {
    // Clean up test products
    await query('DELETE FROM products WHERE user_id = $1', [userId]);
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product',
        unit: 'pcs',
        scrapValue: 5.00,
        openingStock: 100,
        sellingPrice: 25.00,
        targetMarginPercent: 20.0
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(productData.name);
      expect(response.body.data.product.currentStock).toBe(productData.openingStock);
    });

    it('should fail to create product without required fields', async () => {
      const productData = {
        name: 'Test Product'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create product without authentication', async () => {
      const productData = {
        name: 'Test Product',
        unit: 'pcs'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create test products
      await query(
        `INSERT INTO products (user_id, name, description, unit, scrap_value, opening_stock, current_stock, selling_price, target_margin_percent)
         VALUES 
           ($1, 'Product 1', 'Description 1', 'pcs', 5.00, 100, 100, 25.00, 20.0),
           ($1, 'Product 2', 'Description 2', 'kg', 2.00, 50, 50, 15.00, 25.0)`,
        [userId]
      );
    });

    it('should get all products for user', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.pagination.totalCount).toBe(2);
    });

    it('should search products by name', async () => {
      const response = await request(app)
        .get('/api/products?search=Product 1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].name).toBe('Product 1');
    });

    it('should paginate products', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/products/:id', () => {
    let productId;

    beforeEach(async () => {
      // Create a test product
      const result = await query(
        `INSERT INTO products (user_id, name, description, unit, scrap_value, opening_stock, current_stock, selling_price, target_margin_percent)
         VALUES ($1, 'Test Product', 'Test Description', 'pcs', 5.00, 100, 100, 25.00, 20.0)
         RETURNING id`,
        [userId]
      );
      productId = result.rows[0].id;

      // Add materials
      await query(
        `INSERT INTO product_materials (product_id, material_name, quantity, unit, unit_cost, total_cost)
         VALUES ($1, 'Steel', 2.5, 'kg', 3.00, 7.50)`,
        [productId]
      );

      // Add job work
      await query(
        `INSERT INTO product_job_work (product_id, description, cost)
         VALUES ($1, 'Machining', 5.00)`,
        [productId]
      );
    });

    it('should get product with full details', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe('Test Product');
      expect(response.body.data.materials).toHaveLength(1);
      expect(response.body.data.jobWork).toHaveLength(1);
      expect(response.body.data.costBreakdown.totalProductCost).toBe(12.50);
    });

    it('should fail to get non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products/:id/materials', () => {
    let productId;

    beforeEach(async () => {
      // Create a test product
      const result = await query(
        `INSERT INTO products (user_id, name, unit, opening_stock, current_stock)
         VALUES ($1, 'Test Product', 'pcs', 100, 100)
         RETURNING id`,
        [userId]
      );
      productId = result.rows[0].id;
    });

    it('should add material to product', async () => {
      const materialData = {
        materialName: 'Steel',
        quantity: 2.5,
        unit: 'kg',
        unitCost: 3.00
      };

      const response = await request(app)
        .post(`/api/products/${productId}/materials`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(materialData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.material.materialName).toBe(materialData.materialName);
      expect(response.body.data.material.totalCost).toBe(7.50);
    });

    it('should fail to add material to non-existent product', async () => {
      const materialData = {
        materialName: 'Steel',
        quantity: 2.5,
        unit: 'kg',
        unitCost: 3.00
      };

      const response = await request(app)
        .post('/api/products/99999/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send(materialData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId;

    beforeEach(async () => {
      // Create a test product
      const result = await query(
        `INSERT INTO products (user_id, name, unit, opening_stock, current_stock)
         VALUES ($1, 'Test Product', 'pcs', 100, 100)
         RETURNING id`,
        [userId]
      );
      productId = result.rows[0].id;
    });

    it('should delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail to delete non-existent product', async () => {
      const response = await request(app)
        .delete('/api/products/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
