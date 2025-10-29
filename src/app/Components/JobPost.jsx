"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../fireBaseDB";
import styles from "../CSS/jobPost.module.css";

export default function JobPost() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [jobType, setJobType] = useState("hiring"); // hiring or offering
  const [serviceType, setServiceType] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [area, setArea] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serviceType || !priceRange || !area) {
      alert("Please fill all fields");
      return;
    }

    setPosting(true);
    
    try {
      const response = await fetch(`/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email,
          jobType,
          serviceType,
          priceRange,
          area,
          createdAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        alert("Job posted successfully!");
        setServiceType("");
        setPriceRange("");
        setArea("");
        router.push("/");
      } else {
        alert("Failed to post job");
      }
    } catch (error) {
      console.error("Error posting job:", error);
      alert("Failed to post job");
    } finally {
      setPosting(false);
    }
  };

  if (!user) {
    return <div className={styles.error}>Please sign in to post jobs</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Post a Job</h1>
        
        <div className={styles.toggleContainer}>
          <button
            className={`${styles.toggleBtn} ${jobType === "hiring" ? styles.active : ""}`}
            onClick={() => setJobType("hiring")}
          >
            I'm Hiring
          </button>
          <button
            className={`${styles.toggleBtn} ${jobType === "offering" ? styles.active : ""}`}
            onClick={() => setJobType("offering")}
          >
            I'm Offering Service
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Type of Service</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Select a service type</option>
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

          <div className={styles.field}>
            <label className={styles.label}>Price Range (NIS)</label>
            <input
              type="text"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              placeholder="e.g., 100-500 NIS, 50 NIS/hour"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Area (City)</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Select area</option>
              <option value="Tel Aviv">Tel Aviv</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={posting}
            className={styles.submitBtn}
          >
            {posting ? "Posting..." : `Post ${jobType === "hiring" ? "Job" : "Service"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
