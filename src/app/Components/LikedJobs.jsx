"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../fireBaseDB";
import Chat from "./Chat";
import styles from "../CSS/likedJobs.module.css";

export default function LikedJobs() {
  const [user, setUser] = useState(null);
  const [likedJobs, setLikedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [chatJobTitle, setChatJobTitle] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      fetchLikedJobs();
    }
  }, [user]);

  const fetchLikedJobs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/like?userEmail=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      
      if (response.ok) {
        setLikedJobs(data.likedJobs || []);
      } else {
        setLikedJobs([]);
      }
    } catch (error) {
      setLikedJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedJob(null);
  };

  const removeLikedJob = async (jobId) => {
    if (!user) return;
    
    
      const response = await fetch('/api/jobs/like', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
          jobId: jobId
        })
      });

      if (response.ok) {
        setLikedJobs(prev => prev.filter(job => job.jobId !== jobId));
        if (selectedJob && selectedJob.jobId === jobId) {
          closeModal();
        }
      }
  };

  const openChat = (job) => {
    setChatRecipient(job.jobData.userEmail);
    setChatJobTitle(job.jobData.serviceType);
    setChatOpen(true);
    closeModal(); 
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatRecipient(null);
    setChatJobTitle("");
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Please sign in to view your liked jobs</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your Liked Jobs</h1>
        <p className={styles.subtitle}>
          {likedJobs.length} job{likedJobs.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading your liked jobs...</div>
      ) : likedJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No liked jobs yet</h3>
          <p>Jobs you like will appear here. Start exploring to find opportunities!</p>
          <a href="/explore" className={styles.exploreLink}>
            Explore Jobs
          </a>
        </div>
      ) : (
        <div className={styles.jobsList}>
          {likedJobs.map((job) => (
            <div 
              key={job.jobId} 
              className={styles.jobCard}
              onClick={() => handleJobClick(job)}
            >
              <div className={styles.jobHeader}>
                <h3 className={styles.jobTitle}>{job.jobData.serviceType}</h3>
                <button 
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLikedJob(job.jobId);
                  }}
                  title="Remove from liked jobs"
                >
                  ❌
                </button>
              </div>
              <div className={styles.jobMeta}>
                <span className={styles.jobArea}>📍 {job.jobData.area}</span>
                <span className={styles.jobPrice}>💰 {job.jobData.priceRange}</span>
              </div>
              <div className={styles.jobInfo}>
                <p className={styles.jobPoster}>Posted by: {job.jobData.userEmail}</p>
                <p className={styles.jobDate}>
                  Liked on: {new Date(job.likedAt).toLocaleDateString()}
                </p>
              </div>
              <div className={styles.clickHint}>Click for details</div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedJob && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedJob.jobData.serviceType}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.jobDetailsGrid}>
                <div className={styles.detailItem}>
                  <label>Service Type:</label>
                  <span>{selectedJob.jobData.serviceType}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <label>Job Type:</label>
                  <span className={styles.jobTypeBadge}>
                    {selectedJob.jobData.jobType === 'hiring' ? '🔍 Hiring' : '💼 Offering Services'}
                  </span>
                </div>
                
                <div className={styles.detailItem}>
                  <label>Location:</label>
                  <span>📍 {selectedJob.jobData.area}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <label>Price Range:</label>
                  <span>💰 {selectedJob.jobData.priceRange}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <label>Posted by:</label>
                  <span>{selectedJob.jobData.userEmail}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <label>Posted on:</label>
                  <span>{new Date(selectedJob.jobData.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <label>Liked on:</label>
                  <span>{new Date(selectedJob.likedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {selectedJob.jobData.description && (
                <div className={styles.description}>
                  <label>Description:</label>
                  <p>{selectedJob.jobData.description}</p>
                </div>
              )}
            </div>
            
            <div className={styles.modalActions}>
              <button 
                className={styles.contactBtn}
                onClick={() => openChat(selectedJob)}
              >
                Contact Poster
              </button>
              <button 
                className={styles.removeFromLikedBtn}
                onClick={() => removeLikedJob(selectedJob.jobId)}
              >
                Remove from Liked
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Component */}
      <Chat 
        isOpen={chatOpen}
        onClose={closeChat}
        recipientEmail={chatRecipient}
        jobTitle={chatJobTitle}
      />
    </div>
  );
}