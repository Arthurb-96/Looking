import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// POST - Join group or manage members
export async function POST(request, { params }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const { userId, action, targetUserId, newRole } = body;

    const { db } = await connectToDatabase();
    
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Find the user's MongoDB _id from their email for permission checking
    const currentUser = await db.collection('users').findOne({ email: userId });
    const currentUserMongoId = currentUser?._id.toString();

    const userMember = group.members.find(member => member.userId === currentUserMongoId);
    const isAdmin = userMember?.role === 'admin';
    const isModerator = userMember?.role === 'moderator' || isAdmin;

    switch (action) {
      case 'join':
        // Use the user data we already looked up
        if (!currentUser) {
          return NextResponse.json({ error: 'User not found in database' }, { status: 400 });
        }
        
        const mongoUserId = currentUserMongoId;
        
        // Check if user is already a member (check only MongoDB _id since that's what we store now)
        if (group.members.some(member => member.userId === mongoUserId)) {
          return NextResponse.json({ error: 'Already a member' }, { status: 400 });
        }

        const newMember = {
          userId: mongoUserId, // Store MongoDB _id instead of Firebase UID
          role: 'member',
          joinedAt: new Date(),
          status: group.settings.requireApproval ? 'pending' : 'active'
        };

        await db.collection('groups').updateOne(
          { _id: new ObjectId(groupId) },
          { 
            $push: { members: newMember },
            $inc: { 'stats.memberCount': group.settings.requireApproval ? 0 : 1 },
            $set: { updatedAt: new Date() }
          }
        );

        return NextResponse.json({ 
          message: group.settings.requireApproval ? 
            'Join request sent for approval' : 'Joined group successfully' 
        });

      case 'leave':
        if (!userMember) {
          return NextResponse.json({ error: 'Not a member' }, { status: 400 });
        }

        if (group.adminId === userId) {
          return NextResponse.json({ 
            error: 'Admin cannot leave group. Transfer ownership first.' 
          }, { status: 400 });
        }

        await db.collection('groups').updateOne(
          { _id: new ObjectId(groupId) },
          { 
            $pull: { members: { userId } },
            $inc: { 'stats.memberCount': -1 },
            $set: { updatedAt: new Date() }
          }
        );

        return NextResponse.json({ message: 'Left group successfully' });

      case 'approve':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await db.collection('groups').updateOne(
          { _id: new ObjectId(groupId), 'members.userId': targetUserId },
          { 
            $set: { 'members.$.status': 'active' },
            $inc: { 'stats.memberCount': 1 }
          }
        );

        return NextResponse.json({ message: 'Member approved successfully' });

      case 'reject':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await db.collection('groups').updateOne(
          { _id: new ObjectId(groupId) },
          { $pull: { members: { userId: targetUserId } } }
        );

        return NextResponse.json({ message: 'Member rejected successfully' });

      case 'ban':
        if (!isModerator) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await db.collection('groups').updateOne(
          { _id: new ObjectId(groupId), 'members.userId': targetUserId },
          { 
            $set: { 'members.$.status': 'banned' },
            $inc: { 'stats.memberCount': -1 }
          }
        );

        return NextResponse.json({ message: 'Member banned successfully' });

      case 'unban':
        if (!isModerator) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await db.collection('groups').updateOne(
          { _id: new ObjectId(groupId), 'members.userId': targetUserId },
          { 
            $set: { 'members.$.status': 'active' },
            $inc: { 'stats.memberCount': 1 }
          }
        );

        return NextResponse.json({ message: 'Member unbanned successfully' });

      case 'changeRole':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (!['member', 'moderator'].includes(newRole)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        await db.collection('groups').updateOne(
          { _id: new ObjectId(groupId), 'members.userId': targetUserId },
          { $set: { 'members.$.role': newRole } }
        );

        return NextResponse.json({ message: 'Role updated successfully' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing group member:', error);
    return NextResponse.json({ error: 'Failed to manage member' }, { status: 500 });
  }
}

// GET - Get group members
export async function GET(request, { params }) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'pending', 'banned'
    
    const { db } = await connectToDatabase();
    
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    let members = group.members;
    
    if (status) {
      members = members.filter(member => member.status === status);
    }

    // Get user details for each member
    const userIds = members.map(member => member.userId);
    
    // Try to get users by MongoDB ObjectId first
    const objectIds = userIds.map(id => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    let users = await db.collection('users').find({
      _id: { $in: objectIds }
    }).toArray();
    
    // If some users weren't found by ObjectId, try looking up by email
    // (for backward compatibility with any email-stored userIds)
    const foundUserIds = users.map(u => u._id.toString());
    const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
    
    if (missingUserIds.length > 0) {
      const additionalUsers = await db.collection('users').find({
        email: { $in: missingUserIds }
      }).toArray();
      users = [...users, ...additionalUsers];
    }

    const membersWithDetails = members.map(member => {
      // Try to find user by MongoDB ObjectId first, then by email
      let user = users.find(u => u._id.toString() === member.userId);
      if (!user) {
        user = users.find(u => u.email === member.userId);
      }
      
      return {
        ...member,
        displayName: user?.displayName || user?.name || user?.email?.split('@')[0] || 'Unknown User',
        email: user?.email,
        profilePicture: user?.profilePicture
      };
    });

    return NextResponse.json({ members: membersWithDetails });
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}