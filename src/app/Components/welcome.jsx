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

  // helper to post and refresh feed
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
          <NavigationBar user={user} handleSignOut={handleSignOut} />

          <div className={layoutStyles.mainLayout}>
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

            <main className={layoutStyles.mainFeed}>
              <CreatePost user={user} onPost={handlePost} />
              <UserPostsFeed key={feedKey} username={user.email} />
            </main>

          </div>
          
        </>
      ) : (
        <AuthContainer />
      )}
    </>
  );
}
