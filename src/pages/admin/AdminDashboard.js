import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import api from '../../services/api';
import {
  FiUsers, FiUserCheck, FiFile, FiMessageSquare,
  FiInbox, FiCalendar, FiUserPlus, FiUpload,
  FiBell, FiSettings, FiTrendingUp, FiTrendingDown, FiActivity,
  FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiClock,
  FiCpu, FiArrowRight, FiRefreshCw, FiStar, FiZap,
} from 'react-icons/fi';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/* ─── Skeleton ─────────────────────────────────────────────────────────── */
const Sk = ({ className = '' }) => (
  <div className={`bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

/* ─── Static config ─────────────────────────────────────────────────────── */
const STAT_META = [
  { key: 'totalUsers',         label: 'Total Users',       icon: FiUsers,         color: 'bg-sky-500/20 text-sky-400',         route: '/admin/users'    },
  { key: 'activeUsers',        label: 'Active Users',      icon: FiUserCheck,     color: 'bg-emerald-500/20 text-emerald-400', route: '/admin/users'    },
  { key: 'totalDocuments',     label: 'Documents',         icon: FiFile,          color: 'bg-violet-500/20 text-violet-400',   route: '/admin/documents'},
  { key: 'totalConversations', label: 'AI Conversations',  icon: FiMessageSquare, color: 'bg-amber-500/20 text-amber-400',     route: '/admin/ai-model' },
  { key: 'pendingFeedback',    label: 'Pending Feedback',  icon: FiInbox,         color: 'bg-orange-500/20 text-orange-400',   route: '/admin/feedback' },
  { key: 'upcomingEvents',     label: 'Upcoming Events',   icon: FiCalendar,      color: 'bg-pink-500/20 text-pink-400',       route: '/admin/events'   },
];

const QUICK_ACTIONS = [
  { icon: FiUserPlus,   label: 'Add User',        route: '/admin/users'         },
  { icon: FiUpload,     label: 'Upload Document', route: '/admin/documents'     },
  { icon: FiBell,       label: 'Announcement',    route: '/admin/announcements' },
  { icon: FiCalendar,   label: 'Schedule Event',  route: '/admin/events'        },
  { icon: FiSettings,   label: 'Settings',        route: '/admin/settings'      },
  { icon: FiTrendingUp, label: 'View Feedback',   route: '/admin/feedback'      },
];

const STATUS_SERVICES = [
  { label: 'Database',     key: 'database'  },
  { label: 'API Service',  key: 'api'       },
  { label: 'AI Service',   key: 'aiService' },
  { label: 'File Storage', key: 'storage'   },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const statusColor = (s) => {
  if (!s) return 'text-slate-400';
  const v = s.toLowerCase();
  if (['operational', 'healthy', 'online'].includes(v)) return 'text-emerald-400';
  if (['degraded', 'warning'].includes(v))               return 'text-amber-400';
  return 'text-red-400';
};
const statusIcon = (s) => {
  if (!s) return FiClock;
  const v = s.toLowerCase();
  if (['operational', 'healthy', 'online'].includes(v)) return FiCheckCircle;
  if (['degraded', 'warning'].includes(v))               return FiAlertTriangle;
  return FiAlertCircle;
};
const statusRowBg = (s) => {
  if (!s) return '';
  const v = s.toLowerCase();
  if (['operational', 'healthy', 'online'].includes(v)) return 'bg-emerald-500/[0.04]';
  if (['degraded', 'warning'].includes(v))               return 'bg-amber-500/[0.06]';
  return 'bg-red-500/[0.06]';
};

const activityMeta = (action = '') => {
  if (action.includes('registered'))                    return { icon: FiUserPlus,  cls: 'bg-sky-500/20 text-sky-400'     };
  if (action.includes('upload') || action.includes('document')) return { icon: FiUpload, cls: 'bg-violet-500/20 text-violet-400' };
  if (action.includes('event'))                         return { icon: FiCalendar,  cls: 'bg-pink-500/20 text-pink-400'   };
  return                                                       { icon: FiActivity,  cls: 'bg-slate-500/20 text-slate-400' };
};

const fmtResponseTime = (secs) => {
  if (secs == null) return '—';
  if (secs < 60) return `${Number(secs).toFixed(1)}s`;
  return `${(secs / 60).toFixed(1)}m`;
};

const fmtAgo = (ts) => {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (diff < 5)  return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
};

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats,            setStats]            = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemStatus,     setSystemStatus]     = useState(null);
  const [chatStats,        setChatStats]        = useState(null);
  const [communityStats,   setCommunityStats]   = useState(null);
  const [chartLabels,      setChartLabels]      = useState([]);
  const [chartData,        setChartData]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [error,            setError]            = useState(false);
  const [lastRefreshed,    setLastRefreshed]    = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(false);

    const [dashRes, chartRes, chatRes, communityRes] = await Promise.allSettled([
      api.get('/dashboard/'),
      api.get('/registrations-per-month/'),
      api.get('/chat/stats/'),
      api.get('/innovation/community/'),
    ]);

    if (dashRes.status === 'fulfilled') {
      const d = dashRes.value.data;
      setStats(d.stats ?? null);
      setRecentActivities(d.recentActivities || []);
      setSystemStatus(d.systemStatus ?? null);
    } else {
      setError(true);
    }

    if (chartRes.status === 'fulfilled') {
      setChartLabels(chartRes.value.data.labels || []);
      setChartData(chartRes.value.data.data   || []);
    }

    if (chatRes.status === 'fulfilled') {
      setChatStats(chatRes.value.data.stats ?? null);
    }

    if (communityRes.status === 'fulfilled') {
      setCommunityStats(communityRes.value.data ?? null);
    }

    setLastRefreshed(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Initial load + 60-second auto-refresh
  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Month-over-month registration trend
  const registrationTrend = (() => {
    if (chartData.length < 2) return null;
    const cur  = chartData[chartData.length - 1] ?? 0;
    const prev = chartData[chartData.length - 2] ?? 0;
    if (prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  })();

  const chartConfig = {
    labels: chartLabels,
    datasets: [{
      label: 'Registrations',
      data: chartData,
      fill: true,
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255,215,0,0.07)',
      pointBackgroundColor: '#FFD700',
      pointBorderColor: '#001F5B',
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f1e3d',
        titleColor: '#FFD700',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,215,0,.2)',
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.04)' } },
      y: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.04)' }, beginAtZero: true },
    },
  };

  /* ── Error full-page ── */
  if (!loading && error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <FiAlertCircle size={28} className="text-red-400" />
        </div>
        <p className="text-lg font-black text-white">Failed to load dashboard</p>
        <p className="text-sm text-navy-400 mt-1 mb-6 max-w-xs">
          Could not reach the server. Make sure the backend is running and your session is valid.
        </p>
        <button
          onClick={() => load()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black
            text-navy-900 transition-all hover:-translate-y-px"
          style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
        >
          <FiRefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-navy-400 mt-0.5">
            {lastRefreshed ? `Updated ${fmtAgo(lastRefreshed)}` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing || loading}
          aria-label="Refresh dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold
            text-navy-300 border border-navy-700/40 hover:border-navy-600/60 hover:text-white
            disabled:opacity-40 transition-all"
        >
          <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading
          ? [...Array(6)].map((_, i) => <Sk key={i} className="h-28" />)
          : STAT_META.map(({ key, label, icon: Icon, color, route }) => {
              const val     = stats?.[key];
              const isAlert = key === 'pendingFeedback' && val > 0;
              const [bg, fg] = color.split(' ');
              return (
                <button
                  key={key}
                  onClick={() => navigate(route)}
                  className={[
                    'group relative bg-navy-800/60 rounded-2xl p-5 text-left border',
                    'hover:-translate-y-0.5 hover:border-navy-600/60 transition-all duration-200',
                    isAlert ? 'border-orange-500/30 bg-orange-500/[0.03]' : 'border-navy-700/40',
                  ].join(' ')}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
                    <Icon size={16} aria-hidden className={fg} />
                  </div>
                  <p className="text-2xl font-black text-white leading-none tabular-nums mb-1">
                    {val ?? '—'}
                  </p>
                  <p className="text-xs text-navy-400 font-semibold leading-tight">{label}</p>
                  <FiArrowRight
                    size={12}
                    className="absolute top-3 right-3 text-navy-700 opacity-0
                      group-hover:opacity-100 group-hover:text-gold transition-all"
                  />
                </button>
              );
            })
        }
      </div>

      {/* ── Chart + AI Stats ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Registration trend chart */}
        <div className="lg:col-span-2 bg-navy-800/60 rounded-2xl border border-navy-700/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiTrendingUp size={15} className="text-gold" aria-hidden />
              <h2 className="text-sm font-black text-white">User Registrations</h2>
              <span className="text-xs text-navy-600">last 10 months</span>
            </div>
            {registrationTrend !== null && (
              <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg ${
                registrationTrend >= 0
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {registrationTrend >= 0
                  ? <FiTrendingUp size={11} />
                  : <FiTrendingDown size={11} />}
                {registrationTrend >= 0 ? '+' : ''}{registrationTrend}% vs last month
              </div>
            )}
          </div>
          <div style={{ height: 210 }}>
            {loading
              ? <Sk className="w-full h-full" />
              : chartLabels.length > 0
                ? <Line data={chartConfig} options={chartOptions} />
                : <div className="h-full flex items-center justify-center text-navy-500 text-sm">No chart data</div>
            }
          </div>
        </div>

        {/* AI Assistant stats */}
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40 flex-shrink-0">
            <FiCpu size={14} className="text-gold" aria-hidden />
            <h2 className="text-sm font-black text-white">AI Assistant</h2>
            {chatStats?.ai_provider && (
              <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-gold/15 text-gold capitalize">
                {chatStats.ai_provider}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-5 space-y-3 flex-1">
              {[...Array(4)].map((_, i) => <Sk key={i} className="h-8" />)}
            </div>
          ) : !chatStats ? (
            <div className="px-5 py-10 text-center text-sm text-navy-500 flex-1 flex items-center justify-center">
              Stats unavailable
            </div>
          ) : (
            <>
              {/* 4 metric tiles */}
              <div className="grid grid-cols-2 flex-1" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {[
                  { label: 'Conversations', value: chatStats.total_conversations ?? '—',            icon: FiMessageSquare, fg: 'text-amber-400'  },
                  { label: 'Messages',      value: chatStats.total_messages ?? '—',                  icon: FiActivity,      fg: 'text-violet-400' },
                  { label: 'Avg Response',  value: fmtResponseTime(chatStats.average_response_time), icon: FiClock,         fg: 'text-sky-400'    },
                  { label: 'Satisfaction',  value: chatStats.user_satisfaction_rate != null
                      ? `${Number(chatStats.user_satisfaction_rate).toFixed(1)}/5`
                      : '—',
                    icon: FiStar, fg: 'text-gold' },
                ].map(({ label, value, icon: Icon, fg }, i) => (
                  <div
                    key={label}
                    className={`flex flex-col items-center justify-center p-4 text-center ${
                      i % 2 === 0 ? 'border-r border-navy-700/30' : ''
                    } ${i < 2 ? 'border-b border-navy-700/30' : ''}`}
                  >
                    <Icon size={14} className={`mb-1.5 ${fg}`} aria-hidden />
                    <p className="text-lg font-black text-white tabular-nums leading-none">{value}</p>
                    <p className="text-[10px] text-navy-500 mt-1 font-semibold">{label}</p>
                  </div>
                ))}
              </div>

              {/* Top questions */}
              {chatStats.common_questions?.length > 0 && (
                <div className="px-4 py-3 border-b border-navy-700/30">
                  <p className="text-[9px] font-black text-navy-600 uppercase tracking-widest mb-2">
                    Top questions
                  </p>
                  <ul className="space-y-1.5">
                    {chatStats.common_questions.slice(0, 4).map((q, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[9px] font-black text-gold mt-0.5 w-3 flex-shrink-0">{i + 1}.</span>
                        <p className="text-[10px] text-navy-300 leading-relaxed line-clamp-1 flex-1 min-w-0">
                          {q.message_text}
                        </p>
                        <span className="text-[9px] text-navy-600 flex-shrink-0">{q.count}×</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="px-4 py-3">
                <button
                  onClick={() => navigate('/admin/ai-model')}
                  className="text-xs font-bold text-gold hover:text-gold/70 flex items-center gap-1 transition-colors"
                >
                  Full AI stats <FiArrowRight size={11} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Recent Activities */}
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700/40">
            <div className="flex items-center gap-2">
              <FiActivity size={14} className="text-gold" aria-hidden />
              <h2 className="text-sm font-black text-white">Recent Activity</h2>
            </div>
          </div>

          <div className="divide-y divide-navy-700/30">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => <Sk key={i} className="h-12" />)}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-navy-500">No recent activity.</div>
            ) : (
              recentActivities.map(a => {
                const { icon: Icon, cls } = activityMeta(a.action);
                const [bg, fg] = cls.split(' ');
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-navy-700/20 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Icon size={13} className={fg} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{a.user}</p>
                      <p className="text-[10px] text-navy-400 mt-0.5 leading-relaxed line-clamp-2">{a.action}</p>
                    </div>
                    <span className="flex-shrink-0 text-[10px] text-navy-600 font-medium mt-0.5 whitespace-nowrap">
                      {a.time}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40">
            <FiCheckCircle size={14} className="text-gold" aria-hidden />
            <h2 className="text-sm font-black text-white">System Status</h2>
          </div>

          <div className="divide-y divide-navy-700/30">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => <Sk key={i} className="h-12" />)}
              </div>
            ) : !systemStatus ? (
              <div className="px-5 py-10 text-center text-sm text-navy-500">Status unavailable.</div>
            ) : (
              STATUS_SERVICES.map(({ label, key }) => {
                const val  = systemStatus[key];
                const Icon = statusIcon(val);
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-5 py-3.5 ${statusRowBg(val)}`}
                  >
                    <span className="text-sm text-navy-300 font-semibold">{label}</span>
                    <span className={`flex items-center gap-1.5 text-xs font-black capitalize ${statusColor(val)}`}>
                      <Icon size={12} aria-hidden />
                      {val || 'Unknown'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Innovation / Community mini-stats */}
          {!loading && communityStats && (
            <>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-navy-700/40">
                <FiZap size={13} className="text-gold" aria-hidden />
                <p className="text-xs font-black text-white">Innovation Hub</p>
              </div>
              <div className="grid grid-cols-3 border-t border-navy-700/40">
                {[
                  { label: 'Projects',  value: communityStats.active_projects     },
                  { label: 'Members',   value: communityStats.members             },
                  { label: 'Solved',    value: communityStats.completed_solutions  },
                ].map(({ label, value }, i) => (
                  <div
                    key={label}
                    className={`flex flex-col items-center py-3 text-center ${
                      i < 2 ? 'border-r border-navy-700/30' : ''
                    }`}
                  >
                    <p className="text-base font-black text-white tabular-nums">{value ?? '—'}</p>
                    <p className="text-[9px] text-navy-600 font-semibold mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-navy-700/40">
            <FiSettings size={14} className="text-gold" aria-hidden />
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
                  size={17}
                  aria-hidden
                  className="text-navy-400 group-hover:text-gold transition-colors"
                />
                <span className="text-[11px] font-bold text-navy-300 group-hover:text-white
                  transition-colors text-center leading-tight">
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
