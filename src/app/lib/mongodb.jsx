// lib/mongodb.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Please set MONGODB_URI in .env.local");

// MongoDB connection options
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  retryWrites: true,
  w: 'majority'
};

// cache across hot reloads in dev
let cached = global._mongo;
if (!cached) {
  cached = global._mongo = { conn: null, promise: null };
}

async function getClient() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = new MongoClient(uri, options).connect();
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export async function connectToDatabase() {
  const client = await getClient();
  const db = client.db("myapp"); // Connect to your actual database
  return { client, db };
}

export default getClient;
