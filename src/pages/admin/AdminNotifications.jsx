import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiSearch,
  FiX,
  FiExternalLink,
  FiCheck,
  FiClipboard,
  FiRefreshCw,
  FiBell,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiCalendar,
  FiFilter,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export default function AdminNotifications() {
  const { currentUser } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const mountedRef = useRef(true);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [toast]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/notifications/`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
        params: { ordering: '-created_at', page, page_size: pageSize, unread: onlyUnread ? true : undefined },
      });
      const list = res.data?.results || res.data || [];
      if (mountedRef.current) setNotifications(Array.isArray(list) ? list : []);
      setToast({ type: 'success', message: `Loaded ${list.length} notifications` });
    } catch (err) {
      console.error('Failed to load notifications', err);
      if (mountedRef.current) {
        setError('Failed to load notifications. Verify the /api/notifications/ endpoint.');
        setNotifications([]);
        setToast({ type: 'error', message: 'Failed to load notifications' });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnread, page]);

  // Derived counts
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.read).length;

  // Client-side search filter (keeps server paging)
  const filtered = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(n => {
      const title = (n.title || '').toLowerCase();
      const text = (n.text || n.body || '').toLowerCase();
      const type = (n.notif_type || '').toLowerCase();
      return title.includes(q) || text.includes(q) || type.includes(q);
    });
  }, [notifications, searchQuery]);

  // Optimistic local helpers
  const markReadLocal = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markUnreadLocal = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${BASE_URL}/api/notifications/${id}/`, { read: true }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setToast({ type: 'success', message: 'Notification marked as read' });
    } catch (err) {
      console.warn('markAsRead failed', err);
      setToast({ type: 'error', message: 'Failed to mark as read' });
    }
  };

  const markAsUnread = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${BASE_URL}/api/notifications/${id}/`, { read: false }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      markUnreadLocal(id);
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, read: false } : prev);
      setToast({ type: 'success', message: 'Notification marked as unread' });
    } catch (err) {
      console.warn('markAsUnread failed', err);
      setToast({ type: 'error', message: 'Failed to mark as unread' });
    }
  };

  const markAllRead = async () => {
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('token');
      // try bulk endpoint
      try {
        await axios.post(`${BASE_URL}/api/notifications/mark_all_read/`, {}, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        await fetchNotifications();
        setToast({ type: 'success', message: 'All notifications marked as read' });
      } catch (e) {
        // fallback to per-item patch
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n => axios.patch(`${BASE_URL}/api/notifications/${n.id}/`, { read: true }, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        }).catch(()=>{})));
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setToast({ type: 'success', message: `${unread.length} notifications marked as read` });
      }
    } catch (err) {
      console.warn('markAllRead failed', err);
      setToast({ type: 'error', message: 'Failed to mark all as read' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    fetchNotifications();
  };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  // Open detail drawer and fetch full notification if API provides detail
  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setSelected(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/notifications/${id}/`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      if (!mountedRef.current) return;
      setSelected(res.data);
    } catch (err) {
      console.warn('Notification detail fetch failed -- using list fallback', err);
      const fallback = notifications.find(n => n.id === id);
      if (fallback) setSelected(fallback);
    } finally {
      if (!mountedRef.current) return;
      setDetailLoading(false);
      const item = notifications.find(n => n.id === id);
      if (item && !item.read) markReadLocal(id);
      markAsRead(id);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  const copyLink = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      setToast({ type: 'success', message: 'Link copied to clipboard' });
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to copy link' });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'alert': return <FiAlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <FiAlertCircle className="w-5 h-5 text-amber-600" />;
      case 'success': return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      default: return <FiInfo className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'alert': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'warning': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  // Custom styles for animations
  const customStyles = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
    .animate-fade-in-up { animation: fadeInUp 0.45s ease-out; }
    .animate-scale-in { animation: scaleIn 0.25s ease-out; }
  `;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <style>{customStyles}</style>

      {/* Toast Notification */}
      <div aria-live="polite" className="fixed top-6 right-6 z-50">
        {toast && (
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg ${
              toast.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}
            role="status"
          >
            {toast.type === 'error' ? <FiAlertCircle className="text-xl" /> : <FiCheckCircle className="text-xl" />}
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <FiBell className="text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
            <p className="text-slate-600 dark:text-slate-400">System and user notifications relevant to your account</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</div>
            <div className="text-sm text-slate-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{unreadCount}</div>
            <div className="text-sm text-slate-500">Unread</div>
          </div>

          <button
            onClick={handleRefresh}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Refresh notifications"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Total Notifications</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiBell className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Unread</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{unreadCount}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiEye className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Current Page</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{page}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FiCalendar className="text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Filtered</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{filtered.length}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
              <FiFilter className="text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex gap-3">
              <button
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all ${
                  onlyUnread
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => { setOnlyUnread(v => !v); setPage(1); }}
              >
                <FiFilter className="w-4 h-4" />
                {onlyUnread ? 'Showing Unread' : 'Show Unread'}
              </button>

              <button
                onClick={markAllRead}
                disabled={bulkLoading || unreadCount === 0}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium disabled:opacity-50"
              >
                <FiCheck className="w-4 h-4" />
                {bulkLoading ? 'Marking...' : 'Mark All Read'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search notifications"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Page {page}
              </div>
              <button
                onClick={() => setPage(p => p + 1)}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="text-xl flex-shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        </div>
      )}

      {/* Notifications Grid */}
      <div className="animate-fade-in-up">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                    <div className="flex gap-2 mt-4">
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center">
            <div className="flex flex-col items-center justify-center gap-4">
              <FiBell className="w-16 h-16 text-slate-400" />
              <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {searchQuery || onlyUnread ? 'No matching notifications' : 'No notifications yet'}
              </div>
              <p className="text-slate-600 dark:text-slate-400 max-w-md">
                {searchQuery 
                  ? `No notifications found for "${searchQuery}". Try adjusting your search.`
                  : onlyUnread
                  ? 'All notifications are read. New notifications will appear here.'
                  : 'Notifications from the system will appear here.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((notification, index) => (
              <div
                key={notification.id}
                className={`bg-white dark:bg-slate-800 border rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl cursor-pointer animate-fade-in-up ${
                  notification.read 
                    ? 'border-slate-200 dark:border-slate-700 opacity-80' 
                    : 'border-purple-200 dark:border-purple-800 bg-gradient-to-r from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/20'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => openDetail(notification.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getNotificationColor(notification.notif_type)}`}>
                      {getNotificationIcon(notification.notif_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getNotificationColor(notification.notif_type)}`}>
                          {(notification.notif_type || 'info').toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <FiCalendar className="w-3 h-3" />
                          {formatDate(notification.created_at)}
                        </div>
                        {!notification.read && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            Unread
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-2 line-clamp-2">
                        {notification.title || notification.text || 'Notification'}
                      </h3>
                      
                      <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3">
                        {notification.text || notification.body || 'No details available'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(notification.id);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm"
                    >
                      <FiEye className="w-4 h-4" />
                      View Details
                    </button>

                    {notification.link && (
                      <a
                        href={notification.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all text-sm"
                      >
                        <FiExternalLink className="w-4 h-4" />
                        Open Link
                      </a>
                    )}
                  </div>

                  {!notification.read ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadLocal(notification.id);
                        markAsRead(notification.id);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 transition-all text-sm"
                    >
                      <FiCheck className="w-4 h-4" />
                      Mark Read
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsUnread(notification.id);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all text-sm"
                    >
                      <FiEyeOff className="w-4 h-4" />
                      Mark Unread
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-transform duration-300 ease-in-out ${
          detailOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={closeDetail}
        />
        
        {/* Drawer Panel */}
        <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
                  <FiBell className="text-lg" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Notification Details</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">View notification information</p>
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                <FiX className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FiRefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                <div className="text-sm text-slate-500">Loading notification details...</div>
              </div>
            ) : !selected ? (
              <div className="text-center py-12 text-slate-500">
                No notification selected
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getNotificationColor(selected.notif_type)}`}>
                    {getNotificationIcon(selected.notif_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getNotificationColor(selected.notif_type)}`}>
                        {(selected.notif_type || 'info').toUpperCase()}
                      </span>
                      <div className="text-sm text-slate-500">
                        {formatDate(selected.created_at)}
                      </div>
                      {!selected.read && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          Unread
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {selected.title || selected.text || 'Notification'}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Message</h4>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                      <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-200">
                        {selected.body || selected.text || 'No content available'}
                      </div>
                    </div>
                  </div>

                  {selected.link && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Related Link</h4>
                      <a
                        href={selected.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                      >
                        <FiExternalLink className="w-4 h-4" />
                        {selected.link}
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                  {!selected.read ? (
                    <button
                      onClick={() => { markReadLocal(selected.id); markAsRead(selected.id); setSelected(prev => prev ? { ...prev, read: true } : prev); }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg transition-all font-medium flex-1 justify-center"
                    >
                      <FiCheck className="w-4 h-4" />
                      Mark as Read
                    </button>
                  ) : (
                    <button
                      onClick={() => { markAsUnread(selected.id); setSelected(prev => prev ? { ...prev, read: false } : prev); }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium flex-1 justify-center"
                    >
                      <FiEyeOff className="w-4 h-4" />
                      Mark as Unread
                    </button>
                  )}

                  <button
                    onClick={() => { copyLink(selected.link || ''); }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium flex-1 justify-center"
                  >
                    <FiClipboard className="w-4 h-4" />
                    Copy Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}