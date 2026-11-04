import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { accessGate, securityHeaders, writeRateLimit } from './middleware/security.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

export const app = express();

// Do not advertise the framework, and (when deployed behind a proxy) trust one
// hop so rate limiting sees the real client address.
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1);

app.use(securityHeaders);

// CORS must run before the access gate so browser preflights are answered.
app.use(
  cors({
    origin: config.clientOrigin.split(',').map((origin) => origin.trim()),
  })
);

// Optional owner-only gate, active only when AUTH_USER/AUTH_PASSWORD are set.
app.use(accessGate);

// Throttle mutating API calls only; static assets and reads stay unlimited.
app.use(writeRateLimit);

app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/subscriptions', subscriptionRoutes);

// In production the built React app can be served by the same Express process.
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use('/api', notFound);
app.use(notFound);
app.use(errorHandler);
