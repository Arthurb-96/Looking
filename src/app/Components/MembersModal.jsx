'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import styles from '../CSS/membersModal.module.css';

const MembersModal = ({ groupId, isOpen, onClose, userRole }) => {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOpen && groupId) {
      fetchMembers();
    }
  }, [isOpen, groupId]);

  const fetchMembers = async () => {
   
      const response = await fetch(`/api/groups/${groupId}/members`);
      const data = await response.json();
      
      if (response.ok) {
        setMembers(data.members.filter(m => m.status === 'active'));
      }
   
      setLoading(false);
    
  };

  const manageMember = async (targetUserId, action, newRole = null) => {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
          action,
          targetUserId,
          newRole
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchMembers(); // Refresh the list
      } else {
        alert(data.error);
      }
    
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#ff9800';
      case 'moderator': return '#2196f3';
      default: return '#4caf50';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'moderator': return '⭐';
      default: return '👤';
    }
  };

  const canManageRole = (targetRole) => {
    if (userRole !== 'admin') return false;
    return targetRole !== 'admin'; // Can't demote other admins
  };

  const canBanMember = (targetRole) => {
    if (userRole === 'member') return false;
    if (userRole === 'moderator' && targetRole === 'admin') return false;
    if (targetRole === 'admin') return false;
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Group Members ({members.length})</h2>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.modalFilters}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            className={styles.roleFilter}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="moderator">Moderators</option>
            <option value="member">Members</option>
          </select>
        </div>

        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loading}>Loading members...</div>
          ) : (
            <div className={styles.membersList}>
              {filteredMembers.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>👥</span>
                  <p>No members found</p>
                </div>
              ) : (
                filteredMembers.map(member => (
                  <div key={member.userId} className={styles.memberCard}>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberAvatar}>
                        {member.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      
                      <div className={styles.memberDetails}>
                        <div className={styles.memberName}>
                          {member.displayName || 'Unknown User'}
                          {member.userId === user?.email && (
                            <span className={styles.youBadge}>(You)</span>
                          )}
                        </div>
                        
                        <div className={styles.memberMeta}>
                          <span 
                            className={styles.roleBadge}
                            style={{ backgroundColor: getRoleColor(member.role) }}
                          >
                            {getRoleIcon(member.role)} {member.role}
                          </span>
                          <span className={styles.joinDate}>
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {member.email && (
                          <div className={styles.memberEmail}>{member.email}</div>
                        )}
                      </div>
                    </div>

                    {/* Admin Controls */}
                    {(userRole === 'admin' || userRole === 'moderator') && 
                     member.userId !== user?.email && (
                      <div className={styles.memberActions}>
                        {/* Role Management (Admin only) */}
                        {canManageRole(member.role) && (
                          <div className={styles.roleActions}>
                            <select 
                              value={member.role}
                              onChange={(e) => manageMember(member.userId, 'changeRole', e.target.value)}
                              className={styles.roleSelect}
                            >
                              <option value="member">Member</option>
                              <option value="moderator">Moderator</option>
                            </select>
                          </div>
                        )}

                        {/* Ban/Kick Actions */}
                        {canBanMember(member.role) && (
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => manageMember(member.userId, 'ban')}
                              className={styles.banBtn}
                              title="Ban member"
                            >
                              🚫 Ban
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.membersSummary}>
            <span className={styles.summaryItem}>
              👑 {members.filter(m => m.role === 'admin').length} Admins
            </span>
            <span className={styles.summaryItem}>
              ⭐ {members.filter(m => m.role === 'moderator').length} Moderators
            </span>
            <span className={styles.summaryItem}>
              👤 {members.filter(m => m.role === 'member').length} Members
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembersModal;