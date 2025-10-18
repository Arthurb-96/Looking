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
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  // Close search dropdown when clicking outside
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
    
    console.log('Searching for users with query:', query);
    setSearchLoading(true);
    try {
      const url = `/api/users/search?query=${encodeURIComponent(query)}&currentUser=${encodeURIComponent(user.email)}`;
      console.log('Search URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Search response:', response.status, data);
      
      if (response.ok) {
        setSearchResults(data.users || []);
        setShowSearchResults(true);
        console.log('Search results set:', data.users);
      } else {
        console.error("Failed to search users:", data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    console.log('Search input changed:', value);
    setSearchQuery(value);
  };

  const handleUserClick = (userEmail) => {
    setSearchQuery("");
    setShowSearchResults(false);
    router.push(`/user/${encodeURIComponent(userEmail)}`);
  };

  // Don't show navbar if user is not logged in (but show on all pages including home)
  if (!user) {
    console.log('NavigationBar not shown - user not logged in');
    return null;
  }

  console.log('NavigationBar rendering - pathname:', pathname, 'user:', user?.email);

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
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className={styles.searchResults}>
                {searchLoading ? (
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