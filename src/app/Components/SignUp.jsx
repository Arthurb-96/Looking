"use client";

import { useState } from "react";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../fireBaseDB";
import styles from "../CSS/auth.module.css";

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("offering");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const categories = ["IT", "Beauty", "Gardening", "Plumbing", "Barber", "Cleaning", "Tutoring", "Other"];

  const handleFirstStep = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setErr("Please fill all fields.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setStep(2);
    } catch (error) {
      setErr(error?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role, category, price }),
      });
      alert("User registered successfully");
    } catch (error) {
      setErr(error?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        {step === 1 ? (
          <form onSubmit={handleFirstStep} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>Name</label>
              <input
                id="name"
                type="text"
                className={styles.input}
                placeholder="Insert your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="new-name"
                minLength={2}
                required
              />
            </div>
            {err ? (
              <p className={styles?.error ?? ""} aria-live="polite">{err}</p>
            ) : null}
            <button type="submit" className={styles.button}>Next</button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Role</label>
              <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="offering"
                    checked={role === "offering"}
                    onChange={() => setRole("offering")}
                  /> Offering
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="hiring"
                    checked={role === "hiring"}
                    onChange={() => setRole("hiring")}
                  /> Hiring
                </label>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="category" className={styles.label}>Category</label>
              <select
                id="category"
                className={styles.input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="price" className={styles.label}>Price per hour</label>
              <input
                id="price"
                type="number"
                className={styles.input}
                placeholder="e.g. 50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={0}
                required
              />
            </div>
            {err ? (
              <p className={styles?.error ?? ""} aria-live="polite">{err}</p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className={`${styles.button} ${loading ? styles.buttonDisabled : ""}`}
            >
              {loading ? "Signing up…" : "Sign Up"}
            </button>
          </form>
        )}
        <div style={{ marginTop: 12 }}>
          <Link href="/signin" className={styles.link}>
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}



