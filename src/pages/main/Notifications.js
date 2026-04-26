import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNotifications } from '../../contexts/NotificationsContext';
import {
  FiBell, FiCheck, FiCheckCircle, FiRefreshCw,
  FiInfo, FiAlertCircle, FiMessageCircle, FiAlertTriangle,
  FiTrash2, FiArrowRight, FiHome,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const TYPE_ICON = {
  info:    FiInfo,
  message: FiMessageCircle,
  warning: FiAlertTriangle,
  error:   FiAlertCircle,
};
const TYPE_COLOR = {
  info:    'text-sky-400 bg-sky-400/10',
  message: 'text-violet-400 bg-violet-400/10',
  warning: 'text-amber-400 bg-amber-400/10',
  error:   'text-red-400 bg-red-400/10',
};

const FILTERS = [
  { value: 'all',     label: 'All' },
  { value: 'unread',  label: 'Unread' },
  { value: 'info',    label: 'Info' },
  { value: 'message', label: 'Message' },
  { value: 'warning', label: 'Warning' },
  { value: 'error',   label: 'Error' },
];

const PAGE_SIZE = 20;

export default function Notifications() {
  const navigate = useNavigate();
  const { fetchNotifications: refreshBadge, markAllRead: ctxMarkAllRead } = useNotifications();

  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll,  setMarkingAll]  = useState(false);
  const [filter,      setFilter]      = useState('all');
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);

  const getToken = () => localStorage.getItem('token');
  const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

  const fetchItems = useCallback(async (reset = true) => {
    const currentPage = reset ? 1 : page + 1;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/api/notifications/?ordering=-created_at&page_size=${PAGE_SIZE}&page=${currentPage}`,
        { headers: authHeader() }
      );
      const list  = res.data.results || res.data || [];
      const count = res.data.count ?? list.length;
      if (reset) {
        setItems(list);
        setPage(1);
      } else {
        setItems(prev => [...prev, ...list]);
        setPage(currentPage);
      }
      setHasMore(currentPage * PAGE_SIZE < count);
    } catch {
      if (reset) setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => { fetchItems(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = async (id) => {
    try {
      await axios.patch(
        `${BASE_URL}/api/notifications/${id}/`,
        { read: true },
        { headers: authHeader() }
      );
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      refreshBadge(true);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await ctxMarkAllRead();
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    setMarkingAll(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await axios.delete(
        `${BASE_URL}/api/notifications/${id}/`,
        { headers: authHeader() }
      );
      setItems(prev => prev.filter(n => n.id !== id));
      refreshBadge(true);
    } catch {}
    setDeletingId(null);
  };

  const handleClick = async (n) => {
    if (!n.read) await markRead(n.id);
    if (n.link) {
      if (n.link.startsWith('/')) navigate(n.link);
      else window.open(n.link, '_blank', 'noopener,noreferrer');
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d    = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const displayed = filter === 'all'
    ? items
    : filter === 'unread'
    ? items.filter(n => !n.read)
    : items.filter(n => n.notif_type === filter);

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-navy-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchItems(true)}
            disabled={loading}
            aria-label="Refresh"
            className="p-2 rounded-xl text-slate-400 dark:text-navy-400
              hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700/50
              transition-colors disabled:opacity-40"
          >
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                text-navy-900 disabled:opacity-50 transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
            >
              <FiCheckCircle size={13} />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => {
          const count = f.value === 'unread'
            ? items.filter(n => !n.read).length
            : f.value !== 'all'
            ? items.filter(n => n.notif_type === f.value).length
            : null;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={[
                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                filter === f.value
                  ? 'bg-gold text-navy-900 shadow-sm'
                  : 'bg-white dark:bg-navy-800 text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700/40 hover:border-slate-300 dark:hover:border-navy-600',
              ].join(' ')}
            >
              {f.label}
              {count !== null && count > 0 && (
                <span className={`text-[9px] font-black px-1 py-0.5 rounded-full min-w-[14px] text-center ${
                  filter === f.value ? 'bg-navy-900/20' : 'bg-gold/20 text-gold'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 overflow-hidden shadow-sm dark:shadow-none">
        {loading ? (
          <div className="divide-y divide-slate-50 dark:divide-navy-700/30">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-navy-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-slate-100 dark:bg-navy-700" />
                  <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-navy-700" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-navy-500">
            <FiBell size={36} className="mb-3 opacity-30" />
            <p className="font-semibold text-sm">
              {filter !== 'all' ? `No ${filter} notifications` : 'No notifications yet'}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {filter !== 'all' ? 'Try a different filter' : "You're all caught up!"}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/')}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                  text-navy-900 transition-all hover:-translate-y-px"
                style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
              >
                <FiHome size={13} />
                Go to Dashboard
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-navy-700/30">
            {displayed.map(n => {
              const Icon  = TYPE_ICON[n.notif_type]  || FiInfo;
              const color = TYPE_COLOR[n.notif_type] || TYPE_COLOR.info;
              const isDeleting = deletingId === n.id;
              return (
                <li key={n.id}>
                  <div
                    className={[
                      'group flex items-start gap-4 px-5 py-4 transition-colors',
                      'hover:bg-slate-50 dark:hover:bg-navy-700/30',
                      !n.read ? 'bg-gold/[0.03]' : '',
                    ].join(' ')}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon size={16} />
                    </div>

                    {/* Content — clickable */}
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => handleClick(n)}
                    >
                      {n.title && (
                        <p className={`text-sm font-bold leading-snug truncate ${n.read ? 'text-slate-500 dark:text-navy-400' : 'text-slate-900 dark:text-white'}`}>
                          {n.title}
                        </p>
                      )}
                      <p className={`text-xs leading-relaxed mt-0.5 ${n.read ? 'text-slate-400 dark:text-navy-500' : 'text-slate-600 dark:text-navy-300'}`}>
                        {n.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-slate-400 dark:text-navy-600">{fmtDate(n.created_at)}</p>
                        {n.link && (
                          <span className="text-[10px] text-gold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FiArrowRight size={9} />
                            {n.link.startsWith('/') ? 'Open page' : 'Open link'}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Right actions */}
                    <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
                      {/* Unread dot / read check */}
                      {n.read
                        ? <FiCheck size={14} className="text-slate-300 dark:text-navy-600" />
                        : (
                          <button
                            onClick={() => markRead(n.id)}
                            title="Mark as read"
                            className="w-2.5 h-2.5 rounded-full bg-gold hover:bg-gold/70 transition-colors"
                          />
                        )
                      }
                      {/* Delete */}
                      <button
                        onClick={(e) => handleDelete(n.id, e)}
                        disabled={isDeleting}
                        aria-label="Delete notification"
                        className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded-lg
                          text-slate-400 dark:text-navy-500 hover:text-red-400 dark:hover:text-red-400
                          hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-30"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700/40 text-center">
            <button
              onClick={() => fetchItems(false)}
              disabled={loadingMore}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-xs font-bold
                text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700/40
                hover:bg-slate-50 dark:hover:bg-navy-700 disabled:opacity-50 transition-colors"
            >
              {loadingMore
                ? <><div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />Loading…</>
                : 'Load more'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
