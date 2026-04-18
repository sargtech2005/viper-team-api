-- ─────────────────────────────────────────────────────────────────────────────
-- Viper-Team API — Seed Data
-- Run AFTER schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Plans (upsert so re-runs are safe)
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

-- NOTE: The admin user is auto-promoted on first login if their email matches
-- ADMIN_EMAIL in your .env file. No manual insert needed.
