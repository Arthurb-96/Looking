import React from "react";
import Image from "next/image";
import styles from "../CSS/userContainer.module.css";

const UserContainer = ({ user }) => {
  return (
    <div className={styles.userContainer}>
      <div className={styles.profileSection}>
        <Image
          src={user?.photoURL || "/profile-default.png"}
          alt="Profile Photo"
          width={80}
          height={80}
          className={styles.profilePhoto}
        />
        <h2 className={styles.welcomeText}>
          Welcome back{user?.displayName ? `, ${user.displayName}` : "!"}
        </h2>
        <p className={styles.userRole}>Looking for opportunities</p>
      </div>
    </div>
  );
};

export default UserContainer;
