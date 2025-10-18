import React from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import styles from "../CSS/analytics.module.css";

const matchesData = [
  { name: "Mon", matches: 0 },
  { name: "Tue", matches: 0 },
  { name: "Wed", matches: 0 },
  { name: "Thu", matches: 0 },
  { name: "Fri", matches: 0 },
  { name: "Sat", matches: 0 },
  { name: "Sun", matches: 0 },
];

const viewsData = [
  { name: "Mon", views: 0 },
  { name: "Tue", views: 0 },
  { name: "Wed", views: 0 },
  { name: "Thu", views: 0 },
  { name: "Fri", views: 0 },
  { name: "Sat", views: 0 },
  { name: "Sun", views: 0 },
];

const Analytics = () => (
  <div className={styles.analyticsWrapper}>
    <div className={styles.chartContainer}>
      <h3>Matches Made (Weekly)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={matchesData}>
          <Line type="monotone" dataKey="matches" stroke="#007bff" strokeWidth={3} />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <div className={styles.chartContainer}>
      <h3>Profile Views (Weekly)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={viewsData}>
          <Line type="monotone" dataKey="views" stroke="#28a745" strokeWidth={3} />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default Analytics;
