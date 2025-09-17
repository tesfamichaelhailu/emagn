const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateDispute, validateId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Create new dispute
router.post('/', authenticateToken, authorize('buyer', 'seller'), validateDispute, async (req, res) => {
  try {
    const { transactionId, disputeType, title, description, evidence = [] } = req.body;

    // Get transaction details
    const transactions = await query(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = transactions[0];

    // Check if user is part of this transaction
    if (transaction.buyer_id !== req.user.id && transaction.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied - not part of this transaction' });
    }

    // Check if transaction is in a state that allows disputes
    if (!['shipped', 'delivered'].includes(transaction.status)) {
      return res.status(400).json({ 
        message: 'Disputes can only be opened for shipped or delivered transactions' 
      });
    }

    // Check if dispute already exists for this transaction
    const existingDisputes = await query(
      'SELECT id FROM disputes WHERE transaction_id = ? AND status IN ("open", "under_review")',
      [transactionId]
    );

    if (existingDisputes.length > 0) {
      return res.status(400).json({ message: 'An active dispute already exists for this transaction' });
    }

    // Generate dispute ID
    const disputeId = `DSP-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create dispute
    const result = await query(
      `INSERT INTO disputes (dispute_id, transaction_id, initiator_id, dispute_type, title, 
                            description, evidence, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
      [disputeId, transactionId, req.user.id, disputeType, title, description, JSON.stringify(evidence)]
    );

    const disputeId_db = result.insertId;

    // Update transaction status to disputed
    await query(
      'UPDATE transactions SET status = "disputed" WHERE id = ?',
      [transactionId]
    );

    // Get created dispute
    const disputes = await query(
      `SELECT d.*, t.transaction_id, t.total_amount,
              initiator.first_name as initiator_first_name, initiator.last_name as initiator_last_name,
              p.title as product_title
       FROM disputes d
       LEFT JOIN transactions t ON d.transaction_id = t.id
       LEFT JOIN users initiator ON d.initiator_id = initiator.id
       LEFT JOIN products p ON t.product_id = p.id
       WHERE d.id = ?`,
      [disputeId_db]
    );

    // Create notifications
    const otherUserId = req.user.id === transaction.buyer_id ? transaction.seller_id : transaction.buyer_id;
    
    // Notify the other party
    await query(
      `INSERT INTO notifications (user_id, title, message, type, action_url)
       VALUES (?, ?, ?, 'dispute', ?)`,
      [
        otherUserId,
        'Dispute Opened',
        `A dispute has been opened for transaction ${transaction.transaction_id}`,
        `/disputes/${disputeId_db}`
      ]
    );

    // Notify all admins
    const admins = await query(
      'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = TRUE'
    );

    for (const admin of admins) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, action_url)
         VALUES (?, ?, ?, 'dispute', ?)`,
        [
          admin.id,
          'New Dispute Requires Review',
          `A new dispute has been opened for transaction ${transaction.transaction_id}`,
          `/admin/disputes/${disputeId_db}`
        ]
      );
    }

    res.status(201).json({
      message: 'Dispute created successfully',
      dispute: disputes[0]
    });

  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({ message: 'Failed to create dispute' });
  }
});

// Get user's disputes
router.get('/my-disputes', authenticateToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status } = req.query;

    let whereCondition = 't.buyer_id = ? OR t.seller_id = ?';
    let queryParams = [req.user.id, req.user.id];

    if (status) {
      whereCondition += ' AND d.status = ?';
      queryParams.push(status);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM disputes d
       LEFT JOIN transactions t ON d.transaction_id = t.id
       WHERE ${whereCondition}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get disputes
    const disputes = await query(
      `SELECT d.*, t.transaction_id, t.total_amount, t.status as transaction_status,
              initiator.first_name as initiator_first_name, initiator.last_name as initiator_last_name,
              p.title as product_title, p.images as product_images
       FROM disputes d
       LEFT JOIN transactions t ON d.transaction_id = t.id
       LEFT JOIN users initiator ON d.initiator_id = initiator.id
       LEFT JOIN products p ON t.product_id = p.id
       WHERE ${whereCondition}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      disputes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({ message: 'Failed to get disputes' });
  }
});

// Get dispute by ID
router.get('/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const disputeId = req.params.id;

    const disputes = await query(
      `SELECT d.*, t.transaction_id, t.total_amount, t.status as transaction_status,
              t.shipping_address, t.buyer_notes, t.seller_notes, t.tracking_number,
              initiator.first_name as initiator_first_name, initiator.last_name as initiator_last_name,
              initiator.email as initiator_email,
              assigned_admin.first_name as assigned_admin_first_name, 
              assigned_admin.last_name as assigned_admin_last_name,
              p.title as product_title, p.description as product_description, p.images as product_images,
              buyer.first_name as buyer_first_name, buyer.last_name as buyer_last_name,
              seller.first_name as seller_first_name, seller.last_name as seller_last_name
       FROM disputes d
       LEFT JOIN transactions t ON d.transaction_id = t.id
       LEFT JOIN users initiator ON d.initiator_id = initiator.id
       LEFT JOIN users assigned_admin ON d.assigned_admin_id = assigned_admin.id
       LEFT JOIN products p ON t.product_id = p.id
       LEFT JOIN users buyer ON t.buyer_id = buyer.id
       LEFT JOIN users seller ON t.seller_id = seller.id
       WHERE d.id = ?`,
      [disputeId]
    );

    if (disputes.length === 0) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    const dispute = disputes[0];

    // Check if user has access to this dispute
    const hasAccess = 
      dispute.initiator_id === req.user.id ||
      dispute.buyer_id === req.user.id ||
      dispute.seller_id === req.user.id ||
      ['admin', 'super_admin'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get dispute messages
    const messages = await query(
      `SELECT dm.*, u.first_name, u.last_name, u.role
       FROM dispute_messages dm
       LEFT JOIN users u ON dm.sender_id = u.id
       WHERE dm.dispute_id = ?
       ORDER BY dm.created_at ASC`,
      [disputeId]
    );

    res.json({ 
      dispute,
      messages
    });

  } catch (error) {
    console.error('Get dispute error:', error);
    res.status(500).json({ message: 'Failed to get dispute' });
  }
});

// Add message to dispute
router.post('/:id/messages', authenticateToken, validateId, async (req, res) => {
  try {
    const disputeId = req.params.id;
    const { message, attachments = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Get dispute details
    const disputes = await query(
      `SELECT d.*, t.buyer_id, t.seller_id
       FROM disputes d
       LEFT JOIN transactions t ON d.transaction_id = t.id
       WHERE d.id = ?`,
      [disputeId]
    );

    if (disputes.length === 0) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    const dispute = disputes[0];

    // Check if user has access to this dispute
    const hasAccess = 
      dispute.initiator_id === req.user.id ||
      dispute.buyer_id === req.user.id ||
      dispute.seller_id === req.user.id ||
      ['admin', 'super_admin'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if dispute is still open
    if (!['open', 'under_review'].includes(dispute.status)) {
      return res.status(400).json({ message: 'Cannot add messages to closed disputes' });
    }

    // Add message
    const result = await query(
      `INSERT INTO dispute_messages (dispute_id, sender_id, message, attachments, is_admin_message)
       VALUES (?, ?, ?, ?, ?)`,
      [
        disputeId, 
        req.user.id, 
        message, 
        JSON.stringify(attachments),
        ['admin', 'super_admin'].includes(req.user.role)
      ]
    );

    // Get created message
    const messages = await query(
      `SELECT dm.*, u.first_name, u.last_name, u.role
       FROM dispute_messages dm
       LEFT JOIN users u ON dm.sender_id = u.id
       WHERE dm.id = ?`,
      [result.insertId]
    );

    // Notify other parties
    const otherUserIds = [dispute.buyer_id, dispute.seller_id].filter(id => id !== req.user.id);
    
    for (const userId of otherUserIds) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, action_url)
         VALUES (?, ?, ?, 'dispute', ?)`,
        [
          userId,
          'New Dispute Message',
          `A new message has been added to dispute ${dispute.dispute_id}`,
          `/disputes/${disputeId}`
        ]
      );
    }

    res.status(201).json({
      message: 'Message added successfully',
      messageData: messages[0]
    });

  } catch (error) {
    console.error('Add dispute message error:', error);
    res.status(500).json({ message: 'Failed to add message' });
  }
});

// Get all disputes (Admin and Super Admin only)
router.get('/', authenticateToken, authorize('admin', 'super_admin'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status, assignedAdminId, disputeType } = req.query;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('d.status = ?');
      queryParams.push(status);
    }

    if (assignedAdminId) {
      whereConditions.push('d.assigned_admin_id = ?');
      queryParams.push(assignedAdminId);
    }

    if (disputeType) {
      whereConditions.push('d.dispute_type = ?');
      queryParams.push(disputeType);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM disputes d ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get disputes
    const disputes = await query(
      `SELECT d.*, t.transaction_id, t.total_amount,
              initiator.first_name as initiator_first_name, initiator.last_name as initiator_last_name,
              assigned_admin.first_name as assigned_admin_first_name, 
              assigned_admin.last_name as assigned_admin_last_name,
              p.title as product_title
       FROM disputes d
       LEFT JOIN transactions t ON d.transaction_id = t.id
       LEFT JOIN users initiator ON d.initiator_id = initiator.id
       LEFT JOIN users assigned_admin ON d.assigned_admin_id = assigned_admin.id
       LEFT JOIN products p ON t.product_id = p.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      disputes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all disputes error:', error);
    res.status(500).json({ message: 'Failed to get disputes' });
  }
});

// Assign dispute to admin
router.put('/:id/assign', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const disputeId = req.params.id;
    const { assignedAdminId } = req.body;

    // Check if dispute exists
    const disputes = await query('SELECT id, status FROM disputes WHERE id = ?', [disputeId]);
    if (disputes.length === 0) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    const dispute = disputes[0];

    if (dispute.status !== 'open') {
      return res.status(400).json({ message: 'Can only assign open disputes' });
    }

    // Verify assigned admin exists and is active
    if (assignedAdminId) {
      const admins = await query(
        'SELECT id FROM users WHERE id = ? AND role IN ("admin", "super_admin") AND is_active = TRUE',
        [assignedAdminId]
      );
      if (admins.length === 0) {
        return res.status(400).json({ message: 'Invalid admin user' });
      }
    }

    // Update dispute
    await query(
      'UPDATE disputes SET assigned_admin_id = ?, status = "under_review" WHERE id = ?',
      [assignedAdminId, disputeId]
    );

    // Notify assigned admin
    if (assignedAdminId) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, action_url)
         VALUES (?, ?, ?, 'dispute', ?)`,
        [
          assignedAdminId,
          'Dispute Assigned',
          `You have been assigned to review dispute ${disputeId}`,
          `/admin/disputes/${disputeId}`
        ]
      );
    }

    res.json({ message: 'Dispute assigned successfully' });

  } catch (error) {
    console.error('Assign dispute error:', error);
    res.status(500).json({ message: 'Failed to assign dispute' });
  }
});

// Resolve dispute (Admin and Super Admin only)
router.put('/:id/resolve', authenticateToken, authorize('admin', 'super_admin'), validateId, async (req, res) => {
  try {
    const disputeId = req.params.id;
    const { resolution, refundAmount = 0, refundToBuyer = true } = req.body;

    if (!resolution || resolution.trim().length === 0) {
      return res.status(400).json({ message: 'Resolution description is required' });
    }

    // Get dispute and transaction details
    const disputes = await query(
      `SELECT d.*, t.*
       FROM disputes d
       LEFT JOIN transactions t ON d.transaction_id = t.id
       WHERE d.id = ?`,
      [disputeId]
    );

    if (disputes.length === 0) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    const dispute = disputes[0];
    const transaction = disputes[0];

    if (dispute.status === 'resolved') {
      return res.status(400).json({ message: 'Dispute is already resolved' });
    }

    // Update dispute
    await query(
      'UPDATE disputes SET resolution = ?, status = "resolved", resolution_date = NOW() WHERE id = ?',
      [resolution, disputeId]
    );

    // Handle refund if applicable
    if (refundAmount > 0) {
      // Update transaction status to refunded
      await query(
        'UPDATE transactions SET status = "refunded" WHERE id = ?',
        [transaction.id]
      );

      // TODO: Process actual refund through payment gateway
      console.log(`Refund of $${refundAmount} to ${refundToBuyer ? 'buyer' : 'seller'}`);
    } else {
      // Mark transaction as completed
      await query(
        'UPDATE transactions SET status = "completed" WHERE id = ?',
        [transaction.id]
      );
    }

    // Notify all parties
    const notifications = [
      {
        userId: transaction.buyer_id,
        title: 'Dispute Resolved',
        message: `Your dispute for transaction ${transaction.transaction_id} has been resolved`
      },
      {
        userId: transaction.seller_id,
        title: 'Dispute Resolved',
        message: `The dispute for transaction ${transaction.transaction_id} has been resolved`
      }
    ];

    for (const notification of notifications) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, action_url)
         VALUES (?, ?, ?, 'dispute', ?)`,
        [notification.userId, notification.title, notification.message, `/disputes/${disputeId}`]
      );
    }

    res.json({ message: 'Dispute resolved successfully' });

  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ message: 'Failed to resolve dispute' });
  }
});

// Get dispute statistics (Admin and Super Admin only)
router.get('/stats/overview', authenticateToken, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_disputes,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_disputes,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_disputes,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_disputes,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_disputes,
        COUNT(CASE WHEN dispute_type = 'product_not_received' THEN 1 END) as not_received_disputes,
        COUNT(CASE WHEN dispute_type = 'product_not_as_described' THEN 1 END) as not_as_described_disputes,
        COUNT(CASE WHEN dispute_type = 'damaged_product' THEN 1 END) as damaged_product_disputes,
        COUNT(CASE WHEN dispute_type = 'seller_not_responding' THEN 1 END) as seller_not_responding_disputes,
        AVG(CASE WHEN status = 'resolved' THEN TIMESTAMPDIFF(HOUR, created_at, resolution_date) END) as avg_resolution_time_hours
      FROM disputes
    `);

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Get dispute stats error:', error);
    res.status(500).json({ message: 'Failed to get dispute statistics' });
  }
});

module.exports = router;