import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

import './AdminDashboard.css';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chart state
  const [chartLabels, setChartLabels] = useState([]);
  const [chartData, setChartData] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    // Fetch dashboard stats, activities, system status
    axios.get(`${BASE_URL}/api/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setStats(res.data.stats);
        setRecentActivities(res.data.recentActivities);
        setSystemStatus(res.data.systemStatus);
      })
      .catch((err) => {
        setStats(null);
        setRecentActivities([]);
        setSystemStatus(null);
        console.error('Dashboard error:', err);
      })
      .finally(() => setLoading(false));

    // Fetch chart data from backend
    axios.get(`${BASE_URL}/api/registrations-per-month/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setChartLabels(res.data.labels);
        setChartData(res.data.data);
      })
      .catch(err => {
        setChartLabels([]);
        setChartData([]);
        console.error('Chart data error:', err);
      });
  }, []);

  const registrationsData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'User Registrations',
        data: chartData,
        fill: false,
        borderColor: '#3498db',
        tension: 0.1
      }
    ]
  };

  const quickActions = [
    { icon: "fas fa-user-plus", label: "Add User", route: "/admin/AdminDashboard/users" },
    { icon: "fas fa-file-upload", label: "Upload Document", route: "/admin/AdminDashboard/documents" },
    { icon: "fas fa-bullhorn", label: "Create Announcement", route: "/admin/AdminDashboard/announcements" },
    { icon: "fas fa-calendar-plus", label: "Schedule Event", route: "/admin/AdminDashboard/events" },
    { icon: "fas fa-cog", label: "System Settings", route: "/admin/AdminDashboard/settings" },
    { icon: "fas fa-download", label: "Generate Report", route: "/admin/AdminDashboard/reports" }
  ];

  return (
    <div className="ad-container">
      <div className="ad-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome to the PKFe-Hub Admin Panel</p>
      </div>

      {/* Chart Card */}
      <div className="ad-card chart-card" style={{ marginBottom: 20 }}>
        <div className="ad-card-header">
          <h3>User Registrations (Monthly)</h3>
        </div>
        <div className="ad-card-body">
          <div className="ad-chart-container">
            <Line
              data={registrationsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>
      </div>

      <div className="ad-stats-grid">
        {loading ? (
          <div>Loading stats...</div>
        ) : !stats ? (
          <div>Error loading stats.</div>
        ) : (
          <>
            <div className="ad-stat-card">
              <div className="ad-stat-icon" style={{ backgroundColor: '#3498db' }}>
                <i className="fas fa-users"></i>
              </div>
              <div className="ad-stat-info">
                <h3>{stats.totalUsers}</h3>
                <p>Total Users</p>
              </div>
            </div>
            <div className="ad-stat-card">
              <div className="ad-stat-icon" style={{ backgroundColor: '#2ecc71' }}>
                <i className="fas fa-user-check"></i>
              </div>
              <div className="ad-stat-info">
                <h3>{stats.activeUsers}</h3>
                <p>Active Users</p>
              </div>
            </div>
            <div className="ad-stat-card">
              <div className="ad-stat-icon" style={{ backgroundColor: '#e74c3c' }}>
                <i className="fas fa-file"></i>
              </div>
              <div className="ad-stat-info">
                <h3>{stats.totalDocuments}</h3>
                <p>Documents</p>
              </div>
            </div>
            <div className="ad-stat-card">
              <div className="ad-stat-icon" style={{ backgroundColor: '#9b59b6' }}>
                <i className="fas fa-comments"></i>
              </div>
              <div className="ad-stat-info">
                <h3>{stats.totalConversations}</h3>
                <p>Conversations</p>
              </div>
            </div>
            <div className="ad-stat-card">
              <div className="ad-stat-icon" style={{ backgroundColor: '#f39c12' }}>
                <i className="fas fa-inbox"></i>
              </div>
              <div className="ad-stat-info">
                <h3>{stats.pendingFeedback}</h3>
                <p>Pending Feedback</p>
              </div>
            </div>
            <div className="ad-stat-card">
              <div className="ad-stat-icon" style={{ backgroundColor: '#1abc9c' }}>
                <i className="fas fa-calendar"></i>
              </div>
              <div className="ad-stat-info">
                <h3>{stats.upcomingEvents}</h3>
                <p>Upcoming Events</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="ad-content">
        <div className="ad-recent-activities">
          <div className="ad-card">
            <div className="ad-card-header">
              <h3>Recent Activities</h3>
            </div>
            <div className="ad-card-body">
              {loading ? (
                <div>Loading recent activities...</div>
              ) : !recentActivities.length ? (
                <div>No recent activities found.</div>
              ) : (
                <ul>
                  {recentActivities.map(activity => (
                    <li key={activity.id}>
                      <div className="ad-activity-item">
                        <div className="ad-activity-content">
                          <span className="ad-activity-user">{activity.user}</span>
                          <span className="ad-activity-action">{activity.action}</span>
                        </div>
                        <span className="ad-activity-time">{activity.time}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="ad-system-status">
          <div className="ad-card">
            <div className="ad-card-header">
              <h3>System Status</h3>
            </div>
            <div className="ad-card-body">
              {loading ? (
                <div>Loading status...</div>
              ) : !systemStatus ? (
                <div>Error loading status.</div>
              ) : (
                <>
                  <div className="ad-status-item">
                    <span className="ad-status-label">Database</span>
                    <span className={`ad-status-value ad-${systemStatus.database}`}>
                      {systemStatus.database}
                    </span>
                  </div>
                  <div className="ad-status-item">
                    <span className="ad-status-label">API Service</span>
                    <span className={`ad-status-value ad-${systemStatus.api}`}>
                      {systemStatus.api}
                    </span>
                  </div>
                  <div className="ad-status-item">
                    <span className="ad-status-label">AI Service</span>
                    <span className={`ad-status-value ad-${systemStatus.aiService}`}>
                      {systemStatus.aiService}
                    </span>
                  </div>
                  <div className="ad-status-item">
                    <span className="ad-status-label">File Storage</span>
                    <span className={`ad-status-value ad-${systemStatus.storage}`}>
                      {systemStatus.storage}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="ad-quick-actions">
          <div className="ad-card">
            <div className="ad-card-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="ad-card-body">
              <div className="ad-action-buttons">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    className="ad-action-btn"
                    onClick={() => navigate(action.route)}
                  >
                    <i className={action.icon}></i>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;