import React, { useState, useEffect } from "react";
import styles from "../CSS/feed.module.css";

export default function UserPostsFeed({ username }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

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
        setNewPost("");
        // Refresh posts
        const data = await res.json();
        setPosts((prev) => [
          { content: newPost, createdAt: new Date(), _id: data.postId },
          ...prev
        ]);
      }
    } finally {
      setPosting(false);
    }
  }

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
            // Use MongoDB _id if available, else fallback to a hash of createdAt and content
            const key = post._id ? post._id : `${post.createdAt}-${post.content}`;
            return (
              <li key={key} className={styles.postItem}>
                <div className={styles.postContent}>{post.content}</div>
                <div className={styles.postDate}>{new Date(post.createdAt).toLocaleString()}</div>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={handleAddPost} className={styles.addPostForm}>
        <textarea
          className={styles.postInput}
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
        />
        <button type="submit" className={styles.addPostButton} disabled={posting || !newPost.trim()}>
          Add a post
        </button>
      </form>
    </div>
  );
}
