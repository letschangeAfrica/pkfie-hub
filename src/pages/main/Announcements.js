import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FiBell, FiRefreshCw, FiAlertTriangle,
  FiInfo, FiChevronDown, FiX,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const PRIORITY_MAP = {
  urgent: { cls: 'bg-red-100 text-red-700 border border-red-200',   icon: FiAlertTriangle },
  high:   { cls: 'bg-amber-100 text-amber-700 border border-amber-200', icon: null },
  normal: { cls: 'bg-sky-100 text-sky-700 border border-sky-200',    icon: null },
  low:    { cls: 'bg-slate-100 text-slate-600 border border-slate-200', icon: null },
};

const PriorityBadge = ({ priority }) => {
  const { cls, icon: Icon } = PRIORITY_MAP[priority] || PRIORITY_MAP.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${cls}`}>
      {Icon && <Icon size={9} aria-hidden="true" />}
      {priority || 'normal'}
    </span>
  );
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [filter,        setFilter]        = useState('all');
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);

  const PAGE_SIZE = 10;
  const token = localStorage.getItem('token');

  const fetchAnnouncements = useCallback(async (reset = true) => {
    if (reset) { setLoading(true); setPage(1); }
    else setLoadingMore(true);

    const currentPage = reset ? 1 : page + 1;
    try {
      const params = new URLSearchParams({
        ordering: '-priority,-created_at',
        page: currentPage,
        page_size: PAGE_SIZE,
      });
      if (filter !== 'all') params.set('priority', filter);

      const res = await axios.get(
        `${BASE_URL}/api/announcements/?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const items = Array.isArray(res.data.results) ? res.data.results
                  : Array.isArray(res.data)         ? res.data : [];
      const count = res.data.count ?? items.length;

      if (reset) {
        setAnnouncements(items);
      } else {
        setAnnouncements(prev => [...prev, ...items]);
        setPage(currentPage);
      }
      setHasMore(currentPage * PAGE_SIZE < count);
    } catch {
      if (reset) setAnnouncements([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, page, token]);

  useEffect(() => { fetchAnnouncements(true); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const getRelDate = (d) => {
    if (!d) return '';
    const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return `${diff} days ago`;
    return formatDate(d);
  };

  const FILTERS = [
    { value: 'all',    label: 'All' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high',   label: 'High' },
    { value: 'normal', label: 'Normal' },
    { value: 'low',    label: 'Low' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Announcements</h1>
          <p className="text-sm text-slate-500 dark:text-navy-400 mt-0.5">All campus notices and updates</p>
        </div>
        <button
          onClick={() => fetchAnnouncements(true)}
          disabled={loading}
          aria-label="Refresh"
          className="p-2 rounded-xl text-slate-400 dark:text-navy-400
            hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700/50
            transition-colors disabled:opacity-40"
        >
          <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={[
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
              filter === f.value
                ? 'bg-gold text-navy-900 shadow-sm'
                : 'bg-white dark:bg-navy-800 text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700/40 hover:border-slate-300 dark:hover:border-navy-600',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-navy-700/40 overflow-hidden shadow-sm dark:shadow-none">
        {loading ? (
          <div className="divide-y divide-slate-50 dark:divide-navy-700/30">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-5 py-5 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-navy-700" />
                  <div className="h-3 w-20 rounded bg-slate-100 dark:bg-navy-700 ml-auto" />
                </div>
                <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-navy-700" />
                <div className="h-3 w-full rounded bg-slate-100 dark:bg-navy-700" />
                <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-navy-700" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-navy-500">
            <FiBell size={36} className="mb-3 opacity-30" />
            <p className="font-semibold text-sm">No announcements found</p>
            <p className="text-xs mt-1 opacity-70">Try a different filter or check back later</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-navy-700/30">
            {announcements.map(a => (
              <li key={a.id}>
                <button
                  onClick={() => setSelected(a)}
                  className="w-full text-left px-5 py-5 hover:bg-slate-50 dark:hover:bg-navy-700/30 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <PriorityBadge priority={a.priority || 'normal'} />
                    <span className="text-[10px] text-slate-400 dark:text-navy-500 flex-shrink-0">
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
              </li>
            ))}
          </ul>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="px-5 py-4 border-t border-slate-100 dark:border-navy-700/40 text-center">
            <button
              onClick={() => fetchAnnouncements(false)}
              disabled={loadingMore}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-xs font-bold
                text-slate-600 dark:text-navy-300 border border-slate-200 dark:border-navy-700/40
                hover:bg-slate-50 dark:hover:bg-navy-700 disabled:opacity-50 transition-colors"
            >
              <FiChevronDown size={14} className={loadingMore ? 'animate-bounce' : ''} />
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Announcement details"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-lg bg-white dark:bg-navy-800 rounded-3xl
              shadow-[0_32px_80px_rgba(0,0,0,.35)] overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1 bg-gold-gradient" aria-hidden="true" />
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={selected.priority || 'normal'} />
                  <span className="text-[10px] text-slate-400">{formatDate(selected.created_at)}</span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white
                    hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors flex-shrink-0"
                >
                  <FiX size={16} />
                </button>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-snug mb-3">
                {selected.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-navy-300 leading-relaxed">
                {selected.content}
              </p>
              {(selected.start_date || selected.end_date) && (
                <div className="mt-4 flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-navy-700/40 text-xs text-slate-500 dark:text-navy-400">
                  {selected.start_date && (
                    <span>From: <strong className="text-slate-700 dark:text-navy-200">{formatDate(selected.start_date)}</strong></span>
                  )}
                  {selected.end_date && (
                    <span>Until: <strong className="text-slate-700 dark:text-navy-200">{formatDate(selected.end_date)}</strong></span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
