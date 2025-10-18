"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../fireBaseDB";
import NavigationBar from "../../Components/NavigationBar";
import styles from "../../CSS/mainLayout.module.css";
import profileStyles from "../../CSS/userProfile.module.css";

export default function UserProfile() {
  const params = useParams();
  const router = useRouter();
  const username = decodeURIComponent(params.username);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setUserPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(username)}&currentUser=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        const user = data.users.find(u => u.email === username);
        if (user) {
          setIsFollowing(user.isFollowing);
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
        setFollowerCount(followersData.count || 0);
      }

      // Fetch following count (how many people this user follows)
      const followingResponse = await fetch(`/api/users/following?user=${encodeURIComponent(username)}`);
      if (followingResponse.ok) {
        const followingData = await followingResponse.json();
        setFollowingCount(followingData.count || 0);
      }
    } catch (error) {
      console.error("Error fetching follow counts:", error);
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

  if (loading) {
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
      <div className={styles.mainLayout}>
        <div className={profileStyles.profileContainer}>
          <div className={profileStyles.profileHeader}>
            <div className={profileStyles.profileAvatar}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className={profileStyles.profileInfo}>
              <h1 className={profileStyles.profileName}>{displayName}</h1>
              <p className={profileStyles.profileEmail}>{username}</p>
              <div className={profileStyles.profileStats}>
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
              {!isOwnProfile && (
                <button 
                  className={`${profileStyles.followBtn} ${isFollowing ? profileStyles.following : ''}`}
                  onClick={handleToggleFollow}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          <div className={profileStyles.profileContent}>
            <div className={profileStyles.postsSection}>
              <h2 className={profileStyles.sectionTitle}>
                {isOwnProfile ? 'Your Posts' : `${displayName}'s Posts`}
              </h2>
              {userPosts.length === 0 ? (
                <div className={profileStyles.noPosts}>
                  {isOwnProfile ? 'You haven\'t posted anything yet.' : 'No posts to show.'}
                </div>
              ) : (
                <div className={profileStyles.postsGrid}>
                  {userPosts.map((post, index) => (
                    <div key={index} className={profileStyles.postCard}>
                      <div className={profileStyles.postContent}>
                        {post.content}
                      </div>
                      <div className={profileStyles.postMeta}>
                        <span className={profileStyles.postDate}>
                          {new Date(post.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}