export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongodb';

export async function GET() {
  try {
    console.log('Checking database contents...');
    
    const { db } = await connectToDatabase();
    
    // List all collections
    const collections = await db.listCollections().toArray();
    
    // Count documents in each collection
    const collectionCounts = {};
    for (const collection of collections) {
      try {
        const count = await db.collection(collection.name).countDocuments();
        collectionCounts[collection.name] = count;
      } catch (error) {
        collectionCounts[collection.name] = `Error: ${error.message}`;
      }
    }
    
    // Get sample group with requireApproval info
    let sampleGroup = null;
    try {
      sampleGroup = await db.collection('groups').findOne({});
    } catch (error) {
      console.log('No groups collection or error:', error.message);
    }
    
    // Get sample users to see their structure
    let sampleUsers = null;
    try {
      sampleUsers = await db.collection('users').find({}).limit(2).toArray();
    } catch (error) {
      console.log('No users collection or error:', error.message);
    }
    
    return NextResponse.json({ 
      status: 'success',
      database: db.databaseName,
      collections: collections.map(c => c.name),
      collectionCounts,
      sampleGroup: sampleGroup ? {
        _id: sampleGroup._id,
        name: sampleGroup.name,
        requireApproval: sampleGroup.settings?.requireApproval,
        members: sampleGroup.members?.map(m => ({
          userId: m.userId,
          role: m.role,
          status: m.status
        }))
      } : null,
      sampleUsers: sampleUsers?.map(u => ({
        email: u.email,
        name: u.name,
        displayName: u.displayName,
        email: u.email,
        allFields: Object.keys(u)
      }))
    });
    
  } catch (error) {
    console.error('Database check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Database check failed',
      error: error.message
    }, { status: 500 });
  }
}