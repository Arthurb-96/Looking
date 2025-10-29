'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import NavigationBar from '../Components/NavigationBar';
import styles from '../CSS/search.module.css';

const AdvancedSearchPage = () => {
  const [user, setUser] = useState(null);
  const [searchType, setSearchType] = useState('users'); // users or groups
  
  // User search filters
  const [userFilters, setUserFilters] = useState({
    query: '',
    location: 'all',
    category: 'all',
    role: 'all'
  });
  
  // Group search filters
  const [groupFilters, setGroupFilters] = useState({
    query: '',
    category: 'all',
    privacy: 'all',
    memberCount: 'all'
  });
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  const locations = ['all', 'Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat', 'Beer Sheva'];
  const userCategories = ['all', 'technology', 'design', 'business', 'marketing', 'healthcare', 'finance', 'education', 'other'];
  const roles = ['all', 'user', 'admin', 'moderator'];
  const groupCategories = ['all', 'Technology', 'Design', 'Business', 'Marketing', 'Healthcare', 'Finance', 'Education', 'Creative', 'Engineering', 'Sales', 'Other'];
  const privacyOptions = ['all', 'public', 'private', 'secret'];
  const memberCountOptions = ['all', '1-10', '11-50', '51-100', '100+'];

  const handleUserSearch = async () => {
    if (!user || !userFilters.query.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({
        query: userFilters.query,
        currentUser: user.email,
        ...(userFilters.location !== 'all' && { location: userFilters.location }),
        ...(userFilters.category !== 'all' && { category: userFilters.category }),
        ...(userFilters.role !== 'all' && { role: userFilters.role })
      });

      const response = await fetch(`/api/users/search?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.users || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSearch = async () => {
    if (!user || !groupFilters.query.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({
        query: groupFilters.query,
        userId: user.email,
        ...(groupFilters.category !== 'all' && { category: groupFilters.category.toLowerCase() }),
        ...(groupFilters.privacy !== 'all' && { privacy: groupFilters.privacy }),
        ...(groupFilters.memberCount !== 'all' && { memberCount: groupFilters.memberCount })
      });

      const response = await fetch(`/api/groups/search?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.groups || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching groups:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchType === 'users') {
      handleUserSearch();
    } else {
      handleGroupSearch();
    }
  };

  if (!user) {
    return (
      <>
        <NavigationBar />
        <div className={styles.container}>
          <div className={styles.error}>Please sign in to search</div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Advanced Search</h1>
          <div className={styles.searchTypeToggle}>
            <button 
              className={`${styles.toggleBtn} ${searchType === 'users' ? styles.active : ''}`}
              onClick={() => setSearchType('users')}
            >
              Search Users
            </button>
            <button 
              className={`${styles.toggleBtn} ${searchType === 'groups' ? styles.active : ''}`}
              onClick={() => setSearchType('groups')}
            >
              Search Groups
            </button>
          </div>
        </div>

        <div className={styles.searchForm}>
          {searchType === 'users' ? (
            // User Search Form
            <div className={styles.filtersSection}>
              <h3 className={styles.sectionTitle}>Search Users</h3>
              <div className={styles.filtersGrid}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Search Query *</label>
                  <input
                    type="text"
                    className={styles.filterInput}
                    placeholder="Enter name or email..."
                    value={userFilters.query}
                    onChange={(e) => setUserFilters(prev => ({ ...prev, query: e.target.value }))}
                  />
                </div>
                
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Location</label>
                  <select
                    className={styles.filterSelect}
                    value={userFilters.location}
                    onChange={(e) => setUserFilters(prev => ({ ...prev, location: e.target.value }))}
                  >
                    {locations.map(location => (
                      <option key={location} value={location}>
                        {location === 'all' ? 'All Locations' : location}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Category</label>
                  <select
                    className={styles.filterSelect}
                    value={userFilters.category}
                    onChange={(e) => setUserFilters(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {userCategories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Role</label>
                  <select
                    className={styles.filterSelect}
                    value={userFilters.role}
                    onChange={(e) => setUserFilters(prev => ({ ...prev, role: e.target.value }))}
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>
                        {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            // Group Search Form
            <div className={styles.filtersSection}>
              <h3 className={styles.sectionTitle}>Search Groups</h3>
              <div className={styles.filtersGrid}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Search Query *</label>
                  <input
                    type="text"
                    className={styles.filterInput}
                    placeholder="Enter group name..."
                    value={groupFilters.query}
                    onChange={(e) => setGroupFilters(prev => ({ ...prev, query: e.target.value }))}
                  />
                </div>
                
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Category</label>
                  <select
                    className={styles.filterSelect}
                    value={groupFilters.category}
                    onChange={(e) => setGroupFilters(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {groupCategories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Privacy</label>
                  <select
                    className={styles.filterSelect}
                    value={groupFilters.privacy}
                    onChange={(e) => setGroupFilters(prev => ({ ...prev, privacy: e.target.value }))}
                  >
                    {privacyOptions.map(privacy => (
                      <option key={privacy} value={privacy}>
                        {privacy === 'all' ? 'All Privacy Types' : privacy.charAt(0).toUpperCase() + privacy.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Member Count</label>
                  <select
                    className={styles.filterSelect}
                    value={groupFilters.memberCount}
                    onChange={(e) => setGroupFilters(prev => ({ ...prev, memberCount: e.target.value }))}
                  >
                    {memberCountOptions.map(count => (
                      <option key={count} value={count}>
                        {count === 'all' ? 'Any Size' : count + ' members'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <button 
            className={styles.searchBtn}
            onClick={handleSearch}
            disabled={loading || (searchType === 'users' ? !userFilters.query.trim() : !groupFilters.query.trim())}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Results Section */}
        <div className={styles.resultsSection}>
          {loading ? (
            <div className={styles.loading}>Searching...</div>
          ) : hasSearched ? (
            <>
              <h3 className={styles.resultsTitle}>
                Search Results ({results.length})
              </h3>
              {results.length === 0 ? (
                <div className={styles.noResults}>
                  No {searchType} found matching your criteria
                </div>
              ) : (
                <div className={styles.resultsGrid}>
                  {searchType === 'users' ? (
                    results.map(user => (
                      <div key={user._id} className={styles.userCard}>
                        <div className={styles.userInfo}>
                          <h4 className={styles.userName}>{user.displayName || user.name}</h4>
                          <p className={styles.userEmail}>{user.email}</p>
                          <div className={styles.userMeta}>
                            {user.location && <span className={styles.userLocation}>📍 {user.location}</span>}
                            {user.category && <span className={styles.userCategory}>🏷️ {user.category}</span>}
                            {user.role && <span className={styles.userRole}>👤 {user.role}</span>}
                          </div>
                        </div>
                        <button 
                          className={styles.viewBtn}
                          onClick={() => window.open(`/user/${encodeURIComponent(user.email)}`, '_blank')}
                        >
                          View Profile
                        </button>
                      </div>
                    ))
                  ) : (
                    results.map(group => (
                      <div key={group._id} className={styles.groupCard}>
                        <div className={styles.groupInfo}>
                          <h4 className={styles.groupName}>{group.name}</h4>
                          <p className={styles.groupDescription}>{group.description}</p>
                          <div className={styles.groupMeta}>
                            <span className={styles.groupCategory}>🏷️ {group.category}</span>
                            <span className={styles.groupPrivacy}>🔒 {group.privacy}</span>
                            <span className={styles.groupMembers}>👥 {group.stats?.memberCount || 0} members</span>
                          </div>
                        </div>
                        <button 
                          className={styles.viewBtn}
                          onClick={() => window.open(`/groups/${group._id}`, '_blank')}
                        >
                          View Group
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={styles.searchPrompt}>
              Enter your search criteria and click "Search" to find {searchType}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdvancedSearchPage;