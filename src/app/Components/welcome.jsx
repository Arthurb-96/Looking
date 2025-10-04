"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../fireBaseDB";

// Auth pieces (keep whichever you actually use)
import SignIn from "./SignIn";
import SignUp from "./SignUp";
//import Register from "./Register";

import styles from "../CSS/auth.module.css";

export default function welcome() {
  const [user, setUser] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub; // proper cleanup
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(auth);
      alert("User signed out");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className={styles.container}>
      {user ? (
        <div className={styles.card}>
          <h1 className={styles.title}>Welcome, {user.email}</h1>
          <p className={styles.subtitle}>You are signed in.</p>

          {/* Use the form class as a vertical stack for spacing */}
          <div className={styles.form}>
            <button
              onClick={handleSignOut}
              className={styles.button}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>

            <Link href="/auth" className={styles.link}>
              Go to dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <h1 className={styles.title}>Authentication</h1>
          <p className={styles.subtitle}>Sign in or create an account</p>

          {/* If these components already include container/card wrappers,
              consider swapping them for “bare” versions or just show links. */}
          <div className={styles.form}>
          <Link href="/signin" className={styles.button} role="button">
  Sign in
</Link>
<Link href="/signup" className={styles.button} role="button">
  Sign up
</Link>
            {/* Or use one register flow only: */}
            {/* <Register /> */}
          </div>

          {/* Alternatively, link to routes instead of embedding:
          <div className={styles.form}>
            <Link href="/signin" className={styles.link}>Go to Sign in</Link>
            <Link href="/register" className={styles.link}>Create an account</Link>
          </div> */}
        </div>
      )}
    </div>
  );
}
