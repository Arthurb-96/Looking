export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Get the group
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId("69012d8abaffbd692a062184") 
    });
    
    // Get all users
    const allUsers = await db.collection('users').find({}).toArray();
    
    // Try different matching strategies
    const userIds = group.members.map(member => member.userId);
    
    const matchByEmail = await db.collection('users').find({
      email: { $in: userIds }
    }).toArray();
    
    const matchById = await db.collection('users').find({
      _id: { $in: userIds }
    }).toArray();
    
    return NextResponse.json({
      groupMembers: group.members,
      userIds: userIds,
      allUsers: allUsers.map(u => ({ email: u.email, _id: u._id, name: u.name, email: u.email })),
      matchByEmail: matchByEmail.map(u => ({ email: u.email, name: u.name })),
      matchById: matchById.map(u => ({ _id: u._id, name: u.name }))
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}