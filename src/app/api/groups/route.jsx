import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

// GET - Fetch all groups or user's groups
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const type = searchParams.get('type'); // 'joined', 'created', 'all'
    
    const { db } = await connectToDatabase();
    
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (userId && type === 'joined') {
      query['members.userId'] = userId;
    } else if (userId && type === 'created') {
      query.adminId = userId;
    }
    
    const groups = await db.collection('groups').find(query).toArray();
    
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST - Create a new group
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      category, 
      privacy, 
      coverImage, 
      adminId, 
      rules,
      settings 
    } = body;

    if (!name || !description || !adminId || !category) {
      return NextResponse.json({ 
        error: 'Name, description, category, and admin ID are required' 
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if group name already exists
    const existingGroup = await db.collection('groups').findOne({ name });
    if (existingGroup) {
      return NextResponse.json({ 
        error: 'Group name already exists' 
      }, { status: 400 });
    }

    // Find the admin user's MongoDB _id from their email
    const adminUser = await db.collection('users').findOne({ email: adminId });
    if (!adminUser) {
      return NextResponse.json({ 
        error: 'Admin user not found in database' 
      }, { status: 400 });
    }
    
    const mongoAdminId = adminUser._id.toString();

    const newGroup = {
      name,
      description,
      category,
      privacy: privacy || 'public',
      coverImage: coverImage || '',
      adminId: mongoAdminId, // Store MongoDB _id
      moderators: [],
      members: [{
        userId: mongoAdminId, // Store MongoDB _id
        role: 'admin',
        joinedAt: new Date(),
        status: 'active'
      }],
      rules: rules || [],
      settings: {
        requireApproval: settings?.requireApproval || false,
        allowMemberPosts: settings?.allowMemberPosts !== false,
        allowFileSharing: settings?.allowFileSharing !== false,
        allowInvites: settings?.allowInvites !== false,
        ...settings
      },
      stats: {
        memberCount: 1,
        postCount: 0,
        createdAt: new Date(),
        lastActivity: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('groups').insertOne(newGroup);
    
    return NextResponse.json({ 
      message: 'Group created successfully',
      groupId: result.insertedId,
      group: { ...newGroup, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}