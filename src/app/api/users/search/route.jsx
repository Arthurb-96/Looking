import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const currentUser = searchParams.get('currentUser');
    const location = searchParams.get('location'); // New parameter
    const category = searchParams.get('category'); // New parameter
    const role = searchParams.get('role'); // New parameter
    
    if (!query || !currentUser) {
      return NextResponse.json(
        { error: 'Query and current user are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Build search criteria
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
    const searchCriteria = {
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
    };

    // Add location filter if provided
    if (location && location !== 'all') {
      searchCriteria.$and.push({ location: location });
    }

    // Add category filter if provided
    if (category && category !== 'all') {
      searchCriteria.$and.push({ category: category });
    }

    // Add role filter if provided
    if (role && role !== 'all') {
      searchCriteria.$and.push({ role: role });
    }
    
    const users = await db.collection('users').find(searchCriteria).limit(10).toArray();

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