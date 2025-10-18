"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../fireBaseDB";

// Auth pieces (keep whichever you actually use)
import AuthContainer from "./AuthContainer";
// import SignIn from "./SignIn";
// import SignUp from "./SignUp";
//import Register from "./Register";

import styles from "../CSS/auth.module.css";
import layoutStyles from "../CSS/mainLayout.module.css";
import UserContainer from "./userContainer";
import UserPostsFeed from "./UserPostsFeed";
import SideNavbar from "./SideNavbar";
import CreatePost from "./CreatePost";
import NavigationBar from "./NavigationBar";

export default function welcome() {
  const [user, setUser] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub; // proper cleanup
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(auth);
      alert("User signed out");
    } finally {
      setSigningOut(false);
    }
  };

  // Helper to post and refresh feed
  const [feedKey, setFeedKey] = useState(0);
  const handlePost = async (content) => {
    await fetch(`/user/${user.email}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    setFeedKey(k => k + 1);
  };

  return (
    <>
      {user ? (
        <>
          {/* Header Navigation */}
          <NavigationBar user={user} handleSignOut={handleSignOut} />

          {/* Main Layout */}
          <div className={layoutStyles.mainLayout}>
            {/* Left Sidebar */}
            <aside className={layoutStyles.leftSidebar}>
              <UserContainer user={user} />
              <div className={layoutStyles.quickActions}>
                <h3>Quick Actions</h3>
                <ul>
                  <li><a href="/jobs">Post Job/Service</a></li>
                  <li><a href="/explore">Explore Jobs</a></li>
                  <li><a href="/liked">Liked Jobs</a></li>
                  <li><a href="/messages">Messages</a></li>
                  <li><a href="/settings">Settings</a></li>
                </ul>
              </div>
            </aside>

            {/* Main Feed */}
            <main className={layoutStyles.mainFeed}>
              <CreatePost user={user} onPost={handlePost} />
              <UserPostsFeed username={user.email} key={feedKey} />
            </main>

            {/* Right Sidebar */}
            <aside className={layoutStyles.rightSidebar}>
              <div className={layoutStyles.suggestions}>
                <h3>Suggestions for you</h3>
                <div className={layoutStyles.suggestionItem}>
                  <div className={layoutStyles.suggestionProfile}>
                    <img src="/profile-default.png" alt="Profile" />
                    <div>
                      <h4>John Doe</h4>
                      <p>Software Engineer</p>
                    </div>
                  </div>
                  <button className={layoutStyles.connectBtn}>Connect</button>
                </div>
                <div className={layoutStyles.suggestionItem}>
                  <div className={layoutStyles.suggestionProfile}>
                    <img src="/profile-default.png" alt="Profile" />
                    <div>
                      <h4>Jane Smith</h4>
                      <p>Product Manager</p>
                    </div>
                  </div>
                  <button className={layoutStyles.connectBtn}>Connect</button>
                </div>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <AuthContainer />
      )}
    </>
  );
}
