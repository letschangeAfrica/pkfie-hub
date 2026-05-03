import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import pkfievideo from '../../images/pkfievideo.mp4';
import {
  FiBook, FiCpu, FiCompass, FiZap, FiBell,
  FiCalendar, FiArrowRight, FiMapPin, FiClock,
  FiX, FiUsers, FiAlertTriangle, FiInfo, FiMessageCircle, FiLock,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/* ── Priority badge ─────────────────────────────────────────── */
const PRIORITY_MAP = {
  urgent: 'bg-red-100 text-red-700 border border-red-200',
  high:   'bg-amber-100 text-amber-700 border border-amber-200',
  normal: 'bg-sky-100 text-sky-700 border border-sky-200',
  low:    'bg-slate-100 text-slate-600 border border-slate-200',
};

const PriorityBadge = ({ priority }) => {
  const cls = PRIORITY_MAP[priority] || PRIORITY_MAP.normal;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${cls}`}>
      {priority === 'urgent' && <FiAlertTriangle size={9} className="mr-1" aria-hidden="true" />}
      {priority || 'normal'}
    </span>
  );
};

/* ── Quick-action card ──────────────────────────────────────── */
const ActionCard = ({ icon: Icon, label, desc, accent, onClick, featured, locked }) => (
  <button
    onClick={locked ? undefined : onClick}
    disabled={locked}
    title={locked ? 'Available for students only' : undefined}
    className={[
      'group relative text-left w-full rounded-2xl bg-white dark:bg-navy-800 p-5 shadow-sm dark:shadow-none',
      'border transition-all duration-200',
      locked
        ? 'opacity-50 cursor-not-allowed border-slate-100 dark:border-navy-700/40'
        : featured
          ? 'border-gold/40 ring-2 ring-gold/20 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none'
          : 'border-slate-100 dark:border-navy-700/40 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none hover:border-slate-200 dark:hover:border-navy-600/60',
    ].join(' ')}
  >
    {featured && !locked && (
      <span className="absolute top-3 right-3 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
        Popular
      </span>
    )}
    {locked && (
      <span className="absolute top-3 right-3">
        <FiLock size={12} className="text-slate-400 dark:text-navy-500" />
      </span>
    )}
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${locked ? 'bg-slate-300 dark:bg-navy-700' : accent}`}>
      <Icon size={20} className="text-white" aria-hidden="true" />
    </div>
    <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight mb-1">{label}</p>
    <p className="text-xs text-slate-500 dark:text-navy-300 leading-relaxed">
      {locked ? 'Students only' : desc}
    </p>
    {!locked && (
      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-navy-400 group-hover:text-slate-600 dark:group-hover:text-navy-200 transition-colors">
        Open <FiArrowRight size={12} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
      </div>
    )}
  </button>
);

/* ── Stat pill (hero) ───────────────────────────────────────── */
const StatPill = ({ icon: Icon, value, label, sub }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
    <div className="w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
      <Icon size={16} className="text-gold" aria-hidden="true" />
    </div>
    <div>
      <p className="text-base font-black text-white leading-none">{value}</p>
      <p className="text-[10px] text-white/60 mt-0.5 leading-tight">{label}<br /><span className="text-white/40">{sub}</span></p>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [announcements,        setAnnouncements]        = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [events,               setEvents]               = useState([]);
  const [loadingAnn,           setLoadingAnn]           = useState(true);
  const [loadingEvt,           setLoadingEvt]           = useState(true);

  const firstName = currentUser?.first_name || currentUser?.username || 'there';
  const role      = currentUser?.role;
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /* ── Fetch announcements (no expired filter — backend handles it) ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(
      `${BASE_URL}/api/announcements/?ordering=-priority,-created_at&page=1&page_size=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => setAnnouncements(
        Array.isArray(res.data.results) ? res.data.results :
        Array.isArray(res.data)         ? res.data         : []
      ))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoadingAnn(false));
  }, []);

  /* ── Fetch upcoming events ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(
      `${BASE_URL}/api/events/?upcoming=true&page=1&page_size=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => {
        const list =
          Array.isArray(res.data.results) ? res.data.results :
          Array.isArray(res.data)         ? res.data         : [];
        if (list.length > 0) {
          setEvents(list);
        } else {
          // Fallback: fetch any recent events if none upcoming
          return axios.get(
            `${BASE_URL}/api/events/?page=1&page_size=3`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).then(r => setEvents(
            Array.isArray(r.data.results) ? r.data.results :
            Array.isArray(r.data)         ? r.data         : []
          ));
        }
      })
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvt(false));
  }, []);

  const handleAnnouncementClick = async (announcement) => {
    setSelectedAnnouncement(announcement);
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.post(
          `${BASE_URL}/api/announcement-views/`,
          { announcement: announcement.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch { /* duplicate view — ignore */ }
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const getMonth   = (d) => d ? new Date(d).toLocaleString('default', { month: 'short' }).toUpperCase() : '';
  const getDay     = (d) => d ? new Date(d).getDate() : '';
  const getTime    = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const getRelDate = (d) => {
    if (!d) return '';
    const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return formatDate(d);
  };

  const skeletonRows = [1, 2, 3];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-navy-gradient shadow-navy-lg min-h-[200px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg,rgba(255,215,0,.04) 0,rgba(255,215,0,.04) 1px,transparent 0,transparent 50%),repeating-linear-gradient(-45deg,rgba(255,215,0,.04) 0,rgba(255,215,0,.04) 1px,transparent 0,transparent 50%)`,
            backgroundSize: '28px 28px',
          }}
        />
        <div aria-hidden="true" className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold/8 blur-[80px]" />
        <div aria-hidden="true" className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-navy-500/30 blur-[60px]" />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 p-6 lg:p-8">
          <div className="flex-1">
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-2 opacity-80">
              {greeting}
            </p>
            <h1 className="font-display font-bold text-white leading-tight mb-2"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
              Welcome back,{' '}
              <span className="text-gold animate-glow-text">{firstName}</span>
            </h1>
            <p className="text-white/60 text-sm mb-6">
              Here's what's happening at PKFokam today
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/handbook')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                  bg-gold text-navy-900 text-sm font-black shadow-gold-md
                  hover:-translate-y-0.5 hover:shadow-gold-lg transition-all duration-200 group"
              >
                Explore Resources
                <FiArrowRight size={14} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </button>
              <button
                onClick={() => navigate('/assistant')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                  bg-white/10 border border-white/20 text-white text-sm font-semibold
                  hover:bg-white/20 hover:border-white/30 hover:-translate-y-0.5
                  transition-all duration-200 backdrop-blur-sm"
              >
                <FiCpu size={14} aria-hidden="true" />
                Ask AI Assistant
              </button>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2.5 lg:min-w-[220px]">
            <StatPill icon={FiUsers}    value="2 500+" label="Students"   sub="Currently enrolled" />
            <StatPill icon={FiBook}     value="128+"   label="Resources"  sub="Handbook documents" />
            <StatPill icon={FiClock}    value="24 / 7" label="AI Support" sub="Always available"   />
          </div>
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-navy-400 mb-3">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            icon={FiBook}
            label="Digital Handbook"
            desc="Browse university policies and resources"
            accent="bg-blue-500"
            onClick={() => navigate('/handbook')}
          />
          <ActionCard
            icon={FiCpu}
            label="AI Assistant"
            desc="Ask anything about PKFokam"
            accent="bg-violet-500"
            onClick={() => navigate('/assistant')}
            featured
          />
          <ActionCard
            icon={FiCompass}
            label="Program Pathfinder"
            desc="Find your academic path"
            accent="bg-emerald-500"
            onClick={() => navigate('/pathfinder')}
            locked={role !== 'student'}
          />
          {role === 'student' ? (
            <ActionCard
              icon={FiZap}
              label="Innovation Hub"
              desc="Build projects, join challenges"
              accent="bg-orange-500"
              onClick={() => navigate('/innovation')}
            />
          ) : (
            <ActionCard
              icon={FiMessageCircle}
              label="Feedback"
              desc="Share your thoughts with PKFokam"
              accent="bg-amber-500"
              onClick={() => navigate('/feedback')}
            />
          )}
        </div>
      </div>

      {/* ── Announcements + Events ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Announcements */}
        <div className="lg:col-span-3 bg-white dark:bg-navy-800 rounded-2xl shadow-sm dark:shadow-none border border-slate-100 dark:border-navy-700/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-navy-700/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-navy-800 flex items-center justify-center">
                <FiBell size={14} className="text-gold" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white">Latest Announcements</h2>
                <p className="text-[10px] text-slate-400 dark:text-navy-400">Most recent campus notices</p>
              </div>
            </div>
            {announcements.length > 0 && (
              <span className="flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full
                bg-gold text-navy-900 text-[10px] font-black">
                {announcements.length}
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-50 dark:divide-navy-700/30">
            {loadingAnn
              ? skeletonRows.map(i => (
                <div key={i} className="px-5 py-4 space-y-2.5 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-navy-700" />
                    <div className="h-3 w-24 rounded bg-slate-100 dark:bg-navy-700 ml-auto" />
                  </div>
                  <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-navy-700" />
                  <div className="h-3 w-full rounded bg-slate-100 dark:bg-navy-700" />
                  <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-navy-700" />
                </div>
              ))
              : announcements.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-navy-500">
                  <FiInfo size={28} className="mb-2 opacity-40" aria-hidden="true" />
                  <p className="text-sm font-medium">No announcements yet</p>
                </div>
              )
              : announcements.map(a => (
                <button
                  key={a.id}
                  onClick={() => handleAnnouncementClick(a)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-navy-700/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <PriorityBadge priority={a.priority || 'normal'} />
                    <span className="text-[10px] text-slate-400 dark:text-navy-500 whitespace-nowrap flex-shrink-0 mt-0.5">
                      {getRelDate(a.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mb-1.5 group-hover:text-navy-800 dark:group-hover:text-gold transition-colors">
                    {a.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-navy-300 leading-relaxed line-clamp-2">
                    {a.content}
                  </p>
                </button>
              ))
            }
          </div>

          <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700/40">
            <button
              onClick={() => navigate('/announcements')}
              className="flex items-center gap-1.5 text-xs font-bold text-gold hover:opacity-80 transition-opacity group"
            >
              View all announcements
              <FiArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Events */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-800 rounded-2xl shadow-sm dark:shadow-none border border-slate-100 dark:border-navy-700/40 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 dark:border-navy-700/40">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <FiCalendar size={14} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white">Events</h2>
              <p className="text-[10px] text-slate-400 dark:text-navy-400">Upcoming campus events</p>
            </div>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-navy-700/30">
            {loadingEvt
              ? skeletonRows.map(i => (
                <div key={i} className="flex items-start gap-3 px-5 py-4 animate-pulse">
                  <div className="w-11 h-12 rounded-xl bg-slate-100 dark:bg-navy-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 w-3/4 rounded bg-slate-100 dark:bg-navy-700" />
                    <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-navy-700" />
                  </div>
                </div>
              ))
              : events.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-navy-500">
                  <FiCalendar size={24} className="mb-2 opacity-40" aria-hidden="true" />
                  <p className="text-sm font-medium">No events found</p>
                </div>
              )
              : events.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => {
                    const date = ev.start_time?.slice(0, 10);
                    navigate(date ? `/calendar?date=${date}` : '/calendar');
                  }}
                  className="w-full text-left flex items-start gap-3.5 px-5 py-4
                    hover:bg-slate-50 dark:hover:bg-navy-700/40 transition-colors group"
                >
                  <div className="flex-shrink-0 w-11 rounded-xl bg-navy-800 dark:bg-navy-900 text-center py-1.5 shadow-navy-md">
                    <p className="text-gold text-xs font-black leading-none">{getMonth(ev.start_time)}</p>
                    <p className="text-white text-lg font-black leading-tight">{getDay(ev.start_time)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-snug truncate
                      group-hover:text-navy-800 dark:group-hover:text-gold transition-colors">
                      {ev.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      {ev.start_time && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-navy-300">
                          <FiClock size={10} aria-hidden="true" />
                          {getTime(ev.start_time)}{ev.end_time ? ` – ${getTime(ev.end_time)}` : ''}
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-navy-300 truncate">
                          <FiMapPin size={10} aria-hidden="true" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            }
          </div>

          <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700/40">
            <button
              onClick={() => navigate('/calendar')}
              className="flex items-center gap-1.5 text-xs font-bold text-gold hover:opacity-80 transition-opacity group"
            >
              View all events
              <FiArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Campus Life ──────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-navy-400 mb-3">
          Campus Life
        </h2>
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 shadow-navy-md" style={{ aspectRatio: '16/6' }}>
          <video
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            aria-hidden="true"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          >
            <source src={pkfievideo} type="video/mp4" />
          </video>
          {/* Gradient overlay + fallback bg */}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-900/20 to-transparent" />
          {/* Caption */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-gold mb-1">Featured</p>
                <h3 className="font-display text-white font-bold text-lg leading-tight">
                  Innovation at PKFokam: Student Showcase 2024
                </h3>
                <p className="text-white/60 text-xs mt-1">
                  Watch highlights from our annual engineering and computer science exhibition.
                </p>
              </div>
              <button
                onClick={() => navigate('/showcase')}
                className="flex-shrink-0 ml-4 flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-gold text-navy-900 text-xs font-black shadow-gold-md
                  hover:-translate-y-0.5 transition-all duration-200"
              >
                View Showcase
                <FiArrowRight size={12} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Announcement detail modal ────────────────────────── */}
      {selectedAnnouncement && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Announcement details"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm animate-fade-in" />
          <div
            className="relative z-10 w-full max-w-lg bg-white dark:bg-navy-800 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,.35)] animate-scale-in overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1 bg-gold-gradient" aria-hidden="true" />

            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={selectedAnnouncement.priority || 'normal'} />
                  <span className="text-[10px] text-slate-400">
                    {formatDate(selectedAnnouncement.created_at)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  aria-label="Close announcement"
                  className="p-1.5 rounded-lg text-slate-400 dark:text-navy-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors flex-shrink-0"
                >
                  <FiX size={16} aria-hidden="true" />
                </button>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-snug mb-3">
                {selectedAnnouncement.title}
              </h3>

              <p className="text-sm text-slate-600 dark:text-navy-300 leading-relaxed">
                {selectedAnnouncement.content}
              </p>

              {(selectedAnnouncement.start_date || selectedAnnouncement.end_date) && (
                <div className="mt-4 flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-navy-700/40 text-xs text-slate-500 dark:text-navy-400">
                  {selectedAnnouncement.start_date && (
                    <span>From: <strong className="text-slate-700 dark:text-navy-200">{formatDate(selectedAnnouncement.start_date)}</strong></span>
                  )}
                  {selectedAnnouncement.end_date && (
                    <span>Until: <strong className="text-slate-700 dark:text-navy-200">{formatDate(selectedAnnouncement.end_date)}</strong></span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
