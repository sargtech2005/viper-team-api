const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

const autoMigrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Running auto-migration...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR(50)  NOT NULL UNIQUE,
        price_ngn    INTEGER      NOT NULL DEFAULT 0,
        api_limit    INTEGER      NOT NULL DEFAULT 100,
        rate_per_min INTEGER      NOT NULL DEFAULT 10,
        features     JSONB        NOT NULL DEFAULT '[]',
        is_active    BOOLEAN      NOT NULL DEFAULT true,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        username         VARCHAR(30)   NOT NULL UNIQUE,
        email            VARCHAR(255)  NOT NULL UNIQUE,
        password_hash    TEXT          NOT NULL,
        role             VARCHAR(10)   NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
        plan_id          INTEGER       REFERENCES plans(id) ON DELETE SET NULL,
        api_calls_used   INTEGER       NOT NULL DEFAULT 0,
        subscription_day SMALLINT      DEFAULT NULL,
        is_active        BOOLEAN       NOT NULL DEFAULT true,
        reset_token      TEXT,
        reset_expires    TIMESTAMPTZ,
        created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_value   TEXT          NOT NULL UNIQUE,
        label       VARCHAR(80)   NOT NULL DEFAULT 'My API Key',
        is_active   BOOLEAN       NOT NULL DEFAULT true,
        last_used   TIMESTAMPTZ,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id       INTEGER       REFERENCES plans(id) ON DELETE SET NULL,
        paystack_ref  VARCHAR(100)  NOT NULL UNIQUE,
        amount_ngn    INTEGER       NOT NULL,
        status        VARCHAR(10)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
        verified_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id          BIGSERIAL PRIMARY KEY,
        user_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
        api_key_id  INTEGER     REFERENCES api_keys(id) ON DELETE SET NULL,
        endpoint    VARCHAR(200) NOT NULL,
        method      VARCHAR(10)  NOT NULL DEFAULT 'GET',
        status_code INTEGER      NOT NULL,
        duration_ms INTEGER,
        ip_address  INET,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // Primary settings table — used by src/config/settings.js (getSetting / setSetting)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key        VARCHAR(100) PRIMARY KEY,
        value      TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_value    ON api_keys(key_value);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_user     ON api_logs(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_ref      ON payments(paystack_ref);`);

    // Add subscription_day to existing tables (safe: ignored if column already exists)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='subscription_day'
        ) THEN
          ALTER TABLE users ADD COLUMN subscription_day SMALLINT DEFAULT NULL;
        END IF;
      END $$;
    `);

    // Add type column to payments — distinguishes plan subscriptions from credit top-ups
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='payments' AND column_name='type'
        ) THEN
          ALTER TABLE payments ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'plan'
            CHECK (type IN ('plan','credits'));
        END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='credit_balance'
        ) THEN
          ALTER TABLE users ADD COLUMN credit_balance INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;
    `);

    // Create credit_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type          VARCHAR(20)   NOT NULL CHECK (type IN ('topup','usage','bonus','refund')),
        amount        INTEGER       NOT NULL,
        description   TEXT,
        paystack_ref  VARCHAR(100),
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_credit_tx_user    ON credit_transactions(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON credit_transactions(created_at);`);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
          CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        END IF;
      END $$;
    `);

    // Upsert correct plans — DO UPDATE ensures existing rows are fixed on /startup
    await client.query(`
      INSERT INTO plans (name, price_ngn, api_limit, rate_per_min, features) VALUES
        ('Free',    0,      500,    10,  '["500 API calls/month","10 req/min","All endpoints","Community support","No watermark"]'),
        ('Hobby',   2000,   4000,   30,  '["4,000 API calls/month","30 req/min","All endpoints","Email support"]'),
        ('Starter', 7500,   25000,  120, '["25,000 API calls/month","120 req/min","All endpoints","Priority email support"]'),
        ('Pro',     20000,  100000, 400, '["100,000 API calls/month","400 req/min","All endpoints","24/7 priority support","Analytics"]')
      ON CONFLICT (name) DO UPDATE SET
        price_ngn    = EXCLUDED.price_ngn,
        api_limit    = EXCLUDED.api_limit,
        rate_per_min = EXCLUDED.rate_per_min,
        features     = EXCLUDED.features;
    `);

    // Remove old plan names no longer in use
    await client.query(`
      DELETE FROM plans WHERE name IN ('Basic', 'Business', 'Ultra') AND id NOT IN (SELECT DISTINCT plan_id FROM users WHERE plan_id IS NOT NULL);
    `);

    // Seed default settings — DO NOTHING so admin-set values are never overwritten
    await client.query(`
      INSERT INTO settings (key, value) VALUES
        ('APP_NAME',            'Viper-Team API'),
        ('MAINTENANCE_MODE',    'off'),
        ('SMTP_HOST',           $1),
        ('SMTP_PORT',           $2),
        ('SMTP_USER',           $3),
        ('SMTP_PASS',           $4),
        ('SMTP_FROM',           $5),
        ('RECAPTCHA_SITE_KEY',  $6),
        ('RECAPTCHA_SECRET_KEY',$7)
      ON CONFLICT (key) DO NOTHING;
    `, [
      process.env.SMTP_HOST           || '',
      process.env.SMTP_PORT           || '587',
      process.env.SMTP_USER           || '',
      process.env.SMTP_PASS           || '',
      process.env.SMTP_FROM           || '',
      process.env.RECAPTCHA_SITE_KEY  || '',
      process.env.RECAPTCHA_SECRET_KEY|| '',
    ]);

    console.log('✅ Auto-migration complete');
  } catch (err) {
    // Log but do NOT crash — tables likely already exist
    console.error('⚠️  Migration warning (non-fatal):', err.message);
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, pool, autoMigrate };
