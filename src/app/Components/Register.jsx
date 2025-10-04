"use client";

import { useState } from "react";
import { auth } from "../fireBaseDB";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import styles from "../CSS/auth.module.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("User registered successfully");
      // Optionally reset the form:
      // setEmail(""); setPassword(""); setPhone("");
    } catch (err) {
      console.log(err);
      alert(err?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles?.container}>
      <div className={styles?.card}>
        <h1 className={styles?.title}>Register</h1>

        <form onSubmit={handleRegister} className={styles?.form}>
          <div className={styles?.field}>
            <label htmlFor="email" className={styles?.label}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles?.input}
              required
            />
          </div>

          <div className={styles?.field}>
            <label htmlFor="password" className={styles?.label}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles?.input}
              required
              minLength={6}
            />
          </div>

          <div className={styles?.field}>
            <label htmlFor="phone" className={styles?.label}>Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+972 50-000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles?.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${styles?.button} ${loading ? styles?.buttonDisabled : ""}`}
          >
            {loading ? "Registering…" : "Register"}
          </button>
        </form>

        <div style={{ marginTop: 12 }}>
          {/* Since we're already on /register, you could link to /signin or /dashboard */}
          <Link href="/register" className={styles?.link}>
            Need help?
          </Link>
        </div>
      </div>
    </div>
  );
}
