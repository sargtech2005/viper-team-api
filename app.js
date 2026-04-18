require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');
const { icon } = require('./src/config/icons');
const { startQuotaScheduler } = require('./src/config/scheduler');

const app = express();

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

// ── /startup — run DB migrations on demand ────────────────────────────────────
app.get('/startup', async (req, res) => {
  try {
    const { pool, autoMigrate } = require('./src/config/db');
    // Test connection first
    const client = await pool.connect();
    client.release();
    await autoMigrate();
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ViperAPI — DB Setup</title>
        <style>
          body { font-family: sans-serif; background: #0a0a12; color: #e2e8f0; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
          .box { text-align:center; max-width: 500px; }
          h1 { color: #10b981; font-size: 2rem; }
          p { color: #94a3b8; margin: 12px 0; }
          a { display:inline-block; margin-top:24px; background: linear-gradient(135deg,#7c3aed,#10b981); color:#fff; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:700; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>✅ Database Ready</h1>
          <p>All tables created and seeded successfully.</p>
          <p>You can now register an account and start using ViperAPI.</p>
          <a href="/">Go to Homepage</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Startup error:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ViperAPI — Setup Error</title>
        <style>
          body { font-family: sans-serif; background: #0a0a12; color: #e2e8f0; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
          .box { text-align:center; max-width: 600px; }
          h1 { color: #ef4444; }
          pre { background:#12121e; padding:16px; border-radius:8px; text-align:left; color:#fca5a5; font-size:13px; overflow:auto; }
          a { display:inline-block; margin-top:24px; background:#7c3aed; color:#fff; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:700; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>❌ Setup Failed</h1>
          <p>Could not connect to the database. Check that DATABASE_URL is set correctly in your Fly.io secrets.</p>
          <pre>${err.message}</pre>
          <a href="/startup">Try Again</a>
        </div>
      </body>
      </html>
    `);
  }
});

// ── /health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── App routes ────────────────────────────────────────────────────────────────
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

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found.' });
  }
  res.status(404).render('error', { title: '404 — Not Found', code: 404, message: 'The page you are looking for does not exist.' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
  res.status(500).render('error', { title: '500 — Error', code: 500, message: 'Something went wrong. Please try again.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ViperAPI running → http://0.0.0.0:${PORT}`);
  startQuotaScheduler();
});
