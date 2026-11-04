import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env regardless of the directory the process was started from.
dotenv.config({ path: path.resolve(here, '../../.env') });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Valid TCP port only (1-65535). PORT=0 would mean "let the OS pick a random
// port", leaving the port unknown to callers — treat it (and non-numeric
// values) as unset so we fall back to the default instead.
const toPort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : fallback;
};

const toBool = (value) => /^(1|true|yes|on)$/i.test(String(value ?? '').trim());

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/subsentry';

// MONGODB_URI is the primary variable; MONGO_URI is a legacy alias. A value in
// the process environment wins over the file, matching dotenv's behaviour.
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || DEFAULT_LOCAL_URI;

const isSrvUri = (uri) => /^mongodb\+srv:\/\//i.test(uri);

/**
 * Credential-free description of a MongoDB URI, safe to log:
 * mongodb+srv://user:pass@cluster0.abc.mongodb.net/db?x=1
 *   → mongodb+srv://cluster0.abc.mongodb.net/db
 */
export function safeMongoTarget(uri) {
  const scheme = isSrvUri(uri) ? 'mongodb+srv' : 'mongodb';
  const afterScheme = uri.slice(uri.indexOf('://') + 3);
  const at = afterScheme.lastIndexOf('@');
  const hostAndDb = at >= 0 ? afterScheme.slice(at + 1) : afterScheme;
  const slash = hostAndDb.indexOf('/');
  const host = slash >= 0 ? hostAndDb.slice(0, slash) : hostAndDb;
  const db = slash >= 0 ? hostAndDb.slice(slash + 1).split('?')[0] : '';
  return `${scheme}://${host}${db ? `/${db}` : ''}`;
}

/**
 * Remove any credentials that a URI or driver message might carry so error
 * text can be logged safely.
 */
export function redactCredentials(text, uri = mongoUri) {
  let out = String(text ?? '');
  const userinfo = /^[a-z+]+:\/\/([^@/]*)@/i.exec(uri);
  if (userinfo?.[1]) {
    out = out.split(userinfo[1]).join('***');
    const password = userinfo[1].split(':').slice(1).join(':');
    if (password) out = out.split(password).join('***');
  }
  return out;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

/** 'atlas' for SRV URIs, 'local' for a single local host, 'remote' otherwise. */
export function mongoMode(uri) {
  if (isSrvUri(uri)) return 'atlas';
  const host = safeMongoTarget(uri).split('://')[1]?.split('/')[0]?.split(',')[0] ?? '';
  const bareHost = host.replace(/^\[|\]$/g, '').split(':')[0];
  return LOCAL_HOSTS.has(bareHost) || LOCAL_HOSTS.has(host) ? 'local' : 'remote';
}

export const config = {
  port: toPort(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri,
  mongoMode: mongoMode(mongoUri),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  lowUsageThreshold: toNumber(process.env.LOW_USAGE_THRESHOLD, 3),
  renewalWindowDays: toNumber(process.env.RENEWAL_WINDOW_DAYS, 7),

  // Optional single-operator access gate (see middleware/security.js). Both
  // values must be present for the gate to switch on; otherwise it is a no-op.
  authUser: process.env.AUTH_USER?.trim() || '',
  authPassword: process.env.AUTH_PASSWORD || '',
  // Set when the app sits behind a reverse proxy/platform load balancer so
  // req.ip (used for rate limiting) is the real client address.
  trustProxy: toBool(process.env.TRUST_PROXY),
  // Writes allowed per IP per window; 0 disables the limiter.
  writeRateLimit: toNumber(process.env.WRITE_RATE_LIMIT_MAX, 120),
  writeRateWindowMs: toNumber(process.env.WRITE_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000),
};
