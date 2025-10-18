import { NextResponse } from 'next/server';
import getClient from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const currentUser = searchParams.get('currentUser');
    
    if (!query || !currentUser) {
      return NextResponse.json(
        { error: 'Query and current user are required' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    // Search for users by display name primarily, then email as fallback (excluding current user)
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
    
    const users = await db.collection('users').find({
      $and: [
        { email: { $ne: currentUser } }, // Exclude current user
        {
          $or: [
            { displayName: { $regex: searchRegex } },
            { name: { $regex: searchRegex } },
            { email: { $regex: searchRegex } }
          ]
        }
      ]
    }).limit(10).toArray();

    // Get follow relationships
    const followRelationships = await db.collection('follows').findOne({
      followerEmail: currentUser
    });

    const followingList = followRelationships?.following || [];

    // Add following status to each user
    const usersWithFollowStatus = users.map(user => ({
      email: user.email,
      displayName: user.displayName || user.name || user.email.split('@')[0],
      isFollowing: followingList.includes(user.email)
    }));
    
    return NextResponse.json({ 
      success: true,
      users: usersWithFollowStatus
    });
    
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}