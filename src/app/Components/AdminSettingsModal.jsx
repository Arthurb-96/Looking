"use clien";

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import styles from '../CSS/adminSettings.module.css';

const AdminSettingsModal = ({ groupId, group, isOpen, onClose, onUpdate }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    privacy: 'public',
    coverImage: '',
    rules: [''],
    settings: {
      requireApproval: false,
      allowMemberPosts: true,
      allowFileSharing: true,
      allowInvites: true,
      postApproval: false
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  const categories = [
    'Technology', 'Design', 'Business', 'Marketing', 'Healthcare',
    'Finance', 'Education', 'Creative', 'Engineering', 'Sales', 'Other'
  ];

  useEffect(() => {
    if (group && isOpen) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        category: group.category || '',
        privacy: group.privacy || 'public',
        coverImage: group.coverImage || '',
        rules: group.rules && group.rules.length > 0 ? group.rules : [''],
        settings: {
          requireApproval: group.settings?.requireApproval || false,
          allowMemberPosts: group.settings?.allowMemberPosts !== false,
          allowFileSharing: group.settings?.allowFileSharing !== false,
          allowInvites: group.settings?.allowInvites !== false,
          postApproval: group.settings?.postApproval || false,
          ...group.settings
        }
      });
    }
  }, [group, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('settings.')) {
      const settingName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingName]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleRuleChange = (index, value) => {
    const newRules = [...formData.rules];
    newRules[index] = value;
    setFormData(prev => ({ ...prev, rules: newRules }));
  };

  const addRule = () => {
    setFormData(prev => ({ ...prev, rules: [...prev.rules, ''] }));
  };

  const removeRule = (index) => {
    if (formData.rules.length > 1) {
      const newRules = formData.rules.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, rules: newRules }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || loading) return;

    setLoading(true);
    try {
      const updateData = {
        ...formData,
        userId: user.email,
        rules: formData.rules.filter(rule => rule.trim() !== '')
      };

      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (response.ok) {
        alert('Group settings updated successfully!');
        onUpdate?.();
        onClose();
      } else {
        alert(data.error || 'Failed to update group settings');
      }
    } catch (error) {
      alert('Failed to update group settings');
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all posts, members, and data. Type "DELETE" to confirm.') || 
        !prompt('Type "DELETE" to confirm group deletion:') === 'DELETE') {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}?userId=${user.email}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Group deleted successfully');
        window.location.href = '/groups';
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete group');
      }
    } catch (error) {
      alert('Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Group Settings</h2>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.tabNavigation}>
          <button 
            className={`${styles.tab} ${activeTab === 'general' ? styles.active : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'permissions' ? styles.active : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'rules' ? styles.active : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            Rules
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'danger' ? styles.active : ''}`}
            onClick={() => setActiveTab('danger')}
          >
            Danger Zone
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.modalContent}>
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className={styles.tabContent}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Group Name</label>
                  <input type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={styles.input}
                    maxLength={50}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={styles.textarea}
                    rows={4}
                    maxLength={500}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={styles.select}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Privacy</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="privacy"
                        value="public"
                        checked={formData.privacy === 'public'}
                        onChange={handleInputChange}
                      />
                      <span>Public - Anyone can find and join</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="privacy"
                        value="private"
                        checked={formData.privacy === 'private'}
                        onChange={handleInputChange}
                      />
                      <span>Private - Visible but requires approval</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="privacy"
                        value="secret"
                        checked={formData.privacy === 'secret'}
                        onChange={handleInputChange}
                      />
                      <span>Secret - Only visible to members</span>
                    </label>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    name="coverImage"
                    value={formData.coverImage}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <div className={styles.tabContent}>
                <div className={styles.permissionsGrid}>
                  <div className={styles.permissionItem}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="settings.requireApproval"
                        checked={formData.settings.requireApproval}
                        onChange={handleInputChange}
                      />
                      <div className={styles.permissionInfo}>
                        <strong>Require approval to join</strong>
                        <p>New members need admin approval before joining</p>
                      </div>
                    </label>
                  </div>

                  <div className={styles.permissionItem}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="settings.allowMemberPosts"
                        checked={formData.settings.allowMemberPosts}
                        onChange={handleInputChange}
                      />
                      <div className={styles.permissionInfo}>
                        <strong>Allow member posts</strong>
                        <p>Members can create posts in the group</p>
                      </div>
                    </label>
                  </div>

                  <div className={styles.permissionItem}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="settings.postApproval"
                        checked={formData.settings.postApproval}
                        onChange={handleInputChange}
                      />
                      <div className={styles.permissionInfo}>
                        <strong>Posts require approval</strong>
                        <p>Admin must approve posts before they appear</p>
                      </div>
                    </label>
                  </div>

                  <div className={styles.permissionItem}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="settings.allowFileSharing"
                        checked={formData.settings.allowFileSharing}
                        onChange={handleInputChange}
                      />
                      <div className={styles.permissionInfo}>
                        <strong>Allow file sharing</strong>
                        <p>Members can upload and share files</p>
                      </div>
                    </label>
                  </div>

                  <div className={styles.permissionItem}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="settings.allowInvites"
                        checked={formData.settings.allowInvites}
                        onChange={handleInputChange}
                      />
                      <div className={styles.permissionInfo}>
                        <strong>Allow member invites</strong>
                        <p>Members can invite others to join</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            
            {activeTab === 'rules' && (
              <div className={styles.tabContent}>
                <p className={styles.tabDescription}>
                  Set clear guidelines for your group members to follow
                </p>
                
                <div className={styles.rulesSection}>
                  {formData.rules.map((rule, index) => (
                    <div key={index} className={styles.ruleItem}>
                      <div className={styles.ruleNumber}>{index + 1}</div>
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => handleRuleChange(index, e.target.value)}
                        placeholder="Enter a group rule..."
                        className={styles.ruleInput}
                        maxLength={200}
                      />
                      {formData.rules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className={styles.removeRuleBtn}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {formData.rules.length < 10 && (
                    <button
                      type="button"
                      onClick={addRule}
                      className={styles.addRuleBtn}
                    >
                      + Add Rule
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className={styles.tabContent}>
                <div className={styles.dangerZone}>
                  <h3 className={styles.dangerTitle}>Danger Zone</h3>
                  <p className={styles.dangerDescription}>
                    These actions are irreversible. Please be certain before proceeding.
                  </p>
                  
                  <div className={styles.dangerAction}>
                    <div className={styles.dangerInfo}>
                      <strong>Delete Group</strong>
                      <p>Permanently delete this group and all its data</p>
                    </div>
                    <button
                      type="button"
                      onClick={deleteGroup}
                      className={styles.deleteBtn}
                      disabled={loading}
                    >
                      Delete Group
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab !== 'danger' && (
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelBtn}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminSettingsModal;

