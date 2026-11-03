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

export const config = {
  port: toPort(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  // MONGODB_URI is the primary variable; MONGO_URI is a legacy alias.
  mongoUri:
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/subsentry',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  lowUsageThreshold: toNumber(process.env.LOW_USAGE_THRESHOLD, 3),
  renewalWindowDays: toNumber(process.env.RENEWAL_WINDOW_DAYS, 7),
};
