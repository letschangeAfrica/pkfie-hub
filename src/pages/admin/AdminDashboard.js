import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import {
  FiUsers, FiUserCheck, FiFile, FiMessageSquare,
  FiInbox, FiCalendar, FiUserPlus, FiUpload,
  FiBell, FiSettings, FiTrendingUp, FiActivity,
  FiCheckCircle, FiAlertCircle, FiClock,
} from 'react-icons/fi';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const Sk = ({ className = '' }) => (
  <div className={`bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

const STAT_META = [
  { key: 'totalUsers',       label: 'Total Users',       icon: FiUsers,         color: 'bg-sky-500/20 text-sky-400'     },
  { key: 'activeUsers',      label: 'Active Users',      icon: FiUserCheck,     color: 'bg-emerald-500/20 text-emerald-400' },
  { key: 'totalDocuments',   label: 'Documents',         icon: FiFile,          color: 'bg-violet-500/20 text-violet-400' },
  { key: 'totalConversations',label: 'Conversations',    icon: FiMessageSquare, color: 'bg-amber-500/20 text-amber-400' },
  { key: 'pendingFeedback',  label: 'Pending Feedback',  icon: FiInbox,         color: 'bg-orange-500/20 text-orange-400' },
  { key: 'upcomingEvents',   label: 'Upcoming Events',   icon: FiCalendar,      color: 'bg-pink-500/20 text-pink-400'   },
];

const QUICK_ACTIONS = [
  { icon: FiUserPlus, label: 'Add User',           route: '/admin/users'         },
  { icon: FiUpload,   label: 'Upload Document',    route: '/admin/documents'     },
  { icon: FiBell,     label: 'Announcement',       route: '/admin/announcements' },
  { icon: FiCalendar, label: 'Schedule Event',     route: '/admin/events'        },
  { icon: FiSettings, label: 'System Settings',    route: '/admin/settings'      },
  { icon: FiTrendingUp,label: 'View Feedback',     route: '/admin/feedback'      },
];

const statusColor = (s) => {
  if (!s) return 'text-slate-400';
  const v = s.toLowerCase();
  if (v === 'operational' || v === 'healthy' || v === 'online') return 'text-emerald-400';
  if (v === 'degraded' || v === 'warning')  return 'text-amber-400';
  return 'text-red-400';
};

const statusIcon = (s) => {
  if (!s) return FiClock;
  const v = s.toLowerCase();
  if (v === 'operational' || v === 'healthy' || v === 'online') return FiCheckCircle;
  return FiAlertCircle;
};

export default function AdminDashboard() {
  const [stats,            setStats]            = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemStatus,     setSystemStatus]     = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [chartLabels,      setChartLabels]      = useState([]);
  const [chartData,        setChartData]        = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const hdrs  = { Authorization: `Bearer ${token}` };

    axios.get(`${BASE_URL}/api/dashboard/`, { headers: hdrs })
      .then(res => {
        setStats(res.data.stats);
        setRecentActivities(res.data.recentActivities || []);
        setSystemStatus(res.data.systemStatus);
      })
      .catch(() => { setStats(null); setRecentActivities([]); setSystemStatus(null); })
      .finally(() => setLoading(false));

    axios.get(`${BASE_URL}/api/registrations-per-month/`, { headers: hdrs })
      .then(res => { setChartLabels(res.data.labels || []); setChartData(res.data.data || []); })
      .catch(() => {});
  }, []);

  const chartConfig = {
    labels: chartLabels,
    datasets: [{
      label: 'User Registrations',
      data: chartData,
      fill: true,
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255,215,0,0.08)',
      pointBackgroundColor: '#FFD700',
      pointBorderColor: '#001F5B',
      pointRadius: 4,
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { weight: 'bold' } } },
      tooltip: {
        backgroundColor: '#0f1e3d',
        titleColor: '#FFD700',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,215,0,.2)',
        borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.04)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.04)' } },
    },
  };

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-navy-400 mt-1">
          Welcome to the PKFIE-Hub Admin Panel
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => <Sk key={i} className="h-28" />)
          : STAT_META.map(({ key, label, icon: Icon, color }) => (
            <div key={key}
              className="bg-navy-800/60 rounded-2xl p-5 border border-navy-700/40
                hover:border-navy-600/60 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color.split(' ')[0]}`}>
                <Icon size={18} aria-hidden="true" className={color.split(' ')[1]} />
              </div>
              <p className="text-2xl font-black text-white leading-none tabular-nums mb-1">
                {stats?.[key] ?? '—'}
              </p>
              <p className="text-xs text-navy-400 font-semibold">{label}</p>
            </div>
          ))
        }
      </div>

      {/* ── Chart ── */}
      <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 p-6">
        <div className="flex items-center gap-2 mb-5">
          <FiTrendingUp size={16} className="text-gold" aria-hidden="true" />
          <h2 className="text-sm font-black text-white">User Registrations (Monthly)</h2>
        </div>
        <div style={{ height: 220 }}>
          {chartLabels.length > 0
            ? <Line data={chartConfig} options={chartOptions} />
            : (
              <div className="h-full flex items-center justify-center text-navy-500 text-sm">
                {loading ? <Sk className="w-full h-full" /> : 'No chart data available'}
              </div>
            )
          }
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Recent Activities */}
        <div className="lg:col-span-1 bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40">
            <FiActivity size={14} className="text-gold" aria-hidden="true" />
            <h2 className="text-sm font-black text-white">Recent Activities</h2>
          </div>
          <div className="divide-y divide-navy-700/30">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => <Sk key={i} className="h-10" />)}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-navy-500">
                No recent activities.
              </div>
            ) : (
              recentActivities.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-3 px-5 py-3.5
                  hover:bg-navy-700/30 transition-colors">
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-white truncate block">{a.user}</span>
                    <span className="text-xs text-navy-400">{a.action}</span>
                  </div>
                  <span className="flex-shrink-0 text-[11px] text-navy-500 font-medium mt-0.5">
                    {a.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40">
            <FiCheckCircle size={14} className="text-gold" aria-hidden="true" />
            <h2 className="text-sm font-black text-white">System Status</h2>
          </div>
          <div className="divide-y divide-navy-700/30">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => <Sk key={i} className="h-10" />)}
              </div>
            ) : !systemStatus ? (
              <div className="px-5 py-10 text-center text-sm text-navy-500">
                Status unavailable.
              </div>
            ) : (
              [
                { label: 'Database',     key: 'database'  },
                { label: 'API Service',  key: 'api'       },
                { label: 'AI Service',   key: 'aiService' },
                { label: 'File Storage', key: 'storage'   },
              ].map(({ label, key }) => {
                const val  = systemStatus[key];
                const Icon = statusIcon(val);
                return (
                  <div key={key} className="flex items-center justify-between px-5 py-3.5
                    hover:bg-navy-700/30 transition-colors">
                    <span className="text-sm text-navy-300 font-semibold">{label}</span>
                    <span className={`flex items-center gap-1.5 text-xs font-black capitalize ${statusColor(val)}`}>
                      <Icon size={12} aria-hidden="true" />
                      {val || 'Unknown'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40">
            <FiSettings size={14} className="text-gold" aria-hidden="true" />
            <h2 className="text-sm font-black text-white">Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(({ icon: Icon, label, route }) => (
              <button
                key={label}
                onClick={() => navigate(route)}
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl
                  bg-navy-700/40 hover:bg-navy-700/70 border border-navy-700/40
                  hover:border-gold/30 transition-all group"
              >
                <Icon
                  size={18}
                  aria-hidden="true"
                  className="text-navy-400 group-hover:text-gold transition-colors"
                />
                <span className="text-[11px] font-bold text-navy-300 group-hover:text-white transition-colors text-center leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
