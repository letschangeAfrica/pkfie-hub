import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  FiArrowLeft, FiSearch, FiUsers, FiBell, FiCalendar,
  FiFile, FiAlertCircle, FiArrowRight,
} from 'react-icons/fi';

/* ─── Sub-components ────────────────────────────────────────────────────── */
const Sk = ({ className = '' }) => (
  <div className={`bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

const ROLE_COLOR = {
  admin:    'bg-gold/20 text-gold',
  student:  'bg-sky-500/20 text-sky-400',
  lecturer: 'bg-violet-500/20 text-violet-400',
  parent:   'bg-emerald-500/20 text-emerald-400',
  staff:    'bg-orange-500/20 text-orange-400',
};

const PRIORITY_COLOR = {
  urgent: 'bg-red-500/20 text-red-400',
  high:   'bg-orange-500/20 text-orange-400',
  normal: 'bg-sky-500/20 text-sky-400',
  low:    'bg-slate-500/20 text-slate-400',
};

function Section({ icon: Icon, title, count, route, onManage, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-gold" aria-hidden />
        <h2 className="text-sm font-black text-white tracking-tight">{title}</h2>
        <span className="text-xs font-bold text-navy-500 bg-navy-800 px-2 py-0.5 rounded-full">
          {count}
        </span>
        <button
          onClick={() => onManage(route)}
          className="ml-auto text-xs font-bold text-gold hover:text-gold/70
            flex items-center gap-1 transition-colors"
        >
          Manage <FiArrowRight size={11} />
        </button>
      </div>
      {children}
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */
export default function AdminSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const query    = new URLSearchParams(location.search).get('q') || '';

  const [users,         setUsers]         = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events,        setEvents]        = useState([]);
  const [documents,     setDocuments]     = useState([]);
  // Initialize loading true only when there's a query to run
  const [loading,       setLoading]       = useState(!!query);
  const [error,         setError]         = useState(false);

  useEffect(() => {
    if (!query) {
      setUsers([]); setAnnouncements([]); setEvents([]); setDocuments([]);
      setError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    const q = encodeURIComponent(query);

    Promise.allSettled([
      api.get(`/users/?search=${q}`),
      api.get(`/announcements/?search=${q}`),
      api.get(`/events/?search=${q}`),
      api.get('/documents/'),
    ]).then(([u, a, e, d]) => {
      setUsers(
        u.status === 'fulfilled' ? (u.value.data.results ?? u.value.data ?? []) : []
      );
      setAnnouncements(
        a.status === 'fulfilled' ? (a.value.data.results ?? a.value.data ?? []) : []
      );
      setEvents(
        e.status === 'fulfilled' ? (e.value.data.results ?? e.value.data ?? []) : []
      );

      if (d.status === 'fulfilled') {
        const all = d.value.data.results ?? d.value.data ?? [];
        const ql  = query.toLowerCase();
        setDocuments(all.filter(doc =>
          doc.title?.toLowerCase().includes(ql) ||
          doc.description?.toLowerCase().includes(ql)
        ));
      } else {
        setDocuments([]);
      }

      // Only show error state when every single call failed
      const allFailed = [u, a, e, d].every(r => r.status === 'rejected');
      setError(allFailed);
    }).finally(() => setLoading(false));
  }, [query]);

  const totalResults = users.length + announcements.length + events.length + documents.length;
  const hasResults   = !loading && !error && totalResults > 0;
  const nothing      = !loading && !error && !!query && totalResults === 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-navy-400 hover:text-white transition-colors"
        >
          <FiArrowLeft size={15} aria-hidden />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-navy-800 border border-navy-700/40">
            <FiSearch size={15} className="text-gold" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight">
              {query
                ? <>Results for <span className="text-gold">"{query}"</span></>
                : 'Admin Search'}
            </h1>
            {hasResults && (
              <p className="text-xs text-navy-500">
                {totalResults} result{totalResults !== 1 ? 's' : ''} across users, documents, announcements and events
              </p>
            )}
          </div>
        </div>
      </div>

      {/* No query — prompt to search */}
      {!query && (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <FiSearch size={24} className="text-navy-600" aria-hidden />
          </div>
          <p className="text-white font-bold mb-1">Search the admin panel</p>
          <p className="text-sm text-navy-400">
            Use the search bar above to find users, documents, announcements, or events.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
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

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={24} className="text-red-400" />
          </div>
          <p className="text-white font-bold mb-1">Search failed</p>
          <p className="text-sm text-navy-400">
            Could not reach the server. Check that the backend is running.
          </p>
        </div>
      )}

      {/* Nothing found */}
      {nothing && (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <FiSearch size={24} className="text-navy-600" aria-hidden />
          </div>
          <p className="text-white font-bold mb-1">No results found</p>
          <p className="text-sm text-navy-400">Try a different search term.</p>
        </div>
      )}

      {/* Results — only sections with hits are shown */}
      {hasResults && (
        <div className="space-y-8">

          {/* Users */}
          {users.length > 0 && (
            <Section icon={FiUsers} title="Users" count={users.length} route="/admin/users" onManage={navigate}>
              <div className="space-y-2">
                {users.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl
                      bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-navy-400">{u.email}</p>
                    </div>
                    {u.role && (
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase
                        ${ROLE_COLOR[u.role] || 'bg-navy-700 text-navy-300'}`}>
                        {u.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <Section icon={FiFile} title="Documents" count={documents.length} route="/admin/documents" onManage={navigate}>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl
                      bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{doc.title}</p>
                      {doc.description && (
                        <p className="text-xs text-navy-400 line-clamp-1">{doc.description}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase
                      ${doc.status === 'Published'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'}`}>
                      {doc.status || 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <Section icon={FiBell} title="Announcements" count={announcements.length} route="/admin/announcements" onManage={navigate}>
              <div className="space-y-2">
                {announcements.map(a => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-4 px-5 py-3.5 rounded-xl
                      bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm mb-0.5">{a.title}</p>
                      <p className="text-xs text-navy-400 leading-relaxed">
                        {a.content?.slice(0, 100)}{a.content?.length > 100 ? '…' : ''}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase
                      ${PRIORITY_COLOR[a.priority] || PRIORITY_COLOR.normal}`}>
                      {a.priority || 'normal'}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Events */}
          {events.length > 0 && (
            <Section icon={FiCalendar} title="Events" count={events.length} route="/admin/events" onManage={navigate}>
              <div className="space-y-2">
                {events.map(ev => (
                  <div
                    key={ev.id}
                    className="px-5 py-3.5 rounded-xl bg-navy-800/60 border border-navy-700/40
                      hover:border-navy-600/60 transition-all"
                  >
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
            </Section>
          )}

        </div>
      )}
    </div>
  );
}
