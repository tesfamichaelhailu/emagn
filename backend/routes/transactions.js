const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorize, requireVerification } = require('../middleware/auth');
const { validateTransaction, validateId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Create new transaction (Buyer only)
router.post('/', authenticateToken, authorize('buyer'), requireVerification, validateTransaction, async (req, res) => {
  try {
    const { productId, quantity, shippingAddress, buyerNotes } = req.body;

    // Get product details
    const products = await query(
      'SELECT id, seller_id, title, price, quantity_available, shipping_cost, is_active FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = products[0];

    if (!product.is_active) {
      return res.status(400).json({ message: 'Product is no longer available' });
    }

    if (product.seller_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot buy your own product' });
    }

    if (product.quantity_available < quantity) {
      return res.status(400).json({ 
        message: `Only ${product.quantity_available} units available` 
      });
    }

    // Calculate amounts
    const unitPrice = product.price;
    const subtotal = unitPrice * quantity;
    const shippingCost = product.shipping_cost || 0;
    const platformFeePercentage = 2.5; // Get from system settings in production
    const platformFee = (subtotal * platformFeePercentage) / 100;
    const totalAmount = subtotal + shippingCost + platformFee;
    const escrowAmount = totalAmount; // Full amount held in escrow

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create transaction using database transaction for consistency
    const queries = [
      {
        sql: `INSERT INTO transactions (transaction_id, buyer_id, seller_id, product_id, quantity, 
                                      unit_price, total_amount, escrow_amount, platform_fee, 
                                      shipping_cost, shipping_address, buyer_notes, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        params: [
          transactionId, req.user.id, product.seller_id, productId, quantity,
          unitPrice, totalAmount, escrowAmount, platformFee, shippingCost,
          JSON.stringify(shippingAddress), buyerNotes
        ]
      },
      {
        sql: 'UPDATE products SET quantity_available = quantity_available - ? WHERE id = ?',
        params: [quantity, productId]
      }
    ];

    await transaction(queries);

    // Get created transaction
    const transactions = await query(
      `SELECT t.*, p.title as product_title, 
              seller.first_name as seller_first_name, seller.last_name as seller_last_name,
              buyer.first_name as buyer_first_name, buyer.last_name as buyer_last_name
       FROM transactions t
       LEFT JOIN products p ON t.product_id = p.id
       LEFT JOIN users seller ON t.seller_id = seller.id
       LEFT JOIN users buyer ON t.buyer_id = buyer.id
       WHERE t.transaction_id = ?`,
      [transactionId]
    );

    // Create notification for seller
    await query(
      `INSERT INTO notifications (user_id, title, message, type, action_url)
       VALUES (?, ?, ?, 'transaction', ?)`,
      [
        product.seller_id,
        'New Order Received',
        `You have received a new order for "${product.title}" from ${req.user.first_name} ${req.user.last_name}`,
        `/seller/transactions/${transactions[0].id}`
      ]
    );

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: transactions[0]
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Failed to create transaction' });
  }
});

// Get user's transactions
router.get('/my-transactions', authenticateToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status, type } = req.query; // type: 'buyer' or 'seller'

    let whereCondition = '';
    let queryParams = [];

    if (type === 'buyer') {
      whereCondition = 't.buyer_id = ?';
      queryParams.push(req.user.id);
    } else if (type === 'seller') {
      whereCondition = 't.seller_id = ?';
      queryParams.push(req.user.id);
    } else {
      whereCondition = '(t.buyer_id = ? OR t.seller_id = ?)';
      queryParams.push(req.user.id, req.user.id);
    }

    if (status) {
      whereCondition += ' AND t.status = ?';
      queryParams.push(status);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM transactions t WHERE ${whereCondition}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get transactions
    const transactions = await query(
      `SELECT t.*, p.title as product_title, p.images as product_images,
              seller.first_name as seller_first_name, seller.last_name as seller_last_name,
              buyer.first_name as buyer_first_name, buyer.last_name as buyer_last_name
       FROM transactions t
       LEFT JOIN products p ON t.product_id = p.id
       LEFT JOIN users seller ON t.seller_id = seller.id
       LEFT JOIN users buyer ON t.buyer_id = buyer.id
       WHERE ${whereCondition}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Failed to get transactions' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const transactionId = req.params.id;

    const transactions = await query(
      `SELECT t.*, p.title as product_title, p.description as product_description, p.images as product_images,
              seller.first_name as seller_first_name, seller.last_name as seller_last_name, 
              seller.phone as seller_phone, seller.email as seller_email,
              buyer.first_name as buyer_first_name, buyer.last_name as buyer_last_name,
              buyer.phone as buyer_phone, buyer.email as buyer_email
       FROM transactions t
       LEFT JOIN products p ON t.product_id = p.id
       LEFT JOIN users seller ON t.seller_id = seller.id
       LEFT JOIN users buyer ON t.buyer_id = buyer.id
       WHERE t.id = ?`,
      [transactionId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = transactions[0];

    // Check if user has access to this transaction
    if (transaction.buyer_id !== req.user.id && 
        transaction.seller_id !== req.user.id && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ transaction });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Failed to get transaction' });
  }
});

// Update transaction status (Buyer and Seller)
router.put('/:id/status', authenticateToken, validateId, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { status, notes } = req.body;

    // Get transaction
    const transactions = await query(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = transactions[0];

    // Check if user has permission to update this transaction
    if (transaction.buyer_id !== req.user.id && 
        transaction.seller_id !== req.user.id && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['paid', 'cancelled'],
      'paid': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'disputed'],
      'delivered': ['completed', 'disputed'],
      'completed': [],
      'cancelled': [],
      'disputed': ['resolved'],
      'refunded': []
    };

    if (!validTransitions[transaction.status]?.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${transaction.status} to ${status}` 
      });
    }

    // Role-based status updates
    if (req.user.role === 'buyer' && transaction.buyer_id === req.user.id) {
      if (!['paid', 'delivered', 'disputed'].includes(status)) {
        return res.status(403).json({ message: 'Buyers can only mark as paid, delivered, or disputed' });
      }
    }

    if (req.user.role === 'seller' && transaction.seller_id === req.user.id) {
      if (!['shipped'].includes(status)) {
        return res.status(403).json({ message: 'Sellers can only mark as shipped' });
      }
    }

    // Update transaction
    const updateFields = ['status = ?'];
    const updateValues = [status];

    if (notes) {
      if (req.user.id === transaction.buyer_id) {
        updateFields.push('buyer_notes = ?');
        updateValues.push(notes);
      } else if (req.user.id === transaction.seller_id) {
        updateFields.push('seller_notes = ?');
        updateValues.push(notes);
      }
    }

    if (status === 'shipped' && req.user.id === transaction.seller_id) {
      updateFields.push('estimated_delivery_date = DATE_ADD(NOW(), INTERVAL 7 DAY)');
    }

    if (status === 'delivered') {
      updateFields.push('actual_delivery_date = NOW()');
    }

    updateValues.push(transactionId);

    await query(
      `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Create notifications
    const otherUserId = req.user.id === transaction.buyer_id ? transaction.seller_id : transaction.buyer_id;
    const statusMessages = {
      'paid': 'Payment received for your order',
      'shipped': 'Your order has been shipped',
      'delivered': 'Your order has been delivered',
      'completed': 'Transaction completed successfully',
      'cancelled': 'Transaction has been cancelled',
      'disputed': 'A dispute has been opened for this transaction'
    };

    if (statusMessages[status]) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, action_url)
         VALUES (?, ?, ?, 'transaction', ?)`,
        [
          otherUserId,
          'Transaction Update',
          statusMessages[status],
          `/transactions/${transactionId}`
        ]
      );
    }

    // Get updated transaction
    const updatedTransactions = await query(
      `SELECT t.*, p.title as product_title,
              seller.first_name as seller_first_name, seller.last_name as seller_last_name,
              buyer.first_name as buyer_first_name, buyer.last_name as buyer_last_name
       FROM transactions t
       LEFT JOIN products p ON t.product_id = p.id
       LEFT JOIN users seller ON t.seller_id = seller.id
       LEFT JOIN users buyer ON t.buyer_id = buyer.id
       WHERE t.id = ?`,
      [transactionId]
    );

    res.json({
      message: 'Transaction status updated successfully',
      transaction: updatedTransactions[0]
    });

  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ message: 'Failed to update transaction status' });
  }
});

// Add tracking number (Seller only)
router.put('/:id/tracking', authenticateToken, authorize('seller'), validateId, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { trackingNumber } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({ message: 'Tracking number is required' });
    }

    // Get transaction
    const transactions = await query(
      'SELECT * FROM transactions WHERE id = ? AND seller_id = ?',
      [transactionId, req.user.id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found or access denied' });
    }

    const transaction = transactions[0];

    if (transaction.status !== 'paid') {
      return res.status(400).json({ message: 'Can only add tracking for paid transactions' });
    }

    // Update tracking number and status
    await query(
      'UPDATE transactions SET tracking_number = ?, status = "shipped" WHERE id = ?',
      [trackingNumber, transactionId]
    );

    // Notify buyer
    await query(
      `INSERT INTO notifications (user_id, title, message, type, action_url)
       VALUES (?, ?, ?, 'transaction', ?)`,
      [
        transaction.buyer_id,
        'Order Shipped',
        `Your order has been shipped. Tracking number: ${trackingNumber}`,
        `/transactions/${transactionId}`
      ]
    );

    res.json({ message: 'Tracking number added successfully' });

  } catch (error) {
    console.error('Add tracking number error:', error);
    res.status(500).json({ message: 'Failed to add tracking number' });
  }
});

// Get all transactions (Admin and Super Admin only)
router.get('/', authenticateToken, authorize('admin', 'super_admin'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status, buyerId, sellerId, dateFrom, dateTo } = req.query;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('t.status = ?');
      queryParams.push(status);
    }

    if (buyerId) {
      whereConditions.push('t.buyer_id = ?');
      queryParams.push(buyerId);
    }

    if (sellerId) {
      whereConditions.push('t.seller_id = ?');
      queryParams.push(sellerId);
    }

    if (dateFrom) {
      whereConditions.push('DATE(t.created_at) >= ?');
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('DATE(t.created_at) <= ?');
      queryParams.push(dateTo);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get transactions
    const transactions = await query(
      `SELECT t.*, p.title as product_title,
              seller.first_name as seller_first_name, seller.last_name as seller_last_name,
              buyer.first_name as buyer_first_name, buyer.last_name as buyer_last_name
       FROM transactions t
       LEFT JOIN products p ON t.product_id = p.id
       LEFT JOIN users seller ON t.seller_id = seller.id
       LEFT JOIN users buyer ON t.buyer_id = buyer.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ message: 'Failed to get transactions' });
  }
});

// Get transaction statistics (Admin and Super Admin only)
router.get('/stats/overview', authenticateToken, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_transactions,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_transactions,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_transactions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
        COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_transactions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_transactions,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_fee END), 0) as total_platform_fees,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) as average_transaction_value
      FROM transactions
    `);

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ message: 'Failed to get transaction statistics' });
  }
});

module.exports = router;