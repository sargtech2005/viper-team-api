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

-- ─── Credit Wallet ───────────────────────────────────────────────────────────

-- Add credit_balance column to users (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_balance INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(20)   NOT NULL CHECK (type IN ('topup','usage','bonus','refund')),
  amount        INTEGER       NOT NULL,                    -- positive = credit added, negative = deducted
  description   TEXT,
  paystack_ref  VARCHAR(100),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON credit_transactions(created_at);
