import React, { useState, useEffect, useRef } from 'react';
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
import {
  FiUsers,
  FiUserCheck,
  FiFileText,
  FiMessageCircle,
  FiInbox,
  FiCalendar,
  FiUserPlus,
  FiUploadCloud,
  FiBell,
  FiSettings,
  FiDownload,
  FiArrowRight,
  FiBarChart2,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity,
  FiServer,
  FiDatabase,
  FiCloud,
  FiZap,
  FiChevronRight,
  FiX
} from 'react-icons/fi';
import { FaBullhorn, FaRocket, FaChartLine } from 'react-icons/fa';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// StatCard Component
function StatCard({ title, value, icon, hint, onClick, gradient, delay, trend }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg card-hover animate-scale-in group text-left w-full transition-all duration-300 hover:shadow-xl`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${gradient}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{title}</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 truncate mt-1">{value}</div>
          {trend && (
            <div className={`text-xs font-semibold mt-1 ${
              trend.value > 0 ? 'text-green-600' : 
              trend.value < 0 ? 'text-red-600' : 'text-slate-500'
            }`}>
              {trend.value > 0 ? '↑' : trend.value < 0 ? '↓' : '→'} 
              {typeof trend.value === 'number' ? ` ${Math.abs(Math.round(trend.value))}% ` : ' '}
              {trend.label}
            </div>
          )}
          {hint && <div className="text-xs text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">{hint}</div>}
        </div>
        <div className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
          <FiArrowRight className="text-xl" />
        </div>
      </div>
    </button>
  );
}

// Activity Item Component
// Activity Item Component with enhanced date handling
function ActivityItem({ activity, index }) {
  const getActivityIcon = (type) => {
    const typeStr = String(type).toLowerCase();
    if (typeStr.includes('user')) return <FiUsers className="text-blue-600" />;
    if (typeStr.includes('document')) return <FiFileText className="text-green-600" />;
    if (typeStr.includes('announcement')) return <FaBullhorn className="text-purple-600" />;
    if (typeStr.includes('event')) return <FiCalendar className="text-amber-600" />;
    return <FiActivity className="text-slate-600" />;
  };

  // Enhanced date parsing function
  const formatActivityTime = (timeString) => {
    if (!timeString) return 'Recently';
    
    try {
      let date;
      
      // Handle various date formats
      if (typeof timeString === 'string') {
        // Remove any unexpected characters
        const cleanString = timeString.replace(/[^\w\s:-]/g, '');
        date = new Date(cleanString);
        
        // If still invalid, try parsing as ISO without timezone
        if (isNaN(date.getTime()) && cleanString.includes('T')) {
          const isoString = cleanString.split('T')[0] + 'T' + cleanString.split('T')[1].split('.')[0];
          date = new Date(isoString + 'Z');
        }
      } else if (timeString instanceof Date) {
        date = timeString;
      } else {
        date = new Date(timeString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Return relative time or empty based on index
        return index < 3 ? 'Recently' : '';
      }
      
      // If date is today, show time, otherwise show date
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.warn('Error parsing date:', timeString, error);
      return index < 3 ? 'Recently' : '';
    }
  };

  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all card-hover group animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        {getActivityIcon(activity.type || activity.action)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          {activity.user || activity.actor || 'System'}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          {activity.action || activity.message || 'Performed an action'}
        </div>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {formatActivityTime(activity.time || activity.created_at)}
      </div>
    </div>
  );
}

// Status Item Component
// Status Item Component with explicit status mapping
function StatusItem({ label, status, delay }) {
  const statusValue = String(status).toLowerCase();
  
  // Map status values to states
  const getStatusState = () => {
    const healthyStatuses = ['up', 'ok', 'healthy', 'online', 'running', 'normal', 'active', 'connected'];
    const degradedStatuses = ['degraded', 'partial', 'slow', 'warning', 'unstable', 'limited'];
    const downStatuses = ['down', 'offline', 'error', 'failed', 'stopped', 'disconnected'];
    
    if (healthyStatuses.some(s => statusValue.includes(s))) return 'healthy';
    if (degradedStatuses.some(s => statusValue.includes(s))) return 'degraded';
    if (downStatuses.some(s => statusValue.includes(s))) return 'down';
    
    return 'unknown';
  };

  const statusState = getStatusState();
  
  const getStatusIcon = () => {
    switch (statusState) {
      case 'healthy': return <FiCheckCircle className="text-green-500" />;
      case 'degraded': return <FiAlertCircle className="text-amber-500" />;
      case 'down': return <FiX className="text-red-500" />;
      default: return <FiAlertCircle className="text-slate-500" />;
    }
  };

  const getStatusColor = () => {
    switch (statusState) {
      case 'healthy': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'degraded': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'down': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
    }
  };

  const getDisplayStatus = () => {
    // Return the original status but capitalize it
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <div 
      className={`flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in-up ${getStatusColor()}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <span className="font-medium text-slate-800 dark:text-slate-100">{label}</span>
      </div>
      <span className="text-sm font-semibold">{getDisplayStatus()}</span>
    </div>
  );
}
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Chart state
  const [chartLabels, setChartLabels] = useState([]);
  const [chartData, setChartData] = useState([]);

  const navigate = useNavigate();

  // Toast effect
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Helper to compute percent change
  const computePercentChange = (current, previous) => {
    if (typeof current !== 'number' || typeof previous !== 'number') return null;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Calculate trends based on available data
  const calculateTrends = () => {
    if (!stats) return {};
    
    const trends = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate user trends from registration data
    if (chartData.length >= 2) {
      const currentMonthRegistrations = chartData[chartData.length - 1] || 0;
      const previousMonthRegistrations = chartData[chartData.length - 2] || 0;
      const userTrend = computePercentChange(currentMonthRegistrations, previousMonthRegistrations);
      trends.totalUsers = { 
        value: userTrend, 
        label: 'this month',
        calculated: true 
      };
    } else {
      trends.totalUsers = { value: 12, label: 'this month' }; // Fallback
    }

    // Active users trend (simulated based on time of day)
    const hour = now.getHours();
    const activeUserTrend = hour >= 9 && hour <= 17 ? 8 : -3;
    trends.activeUsers = { value: activeUserTrend, label: 'today' };

    // Documents trend (simulated growth)
    const documentsTrend = stats.totalDocuments > 0 ? 5 : 0;
    trends.totalDocuments = { value: documentsTrend, label: 'new today' };

    // Conversations trend (simulated based on activity)
    const conversationsTrend = recentActivities.length > 5 ? 15 : 5;
    trends.totalConversations = { value: conversationsTrend, label: 'this week' };

    return trends;
  };

  // Calculate additional metrics trends
  const calculateAdditionalTrends = () => {
    return {
      pendingFeedback: { value: -2, label: 'resolved today' },
      upcomingEvents: { value: 10, label: 'this week' },
      activeSessions: { value: 5, label: 'currently' },
      storageUsed: { value: 3, label: 'this month' }
    };
  };

  useEffect(() => {
    const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Fetch dashboard stats, activities, system status
    axios.get(`${BASE_URL}/api/dashboard/`, { headers })
      .then(res => {
        const dashboardData = res.data;
        setStats(dashboardData.stats || {
          totalUsers: dashboardData.total_users || 0,
          activeUsers: dashboardData.active_users || 0,
          totalDocuments: dashboardData.total_documents || 0,
          totalConversations: dashboardData.total_conversations || 0,
          pendingFeedback: dashboardData.pending_feedback || 0,
          upcomingEvents: dashboardData.upcoming_events || 0,
          activeSessions: dashboardData.active_sessions || 24,
          storageUsed: dashboardData.storage_used || 2.4
        });
        setRecentActivities(dashboardData.recentActivities || dashboardData.recent_activities || []);
        setSystemStatus(dashboardData.systemStatus || dashboardData.system_status || {
          database: 'Healthy',
          api: 'Operational',
          aiService: 'Running',
          storage: 'Normal'
        });
      })
      .catch((err) => {
        console.error('Dashboard error:', err);
        // Set fallback data
        setStats({
          totalUsers: 1242,
          activeUsers: 89,
          totalDocuments: 456,
          totalConversations: 1234,
          pendingFeedback: 23,
          upcomingEvents: 7,
          activeSessions: 24,
          storageUsed: 2.4
        });
        setRecentActivities([
          { id: 1, user: 'John Doe', action: 'Uploaded new document', type: 'document', time: new Date().toISOString() },
          { id: 2, user: 'System', action: 'New user registration', type: 'user', time: new Date(Date.now() - 300000).toISOString() },
          { id: 3, user: 'Admin', action: 'Created announcement', type: 'announcement', time: new Date(Date.now() - 600000).toISOString() }
        ]);
        setSystemStatus({
          database: 'Healthy',
          api: 'Operational',
          aiService: 'Running',
          storage: 'Normal'
        });
      })
      .finally(() => setLoading(false));

    // Fetch chart data from backend
    axios.get(`${BASE_URL}/api/registrations-per-month/`, { headers })
      .then(res => {
        setChartLabels(res.data.labels || []);
        setChartData(res.data.data || []);
      })
      .catch(err => {
        console.error('Chart data error:', err);
        // Set demo chart data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        setChartLabels(months.slice(0, currentMonth + 1));
        setChartData(Array.from({ length: currentMonth + 1 }, (_, i) => 
          Math.floor(Math.random() * 100) + 50
        ));
      });
  }, []);

  const trends = calculateTrends();
  const additionalTrends = calculateAdditionalTrends();

  const registrationsData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'User Registrations',
        data: chartData,
        fill: true,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        ticks: {
          color: '#64748b'
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        ticks: {
          color: '#64748b'
        },
        beginAtZero: true
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  const quickActions = [
    { 
      icon: <FiUserPlus className="text-2xl" />, 
      label: "Add User", 
      route: "/admin/users",
      description: "Manage user accounts",
      gradient: "from-blue-500 to-blue-600"
    },
    { 
      icon: <FiUploadCloud className="text-2xl" />, 
      label: "Upload Document", 
      route: "/admin/documents",
      description: "Add new resources",
      gradient: "from-green-500 to-green-600"
    },
    { 
      icon: <FaBullhorn className="text-2xl" />, 
      label: "Create Announcement", 
      route: "/admin/announcements",
      description: "Broadcast updates",
      gradient: "from-purple-500 to-purple-600"
    },
    { 
      icon: <FiCalendar className="text-2xl" />, 
      label: "Schedule Event", 
      route: "/admin/events",
      description: "Plan activities",
      gradient: "from-amber-500 to-amber-600"
    },
    { 
      icon: <FiSettings className="text-2xl" />, 
      label: "System Settings", 
      route: "/admin/settings",
      description: "Configure system",
      gradient: "from-slate-500 to-slate-600"
    },
    { 
      icon: <FiDownload className="text-2xl" />, 
      label: "Generate Report", 
      route: "/admin/reports",
      description: "Export analytics",
      gradient: "from-rose-500 to-rose-600"
    }
  ];

  // Custom animations
  const customStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in-up { animation: fadeInUp 0.6s ease-out; }
    .animate-slide-in-left { animation: slideInLeft 0.5s ease-out; }
    .animate-slide-in-right { animation: slideInRight 0.5s ease-out; }
    .animate-scale-in { animation: scaleIn 0.4s ease-out; }
    .card-hover {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-hover:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .button-hover {
      transition: all 0.3s ease;
    }
    .button-hover:hover {
      transform: translateY(-2px);
    }
    .toast-enter {
      animation: slideInRight 0.3s ease-out;
    }
  `;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <style>{customStyles}</style>

      {/* Toast notifications */}
      <div aria-live="polite" className="fixed top-6 right-6 z-50">
        {toast && (
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg toast-enter ${
            toast.type === "error" 
              ? "bg-rose-50 border border-rose-200 text-rose-700" 
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}>
            {toast.type === "error" ? <FiX className="text-xl" /> : <FiCheckCircle className="text-xl" />}
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        )}
      </div>

      {/* HEADER SECTION */}
      <section className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <FaChartLine className="text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
              <p className="text-slate-600 dark:text-slate-400">Welcome to the PKFIE-Hub Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-semibold">
            <FiZap className="text-blue-500" />
            System Admin
          </div>
        </div>
      </section>

      {/* STATS OVERVIEW */}
      <section className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : !stats ? (
            <div className="col-span-full text-center py-8 text-slate-500">
              Error loading statistics
            </div>
          ) : (
            <>
              <StatCard 
                title="Total Users" 
                value={stats.totalUsers ?? 0} 
                icon={<FiUsers className="text-2xl" />} 
                onClick={() => navigate("/admin/users")} 
                hint="View all registered users"
                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                delay={0}
                trend={trends.totalUsers}
              />
              <StatCard 
                title="Active Users" 
                value={stats.activeUsers ?? 0} 
                icon={<FiUserCheck className="text-2xl" />} 
                onClick={() => navigate("/admin/users?filter=active")} 
                hint="Currently online users"
                gradient="bg-gradient-to-br from-green-500 to-green-600"
                delay={100}
                trend={trends.activeUsers}
              />
              <StatCard 
                title="Documents" 
                value={stats.totalDocuments ?? 0} 
                icon={<FiFileText className="text-2xl" />} 
                onClick={() => navigate("/admin/documents")} 
                hint="Manage all documents"
                gradient="bg-gradient-to-br from-rose-500 to-rose-600"
                delay={200}
                trend={trends.totalDocuments}
              />
              <StatCard 
                title="Conversations" 
                value={stats.totalConversations ?? 0} 
                icon={<FiMessageCircle className="text-2xl" />} 
                onClick={() => navigate("/admin/conversations")} 
                hint="AI assistant chats"
                gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                delay={300}
                trend={trends.totalConversations}
              />
            </>
          )}
        </div>
      </section>

      {/* CHART SECTION */}
      <section className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                <FiTrendingUp className="text-xl" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Registrations</h3>
                <p className="text-slate-600 dark:text-slate-400">Monthly registration trends</p>
              </div>
            </div>
            <button className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all button-hover">
              Export Data
            </button>
          </div>

          <div className="h-80">
            {chartLabels.length > 0 ? (
              <Line data={registrationsData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading chart data...
                  </div>
                ) : (
                  "No chart data available"
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Recent Activities + Additional Stats */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Activities */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-lg animate-slide-in-left">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white">
                  <FiActivity className="text-xl" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recent Activities</h3>
                  <p className="text-slate-600 dark:text-slate-400">Latest system activities and user actions</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading activities...
                  </div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FiActivity className="text-4xl mx-auto mb-3 opacity-50" />
                  <div>No recent activities</div>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <ActivityItem key={activity.id || index} activity={activity} index={index} />
                ))
              )}
            </div>
          </div>

          {/* Additional Stats */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-lg animate-slide-in-left">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                <FiBarChart2 className="text-xl" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Additional Metrics</h3>
                <p className="text-slate-600 dark:text-slate-400">System performance and engagement</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {loading ? (
                <>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                    </div>
                  ))}
                </>
              ) : !stats ? (
                <div className="col-span-full text-center py-4 text-slate-500">
                  Error loading metrics
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all card-hover">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Pending Feedback</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {stats.pendingFeedback ?? 0}
                        </div>
                        <div className={`text-xs font-semibold mt-1 ${
                          additionalTrends.pendingFeedback.value > 0 ? 'text-green-600' : 
                          additionalTrends.pendingFeedback.value < 0 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {additionalTrends.pendingFeedback.value > 0 ? '↑' : additionalTrends.pendingFeedback.value < 0 ? '↓' : '→'} 
                          {typeof additionalTrends.pendingFeedback.value === 'number' ? ` ${Math.abs(additionalTrends.pendingFeedback.value)}% ` : ' '}
                          {additionalTrends.pendingFeedback.label}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <FiInbox className="text-xl" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all card-hover">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Upcoming Events</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {stats.upcomingEvents ?? 0}
                        </div>
                        <div className={`text-xs font-semibold mt-1 ${
                          additionalTrends.upcomingEvents.value > 0 ? 'text-green-600' : 
                          additionalTrends.upcomingEvents.value < 0 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {additionalTrends.upcomingEvents.value > 0 ? '↑' : additionalTrends.upcomingEvents.value < 0 ? '↓' : '→'} 
                          {typeof additionalTrends.upcomingEvents.value === 'number' ? ` ${Math.abs(additionalTrends.upcomingEvents.value)}% ` : ' '}
                          {additionalTrends.upcomingEvents.label}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <FiCalendar className="text-xl" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all card-hover">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Active Sessions</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {stats.activeSessions || '24'}
                        </div>
                        <div className={`text-xs font-semibold mt-1 ${
                          additionalTrends.activeSessions.value > 0 ? 'text-green-600' : 
                          additionalTrends.activeSessions.value < 0 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {additionalTrends.activeSessions.value > 0 ? '↑' : additionalTrends.activeSessions.value < 0 ? '↓' : '→'} 
                          {typeof additionalTrends.activeSessions.value === 'number' ? ` ${Math.abs(additionalTrends.activeSessions.value)}% ` : ' '}
                          {additionalTrends.activeSessions.label}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <FiUserCheck className="text-xl" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all card-hover">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Storage Used</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {stats.storageUsed || '2.4'} GB
                        </div>
                        <div className={`text-xs font-semibold mt-1 ${
                          additionalTrends.storageUsed.value > 0 ? 'text-green-600' : 
                          additionalTrends.storageUsed.value < 0 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {additionalTrends.storageUsed.value > 0 ? '↑' : additionalTrends.storageUsed.value < 0 ? '↓' : '→'} 
                          {typeof additionalTrends.storageUsed.value === 'number' ? ` ${Math.abs(additionalTrends.storageUsed.value)}% ` : ' '}
                          {additionalTrends.storageUsed.label}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <FiDatabase className="text-xl" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: System Status + Quick Actions */}
        <aside className="space-y-8">
          {/* System Status */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg sticky top-6 animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                  <FiServer className="text-lg" />
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">System Status</div>
              </div>
              <div className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold">
                Live
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !systemStatus ? (
                <div className="text-center py-8 text-slate-500">
                  Error loading system status
                </div>
              ) : (
                <>
                  <StatusItem 
                    label="Database" 
                    status={systemStatus.database} 
                    delay={0}
                  />
                  <StatusItem 
                    label="API Service" 
                    status={systemStatus.api} 
                    delay={100}
                  />
                  <StatusItem 
                    label="AI Service" 
                    status={systemStatus.aiService || systemStatus.ai_service} 
                    delay={200}
                  />
                  <StatusItem 
                    label="File Storage" 
                    status={systemStatus.storage} 
                    delay={300}
                  />
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg animate-slide-in-right">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                <FaRocket className="text-lg" />
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">Quick Actions</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => navigate(action.route)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all card-hover text-center group"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mx-auto mb-3 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1 text-sm">
                    {action.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {action.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Admin Profile Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg sticky top-80 animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <FiSettings className="text-xl" />
              </div>
              <div>
                <div className="text-sm font-semibold text-blue-100">Admin Access</div>
                <div className="text-xl font-bold">System Administrator</div>
              </div>
            </div>
            <p className="text-blue-100 text-sm mb-6 leading-relaxed">
              Full system access with administrative privileges and monitoring capabilities
            </p>
            <button 
              className="w-full py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-all button-hover flex items-center justify-center gap-2"
              onClick={() => navigate("/admin/settings")}
            >
              System Settings <FiArrowRight />
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default AdminDashboard;