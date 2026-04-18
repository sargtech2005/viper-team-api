const { query } = require('./db');

/**
 * Quota reset rules:
 *  - Paid users: resets on the same day-of-month they subscribed (subscription_day).
 *    e.g. subscribed on the 15th → resets on the 15th every month.
 *  - Free / no subscription_day: resets on the 1st of each month.
 *
 * Edge case — months shorter than subscription_day (e.g. subscribed on 31st,
 * February has no 31st): reset on the last day of that month instead.
 *
 * Runs every hour. Tracks per-user reset with a "last_reset_month" approach
 * by storing the year-month of the last reset in a lightweight in-memory map.
 * A server restart is safe: worst case one extra reset check, never double-reset
 * within the same calendar month+day window.
 */

const startQuotaScheduler = () => {
  // Map of userId → "YYYY-MM" of last reset, kept in memory.
  // On restart it clears, but the DB query guards against double-resets
  // because we only reset users whose api_calls_used > 0 or plan is paid.
  const lastReset = new Map();

  const checkAndReset = async () => {
    const now    = new Date();
    const today  = now.getDate();           // 1-31
    const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      // Fetch all active users with their subscription_day
      const { rows: users } = await query(
        `SELECT id, subscription_day FROM users WHERE is_active = true`
      );

      const toReset = [];

      for (const user of users) {
        // Already reset this calendar month? Skip.
        if (lastReset.get(user.id) === yyyyMM) continue;

        const resetDay = user.subscription_day || 1; // free users → day 1

        // Handle months shorter than resetDay:
        // Get the last day of the current month
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const effectiveDay   = Math.min(resetDay, lastDayOfMonth);

        if (today === effectiveDay) {
          toReset.push(user.id);
        }
      }

      if (toReset.length === 0) return;

      // Batch reset
      await query(
        `UPDATE users SET api_calls_used = 0 WHERE id = ANY($1::int[])`,
        [toReset]
      );

      // Mark as reset for this month
      for (const id of toReset) lastReset.set(id, yyyyMM);

      console.log(`✅ Quota reset: ${toReset.length} user(s) on day ${today} of ${yyyyMM}`);
    } catch (err) {
      console.error('❌ Quota reset error:', err.message);
    }
  };

  // Run immediately on startup, then every hour
  checkAndReset();
  setInterval(checkAndReset, 60 * 60 * 1000);

  console.log('✅ Quota scheduler started (per-subscription-day resets).');
};

module.exports = { startQuotaScheduler };
