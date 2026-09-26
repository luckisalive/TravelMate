const db = require('../config/db');

/**
 * In-App Notification Service
 * Handles notification creation, delivery, and automatic trip countdown checks.
 */
class NotificationService {
  /**
   * Create an in-app notification for a user
   * @param {Object} params
   * @param {number} params.userId - Target user ID
   * @param {string} params.type - 'booking' | 'settlement' | 'trip' | 'budget' | 'itinerary' | 'review'
   * @param {string} params.message - Human-readable alert text
   * @param {Date|string} [params.scheduledFor] - Optional future alert time
   */
  static async createNotification({ userId, type, message, scheduledFor = null }) {
    if (!userId || !type || !message) {
      return null;
    }

    try {
      const result = await db.query(
        `INSERT INTO notifications (user_id, type, message, scheduled_for, is_read, created_at)
         VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
         RETURNING *`,
        [userId, type, message, scheduledFor]
      );
      return result.rows[0];
    } catch (err) {
      console.error('[NotificationService] Failed to create notification:', err.message);
      return null;
    }
  }

  /**
   * Automatically detect upcoming trips starting within the next 3 days
   * and create a countdown notification once per trip per day if not already notified today.
   * @param {number} userId
   */
  static async checkUpcomingTripCountdowns(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

      // Find trips for this user starting between today and 3 days from now
      const tripsResult = await db.query(
        `SELECT t.id, t.name, t.start_date
         FROM trips t
         LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
         WHERE (t.created_by = $1 OR tm.user_id = $1)
           AND t.start_date >= $2
           AND t.start_date <= $3`,
        [userId, today, threeDaysLater]
      );

      for (const trip of tripsResult.rows) {
        const tripStartDateStr = typeof trip.start_date === 'string'
          ? trip.start_date.split('T')[0]
          : new Date(trip.start_date).toISOString().split('T')[0];

        const daysUntil = Math.max(0, Math.ceil((new Date(tripStartDateStr) - new Date(today)) / 86400000));
        const prefix = `[Trip #${trip.id}]`;

        // Check if we already alerted today for this trip
        const existingAlert = await db.query(
          `SELECT id FROM notifications 
           WHERE user_id = $1 
             AND type = 'trip' 
             AND message LIKE $2
             AND created_at >= CURRENT_DATE`,
          [userId, `${prefix}%`]
        );

        if (existingAlert.rows.length === 0) {
          const daysText = daysUntil === 0 ? 'starts today!' : daysUntil === 1 ? 'starts tomorrow!' : `starts in ${daysUntil} days!`;
          await this.createNotification({
            userId,
            type: 'trip',
            message: `${prefix} Upcoming Trip: "${trip.name}" ${daysText} Check your itinerary and bookings.`,
          });
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Error checking countdowns:', err.message);
    }
  }

  /**
   * Fetch unread notification count
   * @param {number} userId
   */
  static async getUnreadCount(userId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );
      return parseInt(result.rows[0].count, 10) || 0;
    } catch (err) {
      return 0;
    }
  }
}

module.exports = NotificationService;
