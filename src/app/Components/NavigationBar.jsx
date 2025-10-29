"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../fireBaseDB";
import styles from "../CSS/mainLayout.module.css";

export default function NavigationBar() {
  const [user, setUser] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [show_results, setShowSearchResults] = useState(false);
  const [search_loading, setSearchLoading] = useState(false);
  const [has_unread, setHasUnreadMessages] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  // check for unread msgs
  useEffect(() => {
    if (user?.email && pathname !== '/messages') {
      checkUnreadMessages();
      const interval = setInterval(checkUnreadMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.email, pathname]);

  useEffect(() => {
    if (pathname === '/messages') {
      setHasUnreadMessages(false);
    }
  }, [pathname]);

  // listen for new message events
  useEffect(() => {
    const handleNewMessage = (event) => {
      if (pathname !== '/messages') {
        setHasUnreadMessages(true);
      }
    };

    const handleMessagesRead = () => {
      setHasUnreadMessages(false);
    };

    window.addEventListener('newMessageReceived', handleNewMessage);
    window.addEventListener('messagesRead', handleMessagesRead);
    
    return () => {
      window.removeEventListener('newMessageReceived', handleNewMessage);
      window.removeEventListener('messagesRead', handleMessagesRead);
    };
  }, [pathname]);

  const checkUnreadMessages = async () => {
    if (!user?.email || pathname === '/messages') return;
    
    const response = await fetch(`/api/chat/list?userEmail=${encodeURIComponent(user.email)}`);
    if (response.ok) {
      const data = await response.json();
      setHasUnreadMessages(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim() && user) {
        searchUsers(searchQuery.trim());
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, user]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(auth);
      router.push("/");
    } finally {
      setSigningOut(false);
    }
  };

  const navigateTo = (path) => {
    router.push(path);
  };

  const searchUsers = async (query) => {
    if (!user) return;
    
    setSearchLoading(true);
    const url = `/api/users/search?query=${encodeURIComponent(query)}&currentUser=${encodeURIComponent(user.email)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      setSearchResults(data.users || []);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleUserClick = (userEmail) => {
    setSearchQuery("");
    setShowSearchResults(false);
    router.push(`/user/${encodeURIComponent(userEmail)}`);
  };

  if (!user) {
    return null;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <div className={styles.navLeft}>
          <h1 
            className={styles.logo}
            onClick={() => navigateTo("/")}
            style={{ cursor: "pointer" }}
          >
            Looking
          </h1>

          {/* Search Bar */}
          <div className={styles.searchContainer} ref={searchRef}>
            <div className={styles.searchInputWrapper}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                className={styles.searchInput}
              />
              <div className={styles.searchIcon}>🔍</div>
            </div>
            
            {show_results && (
              <div className={styles.searchResults}>
                {search_loading ? (
                  <div className={styles.searchLoading}>Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className={styles.noResults}>No users found</div>
                ) : (
                  searchResults.map((foundUser) => (
                    <div 
                      key={foundUser.email} 
                      className={styles.searchResultItem}
                      onClick={() => handleUserClick(foundUser.email)}
                    >
                      <div className={styles.userAvatar}>
                        {foundUser.displayName?.charAt(0) || foundUser.email.charAt(0)}
                      </div>
                      <div className={styles.userDetails}>
                        <div className={styles.userName}>
                          {foundUser.displayName || foundUser.email.split('@')[0]}
                        </div>
                        <div className={styles.userEmail}>{foundUser.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          <div className={styles.navLinks}>
            <button 
              className={`${styles.navLink} ${pathname === "/" ? styles.active : ""}`}
              onClick={() => navigateTo("/")}
            >
              Home
            </button>
            <button 
              className={`${styles.navLink} ${pathname === "/explore" ? styles.active : ""}`}
              onClick={() => navigateTo("/explore")}
            >
              Explore
            </button>
            <button 
              className={`${styles.navLink} ${pathname === "/groups" ? styles.active : ""}`}
              onClick={() => navigateTo("/groups")}
            >
              Groups
            </button>
            <button 
              className={`${styles.navLink} ${pathname === "/messages" ? styles.active : ""}`}
              onClick={() => navigateTo("/messages")}
              style={{ position: 'relative' }}
            >
              Messages
              {has_unread && (
                <span className={styles.notificationDot}></span>
              )}
            </button>
            <button 
              className={`${styles.navLink} ${pathname === "/jobs" ? styles.active : ""}`}
              onClick={() => navigateTo("/jobs")}
            >
              Post Job
            </button>
            <button 
              className={`${styles.navLink} ${pathname === "/liked" ? styles.active : ""}`}
              onClick={() => navigateTo("/liked")}
            >
              Liked Jobs
            </button>
            <button 
              className={`${styles.navLink} ${pathname === "/search" ? styles.active : ""}`}
              onClick={() => navigateTo("/search")}
            >
              Advanced Search
            </button>
          </div>
        </div>
        
        <div className={styles.navRight}>
          <span className={styles.userGreeting}>
            Hi, {user?.displayName || user?.email?.split("@")[0] || "User"}
          </span>
          <button 
            onClick={handleSignOut} 
            className={styles.signOutBtn}
            disabled={signingOut}
          >
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </nav>
  );
}