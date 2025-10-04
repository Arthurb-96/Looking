// lib/mongodb.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Please set MONGODB_URI in .env.local");

// cache across hot reloads in dev
let cached = global._mongo;
if (!cached) {
  cached = global._mongo = { conn: null, promise: null };
}

export default async function getClient() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = new MongoClient(uri).connect();
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
