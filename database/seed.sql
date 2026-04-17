-- ─────────────────────────────────────────────────────────────────────────────
-- Viper-Team API — Seed Data
-- Run AFTER schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Default Plans
INSERT INTO plans (name, price_ngn, api_limit, rate_per_min, features) VALUES
  ('Free',    0,     500,   5,   '["500 API calls/month","5 req/min","Basic endpoints","Community support"]'),
  ('Starter', 1500,  5000,  20,  '["5,000 API calls/month","20 req/min","All endpoints","Email support"]'),
  ('Pro',     4000,  25000, 60,  '["25,000 API calls/month","60 req/min","All endpoints","Priority support","Analytics"]'),
  ('Ultra',   9000,  100000,200, '["100,000 API calls/month","200 req/min","All endpoints","24/7 support","Analytics","Custom limits"]')
ON CONFLICT (name) DO NOTHING;

-- NOTE: The admin user is auto-promoted on first login if their email matches
-- ADMIN_EMAIL in your .env file. No manual insert needed.
-- But you can manually insert one here if preferred:
--
-- INSERT INTO users (username, email, password_hash, role, plan_id)
-- VALUES ('admin', 'confidencerich97@gmail.com', '<bcrypt_hash>', 'admin', 4)
-- ON CONFLICT (email) DO NOTHING;
