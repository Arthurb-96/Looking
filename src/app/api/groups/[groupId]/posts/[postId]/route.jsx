import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// PUT - Update group post (author or moderator)
export async function PUT(request, { params }) {
  try {
    const { groupId, postId } = params;
    const body = await request.json();
    const { userEmail, action, ...updateData } = body;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get user details
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get group and post
    const [group, post] = await Promise.all([
      db.collection('groups').findOne({ _id: new ObjectId(groupId) }),
      db.collection('groupPosts').findOne({ _id: new ObjectId(postId) })
    ]);
    
    if (!group || !post) {
      return NextResponse.json({ error: 'Group or post not found' }, { status: 404 });
    }

    const userMember = group.members.find(member => member.email === userEmail);
    const isAuthor = post.authorId === userEmail;
    const isModerator = userMember?.role === 'moderator' || userMember?.role === 'admin';

    switch (action) {
      case 'approve':
        if (!isModerator) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await db.collection('groupPosts').updateOne(
          { _id: new ObjectId(postId) },
          { $set: { isApproved: true, updatedAt: new Date() } }
        );

        return NextResponse.json({ message: 'Post approved successfully' });

      case 'pin':
      case 'unpin':
        if (!isModerator) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await db.collection('groupPosts').updateOne(
          { _id: new ObjectId(postId) },
          { $set: { isPinned: action === 'pin', updatedAt: new Date() } }
        );

        return NextResponse.json({ 
          message: `Post ${action === 'pin' ? 'pinned' : 'unpinned'} successfully` 
        });

      case 'edit':
        if (!isAuthor && !isModerator) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const allowedUpdates = ['content', 'images'];
        const updates = {};
        
        allowedUpdates.forEach(field => {
          if (updateData[field] !== undefined) {
            updates[field] = updateData[field];
          }
        });

        if (Object.keys(updates).length === 0) {
          return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
        }

        updates.updatedAt = new Date();

        await db.collection('groupPosts').updateOne(
          { _id: new ObjectId(postId) },
          { $set: updates }
        );

        return NextResponse.json({ message: 'Post updated successfully' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating group post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE - Delete group post
export async function DELETE(request, { params }) {
  try {
    const { groupId, postId } = params;
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get user details
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get group and post
    const [group, post] = await Promise.all([
      db.collection('groups').findOne({ _id: new ObjectId(groupId) }),
      db.collection('groupPosts').findOne({ _id: new ObjectId(postId) })
    ]);
    
    if (!group || !post) {
      return NextResponse.json({ error: 'Group or post not found' }, { status: 404 });
    }

    const userMember = group.members.find(member => member.email === userEmail);
    const isAuthor = post.authorId === userEmail;
    const isAdmin = userMember?.role === 'admin';

    // Admin can delete any post, author can delete their own post
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Only admins or post authors can delete posts' }, { status: 403 });
    }

    await db.collection('groupPosts').deleteOne({ _id: new ObjectId(postId) });
    
    // Update group stats
    await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId) },
      { $inc: { 'stats.postCount': -1 } }
    );

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting group post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

// POST - Interact with post (like, comment)
export async function POST(request, { params }) {
  try {
    const { groupId, postId } = params;
    const body = await request.json();
    const { userEmail, action, content } = body;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get user details
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user is group member
    const group = await db.collection('groups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = group.members.some(
      member => member.email === userEmail && member.status === 'active'
    );

    if (!isMember) {
      return NextResponse.json({ error: 'Not a group member' }, { status: 403 });
    }

    switch (action) {
      case 'like':
        await db.collection('groupPosts').updateOne(
          { _id: new ObjectId(postId) },
          { $addToSet: { likes: userEmail } }
        );
        return NextResponse.json({ message: 'Post liked successfully' });

      case 'unlike':
        await db.collection('groupPosts').updateOne(
          { _id: new ObjectId(postId) },
          { $pull: { likes: userEmail } }
        );
        return NextResponse.json({ message: 'Post unliked successfully' });

      case 'comment':
        if (!content) {
          return NextResponse.json({ error: 'Comment content required' }, { status: 400 });
        }

        const comment = {
          _id: new ObjectId(),
          authorId: userEmail,
          authorName: user.displayName || user.name || userEmail.split('@')[0],
          content,
          createdAt: new Date()
        };

        await db.collection('groupPosts').updateOne(
          { _id: new ObjectId(postId) },
          { $push: { comments: comment } }
        );

        return NextResponse.json({ 
          message: 'Comment added successfully',
          comment
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error interacting with post:', error);
    return NextResponse.json({ error: 'Failed to interact with post' }, { status: 500 });
  }
}