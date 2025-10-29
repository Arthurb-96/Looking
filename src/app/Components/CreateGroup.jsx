'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import { useRouter } from 'next/navigation';
import styles from '../CSS/createGroup.module.css';

const CreateGroup = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

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

  const categories = [
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
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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

  const validateStep = (currentStep) => {
    const newErrors = {};
    
    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = 'Group name is required';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (!formData.category) newErrors.category = 'Category is required';
      
      if (formData.name.length < 3) newErrors.name = 'Group name must be at least 3 characters';
      if (formData.description.length < 10) newErrors.description = 'Description must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(step)) return;
    
    setLoading(true);
    
    try {
      const groupData = {
        ...formData,
        adminId: user.email,  // Use email instead of uid since user documents don't have uid field
        rules: formData.rules.filter(rule => rule.trim() !== '')
      };

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Group created successfully!');
        router.push(`/groups/${data.groupId}`);
        onClose?.();
      } else {
        setErrors({ submit: data.error || 'Failed to create group' });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to create group. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>Basic Information</h3>
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Group Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter group name"
          className={`${styles.input} ${errors.name ? styles.error : ''}`}
          maxLength={50}
        />
        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
        <small className={styles.hint}>{formData.name.length}/50 characters</small>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Description *</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe what your group is about..."
          className={`${styles.textarea} ${errors.description ? styles.error : ''}`}
          rows={4}
          maxLength={500}
        />
        {errors.description && <span className={styles.errorText}>{errors.description}</span>}
        <small className={styles.hint}>{formData.description.length}/500 characters</small>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Category *</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          className={`${styles.select} ${errors.category ? styles.error : ''}`}
        >
          <option value="">Select a category</option>
          {categories.map(cat => (
            <option key={cat} value={cat.toLowerCase()}>{cat}</option>
          ))}
        </select>
        {errors.category && <span className={styles.errorText}>{errors.category}</span>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Privacy Setting</label>
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="privacy"
              value="public"
              checked={formData.privacy === 'public'}
              onChange={handleInputChange}
            />
            <span className={styles.radioText}>
              <strong>Public</strong> - Anyone can find and join
            </span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="privacy"
              value="private"
              checked={formData.privacy === 'private'}
              onChange={handleInputChange}
            />
            <span className={styles.radioText}>
              <strong>Private</strong> - Visible but requires approval to join
            </span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="privacy"
              value="secret"
              checked={formData.privacy === 'secret'}
              onChange={handleInputChange}
            />
            <span className={styles.radioText}>
              <strong>Secret</strong> - Only visible to members
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>Group Settings</h3>
      
      <div className={styles.settingsGrid}>
        <div className={styles.settingItem}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="settings.requireApproval"
              checked={formData.settings.requireApproval}
              onChange={handleInputChange}
            />
            <span className={styles.checkboxText}>
              <strong>Require approval to join</strong>
              <small>New members need admin approval</small>
            </span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="settings.allowMemberPosts"
              checked={formData.settings.allowMemberPosts}
              onChange={handleInputChange}
            />
            <span className={styles.checkboxText}>
              <strong>Allow member posts</strong>
              <small>Members can create posts in the group</small>
            </span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="settings.postApproval"
              checked={formData.settings.postApproval}
              onChange={handleInputChange}
            />
            <span className={styles.checkboxText}>
              <strong>Posts require approval</strong>
              <small>Admin must approve posts before they appear</small>
            </span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="settings.allowFileSharing"
              checked={formData.settings.allowFileSharing}
              onChange={handleInputChange}
            />
            <span className={styles.checkboxText}>
              <strong>Allow file sharing</strong>
              <small>Members can upload and share files</small>
            </span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="settings.allowInvites"
              checked={formData.settings.allowInvites}
              onChange={handleInputChange}
            />
            <span className={styles.checkboxText}>
              <strong>Allow member invites</strong>
              <small>Members can invite others to join</small>
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>Group Rules (Optional)</h3>
      <p className={styles.stepDescription}>
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
  );

  if (!user) {
    return (
      <div className={styles.authRequired}>
        <h3>Please sign in to create a group</h3>
      </div>
    );
  }

  return (
    <div className={styles.createGroupContainer}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create New Group</h2>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.stepIndicator}>
          {[1, 2, 3].map(num => (
            <div 
              key={num} 
              className={`${styles.stepDot} ${step >= num ? styles.active : ''}`}
            >
              {num}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {errors.submit && (
            <div className={styles.submitError}>{errors.submit}</div>
          )}

          <div className={styles.modalFooter}>
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className={styles.backBtn}
                disabled={loading}
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className={styles.nextBtn}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;

