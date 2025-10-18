import { NextResponse } from 'next/server';
import getClient from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUser = searchParams.get('targetUser');
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'targetUser parameter is required' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    // Count how many people follow this user
    const followerCount = await db.collection('follows').countDocuments({
      following: targetUser
    });
    
    return NextResponse.json({ 
      success: true,
      count: followerCount
    });
    
  } catch (error) {
    console.error('Error fetching follower count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}