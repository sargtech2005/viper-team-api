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

// ── Global locals available in every EJS template ──────────────────────────
app.use((req, res, next) => {
  res.locals.user        = null;
  res.locals.APP_NAME    = 'ViperAPI';
  res.locals.APP_URL     = process.env.APP_URL || 'https://viper-api.name.ng';
  res.locals.currentPath = req.path;
  res.locals.icon        = icon;   // ← icon('name', size) in every template
  next();
});

// ── Subdomain routing ─────────────────────────────────────────────────────
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ViperAPI running → http://0.0.0.0:${PORT}`);
  startQuotaScheduler();
});
