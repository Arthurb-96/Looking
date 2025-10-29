export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import getClient from '@/app/lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const since = searchParams.get('since');
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail parameter is required' },
        { status: 400 }
      );
    }

    let client;
    try {
      client = await getClient();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', newMessages: [] },
        { status: 200 } // Return 200 with empty array to prevent client errors
      );
    }

    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    const query = {
      recipient: userEmail,
      read: false
    };

    if (since) {
      query.timestamp = { $gt: new Date(since) };
    }

    // Get new unread messages for this user
    let newMessages = [];
    let messagesWithNames = [];
    
    try {
      newMessages = await db.collection('messages') // Changed from 'chatMessages' to 'messages'
        .find(query)
        .sort({ timestamp: 1 })
        .limit(50)
        .toArray();

      // Get sender names for the messages
      const senderEmails = [...new Set(newMessages.map(msg => msg.sender))]; // Changed from senderEmail to sender
      const senders = await db.collection('users')
        .find({ email: { $in: senderEmails } })
        .toArray();

      // Add sender names to messages
      messagesWithNames = newMessages.map(message => {
        const sender = senders.find(s => s.email === message.sender); // Changed from senderEmail to sender
        return {
          ...message,
          senderName: sender?.displayName || sender?.name || message.sender.split('@')[0] // Changed from senderEmail to sender
        };
      });
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        { error: 'Database query failed', newMessages: [] },
        { status: 200 } // Return 200 with empty array to prevent client errors
      );
    }
    
    return NextResponse.json({ 
      success: true,
      newMessages: messagesWithNames,
      count: messagesWithNames.length
    });
    
  } catch (error) {
    console.error('Error fetching message notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}