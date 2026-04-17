const { query } = require('./db');

/**
 * Resets api_calls_used for all users on the 1st of each month.
 * Runs a check every 6 hours — lightweight, no extra dependencies.
 */
const startQuotaScheduler = () => {
  let lastResetMonth = null;

  const checkAndReset = async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${now.getMonth()}`;

    // Only reset once per calendar month
    if (lastResetMonth === month) return;

    // Only run on the 1st day of the month
    if (now.getDate() !== 1) return;

    try {
      const result = await query(`
        UPDATE users
        SET api_calls_used = 0
        WHERE api_calls_used > 0
        RETURNING id
      `);
      lastResetMonth = month;
      console.log(`✅ Monthly quota reset: ${result.rowCount} users reset.`);
    } catch (err) {
      console.error('❌ Quota reset error:', err.message);
    }
  };

  // Check immediately on startup
  checkAndReset();

  // Check every 6 hours
  setInterval(checkAndReset, 6 * 60 * 60 * 1000);

  console.log('✅ Monthly quota scheduler started.');
};

module.exports = { startQuotaScheduler };
