import { NextResponse } from 'next/server';
import getClient from '../../../lib/mongodb';

export async function POST(request) {
  try {
    const { chatId, senderEmail, recipientEmail, message, jobContext } = await request.json();
    
    if (!chatId || !senderEmail || !recipientEmail || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    const messageData = {
      chatId,
      senderEmail,
      recipientEmail,
      message,
      jobContext,
      timestamp: new Date(),
      read: false
    };

    // Insert the message
    const result = await db.collection('chatMessages').insertOne(messageData);
    
    // Update or create chat metadata
    await db.collection('chats').updateOne(
      { chatId },
      {
        $set: {
          participants: [senderEmail, recipientEmail],
          lastMessage: message,
          lastMessageTime: new Date(),
          jobContext
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    return NextResponse.json({ 
      success: true, 
      messageId: result.insertedId,
      message: 'Message sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    // Fetch messages for this chat, sorted by timestamp
    const messages = await db.collection('chatMessages')
      .find({ chatId })
      .sort({ timestamp: 1 })
      .limit(100) // Limit to last 100 messages
      .toArray();
    
    return NextResponse.json({ 
      success: true,
      messages: messages
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mark messages as read
export async function PUT(request) {
  try {
    const { chatId, userEmail } = await request.json();
    
    if (!chatId || !userEmail) {
      return NextResponse.json(
        { error: 'Chat ID and user email are required' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    // Mark all messages in this chat as read for this user
    await db.collection('chatMessages').updateMany(
      { 
        chatId, 
        recipientEmail: userEmail,
        read: false 
      },
      { 
        $set: { read: true } 
      }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Messages marked as read'
    });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}