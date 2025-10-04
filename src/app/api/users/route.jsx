// app/api/users/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getClient from "@/app/lib/mongodb"; // or use a relative path: "../../../lib/mongodb"

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const client = await getClient();                    // <-- always a MongoClient
    const db = client.db(process.env.MONGODB_DB || "myapp");
    const users = db.collection("users");

    await users.createIndex({ email: 1 }, { unique: true });

    const res = await users.updateOne(
      { email },
      {
        $setOnInsert: { email, createdAt: new Date() },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, upserted: Boolean(res.upsertedId) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
