/**
 * Development entry-point (persistent MongoDB).
 *
 * This file previously spun up an ephemeral mongodb-memory-server instance
 * whenever MONGODB_URI was unreachable, which silently discarded all data on
 * every restart. Development now always uses the persistent database from
 * MONGODB_URI (a local on-disk mongod or MongoDB Atlas); the repo-root
 * `npm run dev` orchestrator (scripts/dev.mjs) makes sure that mongod is
 * listening before this process starts.
 *
 * mongodb-memory-server is reserved exclusively for the automated test suite
 * (server/scripts/verify.mjs).
 *
 * Usage: nodemon src/server.dev.js   (`npm run dev` at the repo root)
 */
import './server.js';
