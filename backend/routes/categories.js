const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorize, optionalAuth } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Get all categories (public)
router.get('/', optionalAuth, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { parentId, includeInactive } = req.query;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];

    if (!includeInactive || includeInactive !== 'true') {
      whereConditions.push('is_active = TRUE');
    }

    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === '') {
        whereConditions.push('parent_id IS NULL');
      } else {
        whereConditions.push('parent_id = ?');
        queryParams.push(parentId);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM categories ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get categories
    const categories = await query(
      `SELECT c.*, 
              parent.name as parent_name,
              (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = TRUE) as product_count
       FROM categories c
       LEFT JOIN categories parent ON c.parent_id = parent.id
       ${whereClause}
       ORDER BY c.name ASC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to get categories' });
  }
});

// Get category by ID (public)
router.get('/:id', optionalAuth, validateId, async (req, res) => {
  try {
    const categoryId = req.params.id;

    const categories = await query(
      `SELECT c.*, 
              parent.name as parent_name,
              (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = TRUE) as product_count
       FROM categories c
       LEFT JOIN categories parent ON c.parent_id = parent.id
       WHERE c.id = ?`,
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const category = categories[0];

    // Get subcategories
    const subcategories = await query(
      `SELECT id, name, description, image_url, 
              (SELECT COUNT(*) FROM products WHERE category_id = id AND is_active = TRUE) as product_count
       FROM categories 
       WHERE parent_id = ? AND is_active = TRUE
       ORDER BY name ASC`,
      [categoryId]
    );

    // Get featured products in this category
    const featuredProducts = await query(
      `SELECT p.id, p.title, p.price, p.images, p.is_featured,
              u.first_name as seller_first_name, u.last_name as seller_last_name
       FROM products p
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.category_id = ? AND p.is_active = TRUE AND p.is_featured = TRUE
       ORDER BY p.created_at DESC
       LIMIT 6`,
      [categoryId]
    );

    res.json({
      category,
      subcategories,
      featuredProducts
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Failed to get category' });
  }
});

// Create new category (Admin and Super Admin only)
router.post('/', authenticateToken, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, description, parentId, imageUrl } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if parent category exists
    if (parentId) {
      const parentCategories = await query(
        'SELECT id FROM categories WHERE id = ? AND is_active = TRUE',
        [parentId]
      );
      if (parentCategories.length === 0) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }

    // Check if category name already exists at the same level
    const existingCategories = await query(
      'SELECT id FROM categories WHERE name = ? AND parent_id = ?',
      [name.trim(), parentId || null]
    );
    if (existingCategories.length > 0) {
      return res.status(409).json({ message: 'Category with this name already exists at this level' });
    }

    // Create category
    const result = await query(
      `INSERT INTO categories (name, description, parent_id, image_url)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), description || null, parentId || null, imageUrl || null]
    );

    const categoryId = result.insertId;

    // Get created category
    const categories = await query(
      `SELECT c.*, parent.name as parent_name
       FROM categories c
       LEFT JOIN categories parent ON c.parent_id = parent.id
       WHERE c.id = ?`,
      [categoryId]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: categories[0]
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

// Update category (Admin and Super Admin only)
router.put('/:id', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description, parentId, imageUrl, isActive } = req.body;

    // Check if category exists
    const existingCategories = await query('SELECT id FROM categories WHERE id = ?', [categoryId]);
    if (existingCategories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if parent category exists
    if (parentId) {
      const parentCategories = await query(
        'SELECT id FROM categories WHERE id = ? AND is_active = TRUE',
        [parentId]
      );
      if (parentCategories.length === 0) {
        return res.status(400).json({ message: 'Parent category not found' });
      }

      // Prevent setting parent to self or creating circular references
      if (parentId == categoryId) {
        return res.status(400).json({ message: 'Category cannot be its own parent' });
      }
    }

    // Check if category name already exists at the same level
    if (name) {
      const duplicateCategories = await query(
        'SELECT id FROM categories WHERE name = ? AND parent_id = ? AND id != ?',
        [name.trim(), parentId || null, categoryId]
      );
      if (duplicateCategories.length > 0) {
        return res.status(409).json({ message: 'Category with this name already exists at this level' });
      }
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (parentId !== undefined) {
      updates.push('parent_id = ?');
      values.push(parentId);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      values.push(imageUrl);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(categoryId);

    await query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);

    // Get updated category
    const categories = await query(
      `SELECT c.*, parent.name as parent_name
       FROM categories c
       LEFT JOIN categories parent ON c.parent_id = parent.id
       WHERE c.id = ?`,
      [categoryId]
    );

    res.json({
      message: 'Category updated successfully',
      category: categories[0]
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

// Delete category (Admin and Super Admin only)
router.delete('/:id', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category exists
    const existingCategories = await query('SELECT id FROM categories WHERE id = ?', [categoryId]);
    if (existingCategories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has products
    const products = await query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = TRUE',
      [categoryId]
    );
    if (products[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with active products. Deactivate instead.' 
      });
    }

    // Check if category has subcategories
    const subcategories = await query(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND is_active = TRUE',
      [categoryId]
    );
    if (subcategories[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with active subcategories' 
      });
    }

    // Soft delete by setting is_active to false
    await query('UPDATE categories SET is_active = FALSE WHERE id = ?', [categoryId]);

    res.json({ message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

// Get category tree (public)
router.get('/tree/structure', optionalAuth, async (req, res) => {
  try {
    // Get all active categories
    const categories = await query(
      `SELECT id, name, description, parent_id, image_url,
              (SELECT COUNT(*) FROM products WHERE category_id = id AND is_active = TRUE) as product_count
       FROM categories 
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories = [];

    // Create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Build tree structure
    categories.forEach(category => {
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        rootCategories.push(categoryMap.get(category.id));
      }
    });

    res.json({ categoryTree: rootCategories });

  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({ message: 'Failed to get category tree' });
  }
});

// Get category statistics (Admin and Super Admin only)
router.get('/:id/stats', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category exists
    const existingCategories = await query('SELECT id FROM categories WHERE id = ?', [categoryId]);
    if (existingCategories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get category statistics
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = TRUE) as active_products,
        (SELECT COUNT(*) FROM products WHERE category_id = ?) as total_products,
        (SELECT COUNT(*) FROM transactions t 
         LEFT JOIN products p ON t.product_id = p.id 
         WHERE p.category_id = ? AND t.status = 'completed') as completed_transactions,
        (SELECT COALESCE(SUM(t.total_amount), 0) FROM transactions t 
         LEFT JOIN products p ON t.product_id = p.id 
         WHERE p.category_id = ? AND t.status = 'completed') as total_revenue,
        (SELECT COUNT(*) FROM categories WHERE parent_id = ? AND is_active = TRUE) as subcategories_count
    `, [categoryId, categoryId, categoryId, categoryId, categoryId]);

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ message: 'Failed to get category statistics' });
  }
});

module.exports = router;