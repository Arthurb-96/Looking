import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../fireBaseDB";
import styles from "../CSS/feed.module.css";

export default function UserPostsFeed({ username }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [deletingPosts, setDeletingPosts] = useState(new Set());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setCurrentUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      try {
        const res = await fetch(`/user/${username}/posts`);
        const data = await res.json();
        setPosts(data.posts || []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, [username]);

  async function handleAddPost(e) {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/user/${username}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost })
      });
      if (res.ok) {
        const data = await res.json();
        setNewPost("");
        // add post to the beginning of the array
        const newPostObj = { 
          content: newPost, 
          createdAt: new Date(), 
          _id: data.postId 
        };
        setPosts((prev) => [newPostObj, ...prev]);
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleDeletePost(postId) {
    if (!postId || !window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    setDeletingPosts(prev => new Set([...prev, postId]));
    
    try {
      const res = await fetch(`/user/${username}/posts?postId=${encodeURIComponent(postId)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        // remove post
        setPosts(prev => prev.filter(post => post._id !== postId));
      } else {
        const errorData = await res.json();
        alert(`Failed to delete post: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert("Failed to delete post. Please try again.");
    } finally {
      setDeletingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  }

  // check  if user is the owner of the profile
  const isOwnProfile = currentUser?.email === username;

  return (
    <div className={styles.feedWrapper}>
      <h2 className={styles.feedTitle}>Posts</h2>
      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : posts.length === 0 ? (
        <div className={styles.noPosts}>You haven't posted yet</div>
      ) : (
        <ul className={styles.postsList}>
          {posts.map((post) => {
            const isDeleting = deletingPosts.has(post._id);
            
            return (
              <li key={post._id} className={styles.postItem}>
                <div className={styles.postHeader}>
                  <div className={styles.postContent}>{post.content}</div>
                  {isOwnProfile && post._id && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeletePost(post._id)}
                      disabled={isDeleting}
                      title="Delete post"
                    >
                      {isDeleting ? "⏳" : "🗑️"}
                    </button>
                  )}
                </div>
                <div className={styles.postDate}>
                  {new Date(post.createdAt).toLocaleString()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      
    </div>
  );
}
