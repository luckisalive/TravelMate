const db = require('../config/db');
const NotificationService = require('../services/notificationService');

/**
 * GET /api/notifications - List user's notifications and unread count
 */
async function getMyNotifications(req, res, next) {
  try {
    const userId = req.user.id;

    // Check countdown notifications for upcoming trips
    await NotificationService.checkUpcomingTripCountdowns(userId);

    const result = await db.query(
      `SELECT id, type, message, is_read, scheduled_for, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const unreadCount = await NotificationService.getUnreadCount(userId);

    return res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        message: row.message,
        is_read: row.is_read,
        scheduled_for: row.scheduled_for,
        created_at: row.created_at,
      })),
      unread_count: unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read - Mark single notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid notification ID format.' },
      });
    }

    const result = await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification not found or unauthorized.' },
      });
    }

    const unreadCount = await NotificationService.getUnreadCount(req.user.id);

    return res.json({
      success: true,
      data: result.rows[0],
      unread_count: unreadCount,
      message: 'Notification marked as read.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/read-all - Mark all user's notifications as read
 */
async function markAllAsRead(req, res, next) {
  try {
    await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    return res.json({
      success: true,
      unread_count: 0,
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notifications/:id - Delete a notification
 */
async function deleteNotification(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid notification ID format.' },
      });
    }

    const result = await db.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification not found or unauthorized.' },
      });
    }

    const unreadCount = await NotificationService.getUnreadCount(req.user.id);

    return res.json({
      success: true,
      data: { id: notificationId },
      unread_count: unreadCount,
      message: 'Notification deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
