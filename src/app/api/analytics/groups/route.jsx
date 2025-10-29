import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    const userId = url.searchParams.get('userId');

    if (!groupId || !userId) {
      return Response.json({ error: 'Group ID and User ID are required' }, { status: 400 });
    }

    // First, find the user's MongoDB _id from their email
    const user = await db.collection('users').findOne({ email: userId });
    if (!user) {
      return Response.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    const userObjectId = user._id.toString();

    // Check if user is admin of the group  
    const groupsCollection = db.collection('groups');
    const group = await groupsCollection.findOne({ 
      _id: new ObjectId(groupId),
      $or: [
        { adminId: userObjectId },  // Check if user's MongoDB _id matches group's adminId
        { 'members.userId': userObjectId, 'members.role': 'admin' }
      ]
    });

    if (!group) {
      return Response.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    // Get group posts collection for analytics
    const postsCollection = db.collection('groupPosts');
    const usersCollection = db.collection('users');

    // 1. Posts per month analytics (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const postsPerMonth = await postsCollection.aggregate([
      {
        $match: {
          $or: [
            { groupId: new ObjectId(groupId) },  // New format (ObjectId)
            { groupId: groupId }                 // Old format (string)
          ],
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          likes: { $sum: { $size: { $ifNull: ["$likes", []] } } }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]).toArray();

    // Format posts per month data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const monthData = postsPerMonth.find(p => p._id.year === year && p._id.month === month);
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        posts: monthData ? monthData.count : 0,
        likes: monthData ? monthData.likes : 0
      });
    }

    // 2. Member activity analytics
    const memberActivity = await postsCollection.aggregate([
      {
        $match: {
          $or: [
            { groupId: new ObjectId(groupId) },  // New format (ObjectId)
            { groupId: groupId }                 // Old format (string)
          ],
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      {
        $group: {
          _id: "$authorId", // Changed from userEmail to authorId
          postCount: { $sum: 1 },
          totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } }
        }
      },
      {
        $sort: { postCount: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // Get user details for member activity
    const memberEmails = memberActivity.map(m => m._id);
    const memberDetails = await usersCollection.find({
      email: { $in: memberEmails }
    }).toArray();

    const enrichedMemberActivity = memberActivity.map(activity => {
      const user = memberDetails.find(u => u.email === activity._id);
      return {
        email: activity._id,
        name: user?.displayName || user?.name || activity._id.split('@')[0],
        postCount: activity.postCount,
        totalLikes: activity.totalLikes
      };
    });

    // 3. Group growth analytics
    const groupGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      // Count members who joined before this month
      const membersAtTime = group.members ? group.members.filter(member => {
        const joinDate = new Date(member.joinedAt || group.createdAt);
        return joinDate <= date;
      }).length : 0;

      groupGrowth.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        members: membersAtTime
      });
    }

    // 4. Recent activity summary
    const recentPosts = await postsCollection.find({
      $or: [
        { groupId: new ObjectId(groupId) },  // New format (ObjectId)
        { groupId: groupId }                 // Old format (string)
      ]
    }).sort({ createdAt: -1 }).limit(5).toArray();

    const totalPosts = await postsCollection.countDocuments({ 
      $or: [
        { groupId: new ObjectId(groupId) },  // New format (ObjectId)
        { groupId: groupId }                 // Old format (string)
      ]
    });
    const totalLikes = await postsCollection.aggregate([
      { 
        $match: { 
          $or: [
            { groupId: new ObjectId(groupId) },  // New format (ObjectId)
            { groupId: groupId }
          ]
        } 
      },
      { $project: { likesCount: { $size: { $ifNull: ["$likes", []] } } } },
      { $group: { _id: null, total: { $sum: "$likesCount" } } }
    ]).toArray();

    const analytics = {
      groupInfo: {
        name: group.name,
        memberCount: group.members ? group.members.length : 0,
        totalPosts: totalPosts,
        totalLikes: totalLikes.length > 0 ? totalLikes[0].total : 0
      },
      postsPerMonth: monthlyData,
      memberActivity: enrichedMemberActivity,
      groupGrowth: groupGrowth,
      recentActivity: recentPosts.map(post => ({
        title: post.title || 'Untitled Post',
        author: post.authorId, // Changed from userEmail to authorId
        createdAt: post.createdAt,
        likes: post.likes ? post.likes.length : 0
      }))
    };

    return Response.json({ analytics });

  } catch (error) {
    console.error('Error fetching group analytics:', error);
    return Response.json(
      { error: 'Failed to fetch analytics' }, 
      { status: 500 }
    );
  }
}