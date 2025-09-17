const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Get dashboard statistics (Admin and Super Admin only)
router.get('/dashboard', authenticateToken, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    // Get comprehensive dashboard statistics
    const [
      userStats,
      productStats,
      transactionStats,
      disputeStats,
      recentTransactions,
      recentDisputes,
      topSellers
    ] = await Promise.all([
      // User statistics
      query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'buyer' THEN 1 END) as total_buyers,
          COUNT(CASE WHEN role = 'seller' THEN 1 END) as total_sellers,
          COUNT(CASE WHEN is_verified = TRUE THEN 1 END) as verified_users,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_users_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_users_week
        FROM users
      `),

      // Product statistics
      query(`
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_products,
          COUNT(CASE WHEN is_featured = TRUE THEN 1 END) as featured_products,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_products_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_products_week
        FROM products
      `),

      // Transaction statistics
      query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
          COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_transactions,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_fee END), 0) as total_platform_fees,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) as avg_transaction_value,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as transactions_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as transactions_week
        FROM transactions
      `),

      // Dispute statistics
      query(`
        SELECT 
          COUNT(*) as total_disputes,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_disputes,
          COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_disputes,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_disputes,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as disputes_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as disputes_week
        FROM disputes
      `),

      // Recent transactions
      query(`
        SELECT t.id, t.transaction_id, t.total_amount, t.status, t.created_at,
               p.title as product_title,
               buyer.first_name as buyer_first_name, buyer.last_name as buyer_last_name,
               seller.first_name as seller_first_name, seller.last_name as seller_last_name
        FROM transactions t
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN users buyer ON t.buyer_id = buyer.id
        LEFT JOIN users seller ON t.seller_id = seller.id
        ORDER BY t.created_at DESC
        LIMIT 10
      `),

      // Recent disputes
      query(`
        SELECT d.id, d.dispute_id, d.title, d.status, d.created_at,
               t.transaction_id,
               initiator.first_name as initiator_first_name, initiator.last_name as initiator_last_name
        FROM disputes d
        LEFT JOIN transactions t ON d.transaction_id = t.id
        LEFT JOIN users initiator ON d.initiator_id = initiator.id
        ORDER BY d.created_at DESC
        LIMIT 10
      `),

      // Top sellers
      query(`
        SELECT u.id, u.first_name, u.last_name, u.email,
               COUNT(t.id) as total_sales,
               COALESCE(SUM(t.total_amount), 0) as total_revenue
        FROM users u
        LEFT JOIN transactions t ON u.id = t.seller_id AND t.status = 'completed'
        WHERE u.role = 'seller' AND u.is_active = TRUE
        GROUP BY u.id
        ORDER BY total_revenue DESC
        LIMIT 10
      `)
    ]);

    res.json({
      userStats: userStats[0],
      productStats: productStats[0],
      transactionStats: transactionStats[0],
      disputeStats: disputeStats[0],
      recentTransactions,
      recentDisputes,
      topSellers
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to get dashboard statistics' });
  }
});

// Get system settings (Super Admin only)
router.get('/settings', authenticateToken, authorize('super_admin'), async (req, res) => {
  try {
    const settings = await query('SELECT * FROM system_settings ORDER BY setting_key');
    
    // Group settings by category
    const groupedSettings = {
      platform: {},
      fees: {},
      limits: {},
      features: {},
      notifications: {}
    };

    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Parse value based on type
      switch (setting.setting_type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = value;
          }
          break;
        default:
          value = value;
      }

      // Categorize settings
      if (setting.setting_key.includes('platform')) {
        groupedSettings.platform[setting.setting_key] = { ...setting, setting_value: value };
      } else if (setting.setting_key.includes('fee') || setting.setting_key.includes('cost')) {
        groupedSettings.fees[setting.setting_key] = { ...setting, setting_value: value };
      } else if (setting.setting_key.includes('limit') || setting.setting_key.includes('min') || setting.setting_key.includes('max')) {
        groupedSettings.limits[setting.setting_key] = { ...setting, setting_value: value };
      } else if (setting.setting_key.includes('email') || setting.setting_key.includes('notification')) {
        groupedSettings.notifications[setting.setting_key] = { ...setting, setting_value: value };
      } else {
        groupedSettings.features[setting.setting_key] = { ...setting, setting_value: value };
      }
    });

    res.json({ settings: groupedSettings });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to get system settings' });
  }
});

// Update system settings (Super Admin only)
router.put('/settings', authenticateToken, authorize('super_admin'), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ message: 'Invalid settings format' });
    }

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(settings)) {
      // Validate setting exists
      const existingSettings = await query(
        'SELECT setting_type FROM system_settings WHERE setting_key = ?',
        [key]
      );

      if (existingSettings.length === 0) {
        return res.status(400).json({ message: `Invalid setting key: ${key}` });
      }

      const settingType = existingSettings[0].setting_type;
      let processedValue = value;

      // Validate and process value based on type
      switch (settingType) {
        case 'number':
          if (typeof value !== 'number' && isNaN(parseFloat(value))) {
            return res.status(400).json({ message: `Invalid number value for ${key}` });
          }
          processedValue = value.toString();
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            return res.status(400).json({ message: `Invalid boolean value for ${key}` });
          }
          processedValue = value.toString();
          break;
        case 'json':
          try {
            processedValue = JSON.stringify(value);
          } catch (e) {
            return res.status(400).json({ message: `Invalid JSON value for ${key}` });
          }
          break;
        default:
          if (typeof value !== 'string') {
            return res.status(400).json({ message: `Invalid string value for ${key}` });
          }
          processedValue = value;
      }

      updates.push('setting_value = ?');
      values.push(processedValue);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No settings to update' });
    }

    // Update all settings
    for (const [key, value] of Object.entries(settings)) {
      await query(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
        [value, key]
      );
    }

    res.json({ message: 'Settings updated successfully' });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// Get audit logs (Super Admin only)
router.get('/audit-logs', authenticateToken, authorize('super_admin'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { action, resourceType, userId, dateFrom, dateTo } = req.query;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];

    if (action) {
      whereConditions.push('action = ?');
      queryParams.push(action);
    }

    if (resourceType) {
      whereConditions.push('resource_type = ?');
      queryParams.push(resourceType);
    }

    if (userId) {
      whereConditions.push('user_id = ?');
      queryParams.push(userId);
    }

    if (dateFrom) {
      whereConditions.push('DATE(created_at) >= ?');
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('DATE(created_at) <= ?');
      queryParams.push(dateTo);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get audit logs
    const logs = await query(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Failed to get audit logs' });
  }
});

// Get user management data (Admin and Super Admin only)
router.get('/users', authenticateToken, authorize('admin', 'super_admin'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { role, isActive, isVerified, search } = req.query;

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

    if (isVerified !== undefined) {
      whereConditions.push('is_verified = ?');
      queryParams.push(isVerified === 'true');
    }

    if (search) {
      whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get users with additional statistics
    const users = await query(
      `SELECT u.*,
              (SELECT COUNT(*) FROM products WHERE seller_id = u.id) as products_count,
              (SELECT COUNT(*) FROM transactions WHERE buyer_id = u.id) as purchases_count,
              (SELECT COUNT(*) FROM transactions WHERE seller_id = u.id) as sales_count,
              (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE seller_id = u.id AND status = 'completed') as total_earned
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
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
    console.error('Get admin users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Promote user to admin (Super Admin only)
router.put('/users/:id/promote', authenticateToken, authorize('super_admin'), validateId, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!['admin', 'seller', 'buyer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role for promotion' });
    }

    // Check if user exists
    const users = await query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Prevent demoting super admin
    if (user.role === 'super_admin') {
      return res.status(400).json({ message: 'Cannot modify super admin role' });
    }

    // Update user role
    await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

    // Log the action
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'promote_user',
        'user',
        userId,
        JSON.stringify({ role }),
        req.ip
      ]
    );

    // Notify the user
    await query(
      `INSERT INTO notifications (user_id, title, message, type, action_url)
       VALUES (?, ?, ?, 'system', ?)`,
      [
        userId,
        'Role Updated',
        `Your role has been updated to ${role}`,
        '/dashboard'
      ]
    );

    res.json({ message: 'User role updated successfully' });

  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Get platform analytics (Super Admin only)
router.get('/analytics', authenticateToken, authorize('super_admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query; // days

    const analytics = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as daily_transactions,
        COALESCE(SUM(total_amount), 0) as daily_revenue,
        COALESCE(SUM(platform_fee), 0) as daily_fees
      FROM transactions 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [period]);

    const userGrowth = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as daily_registrations
      FROM users 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [period]);

    const categoryStats = await query(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as product_count,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.total_amount), 0) as category_revenue
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN transactions t ON p.id = t.product_id AND t.status = 'completed'
      GROUP BY c.id, c.name
      ORDER BY category_revenue DESC
    `);

    res.json({
      transactionAnalytics: analytics,
      userGrowth,
      categoryStats
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Failed to get analytics' });
  }
});

module.exports = router;