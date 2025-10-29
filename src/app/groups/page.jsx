'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import CreateGroup from '../Components/CreateGroup';
import NavigationBar from '../Components/NavigationBar';
import styles from '../CSS/groups.module.css';

const GroupsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = [
    'All',
    'Technology',
    'Design',
    'Business',
    'Marketing',
    'Healthcare',
    'Finance',
    'Education',
    'Creative',
    'Engineering',
    'Sales',
    'Other'
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchGroups();
    if (user) {
      fetchMyGroups();
    }
  }, [user, selectedCategory]);

  const fetchGroups = async () => {
    try {
      const categoryParam = selectedCategory && selectedCategory !== 'All' 
        ? `?category=${selectedCategory.toLowerCase()}` 
        : '';
      
      const response = await fetch(`/api/groups${categoryParam}`);
      const data = await response.json();
      
      if (response.ok) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const response = await fetch(`/api/groups?userId=${user.email}&type=joined`);
      const data = await response.json();
      
      if (response.ok) {
        setMyGroups(data.groups);
      }
    } catch (error) {
      console.error('Error fetching my groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId) => {
    if (!user) {
      alert('Please sign in to join groups');
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.email,
          action: 'join'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        fetchGroups();
        fetchMyGroups();
      } else {
        alert(data.error || 'Failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group');
    }
  };

  const isGroupMember = (group) => {
    return group.members?.some(member => member.userId === user?.email);
  };

  const getGroupRole = (group) => {
    const member = group.members?.find(member => member.userId === user?.email);
    return member?.role || null;
  };

  const renderGroupCard = (group, showJoinButton = true) => {
    const isMember = isGroupMember(group);
    const userRole = getGroupRole(group);
    
    return (
      <div 
        key={group._id} 
        className={styles.groupCard}
        onClick={() => router.push(`/groups/${group._id}`)}
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.groupHeader}>
          <div className={styles.groupCover}>
            {group.coverImage ? (
              <img src={group.coverImage} alt={group.name} />
            ) : (
              <div className={styles.defaultCover}>
                <span className={styles.groupIcon}>👥</span>
              </div>
            )}
            <div className={styles.privacyBadge}>
              {group.privacy === 'private' && '🔒'}
              {group.privacy === 'secret' && '🔐'}
            </div>
          </div>
          
          <div className={styles.groupInfo}>
            <h3 className={styles.groupName}>{group.name}</h3>
            <p className={styles.groupCategory}>{group.category}</p>
            <p className={styles.groupDescription}>{group.description}</p>
            
            <div className={styles.groupStats}>
              <span className={styles.stat}>
                👥 {group.stats?.memberCount || 0} members
              </span>
              <span className={styles.stat}>
                📝 {group.stats?.postCount || 0} posts
              </span>
            </div>
          </div>
        </div>

        <div className={styles.groupFooter}>
          {isMember && (
            <span className={styles.memberBadge}>
              {userRole === 'admin' && '👑 Admin'}
              {userRole === 'moderator' && '⭐ Moderator'}
              {userRole === 'member' && '✓ Member'}
            </span>
          )}
          
          <div className={styles.groupActions}>
            {isMember ? (
              <button 
                className={styles.viewBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/groups/${group._id}`);
                }}
              >
                View Group
              </button>
            ) : (
              showJoinButton && (
                <button 
                  className={styles.joinBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    joinGroup(group._id);
                  }}
                >
                  {group.settings?.requireApproval ? 'Request to Join' : 'Join Group'}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading groups...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <NavigationBar user={user} />
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Groups</h1>
          <p className={styles.pageDescription}>
            Discover communities, share knowledge, and connect with professionals
          </p>
          
          {user && (
            <button 
              className={styles.createBtn}
              onClick={() => setShowCreateModal(true)}
            >
              + Create Group
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <div className={styles.tabNav}>
            <button 
              className={`${styles.tab} ${activeTab === 'discover' ? styles.active : ''}`}
              onClick={() => setActiveTab('discover')}
            >
              🔍 Discover
            </button>
            {user && (
              <button 
                className={`${styles.tab} ${activeTab === 'myGroups' ? styles.active : ''}`}
                onClick={() => setActiveTab('myGroups')}
              >
                👥 My Groups ({myGroups.length})
              </button>
            )}
          </div>

          {activeTab === 'discover' && (
            <div className={styles.filters}>
              <h4 className={styles.filterTitle}>Categories</h4>
              <div className={styles.categoryList}>
                {categories.map(category => (
                  <button
                    key={category}
                    className={`${styles.categoryBtn} ${
                      selectedCategory === category ? styles.active : ''
                    }`}
                    onClick={() => setSelectedCategory(category === 'All' ? '' : category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.main}>
          {activeTab === 'discover' && (
            <div className={styles.groupsGrid}>
              <h2 className={styles.sectionTitle}>
                {selectedCategory ? `${selectedCategory} Groups` : 'All Groups'}
              </h2>
              
              {groups.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🔍</span>
                  <h3>No groups found</h3>
                  <p>Try adjusting your filters or create the first group in this category!</p>
                </div>
              ) : (
                <div className={styles.cardsGrid}>
                  {groups.map(group => renderGroupCard(group))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'myGroups' && user && (
            <div className={styles.groupsGrid}>
              <h2 className={styles.sectionTitle}>My Groups</h2>
              
              {myGroups.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>👥</span>
                  <h3>No groups yet</h3>
                  <p>Join some groups to see them here!</p>
                  <button 
                    className={styles.discoverBtn}
                    onClick={() => setActiveTab('discover')}
                  >
                    Discover Groups
                  </button>
                </div>
              ) : (
                <div className={styles.cardsGrid}>
                  {myGroups.map(group => renderGroupCard(group, false))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateGroup onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

export default GroupsPage;