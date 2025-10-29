'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../fireBaseDB';
import { useRouter } from 'next/navigation';
import NavigationBar from '../../Components/NavigationBar';
import MembersModal from '../../Components/MembersModal';
import AdminSettingsModal from '../../Components/AdminSettingsModal';
import GroupAnalytics from '../../Components/GroupAnalytics';
import styles from '../../CSS/groupDashboard.module.css';

const GroupDashboard = ({ params }) => {
  const [groupId, setGroupId] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setGroupId(resolvedParams.groupId);
    };
    getParams();
  }, [params]);
  
  const [group, setGroup] = useState(null);
  const [userMembership, setUserMembership] = useState({});
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [showCommentsForPost, setShowCommentsForPost] = useState({});
  const [commentTexts, setCommentTexts] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId, user]);

  const fetchGroupData = async () => {
    try {
      const [groupResponse, postsResponse, membersResponse] = await Promise.all([
        fetch(`/api/groups/${groupId}?userId=${user?.email || ''}`),
        fetch(`/api/groups/${groupId}/posts?userId=${user?.email || ''}`),
        fetch(`/api/groups/${groupId}/members`)
      ]);

      const [groupData, postsData, membersData] = await Promise.all([
        groupResponse.json(),
        postsResponse.json(),
        membersResponse.json()
      ]);

      if (groupResponse.ok) {
        setGroup(groupData.group);
        setUserMembership(groupData.userMembership);
      }

      if (postsResponse.ok) {
        setPosts(postsData.posts);
      }

      if (membersResponse.ok) {
        setMembers(membersData.members.filter(m => m.status === 'active'));
        setPendingMembers(membersData.members.filter(m => m.status === 'pending'));
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
          action: 'join'
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchGroupData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const leaveGroup = async () => {
    if (!user || !confirm('Are you sure you want to leave this group?')) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
          action: 'leave'
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        router.push('/groups');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() || !user) return;

    setPosting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postContent,
          authorId: user.email
        })
      });

      const data = await response.json();
      if (response.ok) {
        setPostContent('');
        fetchGroupData(); // Refresh posts
        if (!data.post.isApproved) {
          alert('Post submitted for approval');
        }
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setPosting(false);
    }
  };

  const deletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/posts/${postId}?userEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPosts(posts.filter(p => p._id !== postId));
        alert('Post deleted successfully');
        // Refresh group data to update post count
        fetchGroupData();
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const togglePostPin = async (postId, isPinned) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          action: isPinned ? 'unpin' : 'pin'
        })
      });

      if (response.ok) {
        fetchGroupData(); // Refresh to show updated pin status
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const toggleLike = async (postId) => {
    if (!user) return;

    try {
      const post = posts.find(p => p._id === postId);
      const isLiked = post?.likes?.includes(user.email);
      
      const response = await fetch(`/api/groups/${groupId}/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          action: isLiked ? 'unlike' : 'like'
        })
      });

      if (response.ok) {
        // Update posts state immediately for better UX
        setPosts(prevPosts => prevPosts.map(p => {
          if (p._id === postId) {
            const newLikes = isLiked 
              ? p.likes.filter(email => email !== user.email)
              : [...(p.likes || []), user.email];
            return { ...p, likes: newLikes };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const addComment = async (postId, content) => {
    if (!user || !content.trim()) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          action: 'comment',
          content: content.trim()
        })
      });

      if (response.ok) {
        fetchGroupData(); // Refresh to show new comment
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const manageMember = async (targetUserId, action, newRole = null) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
          action,
          targetUserId,
          newRole
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchGroupData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error managing member:', error);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <NavigationBar />
        <div className={styles.loading}>Loading group...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className={styles.container}>
        <NavigationBar />
        <div className={styles.error}>Group not found</div>
      </div>
    );
  }

  const canPost = userMembership.isMember && (
    group.settings?.allowMemberPosts || userMembership.isModerator
  );

  return (
    <div className={styles.container}>
      <NavigationBar user={user} />
      
      {/* Group Header */}
      <div className={styles.groupHeader}>
        <div className={styles.coverSection}>
          {group.coverImage ? (
            <img src={group.coverImage} alt={group.name} className={styles.coverImage} />
          ) : (
            <div className={styles.defaultCover}>
              <span className={styles.coverIcon}>👥</span>
            </div>
          )}
          
          <div className={styles.groupInfo}>
            <div className={styles.groupTitleSection}>
              <h1 className={styles.groupName}>{group.name}</h1>
              <span className={styles.privacyBadge}>
                {group.privacy === 'public' && '🌐 Public'}
                {group.privacy === 'private' && '🔒 Private'}
                {group.privacy === 'secret' && '🔐 Secret'}
              </span>
            </div>
            
            <p className={styles.groupDescription}>{group.description}</p>
            
            <div className={styles.groupStats}>
              <span className={styles.stat}>
                👥 {group.stats?.memberCount || 0} members
              </span>
              <span className={styles.stat}>
                📝 {group.stats?.postCount || 0} posts
              </span>
              <span className={styles.stat}>
                📅 Created {new Date(group.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.groupActions}>
          {!userMembership.isMember ? (
            <button className={styles.joinBtn} onClick={joinGroup}>
              {group.settings?.requireApproval ? 'Request to Join' : 'Join Group'}
            </button>
          ) : (
            <div className={styles.memberActions}>
              <span className={styles.memberBadge}>
                {userMembership.isAdmin && '👑 Admin'}
                {userMembership.role === 'moderator' && '⭐ Moderator'}
                {userMembership.role === 'member' && '✓ Member'}
              </span>
              
              {userMembership.isAdmin && (
                <button 
                  className={styles.settingsBtn}
                  onClick={() => setShowSettingsModal(true)}
                >
                  ⚙️ Settings
                </button>
              )}
              
              {userMembership.isAdmin && (
                <button 
                  className={styles.analyticsBtn}
                  onClick={() => setShowAnalytics(true)}
                >
                  📊 Analytics
                </button>
              )}
              
              <button 
                className={styles.membersBtn}
                onClick={() => setShowMembersModal(true)}
              >
                👥 Members ({members.length})
              </button>
              
              {!userMembership.isAdmin && (
                <button className={styles.leaveBtn} onClick={leaveGroup}>
                  Leave Group
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.leftColumn}>
          {/* Navigation Tabs */}
          <div className={styles.tabNavigation}>
            <button 
              className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              📝 Posts
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`}
              onClick={() => setActiveTab('about')}
            >
              ℹ️ About
            </button>
            {userMembership.isAdmin && pendingMembers.length > 0 && (
              <button 
                className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                ⏳ Pending ({pendingMembers.length})
              </button>
            )}
          </div>

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className={styles.postsSection}>
              {/* Create Post */}
              {canPost && (
                <div className={styles.createPost}>
                  <form onSubmit={createPost}>
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Share something with the group..."
                      className={styles.postTextarea}
                      rows={3}
                    />
                    <div className={styles.postActions}>
                      <span className={styles.postHint}>
                        {group.settings?.postApproval && !userMembership.isModerator
                          ? 'Posts require approval'
                          : 'Post will appear immediately'
                        }
                      </span>
                      <button 
                        type="submit" 
                        className={styles.postBtn}
                        disabled={posting || !postContent.trim()}
                      >
                        {posting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Posts List */}
              <div className={styles.postsContainer}>
                <div className={styles.postsList}>
                  {posts.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📝</span>
                      <h3>No posts yet</h3>
                      <p>Be the first to share something with the group!</p>
                    </div>
                  ) : (
                    <>
                      {posts.map(post => {
                    const isLiked = post.likes?.includes(user?.uid);
                    const showComments = showCommentsForPost[post._id] || false;
                    const commentText = commentTexts[post._id] || '';
                    
                    return (
                      <div key={post._id} className={`${styles.postCard} ${post.isPinned ? styles.pinned : ''}`}>
                        <div className={styles.postHeader}>
                          <div className={styles.postAuthor}>
                            <div className={styles.authorAvatar}>
                              {post.author?.displayName?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className={styles.authorInfo}>
                              <h4 className={styles.authorName}>
                                {post.author?.displayName || 'Unknown User'}
                              </h4>
                              <time className={styles.postDate}>
                                {new Date(post.createdAt).toLocaleDateString()}
                              </time>
                            </div>
                          </div>
                          
                          <div className={styles.postControls}>
                            {post.isPinned && <span className={styles.pinnedBadge}>📌 Pinned</span>}
                            
                            {(userMembership.isModerator || post.authorId === user?.uid) && (
                              <div className={styles.postMenu}>
                                {userMembership.isModerator && (
                                  <button 
                                    onClick={() => togglePostPin(post._id, post.isPinned)}
                                    className={styles.menuBtn}
                                  >
                                    {post.isPinned ? 'Unpin' : 'Pin'}
                                  </button>
                                )}
                                {(userMembership.isModerator || post.authorId === user?.email) && (
                                  <button 
                                    onClick={() => deletePost(post._id)}
                                    className={styles.deleteBtn}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className={styles.postContent}>
                          <p>{post.content}</p>
                          {post.images && post.images.map((image, index) => (
                            <img 
                              key={index} 
                              src={image} 
                              alt="Post content" 
                              className={styles.postImage}
                            />
                          ))}
                        </div>
                        
                        <div className={styles.postFooter}>
                          <div className={styles.postActions}>
                            <button 
                              onClick={() => toggleLike(post._id)}
                              className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
                            >
                              {isLiked ? '❤️' : '🤍'} {post.likes?.length || 0}
                            </button>
                            
                            <button 
                              onClick={() => setShowCommentsForPost(prev => ({
                                ...prev,
                                [post._id]: !showComments
                              }))}
                              className={styles.actionBtn}
                            >
                              💬 {post.comments?.length || 0}
                            </button>
                          </div>
                        </div>
                        
                        {/* Comments Section */}
                        {showComments && (
                          <div className={styles.commentsSection}>
                            {/* Add Comment */}
                            {userMembership.isMember && (
                              <div className={styles.addComment}>
                                <input
                                  type="text"
                                  value={commentText}
                                  onChange={(e) => setCommentTexts(prev => ({
                                    ...prev,
                                    [post._id]: e.target.value
                                  }))}
                                  placeholder="Write a comment..."
                                  className={styles.commentInput}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      addComment(post._id, commentText);
                                      setCommentTexts(prev => ({ ...prev, [post._id]: '' }));
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    addComment(post._id, commentText);
                                    setCommentTexts(prev => ({ ...prev, [post._id]: '' }));
                                  }}
                                  className={styles.commentBtn}
                                  disabled={!commentText.trim()}
                                >
                                  Post
                                </button>
                              </div>
                            )}
                            
                            {/* Comments List */}
                            <div className={styles.commentsList}>
                              {post.comments?.map((comment, index) => (
                                <div key={index} className={styles.comment}>
                                  <div className={styles.commentAvatar}>
                                    {comment.authorName?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                  <div className={styles.commentContent}>
                                    <div className={styles.commentHeader}>
                                      <span className={styles.commentAuthor}>
                                        {comment.authorName || 'Unknown User'}
                                      </span>
                                      <time className={styles.commentDate}>
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                      </time>
                                    </div>
                                    <p className={styles.commentText}>{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {posts.length > 3 && (
                    <div className={styles.scrollIndicator}>
                      <span>📋 {posts.length} posts total • Scroll for more</span>
                    </div>
                  )}
                </>
              )}
                </div>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className={styles.aboutSection}>
              <div className={styles.aboutCard}>
                <h3>About this group</h3>
                <p>{group.description}</p>
                
                <div className={styles.groupDetails}>
                  <div className={styles.detail}>
                    <strong>Category:</strong> {group.category}
                  </div>
                  <div className={styles.detail}>
                    <strong>Privacy:</strong> {group.privacy}
                  </div>
                  <div className={styles.detail}>
                    <strong>Created:</strong> {new Date(group.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {group.rules && group.rules.length > 0 && (
                  <div className={styles.rulesSection}>
                    <h4>Group Rules</h4>
                    <ol className={styles.rulesList}>
                      {group.rules.map((rule, index) => (
                        <li key={index} className={styles.rule}>{rule}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Members Tab (Admin Only) */}
          {activeTab === 'pending' && userMembership.isAdmin && (
            <div className={styles.pendingSection}>
              <h3>Pending Requests</h3>
              {pendingMembers.length === 0 ? (
                <p>No pending requests</p>
              ) : (
                <div className={styles.pendingList}>
                  {pendingMembers.map(member => (
                    <div key={member.userId} className={styles.pendingCard}>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberAvatar}>
                          {member.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h4>{member.displayName || 'Unknown User'}</h4>
                          <p>Requested {new Date(member.joinedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className={styles.pendingActions}>
                        <button 
                          onClick={() => manageMember(member.userId, 'approve')}
                          className={styles.approveBtn}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => manageMember(member.userId, 'reject')}
                          className={styles.rejectBtn}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className={styles.rightSidebar}>
          <div className={styles.membersPreview}>
            <h4>Members ({members.length})</h4>
            <div className={styles.membersList}>
              {members.slice(0, 6).map(member => (
                <div key={member.userId} className={styles.memberItem}>
                  <div className={styles.memberAvatar}>
                    {member.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className={styles.memberDetails}>
                    <span className={styles.memberName}>
                      {member.displayName || 'Unknown User'}
                    </span>
                    <span className={styles.memberRole}>{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
            {members.length > 6 && (
              <button 
                className={styles.viewAllBtn}
                onClick={() => setShowMembersModal(true)}
              >
                View all members
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members Modal */}
      <MembersModal 
        groupId={groupId}
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        userRole={userMembership.role}
      />

      {/* Admin Settings Modal */}
      <AdminSettingsModal 
        groupId={groupId}
        group={group}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpdate={fetchGroupData}
      />

      {/* Group Analytics Modal */}
      {showAnalytics && (
        <GroupAnalytics 
          groupId={groupId}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
};

export default GroupDashboard;