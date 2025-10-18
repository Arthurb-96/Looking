import { NextResponse } from 'next/server';
import getClient from '../../../lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    // Fetch all chats where this user is a participant
    const chats = await db.collection('chats')
      .find({ 
        participants: userEmail 
      })
      .sort({ lastMessageTime: -1 }) // Most recent first
      .toArray();
    
    return NextResponse.json({ 
      success: true,
      chats: chats
    });
    
  } catch (error) {
    console.error('Error fetching chats list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}