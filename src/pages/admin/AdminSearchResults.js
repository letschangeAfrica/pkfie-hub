import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  FiArrowLeft, FiSearch, FiUsers, FiBell, FiCalendar,
} from 'react-icons/fi';

const Sk = ({ className = '' }) => (
  <div className={`bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

const ROLE_COLOR = {
  admin:    'bg-gold/20 text-gold',
  student:  'bg-sky-500/20 text-sky-400',
  lecturer: 'bg-violet-500/20 text-violet-400',
  parent:   'bg-emerald-500/20 text-emerald-400',
};

const PRIORITY_COLOR = {
  urgent: 'bg-red-500/20 text-red-400',
  high:   'bg-orange-500/20 text-orange-400',
  normal: 'bg-sky-500/20 text-sky-400',
  low:    'bg-slate-500/20 text-slate-400',
};

function Section({ icon: Icon, title, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-gold" aria-hidden="true" />
        <h2 className="text-sm font-black text-white tracking-tight">{title}</h2>
        <span className="text-xs font-bold text-navy-500 bg-navy-800 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  );
}

export default function AdminSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const query    = new URLSearchParams(location.search).get('q') || '';

  const [users,         setUsers]         = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    if (!query) { setUsers([]); setAnnouncements([]); setEvents([]); return; }
    setLoading(true);
    const q = encodeURIComponent(query);

    Promise.all([
      api.get(`/users/?search=${q}`),
      api.get(`/announcements/?search=${q}`),
      api.get(`/events/?search=${q}`),
    ])
      .then(([u, a, e]) => {
        setUsers(u.data.results         ?? u.data ?? []);
        setAnnouncements(a.data.results ?? a.data ?? []);
        setEvents(e.data.results        ?? e.data ?? []);
      })
      .catch(() => { setUsers([]); setAnnouncements([]); setEvents([]); })
      .finally(() => setLoading(false));
  }, [query]);

  const nothing = !loading && !users.length && !announcements.length && !events.length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-navy-400 hover:text-white transition-colors"
        >
          <FiArrowLeft size={15} aria-hidden="true" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-navy-800 border border-navy-700/40">
            <FiSearch size={15} className="text-gold" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight">
              {query ? <>Results for <span className="text-gold">"{query}"</span></> : 'Admin Search'}
            </h1>
            {!loading && query && (
              <p className="text-xs text-navy-500">
                {users.length + announcements.length + events.length} total result{users.length + announcements.length + events.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Sk className="h-5 w-32" />
              {[...Array(2)].map((_, j) => <Sk key={j} className="h-16" />)}
            </div>
          ))}
        </div>
      )}

      {/* Nothing found */}
      {nothing && (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <FiSearch size={24} className="text-navy-600" aria-hidden="true" />
          </div>
          <p className="text-white font-bold mb-1">No results found</p>
          <p className="text-sm text-navy-400">Try a different search term.</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-8">

          {/* Users */}
          <Section icon={FiUsers} title="Users" count={users.length}>
            {users.length === 0 ? (
              <p className="text-sm text-navy-500">No users found.</p>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl
                      bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60 transition-all">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs text-navy-400">{u.email}</p>
                    </div>
                    {u.role && (
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${ROLE_COLOR[u.role] || 'bg-navy-700 text-navy-300'}`}>
                        {u.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Announcements */}
          <Section icon={FiBell} title="Announcements" count={announcements.length}>
            {announcements.length === 0 ? (
              <p className="text-sm text-navy-500">No announcements found.</p>
            ) : (
              <div className="space-y-2">
                {announcements.map(a => (
                  <div key={a.id}
                    className="flex items-start justify-between gap-4 px-5 py-3.5 rounded-xl
                      bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60 transition-all">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm mb-0.5">{a.title}</p>
                      <p className="text-xs text-navy-400 leading-relaxed">
                        {a.content?.slice(0, 100)}{a.content?.length > 100 ? '…' : ''}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${PRIORITY_COLOR[a.priority] || PRIORITY_COLOR.normal}`}>
                      {a.priority || 'normal'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Events */}
          <Section icon={FiCalendar} title="Events" count={events.length}>
            {events.length === 0 ? (
              <p className="text-sm text-navy-500">No events found.</p>
            ) : (
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id}
                    className="px-5 py-3.5 rounded-xl bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60 transition-all">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="font-bold text-white text-sm">{ev.title}</p>
                      {ev.start_time && (
                        <span className="flex-shrink-0 text-[11px] font-bold text-navy-400">
                          {new Date(ev.start_time).toLocaleDateString()}
                          {ev.end_time ? ` → ${new Date(ev.end_time).toLocaleDateString()}` : ''}
                        </span>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-xs text-navy-400">
                        {ev.description.slice(0, 80)}{ev.description.length > 80 ? '…' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
