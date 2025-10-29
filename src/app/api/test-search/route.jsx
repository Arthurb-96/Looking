export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'bob';
    const currentUser = searchParams.get('currentUser') || 'arthur@gmail.com';
    
    const { db } = await connectToDatabase();
    
    const allUsers = await db.collection('users').find({}).toArray();
    
    const searchRegex = new RegExp(query, 'i');
    const searchCriteria = {
      $and: [
        { email: { $ne: currentUser } },
        {
          $or: [
            { displayName: { $regex: searchRegex } },
            { name: { $regex: searchRegex } },
            { email: { $regex: searchRegex } }
          ]
        }
      ]
    };
    
    const searchResults = await db.collection('users').find(searchCriteria).toArray();
    
    return NextResponse.json({
      query: query,
      currentUser: currentUser,
      searchCriteria: searchCriteria,
      allUsers: allUsers.map(u => ({
        name: u.name,
        displayName: u.displayName,
        email: u.email
      })),
      searchResults: searchResults.map(u => ({
        name: u.name,
        displayName: u.displayName,
        email: u.email
      }))
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}