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

// ─── Auto Migration ───────────────────────────────────────────────────────────
// Runs on startup — creates all tables if they don't exist. Safe to run many times.
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

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_value    ON api_keys(key_value);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_user     ON api_logs(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_ref      ON payments(paystack_ref);`);

    // Trigger
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

    // Seed default plans if table is empty
    const { rows } = await client.query('SELECT COUNT(*) FROM plans');
    if (parseInt(rows[0].count) === 0) {
      await client.query(`
        INSERT INTO plans (name, price_ngn, api_limit, rate_per_min, features) VALUES
          ('Free',    0,      500,    5,   '["500 API calls/month","5 req/min","All endpoints","Community support"]'),
          ('Starter', 1500,   5000,   20,  '["5,000 API calls/month","20 req/min","All endpoints","Email support"]'),
          ('Pro',     4000,   25000,  60,  '["25,000 API calls/month","60 req/min","All endpoints","Priority support","Analytics"]'),
          ('Ultra',   9000,   100000, 200, '["100,000 API calls/month","200 req/min","All endpoints","24/7 support","Analytics","Custom limits"]')
        ON CONFLICT (name) DO NOTHING;
      `);
      console.log('✅ Default plans seeded');
    }

    console.log('✅ Auto-migration complete');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    client.release();
  }
};

// Connect and migrate on startup
pool.connect()
  .then(async (client) => {
    console.log('✅ PostgreSQL connected');
    client.release();
    await autoMigrate();
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('Set DATABASE_URL in your environment variables.');
  });

module.exports = { query, getClient, pool };
