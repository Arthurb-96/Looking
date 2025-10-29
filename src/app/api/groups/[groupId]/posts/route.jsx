import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// GET - Get group posts
export async function GET(request, { params }) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;
    
    const { db } = await connectToDatabase();
    
    // Check if user is member
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = group.members.some(
      member => member.userId === userId && member.status === 'active'
    );

    if (group.privacy === 'private' && !isMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const posts = await db.collection('groupPosts')
      .find({ 
        groupId: new ObjectId(groupId),
        isApproved: true 
      })
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get author details for each post and comments
    const authorIds = posts.map(post => post.authorId);
    const commentAuthorIds = posts.flatMap(post => 
      post.comments?.map(comment => comment.authorId).filter(Boolean) || []
    );
    const allAuthorIds = [...new Set([...authorIds, ...commentAuthorIds])];
    
    const authors = await db.collection('users').find({
      email: { $in: allAuthorIds }
    }).toArray();

    const postsWithAuthors = posts.map(post => {
      const author = authors.find(a => a.email === post.authorId);
      
      // Also enrich comments with author names
      const enrichedComments = post.comments?.map(comment => {
        if (!comment.authorName) {
          const commentAuthor = authors.find(a => a.email === comment.authorId);
          return {
            ...comment,
            authorName: commentAuthor?.displayName || commentAuthor?.name || comment.authorId?.split('@')[0] || 'Unknown User'
          };
        }
        return comment;
      }) || [];
      
      return {
        ...post,
        comments: enrichedComments,
        author: {
          email: author?.email,
          displayName: author?.displayName || author?.name || 'Unknown User',
          profilePicture: author?.profilePicture
        }
      };
    });

    return NextResponse.json({ posts: postsWithAuthors });
  } catch (error) {
    console.error('Error fetching group posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST - Create group post
export async function POST(request, { params }) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const { content, authorId, images, isPinned } = body;

    if (!content || !authorId) {
      return NextResponse.json({ 
        error: 'Content and author ID are required' 
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Check if user is member and can post
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Find the user's MongoDB _id from their email
    const user = await db.collection('users').findOne({ email: authorId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }
    const userMongoId = user._id.toString();

    const userMember = group.members.find(
      member => member.userId === userMongoId && member.status === 'active'
    );

    if (!userMember) {
      return NextResponse.json({ error: 'Not a group member' }, { status: 403 });
    }

    const canPost = group.settings.allowMemberPosts || 
                   userMember.role === 'admin' || 
                   userMember.role === 'moderator';

    if (!canPost) {
      return NextResponse.json({ 
        error: 'Not authorized to post in this group' 
      }, { status: 403 });
    }

    const canPin = isPinned && (userMember.role === 'admin' || userMember.role === 'moderator');

    const newPost = {
      groupId: new ObjectId(groupId), // Store as ObjectId for consistency
      authorId, // Store email as authorId for consistency with frontend
      content,
      images: images || [],
      isPinned: canPin || false,
      isApproved: userMember.role === 'admin' || userMember.role === 'moderator' || !group.settings.requireApproval,
      likes: [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('groupPosts').insertOne(newPost);
    
    // Update group stats
    await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $inc: { 'stats.postCount': 1 },
        $set: { 'stats.lastActivity': new Date() }
      }
    );

    return NextResponse.json({ 
      message: newPost.isApproved ? 'Post created successfully' : 'Post submitted for approval',
      postId: result.insertedId,
      post: { ...newPost, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating group post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}