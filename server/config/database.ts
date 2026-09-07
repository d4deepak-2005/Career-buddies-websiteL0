import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MongoDB startup error: MONGODB_URI is not configured. Add MONGODB_URI to your .env file.');
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('[MongoDB] Connected successfully.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`MongoDB startup error: Unable to connect using MONGODB_URI. ${message}`);
  }
}
