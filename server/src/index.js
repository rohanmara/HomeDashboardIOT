import cors from 'cors';
import express from 'express';
import http from 'node:http';
import { initDb } from './db.js';
import { initRealtime } from './realtime.js';
import { createAnalyticsRouter } from './routes/analytics.js';
import { createDsaRouter } from './routes/dsa.js';
import { createEsp32Router } from './routes/esp32.js';
import { createSessionsRouter } from './routes/sessions.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const db = initDb();
const app = express();
const httpServer = http.createServer(app);

initRealtime(httpServer, db);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/sessions', createSessionsRouter(db));
app.use('/api/analytics', createAnalyticsRouter(db));
app.use('/api/dsa', createDsaRouter());
app.use('/esp32', createEsp32Router(db));

app.use((error, _req, res, _next) => {
  const status = error.status ?? 500;
  res.status(status).json({
    success: false,
    message: error.message ?? 'Unexpected server error'
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Study API listening on http://${HOST}:${PORT}`);
});
