"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../fireBaseDB";
import NavigationBar from "../../Components/NavigationBar";
import Chat from "../../Components/Chat";
import styles from "../../CSS/mainLayout.module.css";
import profileStyles from "../../CSS/userProfile.module.css";

export default function UserProfile() {
  const params = useParams();
  const router = useRouter();
  const [username, setUsername] = useState(null);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [deletingPosts, setDeletingPosts] = useState(new Set());

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setUsername(decodeURIComponent(resolvedParams.username));
    };
    getParams();
  }, [params]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setCurrentUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser && username) {
      fetchUserProfile();
      fetchUserPosts();
      checkFollowStatus();
      fetchFollowCounts();
    }
  }, [currentUser, username]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users?email=${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        setProfileUser(data.user);
      } else {
        setError("User not found");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError("Failed to load user profile");
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await fetch(`/user/${encodeURIComponent(username)}/posts`);
      if (response.ok) {
        const data = await response.json();
        // Add safety check for posts array
        setUserPosts(Array.isArray(data.posts) ? data.posts : []);
      } else {
        console.error("Failed to fetch user posts:", response.status, response.statusText);
        setUserPosts([]);
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
      setUserPosts([]);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(username)}&currentUser=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        // Add safety check for data.users
        if (data && data.users && Array.isArray(data.users)) {
          const user = data.users.find(u => u.email === username);
          if (user) {
            setIsFollowing(user.isFollowing);
          }
        } else {
          console.log("No users array in response:", data);
        }
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      // Fetch follower count (how many people follow this user)
      const followersResponse = await fetch(`/api/users/followers?targetUser=${encodeURIComponent(username)}`);
      if (followersResponse.ok) {
        const followersData = await followersResponse.json();
        setFollowerCount(typeof followersData.count === 'number' ? followersData.count : 0);
      } else {
        setFollowerCount(0);
      }

      // Fetch following count (how many people this user follows)
      const followingResponse = await fetch(`/api/users/following?user=${encodeURIComponent(username)}`);
      if (followingResponse.ok) {
        const followingData = await followingResponse.json();
        setFollowingCount(typeof followingData.count === 'number' ? followingData.count : 0);
      } else {
        setFollowingCount(0);
      }
    } catch (error) {
      console.error("Error fetching follow counts:", error);
      setFollowerCount(0);
      setFollowingCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) return;
    
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch('/api/users/follow', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followerEmail: currentUser.email,
          targetUserEmail: username
        })
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
    }
  };

  const handleSendMessage = () => {
    // Open the small chat window at the bottom
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const handleDeletePost = async (postId) => {
    if (!postId || !window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    setDeletingPosts(prev => new Set([...prev, postId]));
    
    try {
      const res = await fetch(`/user/${encodeURIComponent(username)}/posts?postId=${encodeURIComponent(postId)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        // Remove post from UI
        setUserPosts(prev => prev.filter(post => post._id !== postId));
      } else {
        const errorData = await res.json();
        alert(`Failed to delete post: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setDeletingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!currentUser) {
    return <div>Please log in to view profiles</div>;
  }

  if (loading || !username) {
    return (
      <>
        <NavigationBar user={currentUser} handleSignOut={handleSignOut} />
        <div className={styles.mainLayout}>
          <div className={profileStyles.loadingContainer}>
            <div className={profileStyles.loading}>Loading profile...</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavigationBar user={currentUser} handleSignOut={handleSignOut} />
        <div className={styles.mainLayout}>
          <div className={profileStyles.errorContainer}>
            <div className={profileStyles.error}>{error}</div>
            <button onClick={() => router.back()} className={profileStyles.backBtn}>
              Go Back
            </button>
          </div>
        </div>
      </>
    );
  }

  const displayName = profileUser?.displayName || username.split('@')[0];
  const isOwnProfile = currentUser.email === username;

  return (
    <>
      <NavigationBar user={currentUser} handleSignOut={handleSignOut} />
      <div className={profileStyles.pageWrapper}>
        {/* Hero Section with Cover Photo */}
        <div className={profileStyles.heroSection}>
          <div className={profileStyles.coverPhoto}>
            <div className={profileStyles.coverOverlay}></div>
          </div>
          
          {/* Profile Header */}
          <div className={profileStyles.profileHeader}>
            <div className={profileStyles.headerContent}>
              <div className={profileStyles.profileImageContainer}>
                <div className={profileStyles.profileAvatar}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className={profileStyles.profileInfo}>
                <div className={profileStyles.nameSection}>
                  <h1 className={profileStyles.profileName}>{displayName}</h1>
                  <p className={profileStyles.profileTitle}>
                    {profileUser?.role || 'Member'} • {profileUser?.location || 'Location not specified'}
                  </p>
                </div>
                
                <div className={profileStyles.statsRow}>
                  <div className={profileStyles.stat}>
                    <span className={profileStyles.statNumber}>{userPosts.length}</span>
                    <span className={profileStyles.statLabel}>Posts</span>
                  </div>
                  <div className={profileStyles.stat}>
                    <span className={profileStyles.statNumber}>{followerCount}</span>
                    <span className={profileStyles.statLabel}>Followers</span>
                  </div>
                  <div className={profileStyles.stat}>
                    <span className={profileStyles.statNumber}>{followingCount}</span>
                    <span className={profileStyles.statLabel}>Following</span>
                  </div>
                </div>
              </div>
              
              <div className={profileStyles.actionButtons}>
                {!isOwnProfile ? (
                  <>
                    <button 
                      className={`${profileStyles.followBtn} ${isFollowing ? profileStyles.following : ''}`}
                      onClick={handleToggleFollow}
                    >
                      {isFollowing ? '✓ Following' : '+ Follow'}
                    </button>
                    <button 
                      className={profileStyles.messageBtn}
                      onClick={handleSendMessage}
                    >
                      💬 Message
                    </button>
                    <button className={profileStyles.moreBtn}>
                      ⋯
                    </button>
                  </>
                ) : (
                  <button className={profileStyles.editBtn}>
                    ✏️ Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={profileStyles.mainContent}>
          <div className={profileStyles.contentGrid}>
            {/* Left Sidebar - About */}
            <div className={profileStyles.leftSidebar}>
              <div className={profileStyles.aboutCard}>
                <h3 className={profileStyles.cardTitle}>About</h3>
                <div className={profileStyles.aboutContent}>
                  <div className={profileStyles.aboutItem}>
                    <span className={profileStyles.aboutIcon}>📧</span>
                    <span className={profileStyles.aboutText}>{username}</span>
                  </div>
                  {profileUser?.phone && (
                    <div className={profileStyles.aboutItem}>
                      <span className={profileStyles.aboutIcon}>📱</span>
                      <span className={profileStyles.aboutText}>{profileUser.phone}</span>
                    </div>
                  )}
                  {profileUser?.location && (
                    <div className={profileStyles.aboutItem}>
                      <span className={profileStyles.aboutIcon}>📍</span>
                      <span className={profileStyles.aboutText}>{profileUser.location}</span>
                    </div>
                  )}
                  <div className={profileStyles.aboutItem}>
                    <span className={profileStyles.aboutIcon}>⭐</span>
                    <span className={profileStyles.aboutText}>{profileUser?.category || 'General'}</span>
                  </div>
                </div>
              </div>

              {/* Activity Card */}
              <div className={profileStyles.activityCard}>
                <h3 className={profileStyles.cardTitle}>Activity</h3>
                <div className={profileStyles.activityStats}>
                  <div className={profileStyles.activityItem}>
                    <span className={profileStyles.activityNumber}>{followerCount}</span>
                    <span className={profileStyles.activityLabel}>followers</span>
                  </div>
                  <div className={profileStyles.activityItem}>
                    <span className={profileStyles.activityNumber}>{userPosts.length}</span>
                    <span className={profileStyles.activityLabel}>posts published</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Feed */}
            <div className={profileStyles.mainFeed}>
              <div className={profileStyles.postsHeader}>
                <h2 className={profileStyles.postsTitle}>
                  {isOwnProfile ? 'Your Posts' : 'Recent Posts'}
                </h2>
                <div className={profileStyles.postsFilter}>
                  <button className={`${profileStyles.filterBtn} ${profileStyles.active}`}>
                    All Posts
                  </button>
                  <button className={profileStyles.filterBtn}>
                    Recent
                  </button>
                </div>
              </div>

              {userPosts.length === 0 ? (
                <div className={profileStyles.noPosts}>
                  <div className={profileStyles.noPostsIcon}>📝</div>
                  <h3 className={profileStyles.noPostsTitle}>
                    {isOwnProfile ? 'Share your first post' : 'No posts yet'}
                  </h3>
                  <p className={profileStyles.noPostsText}>
                    {isOwnProfile 
                      ? 'Start sharing your thoughts with the community!' 
                      : `${displayName} hasn't shared any posts yet.`
                    }
                  </p>
                </div>
              ) : (
                <div className={profileStyles.postsGrid}>
                  {userPosts.map((post, index) => {
                    const postId = post._id || post.timestamp || index;
                    const isDeleting = deletingPosts.has(postId);
                    
                    return (
                      <article key={postId} className={profileStyles.postCard}>
                        <div className={profileStyles.postHeader}>
                          <div className={profileStyles.postAuthor}>
                            <div className={profileStyles.postAvatar}>
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className={profileStyles.postAuthorInfo}>
                              <h4 className={profileStyles.postAuthorName}>{displayName}</h4>
                              <time className={profileStyles.postDate}>
                                {new Date(post.timestamp || post.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </time>
                            </div>
                          </div>
                          
                          {isOwnProfile && post._id ? (
                            <button 
                              className={profileStyles.deleteBtn}
                              onClick={() => handleDeletePost(post._id)}
                              disabled={isDeleting}
                              title="Delete post"
                            >
                              {isDeleting ? "⏳" : "🗑️"}
                            </button>
                          ) : (
                            <button className={profileStyles.postMenu}>⋯</button>
                          )}
                        </div>
                      
                      <div className={profileStyles.postContent}>
                        {post.content}
                      </div>
                      
                      <div className={profileStyles.postActions}>
                        <button className={profileStyles.actionBtn}>
                          <span className={profileStyles.actionIcon}>👍</span>
                          <span>Like</span>
                        </button>
                        <button className={profileStyles.actionBtn}>
                          <span className={profileStyles.actionIcon}>💬</span>
                          <span>Comment</span>
                        </button>
                        <button className={profileStyles.actionBtn}>
                          <span className={profileStyles.actionIcon}>📤</span>
                          <span>Share</span>
                        </button>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
            </div>

           
          </div>
        </div>
      </div>
      
      {/* Chat Component - Fixed at bottom */}
      <Chat 
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        recipientEmail={username}
        jobTitle={`Direct Message with ${displayName}`}
      />
    </>
  );
}