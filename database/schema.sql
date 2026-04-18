-- Viper-Team API — Full PostgreSQL Schema
-- Run this first before seed.sql

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

CREATE TABLE IF NOT EXISTS api_keys (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_value   TEXT          NOT NULL UNIQUE,
  label       VARCHAR(80)   NOT NULL DEFAULT 'My API Key',
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id       INTEGER       REFERENCES plans(id) ON DELETE SET NULL,
  paystack_ref  VARCHAR(100)  NOT NULL UNIQUE,
  amount_ngn    INTEGER       NOT NULL,
  type          VARCHAR(10)   NOT NULL DEFAULT 'plan' CHECK (type IN ('plan','credits')),
  status        VARCHAR(10)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_api_keys_value    ON api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_api_logs_user     ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created  ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_ref      ON payments(paystack_ref);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Credit Wallet ────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'plan';

CREATE TABLE IF NOT EXISTS credit_transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(20)   NOT NULL CHECK (type IN ('topup','usage','bonus','refund')),
  amount        INTEGER       NOT NULL,
  description   TEXT,
  paystack_ref  VARCHAR(100),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user    ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON credit_transactions(created_at);

-- ─── Credit Packs (admin-editable) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_packs (
  id          SERIAL PRIMARY KEY,
  pack_id     VARCHAR(30)  NOT NULL UNIQUE,
  label       VARCHAR(50)  NOT NULL,
  price_ngn   INTEGER      NOT NULL DEFAULT 500,
  base        INTEGER      NOT NULL DEFAULT 600,
  bonus       INTEGER      NOT NULL DEFAULT 0,
  bonus_pct   INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_packs_active ON credit_packs(is_active);

INSERT INTO credit_packs (pack_id, label, price_ngn, base, bonus, bonus_pct, sort_order) VALUES
  ('topup',  'Top-up',  500,   600,   0,     0,  1),
  ('bundle', 'Bundle',  2000,  3000,  450,   15, 2),
  ('stack',  'Stack',   7500,  15000, 3750,  25, 3),
  ('bulk',   'Bulk',    20000, 50000, 17500, 35, 4)
ON CONFLICT (pack_id) DO NOTHING;

-- ─── Platform Settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('APP_NAME',             'Viper-Team API'),
  ('MAINTENANCE_MODE',     'off'),
  ('SMTP_HOST',            'smtp.gmail.com'),
  ('SMTP_PORT',            '587'),
  ('SMTP_USER',            ''),
  ('SMTP_PASS',            ''),
  ('SMTP_FROM',            ''),
  ('RECAPTCHA_SITE_KEY',   ''),
  ('RECAPTCHA_SECRET_KEY', ''),
  ('SUBSCRIBER_BONUS_PCT', '20')
ON CONFLICT (key) DO NOTHING;
