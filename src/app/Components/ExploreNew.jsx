"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../fireBaseDB";
import Chat from "./Chat";
import styles from "../CSS/exploreNew.module.css";

export default function Explore() {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("looking"); // looking or offering
  const [displayMode, setDisplayMode] = useState("swipe"); // swipe or cards
  const [jobs, setJobs] = useState([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [chatJobTitle, setChatJobTitle] = useState("");
  const [filters, setFilters] = useState({
    serviceType: "",
    priceRange: "",
    area: "Tel Aviv" // Default to Tel Aviv for now
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user, viewMode, filters]);

  const fetchJobs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        userEmail: user.email,
        mode: viewMode,
        area: filters.area,
        ...(filters.serviceType && { serviceType: filters.serviceType }),
        ...(filters.priceRange && { priceRange: filters.priceRange })
      });

      const response = await fetch(`/api/explore?${queryParams}`);
      const data = await response.json();
      
      if (response.ok) {
        setJobs(data.jobs || []);
      } else {
        console.error("Failed to fetch jobs:", data.error);
        setJobs([]);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleLikeJob = async (job, action) => {
    if (!user || !job) return;
    
    try {
      const response = await fetch('/api/jobs/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
          jobId: job._id,
          jobData: job,
          action: action // 'like' or 'dislike'
        })
      });

      if (response.ok) {
        // Move to next job in swipe mode
        if (displayMode === "swipe") {
          setCurrentJobIndex(prev => prev + 1);
        }
      } else {
        console.error('Failed to save job preference');
      }
    } catch (error) {
      console.error('Error saving job preference:', error);
    }
  };

  const handleSwipeAction = (action) => {
    if (jobs.length > 0 && currentJobIndex < jobs.length) {
      const currentJob = jobs[currentJobIndex];
      handleLikeJob(currentJob, action);
    }
  };

  const openChat = (job) => {
    setChatRecipient(job.userEmail);
    setChatJobTitle(job.serviceType);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatRecipient(null);
    setChatJobTitle("");
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Please sign in to explore jobs</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Explore Opportunities</h1>
        
        {/* Toggle between looking and offering */}
        <div className={styles.toggleContainer}>
          <button
            className={`${styles.toggleBtn} ${viewMode === "looking" ? styles.active : ""}`}
            onClick={() => setViewMode("looking")}
          >
            Find Work
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === "offering" ? styles.active : ""}`}
            onClick={() => setViewMode("offering")}
          >
            Find Services
          </button>
        </div>

        {/* Display mode toggle */}
        <div className={styles.displayToggle}>
          <button
            className={`${styles.displayBtn} ${displayMode === "swipe" ? styles.active : ""}`}
            onClick={() => {
              setDisplayMode("swipe");
              setCurrentJobIndex(0);
            }}
          >
            Swipe Mode
          </button>
          <button
            className={`${styles.displayBtn} ${displayMode === "cards" ? styles.active : ""}`}
            onClick={() => setDisplayMode("cards")}
          >
            Cards View
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Service Type</label>
          <select
            value={filters.serviceType}
            onChange={(e) => handleFilterChange("serviceType", e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Services</option>
            <option value="Web Development">Web Development</option>
            <option value="Mobile App Development">Mobile App Development</option>
            <option value="Graphic Design">Graphic Design</option>
            <option value="Content Writing">Content Writing</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Photography">Photography</option>
            <option value="Video Editing">Video Editing</option>
            <option value="Translation">Translation</option>
            <option value="Tutoring">Tutoring</option>
            <option value="Cleaning Services">Cleaning Services</option>
            <option value="Home Repairs">Home Repairs</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical Work">Electrical Work</option>
            <option value="Gardening">Gardening</option>
            <option value="Pet Care">Pet Care</option>
            <option value="Baby Sitting">Baby Sitting</option>
            <option value="Cooking/Catering">Cooking/Catering</option>
            <option value="Event Planning">Event Planning</option>
            <option value="Personal Training">Personal Training</option>
            <option value="Accounting">Accounting</option>
            <option value="Legal Services">Legal Services</option>
            <option value="Consulting">Consulting</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Area</label>
          <select
            value={filters.area}
            onChange={(e) => handleFilterChange("area", e.target.value)}
            className={styles.filterSelect}
          >
            <option value="Tel Aviv">Tel Aviv</option>
          </select>
        </div>

        <button onClick={fetchJobs} className={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      {/* Results */}
      <div className={styles.resultsContainer}>
        {loading ? (
          <div className={styles.loading}>Loading opportunities...</div>
        ) : jobs.length === 0 ? (
          <div className={styles.noResults}>
            No {viewMode === "looking" ? "jobs" : "services"} found matching your criteria
          </div>
        ) : displayMode === "swipe" ? (
          // Swipe Mode
          <div className={styles.swipeContainer}>
            {currentJobIndex < jobs.length ? (
              <div className={styles.swipeCard}>
                <div className={styles.currentJobCard}>
                  <div className={styles.jobHeader}>
                    <h3 className={styles.jobTitle}>{jobs[currentJobIndex].serviceType}</h3>
                    <div className={styles.jobMeta}>
                      <span className={styles.jobArea}>{jobs[currentJobIndex].area}</span>
                      <span className={styles.jobPrice}>{jobs[currentJobIndex].priceRange}</span>
                    </div>
                  </div>
                  <div className={styles.jobDescription}>
                    <p>Posted by: {jobs[currentJobIndex].userEmail}</p>
                    <p>Date: {new Date(jobs[currentJobIndex].createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className={styles.swipeActions}>
                  <button 
                    className={styles.dislikeBtn}
                    onClick={() => handleSwipeAction('dislike')}
                  >
                    👎 Pass
                  </button>
                  <button 
                    className={styles.likeBtn}
                    onClick={() => handleSwipeAction('like')}
                  >
                    👍 Like
                  </button>
                  <button 
                    className={styles.contactBtn}
                    onClick={() => openChat(jobs[currentJobIndex])}
                  >
                    💬 Chat
                  </button>
                </div>
                
                <div className={styles.progressIndicator}>
                  {currentJobIndex + 1} of {jobs.length}
                </div>
              </div>
            ) : (
              <div className={styles.noMoreJobs}>
                <h3>No more jobs to review!</h3>
                <button onClick={() => setCurrentJobIndex(0)} className={styles.restartBtn}>
                  Start Over
                </button>
              </div>
            )}
          </div>
        ) : (
          // Cards Mode (existing)
          <div className={styles.jobsList}>
            {jobs.map((job, index) => (
              <div key={`${job.userEmail}-${job.id}-${index}`} className={styles.jobCard}>
                <div className={styles.jobHeader}>
                  <h3 className={styles.jobTitle}>{job.serviceType}</h3>
                  <div className={styles.jobMeta}>
                    <span className={styles.jobArea}>{job.area}</span>
                    <span className={styles.jobPrice}>{job.priceRange}</span>
                  </div>
                </div>
                <div className={styles.jobFooter}>
                  <span className={styles.jobDate}>
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  <button className={styles.contactBtn}>
                    Contact
                  </button>
                  <button 
                    className={styles.chatBtn}
                    onClick={() => openChat(job)}
                  >
                    💬 Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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