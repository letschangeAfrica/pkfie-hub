import { useEffect, useState, useMemo, useRef } from 'react';
import api from '../../services/api';
import {
  FiRefreshCw, FiSearch, FiX, FiCheckCircle,
  FiBell, FiChevronLeft, FiChevronRight, FiExternalLink,
} from 'react-icons/fi';

const TYPE_COLOR = {
  info:    'bg-sky-500/20 text-sky-400 border-sky-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error:   'bg-red-500/20 text-red-400 border-red-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};
const typeColor = (t) => TYPE_COLOR[(t || '').toLowerCase()] || TYPE_COLOR.info;

const Sk = ({ className = '' }) => (
  <div className={`bg-navy-700/60 rounded-xl animate-pulse ${className}`} />
);

const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [onlyUnread,    setOnlyUnread]    = useState(false);
  const [page,          setPage]          = useState(1);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [selected,      setSelected]      = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bulkLoading,   setBulkLoading]   = useState(false);

  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/notifications/', {
        params: { ordering: '-created_at', page, page_size: 20, unread: onlyUnread || undefined },
      });
      if (mounted.current) setNotifications(res.data.results ?? res.data ?? []);
    } catch {
      if (mounted.current) { setError('Failed to load notifications.'); setNotifications([]); }
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [onlyUnread, page]); // eslint-disable-line

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.text  || '').toLowerCase().includes(q) ||
      (n.notif_type || '').toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const markReadLocal   = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true  } : n));
  const markUnreadLocal = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: false } : n));

  const markAsRead   = (id) => api.patch(`/notifications/${id}/`, { read: true  }).catch(() => {});
  const markAsUnread = async (id) => {
    await api.patch(`/notifications/${id}/`, { read: false }).catch(() => {});
    markUnreadLocal(id);
    if (selected?.id === id) setSelected(p => p ? { ...p, read: false } : p);
  };

  const markAllRead = async () => {
    setBulkLoading(true);
    try {
      try {
        await api.post('/notifications/mark_all_read/', {});
        await fetchNotifications();
      } catch {
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/`, { read: true }).catch(() => {})));
        setNotifications(p => p.map(n => ({ ...n, read: true })));
      }
    } finally { setBulkLoading(false); }
  };

  const openDetail = async (id) => {
    setDetailLoading(true); setDetailOpen(true); setSelected(null);
    try {
      const res = await api.get(`/notifications/${id}/`);
      if (mounted.current) setSelected(res.data);
    } catch {
      const fallback = notifications.find(n => n.id === id);
      if (fallback) setSelected(fallback);
    } finally {
      if (!mounted.current) return;
      setDetailLoading(false);
      const item = notifications.find(n => n.id === id);
      if (item && !item.read) { markReadLocal(id); markAsRead(id); }
    }
  };

  const closeDetail = () => { setDetailOpen(false); setSelected(null); };

  return (
    <div className="flex gap-0 h-full overflow-hidden relative">

      {/* ── Main panel ─────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 space-y-5 overflow-y-auto transition-all ${detailOpen ? 'pr-0 lg:pr-[400px]' : ''}`}>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Notifications</h1>
            <p className="text-sm text-navy-400 mt-0.5">System and user notifications</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-navy-400">
                <strong className="text-white font-black">{notifications.length}</strong> shown
              </span>
              <span className="text-navy-400">
                <strong className="text-amber-400 font-black">{unreadCount}</strong> unread
              </span>
            </div>
            <button
              onClick={() => { setPage(1); fetchNotifications(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                text-navy-300 bg-navy-800 border border-navy-700/40
                hover:text-white hover:border-navy-600/60 transition-all"
            >
              <FiRefreshCw size={13} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setOnlyUnread(v => !v); setPage(1); }}
              className={[
                'px-4 py-2 rounded-xl text-xs font-black transition-all',
                onlyUnread
                  ? 'text-navy-900'
                  : 'text-navy-300 bg-navy-800 border border-navy-700/40 hover:border-navy-600/60',
              ].join(' ')}
              style={onlyUnread ? { background: 'linear-gradient(135deg,#FFD700,#FFEE55)' } : undefined}
            >
              {onlyUnread ? 'Unread only' : 'All notifications'}
            </button>
            <button
              onClick={markAllRead}
              disabled={bulkLoading || unreadCount === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-navy-300 bg-navy-800
                border border-navy-700/40 hover:text-white hover:border-navy-600/60 transition-all
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkLoading ? 'Marking…' : 'Mark all read'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notifications…"
                className="pl-8 pr-8 py-2 w-52 bg-navy-800 border border-navy-700/50 rounded-xl
                  text-sm text-white placeholder-navy-500
                  focus:outline-none focus:border-gold/50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-500 hover:text-white transition-colors">
                  <FiX size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg text-navy-400 hover:text-white bg-navy-800 border border-navy-700/40
                  disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <FiChevronLeft size={14} aria-hidden="true" />
              </button>
              <span className="text-xs font-bold text-navy-400 px-2">p.{page}</span>
              <button onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg text-navy-400 hover:text-white bg-navy-800 border border-navy-700/40 transition-all">
                <FiChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-900/20 border border-red-500/30 text-sm text-red-400 font-semibold">
            {error}
          </div>
        )}

        {/* Notification list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-navy-800/60 rounded-2xl p-5 border border-navy-700/40 space-y-2">
                <Sk className="h-4 w-1/2" />
                <Sk className="h-3 w-full" />
                <Sk className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
              <FiBell size={22} className="text-navy-600" aria-hidden="true" />
            </div>
            <p className="text-sm text-navy-400">No notifications found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => (
              <article
                key={n.id}
                className={[
                  'relative flex items-start gap-4 px-5 py-4 rounded-2xl border transition-all',
                  n.read
                    ? 'bg-navy-800/40 border-navy-700/30 opacity-70'
                    : 'bg-navy-800/80 border-navy-700/50',
                  selected?.id === n.id && 'border-gold/40',
                ].join(' ')}
              >
                {!n.read && (
                  <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-gold" aria-label="Unread" />
                )}
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${typeColor(n.notif_type)}`}>
                    {n.notif_type || 'info'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {n.title || n.text?.slice(0, 80) || 'Notification'}
                    </h3>
                    <span className="flex-shrink-0 text-[11px] text-navy-500">{fmt(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-navy-400 leading-relaxed mb-3 line-clamp-2">
                    {n.text?.slice(0, 180) || <em>No details</em>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openDetail(n.id)}
                      className="text-xs font-bold text-gold hover:underline transition-colors">
                      View
                    </button>
                    {n.link && (
                      <button
                        onClick={() => n.link.startsWith('http') ? window.open(n.link, '_blank') : (window.location.href = n.link)}
                        className="text-xs font-bold text-sky-400 hover:underline transition-colors flex items-center gap-1"
                      >
                        <FiExternalLink size={11} aria-hidden="true" />
                        Open link
                      </button>
                    )}
                    {!n.read ? (
                      <button onClick={() => { markReadLocal(n.id); markAsRead(n.id); }}
                        className="text-xs font-bold text-navy-400 hover:text-white transition-colors">
                        Mark read
                      </button>
                    ) : (
                      <button onClick={() => markAsUnread(n.id)}
                        className="text-xs font-bold text-navy-400 hover:text-white transition-colors">
                        Mark unread
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail drawer ── */}
      {detailOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={closeDetail}
          aria-hidden="true"
        />
      )}
      <aside
        className={[
          'fixed top-0 right-0 z-30 h-full w-[400px] max-w-full',
          'bg-navy-900 border-l border-navy-700/40 shadow-2xl',
          'flex flex-col transition-transform duration-300',
          detailOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-label="Notification details"
        aria-hidden={!detailOpen}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700/40 flex-shrink-0">
          <h2 className="text-sm font-black text-white">Notification Detail</h2>
          <button onClick={closeDetail} aria-label="Close detail panel"
            className="p-1.5 rounded-lg text-navy-400 hover:text-white hover:bg-navy-700 transition-colors">
            <FiX size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {detailLoading ? (
            <div className="space-y-4 pt-2">
              <Sk className="h-6 w-3/4" />
              <Sk className="h-4 w-full" />
              <Sk className="h-4 w-5/6" />
              <Sk className="h-24 w-full" />
            </div>
          ) : !selected ? (
            <div className="text-center py-16 text-navy-500 text-sm">
              Select a notification to view details.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-black text-white leading-snug mb-1">
                  {selected.title || selected.text || 'Notification'}
                </h3>
                <p className="text-xs text-navy-500">{fmt(selected.created_at)}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border ${typeColor(selected.notif_type)}`}>
                  {selected.notif_type || 'info'}
                </span>
                {!selected.read && (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-gold/20 text-gold border border-gold/30">
                    Unread
                  </span>
                )}
              </div>

              <div
                className="text-sm text-navy-200 leading-relaxed bg-navy-800/50 rounded-xl p-4 border border-navy-700/40"
                dangerouslySetInnerHTML={{ __html: (selected.body || selected.text || '').replace(/\n/g, '<br/>') }}
              />

              {selected.link && (
                <a
                  href={selected.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-gold hover:underline"
                >
                  <FiExternalLink size={13} aria-hidden="true" />
                  Open related link
                </a>
              )}

              <div className="flex gap-2 pt-2">
                {!selected.read ? (
                  <button
                    onClick={() => { markReadLocal(selected.id); markAsRead(selected.id); setSelected(p => p ? { ...p, read: true } : p); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-navy-900 transition-all hover:-translate-y-px"
                    style={{ background: 'linear-gradient(135deg,#FFD700,#FFEE55)' }}
                  >
                    <FiCheckCircle size={13} aria-hidden="true" />
                    Mark read
                  </button>
                ) : (
                  <button
                    onClick={() => markAsUnread(selected.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-navy-300 bg-navy-800 border border-navy-700/40 hover:text-white hover:border-navy-600/60 transition-all"
                  >
                    Mark unread
                  </button>
                )}
                {selected.link && (
                  <button
                    onClick={() => navigator.clipboard?.writeText(selected.link)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-navy-400 bg-navy-800 border border-navy-700/40 hover:text-white transition-all"
                  >
                    Copy link
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
