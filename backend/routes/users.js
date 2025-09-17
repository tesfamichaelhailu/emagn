const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorize, optionalAuth } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Get all users (Admin and Super Admin only)
router.get('/', authenticateToken, authorize('admin', 'super_admin'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { role, isActive, search } = req.query;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];

    if (role) {
      whereConditions.push('role = ?');
      queryParams.push(role);
    }

    if (isActive !== undefined) {
      whereConditions.push('is_active = ?');
      queryParams.push(isActive === 'true');
    }

    if (search) {
      whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereClause}`, queryParams);
    const total = countResult[0].total;

    // Get users
    const users = await query(
      `SELECT id, email, first_name, last_name, role, phone, city, state, country, 
              is_verified, is_active, created_at, updated_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:id', optionalAuth, validateId, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if requesting own profile or admin access
    const isOwnProfile = req.user && req.user.id === parseInt(userId);
    const isAdmin = req.user && ['admin', 'super_admin'].includes(req.user.role);

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await query(
      `SELECT id, email, first_name, last_name, role, phone, address, city, state, 
              country, postal_code, profile_image, is_verified, is_active, created_at, updated_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Hide sensitive information for non-admin users
    if (!isAdmin) {
      delete user.address;
      delete user.phone;
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

// Update user (Admin and Super Admin only)
router.put('/:id', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, role, phone, address, city, state, country, postalCode, isActive, isVerified } = req.body;

    // Check if user exists
    const existingUsers = await query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (role !== undefined) {
      // Only super admin can change roles
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only super admin can change user roles' });
      }
      updates.push('role = ?');
      values.push(role);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country);
    }
    if (postalCode !== undefined) {
      updates.push('postal_code = ?');
      values.push(postalCode);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive);
    }
    if (isVerified !== undefined) {
      updates.push('is_verified = ?');
      values.push(isVerified);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(userId);

    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Get updated user
    const users = await query(
      `SELECT id, email, first_name, last_name, role, phone, address, city, state, 
              country, postal_code, profile_image, is_verified, is_active, created_at, updated_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    res.json({
      message: 'User updated successfully',
      user: users[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Deactivate user (Admin and Super Admin only)
router.put('/:id/deactivate', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const existingUsers = await query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = existingUsers[0];

    // Prevent deactivating super admin
    if (user.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot deactivate super admin' });
    }

    // Prevent regular admin from deactivating other admins
    if (req.user.role === 'admin' && user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot deactivate other admin users' });
    }

    await query('UPDATE users SET is_active = FALSE WHERE id = ?', [userId]);

    res.json({ message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

// Activate user (Admin and Super Admin only)
router.put('/:id/activate', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const existingUsers = await query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await query('UPDATE users SET is_active = TRUE WHERE id = ?', [userId]);

    res.json({ message: 'User activated successfully' });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ message: 'Failed to activate user' });
  }
});

// Get user statistics (Admin and Super Admin only)
router.get('/:id/stats', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const existingUsers = await query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user statistics
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM products WHERE seller_id = ?) as products_listed,
        (SELECT COUNT(*) FROM transactions WHERE buyer_id = ?) as purchases_made,
        (SELECT COUNT(*) FROM transactions WHERE seller_id = ?) as sales_made,
        (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE buyer_id = ? AND status = 'completed') as total_spent,
        (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE seller_id = ? AND status = 'completed') as total_earned,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = ?) as reviews_received,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE reviewee_id = ?) as average_rating
    `, [userId, userId, userId, userId, userId, userId, userId]);

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Failed to get user statistics' });
  }
});

// Get user notifications
router.get('/:id/notifications', authenticateToken, validateId, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if requesting own notifications or admin access
    if (req.user.id !== parseInt(userId) && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get notifications
    const notifications = await query(
      `SELECT id, title, message, type, is_read, action_url, metadata, created_at 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [userId]);
    const total = countResult[0].total;

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.put('/:id/notifications/:notificationId/read', authenticateToken, validateId, async (req, res) => {
  try {
    const userId = req.params.id;
    const notificationId = req.params.notificationId;

    // Check if requesting own notifications or admin access
    if (req.user.id !== parseInt(userId) && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    res.json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

module.exports = router;