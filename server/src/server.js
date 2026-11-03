import { app } from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

async function start() {
  try {
    await connectDB(config.mongoUri);
  } catch (error) {
    console.error('[db] Could not connect to MongoDB:', error.message);
    console.error(
      '[db] Check MONGODB_URI in server/.env (copy server/.env.example) and that MongoDB is running.'
    );
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
