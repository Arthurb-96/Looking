// components/SignIn.jsx
"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../fireBaseDB"; // keep your path
import Link from "next/link";
import styles from "../CSS/auth.module.css";
import UserContainer from "./userContainer";
import UserPostsFeed from "./UserPostsFeed";
import SideNavbar from "./SideNavbar";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [user, setUser] = useState(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrMsg("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User will be set by onAuthStateChanged
    } catch (err) {
      setErrMsg(err?.message || "Failed to sign in");
      console.log(err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (user) {
    return (
      <>
        <SideNavbar />
        <UserContainer user={user} />
        <UserPostsFeed username={user.displayName || user.email} />
      </>
    );
  }
  return (
    <>
      <SideNavbar />
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue</p>
          <form onSubmit={handleSignIn} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
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
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
            {errMsg && <div className={styles.error}>{errMsg}</div>}
          </form>
          <p className={styles.footer}>
            Need the app?{" "}
            <Link href="/dashboard" className={styles.link}>
              Go to dashboard
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
