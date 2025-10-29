"use client";

import { useState } from "react";
import SignInForm from "./SignInForm";
import styles from "../CSS/auth.module.css";

export default function AuthContainer() {
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.authToggle}>
          <button
            className={`${styles.toggleBtn} ${isSignIn ? styles.active : ""}`}
            onClick={() => setIsSignIn(true)}
          >
            Sign In
          </button>
          <button
            className={`${styles.toggleBtn} ${!isSignIn ? styles.active : ""}`}
            onClick={() => setIsSignIn(false)}
          >
            Sign Up
          </button>
        </div>
        
        {isSignIn ? (
          <SignInForm />
        ) : (
          <SignUpForm />
        )}
      </div>
    </div>
  );
}

// Two-stage SignUp form component
function SignUpForm() {
  const [step, setStep] = useState(1);
  
  // Step 1: Personal Information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  
  // Step 2: Account Information
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleStep1Continue = (e) => {
    e.preventDefault();
    setErrMsg("");
    
    if (!firstName.trim() || !lastName.trim()) {
      setErrMsg("First name and last name are required");
      return;
    }
    
    setStep(2);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrMsg("");

    if (password !== confirmPassword) {
      setErrMsg("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setErrMsg("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const { auth } = await import("../fireBaseDB");
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with full name
      const displayName = `${firstName} ${lastName}`;
      await updateProfile(userCredential.user, {
        displayName: displayName
      });

      // Store additional user info in MongoDB database
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          name: displayName,
          displayName: displayName,
          phone: phone || "",
          location: location || "",
          role: "user", // default role for new users
          category: "general", // default category
          price: "0" // default price
        }),
      });

      // Success - user will be automatically redirected by onAuthStateChanged
      console.log("User account created successfully with complete profile data");
    } catch (err) {
      console.error("Signup error:", err);
      
      // If MongoDB storage fails but Firebase account was created, we should handle this gracefully
      if (err.message.includes("fetch")) {
        setErrMsg("Account created but profile data couldn't be saved. Please contact support.");
      } else {
        setErrMsg(err?.message || "Failed to create account");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <>
        <h1 className={styles.title}>Join Looking</h1>
        <p className={styles.subtitle}>Step 1 of 2: Tell us about yourself</p>
        <form onSubmit={handleStep1Continue} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-firstname">First Name *</label>
            <input
              id="signup-firstname"
              className={styles.input}
              type="text"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-lastname">Last Name *</label>
            <input
              id="signup-lastname"
              className={styles.input}
              type="text"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-phone">Phone Number</label>
            <input
              id="signup-phone"
              className={styles.input}
              type="tel"
              placeholder="Your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-location">Location</label>
            <select
              id="signup-location"
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Select your location</option>
              <option value="Tel Aviv">Tel Aviv</option>
            </select>
          </div>
          <button className={styles.button} type="submit">
            Continue to Step 2
          </button>
          {errMsg && <div className={styles.error}>{errMsg}</div>}
        </form>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.title}>Almost Done!</h1>
      <p className={styles.subtitle}>Step 2 of 2: Create your account</p>
      <form onSubmit={handleSignUp} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-email">Email *</label>
          <input
            id="signup-email"
            className={styles.input}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-password">Password *</label>
          <input
            id="signup-password"
            className={styles.input}
            type="password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-confirm">Confirm Password *</label>
          <input
            id="signup-confirm"
            className={styles.input}
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div className={styles.buttonGroup}>
          <button 
            type="button" 
            className={styles.backButton}
            onClick={() => setStep(1)}
          >
            Back
          </button>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </div>
        {errMsg && <div className={styles.error}>{errMsg}</div>}
      </form>
    </>
  );
}