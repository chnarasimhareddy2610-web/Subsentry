#!/usr/bin/env node
/**
 * SubSentry development orchestrator.
 *
 * Starts the stack in the order that prevents the Vite proxy from hitting a
 * dead Express port (ECONNREFUSED):
 *
 *   1. persistent MongoDB — a real, on-disk mongod, started only when
 *      MONGODB_URI points at a local host that is not already answering.
 *      Remote URIs (MongoDB Atlas) are used as-is.
 *   2. Express API (via nodemon).
 *   3. Poll GET /api/health until it reports database: "connected".
 *   4. Only then start the Vite dev server.
 *
 * mongodb-memory-server is deliberately NOT used here: it is reserved for the
 * automated test suite (server/scripts/verify.mjs). Development always runs
 * against the persistent database in MONGODB_URI, so data survives restarts.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, '.data');
const MONGO_DB_PATH = path.join(DATA_DIR, 'mongodb');
const MONGO_LOG_PATH = path.join(DATA_DIR, 'mongod.log');

const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/subsentry';
const MONGOD_START_TIMEOUT_MS = 30_000;
const HEALTH_TIMEOUT_MS = 60_000;
const VITE_READY_TIMEOUT_MS = 20_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let shuttingDown = false;
/** @type {{ name: string, proc: import('node:child_process').ChildProcess }[]} */
const children = [];

// ── Environment ────────────────────────────────────────────────────────

/** Minimal KEY=VALUE reader for server/.env (no dependency on dotenv here). */
function readServerEnv() {
  const env = {};
  const file = path.join(ROOT, 'server', '.env');
  if (!fs.existsSync(file)) return env;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function resolveMongoUri(serverEnv) {
  return (
    process.env.MONGODB_URI ||
    serverEnv.MONGODB_URI ||
    process.env.MONGO_URI ||
    serverEnv.MONGO_URI ||
    DEFAULT_MONGO_URI
  );
}

/**
 * If the URI targets a single local host, return { host, port } so we can
 * make sure a persistent mongod is listening there. Returns null for remote
 * hosts (e.g. MongoDB Atlas) — those are used untouched.
 */
function localMongoTarget(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/([^/]+)(?:\/|$)/.exec(uri);
  if (!match || uri.startsWith('mongodb+srv://')) return null;

  const firstHost = match[1].split(',')[0];
  const withoutCredentials = firstHost.includes('@')
    ? firstHost.slice(firstHost.indexOf('@') + 1)
    : firstHost;

  const [host, portText] = withoutCredentials.split(':');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  if (!isLocal) return null;

  return { host: host === 'localhost' || host === '::1' || host === '[::1]' ? '127.0.0.1' : host, port: Number(portText) || 27017 };
}

// ── TCP helpers ────────────────────────────────────────────────────────

function probePort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (up) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(up);
    };
    const sock = net.connect({ host, port });
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

function waitForPort(host, port, timeoutMs, isDead) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const attempt = () => {
      if (isDead && isDead()) {
        reject(new Error('mongod exited before it started listening'));
        return;
      }

      let settled = false;
      const sock = net.connect({ host, port });

      const retry = () => {
        if (settled) return;
        settled = true;
        sock.destroy();
        if (isDead && isDead()) {
          reject(new Error('mongod exited before it started listening'));
        } else if (Date.now() >= deadline) {
          reject(new Error(`timed out after ${timeoutMs}ms waiting for ${host}:${port}`));
        } else {
          setTimeout(attempt, 400);
        }
      };

      sock.setTimeout(1000, retry);
      sock.once('connect', () => {
        if (settled) return;
        settled = true;
        sock.destroy();
        resolve();
      });
      sock.once('error', retry);
    };

    attempt();
  });
}

// ── mongod discovery / launch ──────────────────────────────────────────

function findMongodBinary() {
  // 1. A system-installed mongod on PATH is preferred.
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['mongod'], {
    encoding: 'utf8',
  });
  if (which.status === 0) {
    const first = which.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (first && fs.existsSync(first)) return first;
  }

  // 2. Fall back to the mongod binary already downloaded by the test suite's
  //    mongodb-memory-server (cache locations), running it as a normal,
  //    on-disk mongod — not as an in-memory instance.
  const cacheDirs = [
    path.join(process.env.LOCALAPPDATA || '', 'mongodb-binaries'),
    path.join(process.env.USERPROFILE || osHome(), '.cache', 'mongodb-binaries'),
    process.env.MONGOMS_DOWNLOAD_DIR,
  ].filter((dir) => dir && dir !== path.join('', 'mongodb-binaries') && fs.existsSync(dir));

  const candidates = cacheDirs
    .flatMap((dir) => {
      try {
        return fs
          .readdirSync(dir)
          .filter((file) => /^mongod-/i.test(file))
          .map((file) => path.join(dir, file));
      } catch {
        return [];
      }
    })
    .sort();

  return candidates.at(-1) ?? null;
}

function osHome() {
  return process.env.HOME || process.env.USERPROFILE || '';
}

function tailFile(file, lines = 20) {
  try {
    const content = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    return content.slice(-lines).join('\n');
  } catch {
    return '(no log)';
  }
}

function startMongod(binary, { host, port }) {
  fs.mkdirSync(MONGO_DB_PATH, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const logFd = fs.openSync(MONGO_LOG_PATH, 'a');
  const proc = spawn(
    binary,
    [
      '--dbpath', MONGO_DB_PATH,
      '--port', String(port),
      '--bind_ip', host,
    ],
    { stdio: ['ignore', logFd, logFd], windowsHide: true }
  );
  fs.closeSync(logFd);

  proc.on('error', (error) => {
    console.error(`[mongo] failed to launch mongod: ${error.message}`);
  });
  return proc;
}

// ── Child process plumbing ─────────────────────────────────────────────

function pipeLines(stream, prefix) {
  if (!stream) return;
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) console.log(`${prefix} ${line}`);
    }
  });
  stream.on('end', () => {
    if (buffer.trim()) console.log(`${prefix} ${buffer}`);
  });
}

function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[dev] ${reason}`);
  for (const { proc } of children) killTree(proc.pid);
  await sleep(600);
  process.exit(exitCode);
}

function supervise(name, proc, { failStack = true } = {}) {
  children.push({ name, proc });
  proc.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] ${name} exited (code ${code ?? 'null'}, signal ${signal ?? 'none'})`);
    if (failStack) {
      shutdown(`${name} stopped — shutting the stack down`, code || 1);
    }
  });
}

// ── Health gate ────────────────────────────────────────────────────────

function getHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/api/health', timeout: 2000 },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = body ? JSON.parse(body) : null;
          } catch {
            data = null;
          }
          resolve({ status: res.statusCode, data });
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function gateHealth(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastState = 'connection refused';

  while (Date.now() < deadline && !shuttingDown) {
    const health = await getHealth(port);
    if (health) {
      if (health.status === 200 && health.data?.database === 'connected') {
        return { ok: true, data: health.data };
      }
      lastState = `status ${health.status}, database ${health.data?.database ?? 'unknown'}`;
    } else {
      lastState = 'connection refused';
    }
    await sleep(500);
  }
  return { ok: false, reason: lastState };
}

// ── Main ───────────────────────────────────────────────────────────────

// First valid TCP port (1-65535) among the candidates; otherwise 5000.
// PORT=0 (seen in some shells) would bind to a random port and make the
// health-gate URL wrong, so it must not win over server/.env.
function pickPort(...candidates) {
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) return parsed;
  }
  return 5000;
}

async function main() {
  const serverEnv = readServerEnv();
  const port = pickPort(process.env.PORT, serverEnv.PORT);
  const mongoUri = resolveMongoUri(serverEnv);
  const local = localMongoTarget(mongoUri);

  let mongodProc = null;

  if (local) {
    if (await probePort(local.host, local.port)) {
      console.log(`[dev] MongoDB already listening on ${local.host}:${local.port} — reusing it`);
    } else {
      const binary = findMongodBinary();
      if (!binary) {
        console.error(`[dev] Nothing is listening on ${local.host}:${local.port} and no mongod binary was found.`);
        console.error('[dev] Fix one of the following:');
        console.error('  - install MongoDB and put mongod on PATH, or');
        console.error('  - set MONGODB_URI in server/.env to a MongoDB Atlas connection string.');
        process.exit(1);
      }

      console.log(`[dev] Starting persistent mongod (${binary})`);
      console.log(`[dev]   dbpath: ${MONGO_DB_PATH}`);
      mongodProc = startMongod(binary, local);
      children.push({ name: 'mongod', proc: mongodProc });
      mongodProc.on('exit', (code, signal) => {
        if (shuttingDown) return;
        console.error(`[dev] mongod exited unexpectedly (code ${code}, signal ${signal})`);
        console.error(`[dev] mongod log tail:\n${tailFile(MONGO_LOG_PATH)}`);
        shutdown('mongod stopped — shutting the stack down', code || 1);
      });

      try {
        await waitForPort(local.host, local.port, MONGOD_START_TIMEOUT_MS, () => mongodProc.exitCode !== null);
        console.log('[dev] MongoDB is ready (persistent, on-disk)');
      } catch (error) {
        console.error(`[dev] mongod failed to start: ${error.message}`);
        console.error(`[dev] mongod log tail:\n${tailFile(MONGO_LOG_PATH)}`);
        await shutdown('MongoDB failed to start', 1);
        return;
      }
    }
  } else {
    console.log('[dev] MONGODB_URI points at a remote host (e.g. Atlas) — using it as-is');
  }

  // 2. Express API
  console.log('[dev] Starting Express API…');
  // Single command string: passing args with shell:true is deprecated (DEP0190).
  const api = spawn('npm run dev:server', {
    cwd: ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pipeLines(api.stdout, '[api]');
  pipeLines(api.stderr, '[api]');
  supervise('Express API', api);

  // 3. Health gate — the Vite dev server only starts once the API answers
  //    /api/health with a connected database, so the proxy never sees
  //    ECONNREFUSED from a not-yet-listening backend.
  console.log(`[dev] Waiting for http://localhost:${port}/api/health …`);
  const gate = await gateHealth(port, HEALTH_TIMEOUT_MS);

  if (!gate.ok) {
    console.error(`[dev] API health check failed (${gate.reason}) after ${HEALTH_TIMEOUT_MS}ms`);
    await shutdown('API never became healthy', 1);
    return;
  }
  console.log(`[dev] API healthy — database: ${gate.data.database}`);

  // 4. Vite dev server
  console.log('[dev] Starting Vite dev server…');
  const web = spawn('npm run dev:client', {
    cwd: ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pipeLines(web.stdout, '[web]');
  pipeLines(web.stderr, '[web]');
  supervise('Vite', web);

  // Light readiness probe so the final message is truthful.
  const viteDeadline = Date.now() + VITE_READY_TIMEOUT_MS;
  let viteUp = false;
  while (Date.now() < viteDeadline && !shuttingDown) {
    // Vite binds "localhost", which on some machines resolves to ::1 only,
    // so probe both loopback addresses before declaring it down.
    viteUp = (await probePort('127.0.0.1', 5173, 600)) || (await probePort('::1', 5173, 600));
    if (viteUp) break;
    await sleep(400);
  }

  if (viteUp) {
    console.log('\n[dev] Stack ready → http://localhost:5173  (API: http://localhost:' + port + ')');
  } else {
    console.warn('\n[dev] Vite has not opened port 5173 yet — check the [web] log above.');
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(`${signal} received`, 0);
  });
}

main().catch(async (error) => {
  console.error('[dev] Fatal:', error);
  await shutdown('orchestrator crashed', 1);
});
