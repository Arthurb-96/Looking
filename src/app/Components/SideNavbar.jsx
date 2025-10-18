"use client"

import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../fireBaseDB";
import Link from "next/link";
import styles from "../CSS/sideNavbar.module.css";

const SideNavbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={styles.menuButton}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
      </button>
      <nav className={`${styles.sideNavbar} ${open ? styles.open : ""}`}>
        <ul>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/explore">Explore</Link></li>
          <li><Link href="/messages">Messages</Link></li>
          <li><Link href="/settings">Settings</Link></li>
          <li>
            <button
              className={styles.signOutButton}
              onClick={async () => {
                await signOut(auth);
                window.location.reload();
              }}
            >Sign out</button>
          </li>
        </ul>
      </nav>
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
    </>
  );
};

export default SideNavbar;
