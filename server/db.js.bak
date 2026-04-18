const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

const query = (text, params) => pool.query(text, params);

// ── Auto-migrate: create all tables on first run ──────────────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        name             VARCHAR(120) NOT NULL,
        email            VARCHAR(200) NOT NULL UNIQUE,
        password_hash    VARCHAR(255) NOT NULL,
        plan             VARCHAR(20)  NOT NULL DEFAULT 'free',
        api_key          VARCHAR(80)  NOT NULL UNIQUE,
        credits_remaining INT         NOT NULL DEFAULT 5,
        credits_used      INT         NOT NULL DEFAULT 0,
        credits_reset_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
        is_admin          BOOLEAN     NOT NULL DEFAULT false,
        is_active         BOOLEAN     NOT NULL DEFAULT true,
        email_verified    BOOLEAN     NOT NULL DEFAULT false,
        verify_token      VARCHAR(120),
        reset_token       VARCHAR(120),
        reset_expires     TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Subscriptions (plan purchases)
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id            SERIAL PRIMARY KEY,
        user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_name     VARCHAR(30)  NOT NULL,
        price_ngn     INT          NOT NULL,
        credits_limit INT          NOT NULL,
        paystack_ref  VARCHAR(100) UNIQUE,
        status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
        starts_at     TIMESTAMPTZ,
        expires_at    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // Credit top-up purchases (not subscription)
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_purchases (
        id           SERIAL PRIMARY KEY,
        user_id      INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credits      INT  NOT NULL,
        price_ngn    INT  NOT NULL,
        paystack_ref VARCHAR(100) UNIQUE,
        status       VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // API call logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id          BIGSERIAL PRIMARY KEY,
        user_id     INT REFERENCES users(id) ON DELETE SET NULL,
        category    VARCHAR(60),
        endpoint    VARCHAR(200),
        method      VARCHAR(10) DEFAULT 'GET',
        status_code SMALLINT    DEFAULT 200,
        latency_ms  INT,
        ip          VARCHAR(45),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // API categories (managed by admin)
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_categories (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(80)  NOT NULL,
        slug        VARCHAR(80)  NOT NULL UNIQUE,
        description TEXT,
        icon        VARCHAR(10)  DEFAULT '⚡',
        is_active   BOOLEAN      NOT NULL DEFAULT true,
        sort_order  INT          DEFAULT 0
      );
    `);

    // API endpoints (managed by admin)
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_endpoints (
        id           SERIAL PRIMARY KEY,
        category_id  INT NOT NULL REFERENCES api_categories(id) ON DELETE CASCADE,
        name         VARCHAR(120) NOT NULL,
        slug         VARCHAR(120) NOT NULL,
        description  TEXT,
        method       VARCHAR(10)  DEFAULT 'GET',
        proxy_url    TEXT,
        params_schema TEXT,
        is_active    BOOLEAN NOT NULL DEFAULT true,
        is_free      BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(category_id, slug)
      );
    `);

    // Site settings (key-value)
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key        VARCHAR(80) PRIMARY KEY,
        value      TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default site settings if missing
    await client.query(`
      INSERT INTO site_settings (key, value) VALUES
        ('site_name',       'Viper-Team API'),
        ('site_tagline',    'Powerful APIs for African Automation'),
        ('recaptcha_enabled', 'false'),
        ('maintenance_mode',  'false'),
        ('credit_pack_100',   '2000'),
        ('credit_pack_300',   '5500'),
        ('credit_pack_500',   '8500')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Seed default API categories if empty
    const { rows } = await client.query('SELECT COUNT(*) FROM api_categories');
    if (parseInt(rows[0].count) === 0) {
      await client.query(`
        INSERT INTO api_categories (name, slug, description, icon, sort_order) VALUES
          ('Downloads',           'downloads',    'Download media, APKs, files from anywhere', '📥', 1),
          ('Code Automation',     'code',         'Execute, format and analyse code snippets',  '💻', 2),
          ('Crypto & Blockchain', 'crypto',       'Real-time prices, wallets, blockchain data', '₿',  3),
          ('Geolocation & IP',    'geo',          'IP lookup, GPS geocoding, timezone data',    '🌍', 4),
          ('Hosting & Server',    'hosting',      'DNS, uptime monitoring, server fingerprints','🖥️', 5),
          ('WhatsApp & Messaging','messaging',    'WhatsApp bot helpers, SMS, notifications',   '💬', 6),
          ('Social Media',        'social',       'Scrape profiles, post, fetch engagement',    '📱', 7),
          ('File Conversion',     'convert',      'PDF, image, audio & format conversions',     '🔄', 8);
      `);
    }

    // Auto-promote admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await client.query(
        `UPDATE users SET is_admin = true WHERE email = $1`,
        [adminEmail]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Database ready');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, pool, initDB };
