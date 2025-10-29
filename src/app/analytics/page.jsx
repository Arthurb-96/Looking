'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import NavigationBar from '../Components/NavigationBar';
import styles from '../CSS/analytics.module.css';

const AnalyticsPage = () => {
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState({
    posts: { total: 0, thisMonth: 0, thisWeek: 0 },
    social: { followers: 0, following: 0, profileViews: 0 },
    groups: { joined: 0, postsInGroups: 0, adminOf: 0 },
    engagement: { totalLikes: 0, totalComments: 0, avgEngagement: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // week, month, year

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?userEmail=${encodeURIComponent(user.email)}&timeRange=${timeRange}`);
      const data = await response.json();
      
      if (response.ok) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <NavigationBar />
        <div className={styles.container}>
          <div className={styles.error}>Please sign in to view analytics</div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Analytics</h1>
          <div className={styles.timeRangeSelector}>
            <button 
              className={`${styles.timeBtn} ${timeRange === 'week' ? styles.active : ''}`}
              onClick={() => setTimeRange('week')}
            >
              This Week
            </button>
            <button 
              className={`${styles.timeBtn} ${timeRange === 'month' ? styles.active : ''}`}
              onClick={() => setTimeRange('month')}
            >
              This Month
            </button>
            <button 
              className={`${styles.timeBtn} ${timeRange === 'year' ? styles.active : ''}`}
              onClick={() => setTimeRange('year')}
            >
              This Year
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading analytics...</div>
        ) : (
          <div className={styles.dashboard}>
            {/* Activity Overview */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>📊 Activity Overview</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.posts.total}</div>
                  <div className={styles.statLabel}>Total Posts</div>
                  <div className={styles.statTrend}>
                    +{analytics.posts.thisMonth} this month
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.posts.thisWeek}</div>
                  <div className={styles.statLabel}>Posts This Week</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.engagement.totalLikes}</div>
                  <div className={styles.statLabel}>Total Likes</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.engagement.totalComments}</div>
                  <div className={styles.statLabel}>Total Comments</div>
                </div>
              </div>
            </div>

            {/* Social Network */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>👥 Social Network</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.social.followers}</div>
                  <div className={styles.statLabel}>Followers</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.social.following}</div>
                  <div className={styles.statLabel}>Following</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.social.profileViews}</div>
                  <div className={styles.statLabel}>Profile Views</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>
                    {analytics.social.followers > 0 ? 
                      Math.round((analytics.social.profileViews / analytics.social.followers) * 100) : 0}%
                  </div>
                  <div className={styles.statLabel}>Engagement Rate</div>
                </div>
              </div>
            </div>

            {/* Group Activity */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>🔗 Group Activity</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.groups.joined}</div>
                  <div className={styles.statLabel}>Groups Joined</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.groups.adminOf}</div>
                  <div className={styles.statLabel}>Admin Of</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{analytics.groups.postsInGroups}</div>
                  <div className={styles.statLabel}>Group Posts</div>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>📈 Performance Insights</h2>
              <div className={styles.insightsGrid}>
                <div className={styles.insightCard}>
                  <h3>Most Active Day</h3>
                  <p>You post most often on Wednesdays</p>
                </div>
                <div className={styles.insightCard}>
                  <h3>Best Performing Content</h3>
                  <p>Technology posts get 40% more engagement</p>
                </div>
                <div className={styles.insightCard}>
                  <h3>Growth Trend</h3>
                  <p>Your follower count grew by 15% this month</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AnalyticsPage;