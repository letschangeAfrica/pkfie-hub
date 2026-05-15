import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  FiCalendar, FiSearch, FiRefreshCw, FiExternalLink,
  FiMapPin, FiUsers, FiClock, FiTag, FiLink, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_COLOR = {
  academic:    'bg-sky-500/20 text-sky-400',
  social:      'bg-emerald-500/20 text-emerald-400',
  career:      'bg-violet-500/20 text-violet-400',
  workshop:    'bg-amber-500/20 text-amber-400',
  webinar:     'bg-cyan-500/20 text-cyan-400',
  conference:  'bg-indigo-500/20 text-indigo-400',
  competition: 'bg-pink-500/20 text-pink-400',
};

const EVENT_TYPES = [
  { value: 'academic',    label: 'Academic' },
  { value: 'social',      label: 'Social' },
  { value: 'career',      label: 'Career' },
  { value: 'workshop',    label: 'Workshop' },
  { value: 'webinar',     label: 'Webinar' },
  { value: 'conference',  label: 'Conference' },
  { value: 'competition', label: 'Competition' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (s) => {
  try {
    return new Date(s).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return s; }
};

const fmtTime = (s) => {
  try {
    return new Date(s).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const isToday = (s) => {
  const d = new Date(s);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
};

const isThisWeek = (s) => {
  const d = new Date(s);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
};

const bucket = (event) => {
  const start = new Date(event.start_time);
  const now = new Date();
  if (start < now && !isToday(event.start_time)) return 'past';
  if (isToday(event.start_time)) return 'today';
  if (isThisWeek(event.start_time)) return 'week';
  return 'upcoming';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className = '' }) {
  return <div className={`bg-navy-700/60 rounded-xl animate-pulse ${className}`} />;
}

// ─── Event Row ────────────────────────────────────────────────────────────────

function EventRow({ event }) {
  const typeColor = TYPE_COLOR[event.event_type] || 'bg-navy-700/40 text-navy-400';
  const typeLabel = EVENT_TYPES.find(t => t.value === event.event_type)?.label || event.event_type;
  const attendeeCount = Array.isArray(event.attendees) ? event.attendees.length : (event.attendee_count ?? 0);

  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-navy-700/30 last:border-0
      hover:bg-navy-700/20 transition-colors items-center">

      {/* Title + location */}
      <div className="col-span-4">
        <p className="text-sm font-bold text-white leading-snug line-clamp-1">{event.title}</p>
        {event.location && (
          <p className="text-xs text-navy-500 flex items-center gap-1 mt-0.5">
            <FiMapPin size={10} aria-hidden="true" />
            {event.location}
          </p>
        )}
        {event.organizer && (
          <p className="text-xs text-navy-600 mt-0.5">{event.organizer}</p>
        )}
      </div>

      {/* Type */}
      <div className="col-span-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black uppercase ${typeColor}`}>
          <FiTag size={9} aria-hidden="true" />
          {typeLabel}
        </span>
      </div>

      {/* Date & time */}
      <div className="col-span-3">
        <p className="text-sm text-white font-medium">{fmtDate(event.start_time)}</p>
        <p className="text-xs text-navy-500 flex items-center gap-1 mt-0.5">
          <FiClock size={10} aria-hidden="true" />
          {fmtTime(event.start_time)}
          {event.end_time && <> — {fmtTime(event.end_time)}</>}
        </p>
      </div>

      {/* Attendees */}
      <div className="col-span-2">
        <p className="text-sm text-white flex items-center gap-1.5">
          <FiUsers size={12} className="text-navy-500" aria-hidden="true" />
          {attendeeCount}
          {event.max_attendees ? <span className="text-navy-600">/ {event.max_attendees}</span> : null}
        </p>
        {event.registration_link && (
          <a
            href={event.registration_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold hover:underline flex items-center gap-1 mt-0.5"
          >
            <FiLink size={9} aria-hidden="true" />
            Register
          </a>
        )}
      </div>

      {/* Soon badge */}
      <div className="col-span-1 flex justify-end">
        {bucket(event) === 'today' && (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-gold/20 text-gold uppercase">
            Today
          </span>
        )}
        {bucket(event) === 'week' && (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-sky-500/20 text-sky-400 uppercase">
            Soon
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ label, count, events, defaultOpen = true, accent = 'text-white' }) {
  const [open, setOpen] = useState(defaultOpen);

  if (events.length === 0) return null;

  return (
    <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-navy-700/40
          hover:bg-navy-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-black uppercase tracking-wide ${accent}`}>{label}</span>
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-navy-700/60 text-navy-400">
            {count}
          </span>
        </div>
        {open
          ? <FiChevronUp size={14} className="text-navy-500" aria-hidden="true" />
          : <FiChevronDown size={14} className="text-navy-500" aria-hidden="true" />}
      </button>

      {open && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-navy-900/40 border-b border-navy-700/30
            text-[10px] font-black uppercase tracking-widest text-navy-500">
            <div className="col-span-4">Event</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Date & Time</div>
            <div className="col-span-2">Attendees</div>
            <div className="col-span-1" />
          </div>
          {events.map(ev => <EventRow key={ev.id} event={ev} />)}
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarManagement() {
  const navigate = useNavigate();

  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [successMsg,   setSuccessMsg]   = useState('');
  const [errorMsg,     setErrorMsg]     = useState('');
  const toastTimer = useRef(null);

  const toast = useCallback((msg, isError = false) => {
    if (isError) setErrorMsg(msg); else setSuccessMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setSuccessMsg(''); setErrorMsg('');
    }, 4000);
  }, []);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/events/', { params: { page_size: 200 } });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setEvents(data);
    } catch {
      toast('Failed to load events.', true);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const filtered = events.filter(ev => {
    const matchSearch = !search ||
      ev.title?.toLowerCase().includes(search.toLowerCase()) ||
      ev.location?.toLowerCase().includes(search.toLowerCase()) ||
      ev.organizer?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || ev.event_type === typeFilter;
    return matchSearch && matchType;
  });

  const now = new Date();
  const todayEvents    = filtered.filter(e => isToday(e.start_time));
  const weekEvents     = filtered.filter(e => !isToday(e.start_time) && isThisWeek(e.start_time) && new Date(e.start_time) >= now);
  const upcomingEvents = filtered.filter(e => !isThisWeek(e.start_time) && new Date(e.start_time) >= now);
  const pastEvents     = filtered.filter(e => !isToday(e.start_time) && new Date(e.start_time) < now);

  const totalUpcoming = events.filter(e => new Date(e.start_time) >= now).length;
  const totalPast     = events.filter(e => new Date(e.start_time) < now && !isToday(e.start_time)).length;
  const totalToday    = events.filter(e => isToday(e.start_time)).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Calendar Overview</h1>
          <p className="text-sm text-navy-400 mt-1">
            Institutional events on the platform calendar — read-only view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-2 rounded-xl border border-navy-700/40 text-navy-400 hover:text-white
              hover:border-navy-600 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate('/admin/events')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-navy-900
              transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55,#FFD700)' }}
          >
            <FiExternalLink size={13} aria-hidden="true" />
            Manage in Events
          </button>
        </div>
      </div>

      {/* Toast */}
      {(successMsg || errorMsg) && (
        <div>
          {successMsg && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <Sk key={i} className="h-20" />)
        ) : [
          { label: 'Total Events',  value: events.length,  color: 'text-white' },
          { label: 'Today',         value: totalToday,     color: 'text-gold' },
          { label: 'Upcoming',      value: totalUpcoming,  color: 'text-sky-400' },
          { label: 'Past',          value: totalPast,      color: 'text-navy-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-navy-800/60 rounded-2xl border border-navy-700/40 px-5 py-4">
            <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-navy-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by title, location, organizer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
              text-white text-sm placeholder-navy-600 focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-navy-800/60 border border-navy-700/40
            text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
        >
          <option value="all">All Types</option>
          {EVENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Sk key={i} className="h-16 rounded-2xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-navy-800/60 rounded-2xl border border-navy-700/40 py-16 text-center">
          <FiCalendar size={28} className="text-navy-600 mx-auto mb-3" aria-hidden="true" />
          <p className="text-navy-400 text-sm">
            {events.length === 0
              ? 'No institutional events found. Create one in Event Management.'
              : 'No events match your search or filter.'}
          </p>
        </div>
      )}

      {/* Grouped sections */}
      {!loading && filtered.length > 0 && (
        <div>
          <Section
            label="Today"
            count={todayEvents.length}
            events={todayEvents}
            accent="text-gold"
          />
          <Section
            label="This Week"
            count={weekEvents.length}
            events={weekEvents}
            accent="text-sky-400"
          />
          <Section
            label="Upcoming"
            count={upcomingEvents.length}
            events={upcomingEvents}
            accent="text-white"
          />
          <Section
            label="Past"
            count={pastEvents.length}
            events={pastEvents}
            defaultOpen={false}
            accent="text-navy-500"
          />
        </div>
      )}
    </div>
  );
}
