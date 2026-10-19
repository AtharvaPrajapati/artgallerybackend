import mongoose from 'mongoose';

let memoryServer = null;

/**
 * Connects to MONGODB_URI, or starts an in-memory MongoDB when
 * MONGODB_URI=memory (useful when Docker Desktop is unavailable).
 */
export async function connectDatabase(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required (or set MONGODB_URI=memory)');
  }

  mongoose.set('strictQuery', true);

  let connectionUri = uri;
  if (uri === 'memory' || uri === 'mongodb-memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    connectionUri = memoryServer.getUri('art_culture_festival');
    console.log('Using in-memory MongoDB (development fallback)');
  }

  await mongoose.connect(connectionUri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

export async function stopMemoryDatabase() {
  if (memoryServer) {
    await mongoose.disconnect();
    await memoryServer.stop();
    memoryServer = null;
  }
}
