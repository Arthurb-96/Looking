'use client';

import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../fireBaseDB';
import styles from '../CSS/analytics.module.css';

const GroupAnalytics = ({ groupId, onClose }) => {
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && groupId) {
      fetchAnalytics();
    }
  }, [user, groupId]);

  useEffect(() => {
    if (analytics) {
      createBarChart();
      createLineChart();
    }
  }, [analytics]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/groups?groupId=${groupId}&userId=${user.email}`);
      const data = await response.json();
      
      if (response.ok) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const createBarChart = () => {
    if (!analytics || !barChartRef.current) return;

    // Clear previous chart
    d3.select(barChartRef.current).selectAll("*").remove();

    const data = analytics.postsPerMonth;
    const margin = { top: 20, right: 30, bottom: 60, left: 50 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const svg = d3.select(barChartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.posts)])
      .nice()
      .range([height, 0]);

    // Color scale
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(data, d => d.posts)]);

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "12px")
      .style("fill", "#374151");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .style("font-size", "12px")
      .style("fill", "#374151");

    // Bars with animation
    g.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.month))
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", d => colorScale(d.posts))
      .attr("stroke", "#1f2937")
      .attr("stroke-width", 1)
      .transition()
      .duration(800)
      .attr("y", d => yScale(d.posts))
      .attr("height", d => height - yScale(d.posts));

    // Add value labels on bars
    g.selectAll(".label")
      .data(data)
      .enter().append("text")
      .attr("class", "label")
      .attr("x", d => xScale(d.month) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.posts) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#1f2937")
      .text(d => d.posts);

    // Chart title
    svg.append("text")
      .attr("x", (width + margin.left + margin.right) / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#1f2937")
      .text("Posts Per Month");
  };

  const createLineChart = () => {
    if (!analytics || !lineChartRef.current) return;

    // Clear previous chart
    d3.select(lineChartRef.current).selectAll("*").remove();

    const data = analytics.groupGrowth;
    const margin = { top: 20, right: 30, bottom: 60, left: 50 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const svg = d3.select(lineChartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.members)])
      .nice()
      .range([height, 0]);

    // Line generator
    const line = d3.line()
      .x(d => xScale(d.month) + xScale.bandwidth() / 2)
      .y(d => yScale(d.members))
      .curve(d3.curveMonotoneX);

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "12px")
      .style("fill", "#374151");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .style("font-size", "12px")
      .style("fill", "#374151");

    // Add gradient
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "line-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", height)
      .attr("x2", 0).attr("y2", 0);

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.1);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.8);

    // Add area under line
    const area = d3.area()
      .x(d => xScale(d.month) + xScale.bandwidth() / 2)
      .y0(height)
      .y1(d => yScale(d.members))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "url(#line-gradient)")
      .attr("d", area);

    // Add line with animation
    const path = g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 3)
      .attr("d", line);

    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1500)
      .attr("stroke-dashoffset", 0);

    // Add points
    g.selectAll(".dot")
      .data(data)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.month) + xScale.bandwidth() / 2)
      .attr("cy", d => yScale(d.members))
      .attr("r", 0)
      .attr("fill", "#059669")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .transition()
      .delay(1500)
      .duration(300)
      .attr("r", 5);

    // Add value labels
    g.selectAll(".label")
      .data(data)
      .enter().append("text")
      .attr("class", "label")
      .attr("x", d => xScale(d.month) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.members) - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#1f2937")
      .text(d => d.members);

    // Chart title
    svg.append("text")
      .attr("x", (width + margin.left + margin.right) / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#1f2937")
      .text("Group Member Growth");
  };

  if (loading) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.loading}>Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.error}>{error}</div>
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>Group Analytics - {analytics?.groupInfo?.name}</h2>
          <div className={styles.headerActions}>
            <button 
              onClick={fetchAnalytics} 
              className={styles.refreshBtn}
              disabled={loading}
            >
              🔄 Refresh
            </button>
            <button onClick={onClose} className={styles.closeBtn}>×</button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <h3>Total Members</h3>
              <div className={styles.summaryValue}>{analytics?.groupInfo?.memberCount || 0}</div>
            </div>
            <div className={styles.summaryCard}>
              <h3>Total Posts</h3>
              <div className={styles.summaryValue}>{analytics?.groupInfo?.totalPosts || 0}</div>
            </div>
            <div className={styles.summaryCard}>
              <h3>Total Likes</h3>
              <div className={styles.summaryValue}>{analytics?.groupInfo?.totalLikes || 0}</div>
            </div>
          </div>

          {/* Charts */}
          <div className={styles.chartsGrid}>
            <div className={styles.chartContainer}>
              <div ref={barChartRef}></div>
            </div>
            <div className={styles.chartContainer}>
              <div ref={lineChartRef}></div>
            </div>
          </div>

          {/* Member Activity Table */}
          <div className={styles.tableSection}>
            <h3 className={styles.sectionTitle}>Top Active Members (Last 30 Days)</h3>
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div>Member</div>
                <div>Posts</div>
                <div>Likes Received</div>
              </div>
              {analytics?.memberActivity?.map((member, index) => (
                <div key={member.email} className={styles.tableRow}>
                  <div>{member.name}</div>
                  <div>{member.postCount}</div>
                  <div>{member.totalLikes}</div>
                </div>
              ))}
              {(!analytics?.memberActivity || analytics.memberActivity.length === 0) && (
                <div className={styles.noData}>No activity data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupAnalytics;