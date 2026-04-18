// Redirects to the real DB module used by app.js
// Do NOT call initDB() from here — it uses the wrong schema.
module.exports = require('../src/config/db');
