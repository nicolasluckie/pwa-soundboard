import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/soundboard';
const DB_NAME = new URL(uri).pathname.slice(1) || 'soundboard';

let client = null;
let db = null;

export async function connectDB() {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(DB_NAME);

  await db.collection('sounds').createIndex({ slug: 1 }, { unique: true });
  await db.collection('assets').createIndex(
    { file_hash: 1 },
    { unique: true, sparse: true }
  );

  return db;
}

export function soundsCol() {
  if (!db) throw new Error('DB not connected — call connectDB() first');
  return db.collection('sounds');
}

export function assetsCol() {
  if (!db) throw new Error('DB not connected — call connectDB() first');
  return db.collection('assets');
}
