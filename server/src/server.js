import { app } from './app.js';
import { config } from './config/env.js';
import { connectDB, describeConnectionError, disconnectDB } from './config/db.js';

async function start() {
  // The database must be ready before Express starts listening: the orchestrator
  // only starts Vite once /api/health reports database: "connected".
  try {
    await connectDB(config.mongoUri);
  } catch (error) {
    console.error(`[db] Could not connect to MongoDB (${config.mongoMode} mode):`);
    console.error(describeConnectionError(error, config.mongoUri));
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`[api] SubSentry API listening on http://localhost:${config.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
