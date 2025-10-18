// app/api/users/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getClient from "@/app/lib/mongodb"; // or use a relative path: "../../../lib/mongodb"

export async function POST(req) {
  try {
    const { email, name, displayName, phone, location, role, category, price } = await req.json();
    
    // Email and name are required, other fields are optional
    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    const users = db.collection("users");

    await users.createIndex({ email: 1 }, { unique: true });

    const userData = {
      name,
      displayName: displayName || name,
      role: role || "user",
      category: category || "general", 
      price: price || "0",
      updatedAt: new Date()
    };

    // Add optional fields if provided
    if (phone) userData.phone = phone;
    if (location) userData.location = location;

  const res = await users.updateOne(
  { email },
  {
    $setOnInsert: {
      email,
      createdAt: new Date()
    },
    $set: userData,
  },
  { upsert: true }
);

    return NextResponse.json({ ok: true, upserted: Boolean(res.upsertedId) });
  } catch (e) {
    console.error("API /users error:", e);
    return NextResponse.json({ error: e?.message || "server error", details: String(e) }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    if (email) {
      // Get specific user by email
      const user = await db.collection('users').findOne({ email: email });
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Return user information (excluding sensitive data)
      const userInfo = {
        email: user.email,
        displayName: user.displayName || user.name || user.email.split('@')[0],
        createdAt: user.createdAt,
        role: user.role,
        category: user.category
      };
      
      return NextResponse.json({ 
        success: true,
        user: userInfo
      });
    } else {
      // Get all users
      const users = await db.collection('users').find({}).toArray();
      
      return NextResponse.json({ 
        success: true,
        users: users,
        count: users.length
      });
    }
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
