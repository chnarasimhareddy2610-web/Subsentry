import mongoose from 'mongoose';

/**
 * Connect Mongoose to the database described by MONGODB_URI (or its legacy
 * alias MONGO_URI).
 * The URI is never logged: it can contain credentials.
 */
export async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  const { host, name } = mongoose.connection;
  console.log(`[db] MongoDB connected (${host}/${name})`);
  return mongoose.connection;
}

export function disconnectDB() {
  return mongoose.disconnect();
}
