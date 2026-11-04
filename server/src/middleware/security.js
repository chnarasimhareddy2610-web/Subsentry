import crypto from 'node:crypto';
import { config } from '../config/env.js';

/**
 * Content Security Policy for both the JSON API and the built SPA.
 *
 * The SPA is a static bundle served from this origin: scripts come only from
 * /assets, styles from the bundle plus Google Fonts, and the only network calls
 * are same-origin `/api/*`. Inline `style` attributes are used for bar widths,
 * so style-src keeps 'unsafe-inline'; scripts never do.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

/**
 * Baseline hardening headers. Cheap, safe for JSON and static assets alike;
 * HSTS is only sent when the request is already secure (or in production), so
 * a local `npm start` over plain HTTP is unaffected.
 */
export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  if (config.nodeEnv === 'production' || req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
}

const safeEqual = (candidate, expected) => {
  const a = Buffer.from(String(candidate));
  const b = Buffer.from(String(expected));
  // timingSafeEqual throws on length mismatch, so compare a fixed-length digest
  // of both inputs instead of short-circuiting on length.
  const digest = (value) => crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(digest(a), digest(b));
};

/**
 * Optional single-operator access gate (HTTP Basic over TLS).
 *
 * SubSentry has no user accounts: the API is intentionally owner-only. When
 * AUTH_USER and AUTH_PASSWORD are set, every route except the health probe
 * requires those credentials, which protects both the dashboard and the API
 * from anonymous access once the app is reachable on the internet. With the
 * variables unset the middleware is a no-op, so local development and the API
 * test suite are unchanged.
 */
export function accessGate(req, res, next) {
  if (!config.authUser || !config.authPassword) return next();

  // Health checks come from the platform/orchestrator, which cannot send
  // credentials; it exposes no user data.
  if (req.path === '/api/health') return next();

  const header = req.headers.authorization ?? '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const user = separator >= 0 ? decoded.slice(0, separator) : decoded;
    const password = separator >= 0 ? decoded.slice(separator + 1) : '';

    if (safeEqual(user, config.authUser) && safeEqual(password, config.authPassword)) {
      return next();
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="SubSentry", charset="UTF-8"');
  return res.status(401).json({ message: 'Authentication required' });
}

const buckets = new Map();
let lastSweep = 0;

/**
 * Throttle data-changing requests per client IP.
 *
 * Reads stay unthrottled (the dashboard polls nothing, but reloads cost nothing),
 * while writes are capped so a script cannot mass-create or mass-delete records
 * against the hosted database. The window is deliberately generous for a
 * single-operator app: normal use never comes close. Set
 * WRITE_RATE_LIMIT_MAX=0 to disable, e.g. behind an edge limiter.
 */
export function writeRateLimit(req, res, next) {
  if (config.writeRateLimit <= 0) return next();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (!req.path.startsWith('/api')) return next();

  const now = Date.now();
  const windowMs = config.writeRateWindowMs;

  if (now - lastSweep > windowMs) {
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      if (now - bucket.start >= windowMs) buckets.delete(key);
    }
  }

  const key = req.ip ?? 'unknown';
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > config.writeRateLimit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.start + windowMs - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      message: 'Too many changes in a short time. Please wait a moment and try again.',
    });
  }

  return next();
}
