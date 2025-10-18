"use client"

import React, { useState } from "react";
import styles from "../CSS/explore.module.css";

const sampleCards = [
  {
    name: "Alex - IT Specialist",
    description: "Experienced in web development, cloud, and DevOps.",
    image: "/default-profile.png",
  },
  {
    name: "Sam - Barber",
    description: "Modern cuts, beard styling, and friendly service.",
    image: "/default-profile.png",
  },
  {
    name: "Jordan - Plumber",
    description: "Quick fixes, installations, and emergency services.",
    image: "/default-profile.png",
  },
];

const Explore = () => {
  const [current, setCurrent] = useState(0);
  const [swiped, setSwiped] = useState([]);

  const handleSwipe = (direction) => {
    setSwiped([...swiped, { ...sampleCards[current], direction }]);
    setCurrent((prev) => (prev + 1 < sampleCards.length ? prev + 1 : prev));
  };

  const card = sampleCards[current];

  return (
    <div className={styles.exploreWrapper}>
      <h2 className={styles.title}>Explore Candidates</h2>
      <div className={styles.cardArea}>
        {card ? (
          <div className={styles.card}>
            <img src={card.image} alt={card.name} className={styles.cardImage} />
            <h3 className={styles.cardName}>{card.name}</h3>
            <p className={styles.cardDesc}>{card.description}</p>
            <div className={styles.actions}>
              <button className={styles.swipeLeft} onClick={() => handleSwipe("left")}>✗</button>
              <button className={styles.swipeRight} onClick={() => handleSwipe("right")}>✓</button>
            </div>
          </div>
        ) : (
          <div className={styles.endText}>No more cards to show!</div>
        )}
      </div>
    </div>
  );
};

export default Explore;
