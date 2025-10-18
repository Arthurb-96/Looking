import { NextResponse } from 'next/server';
import getClient from '../../../lib/mongodb';

export async function POST(request) {
  try {
    const { userEmail, jobId, jobData, action } = await request.json();
    
    if (!userEmail || !jobId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    if (action === 'like') {
      // Add to liked jobs
      const result = await db.collection('likedJobs').updateOne(
        { userEmail: userEmail },
        { 
          $addToSet: { 
            jobs: {
              jobId: jobId,
              jobData: jobData,
              likedAt: new Date()
            }
          }
        },
        { upsert: true }
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Job liked successfully',
        result 
      });
    } else if (action === 'dislike') {
      // Add to disliked jobs (optional - for analytics or to avoid showing again)
      const result = await db.collection('dislikedJobs').updateOne(
        { userEmail: userEmail },
        { 
          $addToSet: { 
            jobs: {
              jobId: jobId,
              jobData: jobData,
              dislikedAt: new Date()
            }
          }
        },
        { upsert: true }
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Job disliked successfully',
        result 
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error handling job preference:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch user's liked jobs
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
    
    const likedJobs = await db.collection('likedJobs').findOne(
      { userEmail: userEmail }
    );
    
    return NextResponse.json({ 
      success: true,
      likedJobs: likedJobs?.jobs || [] 
    });
    
  } catch (error) {
    console.error('Error fetching liked jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a job from liked jobs
export async function DELETE(request) {
  try {
    const { userEmail, jobId } = await request.json();
    
    if (!userEmail || !jobId) {
      return NextResponse.json(
        { error: 'User email and job ID are required' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    
    const result = await db.collection('likedJobs').updateOne(
      { userEmail: userEmail },
      { 
        $pull: { 
          jobs: { jobId: jobId }
        }
      }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Job removed from liked jobs',
      result 
    });
    
  } catch (error) {
    console.error('Error removing liked job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}