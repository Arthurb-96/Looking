import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    
    const query = url.searchParams.get('query');
    const userId = url.searchParams.get('userId');
    const category = url.searchParams.get('category');
    const privacy = url.searchParams.get('privacy');
    const memberCount = url.searchParams.get('memberCount');

    if (!query || !query.trim()) {
      return Response.json({ error: 'Search query is required' }, { status: 400 });
    }

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Build search criteria
    const searchCriteria = {
      $and: [
        {
          $or: [
            { name: { $regex: query.trim(), $options: 'i' } },
            { description: { $regex: query.trim(), $options: 'i' } }
          ]
        }
      ]
    };

    // Add category filter
    if (category && category !== 'all') {
      searchCriteria.$and.push({ category: category });
    }

    // Add privacy filter
    if (privacy && privacy !== 'all') {
      searchCriteria.$and.push({ privacy: privacy });
    }

    // Add member count filter
    if (memberCount && memberCount !== 'all') {
      let memberCountQuery = {};
      switch (memberCount) {
        case '1-10':
          memberCountQuery = { 'stats.memberCount': { $gte: 1, $lte: 10 } };
          break;
        case '11-50':
          memberCountQuery = { 'stats.memberCount': { $gte: 11, $lte: 50 } };
          break;
        case '51-100':
          memberCountQuery = { 'stats.memberCount': { $gte: 51, $lte: 100 } };
          break;
        case '100+':
          memberCountQuery = { 'stats.memberCount': { $gte: 100 } };
          break;
      }
      if (Object.keys(memberCountQuery).length > 0) {
        searchCriteria.$and.push(memberCountQuery);
      }
    }

    const groupsCollection = db.collection('groups');
    
    const groups = await groupsCollection.find(searchCriteria)
      .limit(50)
      .toArray();

    // Filter out secret groups unless user is a member
    const filteredGroups = await Promise.all(
      groups.map(async (group) => {
        // If group is secret, check if user is a member
        if (group.privacy === 'secret') {
          const isMember = group.members && group.members.some(member => 
            member.userId === userId || member.email === userId
          );
          if (!isMember) {
            return null; // Exclude this group
          }
        }
        
        return {
          _id: group._id,
          name: group.name,
          description: group.description,
          category: group.category,
          privacy: group.privacy,
          createdBy: group.createdBy,
          createdAt: group.createdAt,
          stats: group.stats || { memberCount: 0, postCount: 0 }
        };
      })
    );

    // Remove null entries (secret groups user isn't a member of)
    const finalGroups = filteredGroups.filter(group => group !== null);

    return Response.json({ 
      groups: finalGroups,
      total: finalGroups.length,
      searchQuery: query,
      filters: {
        category: category || 'all',
        privacy: privacy || 'all',
        memberCount: memberCount || 'all'
      }
    });

  } catch (error) {
    console.error('Error searching groups:', error);
    return Response.json(
      { error: 'Failed to search groups' }, 
      { status: 500 }
    );
  }
}