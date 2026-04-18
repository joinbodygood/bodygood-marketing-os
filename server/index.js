import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from repo root if present. On Replit, secrets come from the
// Replit Secrets panel directly via process.env, and this call is a no-op.
loadEnv({ path: path.resolve(__dirname, '../.env') });

const { default: authRoutes } = await import('./routes/auth.routes.js');
const { default: settingsRoutes } = await import('./routes/settings.routes.js');
const { default: dashboardRoutes } = await import('./routes/dashboard.routes.js');
const { default: opsRoutes } = await import('./routes/ops.routes.js');
const { default: campaignsRoutes } = await import('./routes/campaigns.routes.js');
const { default: contentRoutes } = await import('./routes/content.routes.js');
const { default: generateRoutes } = await import('./routes/generate.routes.js');
const { default: analyticsRoutes } = await import('./routes/analytics.routes.js');
const { initCronJobs } = await import('./services/cron.service.js');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0'; // required for Replit / containers
const IS_PROD = process.env.NODE_ENV === 'production';

// In dev, the Vite server runs on a different port and proxies /api through.
// In prod, we serve the built client from this same process (same origin).
if (!IS_PROD) {
  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    })
  );
}
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'bodygood-marketing-os',
    env: process.env.NODE_ENV || 'development',
    ts: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ops', opsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/analytics', analyticsRoutes);

// Serve built client in production (single-service deploy — Replit, Render, Fly)
const clientDist = path.resolve(__dirname, '../client/dist');
if (IS_PROD && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(err.status || 500).json({ error: err.message || 'internal_error' });
});

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT} (${IS_PROD ? 'production' : 'development'})`);
  if (IS_PROD && !fs.existsSync(clientDist)) {
    console.warn(
      `[server] WARNING: production mode but client/dist not found. Run "npm run build" first.`
    );
  }
  if (process.env.NODE_ENV !== 'test') {
    initCronJobs();
  }
});
