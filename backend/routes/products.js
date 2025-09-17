const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorize, optionalAuth } = require('../middleware/auth');
const { validateProduct, validateId, validatePagination, validateSearch } = require('../middleware/validation');

const router = express.Router();

// Get all products with search and filters
router.get('/', optionalAuth, validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { q, category, minPrice, maxPrice, condition, sellerId, featured } = req.query;

    // Build query conditions
    let whereConditions = ['p.is_active = TRUE'];
    let queryParams = [];

    if (q) {
      whereConditions.push('(p.title LIKE ? OR p.description LIKE ?)');
      const searchTerm = `%${q}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    if (category) {
      whereConditions.push('p.category_id = ?');
      queryParams.push(category);
    }

    if (minPrice) {
      whereConditions.push('p.price >= ?');
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      whereConditions.push('p.price <= ?');
      queryParams.push(maxPrice);
    }

    if (condition) {
      whereConditions.push('p.condition = ?');
      queryParams.push(condition);
    }

    if (sellerId) {
      whereConditions.push('p.seller_id = ?');
      queryParams.push(sellerId);
    }

    if (featured === 'true') {
      whereConditions.push('p.is_featured = TRUE');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get products with seller and category information
    const products = await query(
      `SELECT p.id, p.title, p.description, p.price, p.currency, p.quantity_available, 
              p.condition, p.images, p.specifications, p.shipping_cost, p.shipping_method, 
              p.estimated_delivery_days, p.is_featured, p.views_count, p.created_at, p.updated_at,
              u.id as seller_id, u.first_name as seller_first_name, u.last_name as seller_last_name,
              c.name as category_name, c.id as category_id
       FROM products p
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.is_featured DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to get products' });
  }
});

// Get product by ID
router.get('/:id', optionalAuth, validateId, async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product with seller and category information
    const products = await query(
      `SELECT p.*, u.id as seller_id, u.first_name as seller_first_name, u.last_name as seller_last_name,
              u.city as seller_city, u.state as seller_state, u.country as seller_country,
              c.name as category_name, c.id as category_id
       FROM products p
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.is_active = TRUE`,
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = products[0];

    // Increment view count
    await query('UPDATE products SET views_count = views_count + 1 WHERE id = ?', [productId]);

    res.json({ product });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to get product' });
  }
});

// Create new product (Seller only)
router.post('/', authenticateToken, authorize('seller'), validateProduct, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      categoryId,
      condition,
      quantityAvailable = 1,
      images = [],
      specifications = {},
      shippingCost = 0,
      shippingMethod = 'Standard Shipping',
      estimatedDeliveryDays = 7
    } = req.body;

    // Verify category exists
    const categories = await query('SELECT id FROM categories WHERE id = ? AND is_active = TRUE', [categoryId]);
    if (categories.length === 0) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Create product
    const result = await query(
      `INSERT INTO products (seller_id, category_id, title, description, price, quantity_available, 
                            condition, images, specifications, shipping_cost, shipping_method, 
                            estimated_delivery_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, categoryId, title, description, price, quantityAvailable,
        condition, JSON.stringify(images), JSON.stringify(specifications),
        shippingCost, shippingMethod, estimatedDeliveryDays
      ]
    );

    const productId = result.insertId;

    // Get created product
    const products = await query(
      `SELECT p.*, u.first_name as seller_first_name, u.last_name as seller_last_name,
              c.name as category_name
       FROM products p
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [productId]
    );

    res.status(201).json({
      message: 'Product created successfully',
      product: products[0]
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Update product (Seller only - own products)
router.put('/:id', authenticateToken, authorize('seller'), validateId, validateProduct, async (req, res) => {
  try {
    const productId = req.params.id;

    // Check if product exists and belongs to user
    const existingProducts = await query(
      'SELECT id, seller_id FROM products WHERE id = ?',
      [productId]
    );

    if (existingProducts.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = existingProducts[0];

    // Check ownership
    if (product.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied - not your product' });
    }

    const {
      title,
      description,
      price,
      categoryId,
      condition,
      quantityAvailable,
      images,
      specifications,
      shippingCost,
      shippingMethod,
      estimatedDeliveryDays
    } = req.body;

    // Verify category exists if provided
    if (categoryId) {
      const categories = await query('SELECT id FROM categories WHERE id = ? AND is_active = TRUE', [categoryId]);
      if (categories.length === 0) {
        return res.status(400).json({ message: 'Invalid category' });
      }
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(categoryId);
    }
    if (condition !== undefined) {
      updates.push('condition = ?');
      values.push(condition);
    }
    if (quantityAvailable !== undefined) {
      updates.push('quantity_available = ?');
      values.push(quantityAvailable);
    }
    if (images !== undefined) {
      updates.push('images = ?');
      values.push(JSON.stringify(images));
    }
    if (specifications !== undefined) {
      updates.push('specifications = ?');
      values.push(JSON.stringify(specifications));
    }
    if (shippingCost !== undefined) {
      updates.push('shipping_cost = ?');
      values.push(shippingCost);
    }
    if (shippingMethod !== undefined) {
      updates.push('shipping_method = ?');
      values.push(shippingMethod);
    }
    if (estimatedDeliveryDays !== undefined) {
      updates.push('estimated_delivery_days = ?');
      values.push(estimatedDeliveryDays);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(productId);

    await query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);

    // Get updated product
    const products = await query(
      `SELECT p.*, u.first_name as seller_first_name, u.last_name as seller_last_name,
              c.name as category_name
       FROM products p
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [productId]
    );

    res.json({
      message: 'Product updated successfully',
      product: products[0]
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Delete product (Seller only - own products)
router.delete('/:id', authenticateToken, authorize('seller'), validateId, async (req, res) => {
  try {
    const productId = req.params.id;

    // Check if product exists and belongs to user
    const existingProducts = await query(
      'SELECT id, seller_id FROM products WHERE id = ?',
      [productId]
    );

    if (existingProducts.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = existingProducts[0];

    // Check ownership
    if (product.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied - not your product' });
    }

    // Check if product has active transactions
    const transactions = await query(
      'SELECT id FROM transactions WHERE product_id = ? AND status IN ("pending", "paid", "shipped")',
      [productId]
    );

    if (transactions.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete product with active transactions. Deactivate instead.' 
      });
    }

    // Soft delete by setting is_active to false
    await query('UPDATE products SET is_active = FALSE WHERE id = ?', [productId]);

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Get seller's products
router.get('/seller/:sellerId', optionalAuth, validateId, validatePagination, async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { active } = req.query;

    // Check if seller exists
    const sellers = await query('SELECT id FROM users WHERE id = ? AND role = "seller"', [sellerId]);
    if (sellers.length === 0) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Build where condition
    let whereCondition = 'p.seller_id = ?';
    let queryParams = [sellerId];

    if (active !== undefined) {
      whereCondition += ' AND p.is_active = ?';
      queryParams.push(active === 'true');
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM products p WHERE ${whereCondition}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get products
    const products = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${whereCondition}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({ message: 'Failed to get seller products' });
  }
});

// Toggle product featured status (Admin and Super Admin only)
router.put('/:id/featured', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const productId = req.params.id;
    const { isFeatured } = req.body;

    // Check if product exists
    const existingProducts = await query('SELECT id FROM products WHERE id = ?', [productId]);
    if (existingProducts.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await query('UPDATE products SET is_featured = ? WHERE id = ?', [isFeatured, productId]);

    res.json({ 
      message: `Product ${isFeatured ? 'featured' : 'unfeatured'} successfully` 
    });

  } catch (error) {
    console.error('Toggle featured status error:', error);
    res.status(500).json({ message: 'Failed to update featured status' });
  }
});

// Get product statistics (Admin and Super Admin only)
router.get('/:id/stats', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const productId = req.params.id;

    // Check if product exists
    const existingProducts = await query('SELECT id FROM products WHERE id = ?', [productId]);
    if (existingProducts.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get product statistics
    const stats = await query(`
      SELECT 
        p.views_count,
        (SELECT COUNT(*) FROM transactions WHERE product_id = ?) as total_transactions,
        (SELECT COUNT(*) FROM transactions WHERE product_id = ? AND status = 'completed') as completed_transactions,
        (SELECT COALESCE(SUM(quantity), 0) FROM transactions WHERE product_id = ? AND status = 'completed') as units_sold,
        (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE product_id = ? AND status = 'completed') as total_revenue
      FROM products p
      WHERE p.id = ?
    `, [productId, productId, productId, productId, productId]);

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({ message: 'Failed to get product statistics' });
  }
});

module.exports = router;