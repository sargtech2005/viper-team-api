require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');
const { icon } = require('./src/config/icons');

const app = express();

// ── Track DB readiness ────────────────────────────────────────────────────────
let dbReady = false;

app.use(helmet({ contentSecurityPolicy: false }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src/public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ── Global locals ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user        = null;
  res.locals.APP_NAME    = 'ViperAPI';
  res.locals.APP_URL     = process.env.APP_URL || 'https://viper-api.name.ng';
  res.locals.currentPath = req.path;
  res.locals.icon        = icon;
  next();
});

// ── Subdomain routing ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const host = req.hostname || '';
  if (host.startsWith('dashboard.') && !req.path.startsWith('/dashboard')) {
    req.url = req.url === '/' ? '/dashboard' : `/dashboard${req.url}`;
  } else if (host.startsWith('test.') && req.url === '/') {
    req.url = '/playground';
  } else if (host.startsWith('docs.') && req.url === '/') {
    req.url = '/docs';
  }
  next();
});

// ── DB readiness gate — show friendly error instead of crashing ───────────────
app.use((req, res, next) => {
  // Always allow static files and health checks through
  if (req.path === '/health' || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/img')) {
    return next();
  }
  if (!dbReady) {
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ success: false, error: 'Service starting up, please retry in a moment.' });
    }
    return res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head><title>ViperAPI — Starting...</title>
        <style>
          body { font-family: sans-serif; background: #0a0a12; color: #e2e8f0; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
          .box { text-align:center; }
          h1 { color: #10b981; } p { color: #94a3b8; }
        </style>
        <meta http-equiv="refresh" content="4">
        </head>
        <body><div class="box"><h1>🐍 ViperAPI</h1><p>Starting up, connecting to database...</p><p>This page will refresh automatically.</p></div></body>
      </html>
    `);
  }
  next();
});

// ── Health check (always responds, even before DB is ready) ───────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', db: dbReady }));

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes      = require('./src/routes/web/auth');
const dashboardRoutes = require('./src/routes/web/dashboard');
const pricingRoutes   = require('./src/routes/web/pricing');
const docsRoutes      = require('./src/routes/web/docs');
const adminRoutes     = require('./src/routes/web/admin');
const apiRouter       = require('./src/routes/api/index');

app.use('/',           authRoutes);
app.use('/dashboard',  dashboardRoutes);
app.use('/pricing',    pricingRoutes);
app.use('/docs',       docsRoutes);
app.use('/playground', docsRoutes);
app.use('/admin',      adminRoutes);
app.use('/api/v1',     apiRouter);

const { optionalAuth } = require('./src/middleware/auth');
app.get('/', optionalAuth, (req, res) => {
  res.render('index', { title: 'ViperAPI — Premium REST APIs for Every App & Bot' });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found.' });
  }
  res.status(404).render('error', { title: '404 — Not Found', code: 404, message: 'The page you are looking for does not exist.' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
  res.status(500).render('error', { title: '500 — Error', code: 500, message: 'Something went wrong. Please try again.' });
});

// ── START: bind port FIRST, connect DB after ──────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ViperAPI running → http://0.0.0.0:${PORT}`);

  // Connect to DB in background AFTER port is open
  const { connectWithRetry, startQuotaScheduler } = require('./src/config/db');
  connectWithRetry()
    .then(() => {
      dbReady = true;
      console.log('✅ DB ready — app fully operational');
      startQuotaScheduler();
    })
    .catch(err => {
      console.error('❌ DB connection ultimately failed:', err.message);
      // App keeps running — DB calls will just error individually
    });
});
