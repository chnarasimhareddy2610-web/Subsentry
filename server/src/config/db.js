import mongoose from 'mongoose';
import { mongoMode, redactCredentials, safeMongoTarget } from './env.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Atlas is reached over the public internet, where a handshake can fail for
// transient reasons (TLS alert, reset, timeout). Those are worth retrying;
// authentication and configuration errors are not.
const RETRYABLE_ERRORS = new Set([
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoServerSelectionError',
]);

const isTransient = (error) =>
  RETRYABLE_ERRORS.has(error?.name) ||
  /TLS|SSL|ECONNRESET|ETIMEDOUT|EPIPE|socket disconnected/i.test(error?.message ?? '');

/**
 * Connect Mongoose to the database described by MONGODB_URI (or its legacy
 * alias MONGO_URI). Awaiting this before the HTTP listener starts means the
 * API is never "up" while the database is unreachable.
 *
 * The URI is never logged: it can contain credentials. Only a credential-free
 * target (host + database) is printed.
 */
export async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  const mode = mongoMode(uri);
  // Atlas needs SRV lookup + TLS on a cold connection, so allow more time than
  // a local mongod that is already listening on the loopback interface.
  const serverSelectionTimeoutMS = mode === 'local' ? 8000 : 20000;
  const attempts = mode === 'local' ? 1 : 4;

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const retry = attempt < attempts && isTransient(error);
      if (!retry) break;
      const delay = attempt * 1500;
      console.warn(`[db] Attempt ${attempt} failed (${error.name}); retrying in ${delay}ms…`);
      await mongoose.disconnect().catch(() => {});
      await sleep(delay);
    }
  }
  if (lastError) throw lastError;

  const { name } = mongoose.connection;
  const label =
    mode === 'atlas' ? 'MongoDB Atlas' : mode === 'remote' ? 'remote MongoDB' : 'local MongoDB';

  console.log(`[db] Connected to ${label} — ${name} (${safeMongoTarget(uri)})`);
  return mongoose.connection;
}

/**
 * Turn a Mongoose connection failure into an actionable hint without ever
 * repeating credentials.
 */
export function describeConnectionError(error, uri) {
  const message = redactCredentials(error?.message ?? 'unknown error', uri);
  const mode = mongoMode(uri);

  let hint = 'Check MONGODB_URI in server/.env (copy server/.env.example).';
  if (mode === 'atlas') {
    hint =
      'Atlas checklist: allow this machine\'s IP under Network Access, confirm the database user and password, and verify the cluster hostname.';
  } else if (mode === 'local') {
    hint = 'Start MongoDB locally (or run `npm run dev`, which starts a persistent mongod).';
  }

  return `${message}\n[db] ${hint}`;
}

export function disconnectDB() {
  return mongoose.disconnect();
}
