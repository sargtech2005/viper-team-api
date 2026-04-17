# 🐍 Viper-Team API

> Premium REST API platform for bots, apps, and automations
> Live at: **https://viper-api.name.ng**

---

## 📁 Project Structure
```
viper-team-api/
├── app.js                        ← Express entry point
├── Dockerfile                    ← Fly.io container
├── fly.toml                      ← Fly.io config
├── .env.example                  ← Copy to .env and fill in
├── .github/workflows/deploy.yml  ← Auto CI/CD on git push
├── database/
│   ├── schema.sql                ← Run this first
│   └── seed.sql                  ← Run this second
└── src/
    ├── config/      (db, mailer, recaptcha)
    ├── controllers/ (auth, apiKey, payment)
    ├── middleware/  (auth JWT, adminOnly, apiKeyCheck)
    ├── models/      (User, Plan, ApiKey, Payment)
    ├── routes/
    │   ├── web/     (auth, dashboard, pricing, docs, admin)
    │   └── api/     (utility, fun, search, info, media)
    ├── views/       (EJS templates)
    └── public/      (CSS, JS, images)
```

---

## ⚙️ Subdomain Routes

| Subdomain | Maps to |
|---|---|
| `viper-api.name.ng` | Main site / landing |
| `dashboard.viper-api.name.ng` | User dashboard |
| `test.viper-api.name.ng` | API Playground |
| `docs.viper-api.name.ng` | API Documentation |

> Set these up as CNAME records in your go54.com DNS pointing to your Fly.io app URL.

---

## 🚀 FULL DEPLOY GUIDE (Termux + GitHub + Fly.io)

### STEP 1 — Install tools in Termux

```bash
# Update packages
pkg update && pkg upgrade -y

# Install git, Node.js, and required tools
pkg install git nodejs-lts -y

# Install Fly.io CLI
curl -L https://fly.io/install.sh | sh

# Add fly to PATH (paste this into your terminal)
export FLYCTL_INSTALL="/root/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Make it permanent
echo 'export FLYCTL_INSTALL="/root/.fly"' >> ~/.bashrc
echo 'export PATH="$FLYCTL_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Confirm fly is installed
fly version
```

---

### STEP 2 — Set up GitHub (authenticate from Termux)

```bash
# Install GitHub CLI
pkg install gh -y

# Log in to GitHub (opens browser)
gh auth login
# Choose: GitHub.com → HTTPS → Login with web browser
# Copy the code shown, press Enter, browser opens, paste code

# Confirm login
gh auth status
```

---

### STEP 3 — Create GitHub Repo and Push Code

```bash
# Navigate to project (wherever you extracted the ZIP)
cd viper-team-api

# Initialize git
git init
git add .
git commit -m "🐍 Initial Viper-Team API commit"

# Create GitHub repo and push
gh repo create viper-team-api --public --source=. --remote=origin --push

# Verify it uploaded
gh repo view --web
```

---

### STEP 4 — Set up Fly.io (Free hosting 24/7)

```bash
# Log in to Fly.io
fly auth login
# Opens browser — sign up at fly.io if you haven't

# Launch your app (run from inside project folder)
fly launch
# When asked:
#   App name: viper-team-api
#   Region: Pick closest (ams = Amsterdam, jnb = Johannesburg)
#   Would you like to set up a Postgresql database? → YES
#   Postgres name: viper-db
#   Plan: Development (free)
#   Would you like to set up Upstash Redis? → No

# This creates your app AND database automatically
# It will print your DATABASE_URL — COPY IT
```

---

### STEP 5 — Set all environment variables on Fly.io

```bash
# Set them one by one (replace with real values)
fly secrets set NODE_ENV=production
fly secrets set APP_URL=https://viper-api.name.ng
fly secrets set JWT_SECRET=your_very_long_random_secret_here_min_32_chars
fly secrets set COOKIE_SECRET=another_different_random_secret_here

# Gmail SMTP (use App Password, not real password)
# Go to: myaccount.google.com → Security → App Passwords → Create
fly secrets set SMTP_HOST=smtp.gmail.com
fly secrets set SMTP_PORT=587
fly secrets set SMTP_USER=yourmail@gmail.com
fly secrets set SMTP_PASS=your_16_char_gmail_app_password
fly secrets set SMTP_FROM="Viper-Team API <yourmail@gmail.com>"

# Paystack (get from dashboard.paystack.com → Settings → API)
fly secrets set PAYSTACK_PUBLIC_KEY=pk_live_xxxx
fly secrets set PAYSTACK_SECRET_KEY=sk_live_xxxx

# Google reCAPTCHA (get from google.com/recaptcha/admin)
fly secrets set RECAPTCHA_SITE_KEY=your_site_key
fly secrets set RECAPTCHA_SECRET_KEY=your_secret_key

# Your admin email (auto-promoted to admin on login)
fly secrets set ADMIN_EMAIL=confidencerich97@gmail.com

# Confirm all secrets are set
fly secrets list
```

---

### STEP 6 — Run the Database Schema

```bash
# Connect to your Fly Postgres database
fly postgres connect -a viper-db

# Once inside the psql prompt, paste and run schema.sql contents:
# (Copy everything from database/schema.sql and paste it)
\i /path/to/schema.sql

# OR paste it manually. Then run the seed:
# (Copy everything from database/seed.sql and paste it)

# Exit psql
\q
```

**Alternative — run schema from file:**
```bash
# Get the DATABASE_URL first
fly secrets list | grep DATABASE_URL

# Run schema directly
cat database/schema.sql | fly postgres connect -a viper-db
cat database/seed.sql   | fly postgres connect -a viper-db
```

---

### STEP 7 — Deploy the App

```bash
# Deploy manually for the first time
fly deploy

# Watch logs to confirm it's running
fly logs

# Open your live site
fly open
```

---

### STEP 8 — Set up GitHub Actions (auto-deploy on push)

```bash
# Get your Fly API token
fly auth token

# Copy the token, then add it to GitHub secrets:
gh secret set FLY_API_TOKEN
# Paste the token and press Enter

# Now every time you push to main, it auto-deploys!
git push origin main
```

---

### STEP 9 — Set up Subdomains in go54.com DNS

Log into go54.com → Manage Domain → DNS Records

Add these CNAME records:

| Type | Name | Value |
|---|---|---|
| CNAME | `dashboard` | `viper-team-api.fly.dev` |
| CNAME | `test` | `viper-team-api.fly.dev` |
| CNAME | `docs` | `viper-team-api.fly.dev` |
| CNAME | `www` | `viper-team-api.fly.dev` |

Then add your custom domain to Fly.io:
```bash
fly certs add viper-api.name.ng
fly certs add dashboard.viper-api.name.ng
fly certs add test.viper-api.name.ng
fly certs add docs.viper-api.name.ng
fly certs add www.viper-api.name.ng

# Check cert status (may take a few minutes)
fly certs list
```

---

### STEP 10 — First Login as Admin

1. Go to `https://viper-api.name.ng/register`
2. Register with the email `confidencerich97@gmail.com`
3. You are **automatically promoted to admin**
4. Visit `https://viper-api.name.ng/admin`

---

## 🔁 Daily Workflow (making changes)

```bash
# Make code changes in your editor
# Then commit and push
git add .
git commit -m "feat: describe your change"
git push origin main
# → GitHub Actions auto-deploys to Fly.io in ~2 minutes
```

---

## 🔑 API Usage

```bash
# Get your API key from dashboard
# Use in any language:

curl https://viper-api.name.ng/api/v1/utility/uuid \
  -H "Authorization: Bearer YOUR_API_KEY"

# Or via query param:
curl "https://viper-api.name.ng/api/v1/fun/joke?apikey=YOUR_API_KEY"
```

---

## 🌐 Available API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/v1/me` | Your plan info |
| POST | `/api/v1/utility/qr` | QR code generator |
| POST | `/api/v1/utility/base64/encode` | Base64 encode |
| POST | `/api/v1/utility/base64/decode` | Base64 decode |
| GET  | `/api/v1/utility/uuid` | UUID generator |
| POST | `/api/v1/utility/password` | Password generator |
| POST | `/api/v1/utility/slugify` | URL slug maker |
| POST | `/api/v1/utility/text/analyze` | Text stats |
| GET  | `/api/v1/utility/ip` | IP lookup |
| GET  | `/api/v1/fun/joke` | Random joke |
| GET  | `/api/v1/fun/quote` | Random quote |
| GET  | `/api/v1/fun/fact` | Random fact |
| GET  | `/api/v1/search/wikipedia` | Wikipedia summary |
| GET  | `/api/v1/info/country` | Country info |
| GET  | `/api/v1/info/currency` | Currency rates |
| GET  | `/api/v1/media/placeholder` | Placeholder image |
| GET  | `/api/v1/media/avatar` | Avatar generator |

---

## 🛠️ Tech Stack
- **Runtime:** Node.js 20 + Express
- **Database:** PostgreSQL (Fly.io managed)
- **Templates:** EJS + express-ejs-layouts
- **Auth:** JWT (cookie-based)
- **Payments:** Paystack inline (no webhook)
- **Email:** Nodemailer + Gmail SMTP
- **Deploy:** Docker → Fly.io
- **CI/CD:** GitHub Actions

---

## 📞 Support
Email: support@viper-api.name.ng
Admin panel: https://viper-api.name.ng/admin
