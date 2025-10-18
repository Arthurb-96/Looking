import { NextResponse } from 'next/server';
import getClient from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    
    if (!user) {
      return NextResponse.json(
        { error: 'user parameter is required' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    // Find the user's following list
    const followData = await db.collection('follows').findOne({
      followerEmail: user
    });
    
    const followingCount = followData?.following?.length || 0;
    
    return NextResponse.json({ 
      success: true,
      count: followingCount
    });
    
  } catch (error) {
    console.error('Error fetching following count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}