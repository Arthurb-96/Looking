import { NextResponse } from 'next/server';
import getClient from '../../../lib/mongodb';

export async function POST(request) {
  try {
    const { followerEmail, targetUserEmail } = await request.json();
    
    if (!followerEmail || !targetUserEmail) {
      return NextResponse.json(
        { error: 'Follower email and target user email are required' },
        { status: 400 }
      );
    }

    if (followerEmail === targetUserEmail) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    // Add to follower's following list
    await db.collection('follows').updateOne(
      { followerEmail: followerEmail },
      { 
        $addToSet: { following: targetUserEmail },
        $setOnInsert: { 
          followerEmail: followerEmail,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    // Add to target user's followers list
    await db.collection('follows').updateOne(
      { followerEmail: targetUserEmail },
      { 
        $addToSet: { followers: followerEmail },
        $setOnInsert: { 
          followerEmail: targetUserEmail,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Successfully followed user'
    });
    
  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { followerEmail, targetUserEmail } = await request.json();
    
    if (!followerEmail || !targetUserEmail) {
      return NextResponse.json(
        { error: 'Follower email and target user email are required' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    // Remove from follower's following list
    await db.collection('follows').updateOne(
      { followerEmail: followerEmail },
      { $pull: { following: targetUserEmail } }
    );
    
    // Remove from target user's followers list
    await db.collection('follows').updateOne(
      { followerEmail: targetUserEmail },
      { $pull: { followers: followerEmail } }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Successfully unfollowed user'
    });
    
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}