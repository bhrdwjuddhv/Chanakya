import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  logger.info(`mongo connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function mongoHealth() {
  try {
    await mongoose.connection.db.admin().ping();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export { mongoose };
