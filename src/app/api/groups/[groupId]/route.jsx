import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// GET - Get specific group details
export async function GET(request, { params }) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const { db } = await connectToDatabase();
    
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is member for additional details
    // First, find the user's MongoDB _id from their email
    let userMongoId = null;
    if (userId) {
      const user = await db.collection('users').findOne({ email: userId });
      userMongoId = user?._id.toString();
    }
    
    const isMember = userMongoId && group.members.some(member => member.userId === userMongoId);
    const userRole = isMember ? 
      group.members.find(member => member.userId === userMongoId)?.role : null;

    return NextResponse.json({ 
      group,
      userMembership: {
        isMember,
        role: userRole,
        isAdmin: userRole === 'admin',
        isModerator: userRole === 'moderator' || userRole === 'admin'
      }
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}

// PUT - Update group settings (admin only)
export async function PUT(request, { params }) {
  try {
    const { groupId } = params;
    const body = await request.json();
    const { userId, ...updateData } = body;

    const { db } = await connectToDatabase();
    
    // Check if user is admin
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Find the user's MongoDB _id from their email
    const user = await db.collection('users').findOne({ email: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }
    const userMongoId = user._id.toString();

    const userMember = group.members.find(member => member.userId === userMongoId);
    if (!userMember || userMember.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date() 
        } 
      }
    );

    return NextResponse.json({ message: 'Group updated successfully' });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE - Delete group (admin only)
export async function DELETE(request, { params }) {
  try {
    const { groupId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const { db } = await connectToDatabase();
    
    // Check if user is admin
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Find the user's MongoDB _id from their email
    const user = await db.collection('users').findOne({ email: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }
    const userMongoId = user._id.toString();

    if (group.adminId !== userMongoId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete group and all related posts
    await Promise.all([
      db.collection('groups').deleteOne({ _id: new ObjectId(groupId) }),
      db.collection('groupPosts').deleteMany({ groupId })
    ]);

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}