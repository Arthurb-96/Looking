"use client";

import { useState } from "react";
import styles from "../CSS/auth.module.css";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrMsg("");
    setSubmitting(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("../fireBaseDB");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setErrMsg(err?.message || "Failed to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className={styles.title}>Welcome back</h1>
      <p className={styles.subtitle}>Sign in to continue</p>
      <form onSubmit={handleSignIn} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signin-email">Email</label>
          <input
            id="signin-email"
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
          <label className={styles.label} htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
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
    </>
  );
}