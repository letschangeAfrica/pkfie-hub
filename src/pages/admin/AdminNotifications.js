import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import './AdminNotifications.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * AdminNotifications
 * - Single page that handles listing, filtering, searching, paging and viewing notification details inline.
 * - Clicking "View" opens a right-side detail drawer (no navigation away from the page).
 * - Supports mark read/unread, bulk "Mark all read", and refreshing the list.
 * - Defensive: works with paginated or non-paginated responses (res.data.results || res.data).
 */

const AdminNotifications = () => {
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

  const mountedRef = useRef(true);

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
      const list = res.data.results || res.data || [];
      if (mountedRef.current) setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications', err);
      if (mountedRef.current) {
        setError('Failed to load notifications. Verify the /api/notifications/ endpoint.');
        setNotifications([]);
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

  // Client-side filtered list for search (keeps server paging intact)
  const filtered = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(n => {
      const title = (n.title || '').toLowerCase();
      const text = (n.text || '').toLowerCase();
      const type = (n.notif_type || '').toLowerCase();
      return title.includes(q) || text.includes(q) || type.includes(q);
    });
  }, [notifications, searchQuery]);

  // Open detail drawer and fetch full notification if necessary
  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setSelected(null);
    try {
      const token = localStorage.getItem('token');
      // Try to GET detail (if your API exposes it). If not, fall back to the list item.
      const res = await axios.get(`${BASE_URL}/api/notifications/${id}/`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      if (!mountedRef.current) return;
      setSelected(res.data);
    } catch (err) {
      console.warn('Notification detail fetch failed -- using list item fallback', err);
      // fallback
      const fallback = notifications.find(n => n.id === id);
      if (fallback) setSelected(fallback);
    } finally {
      if (!mountedRef.current) return;
      setDetailLoading(false);
      // optimistically mark read if needed
      const item = notifications.find(n => n.id === id);
      if (item && !item.read) markReadLocal(id);
      // also request the server to mark read
      markAsRead(id);
    }
  };

  // Close the detail drawer
  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  // Helper: optimistic local update for read
  const markReadLocal = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const markUnreadLocal = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${BASE_URL}/api/notifications/${id}/`, { read: true }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      // already optimistic updated
    } catch (err) {
      console.warn('markAsRead failed', err);
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
    } catch (err) {
      console.warn('markAsUnread failed', err);
    }
  };

  const markAllRead = async () => {
    setBulkLoading(true);
    try {
      // If your API has a bulk endpoint, call it. Otherwise, patch each one.
      const token = localStorage.getItem('token');
      // Try bulk endpoint first
      try {
        await axios.post(`${BASE_URL}/api/notifications/mark_all_read/`, {}, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        // refetch
        await fetchNotifications();
      } catch (e) {
        // fallback: iterate
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n => axios.patch(`${BASE_URL}/api/notifications/${n.id}/`, { read: true }, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        }).catch(()=>{})));
        // optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.warn('markAllRead failed', err);
    } finally {
      setBulkLoading(false);
    }
  };

  // UI handlers
  const handleRefresh = () => {
    setPage(1);
    fetchNotifications();
  };

  // Small UI helpers
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '';

  return (
    <div className="am-container modern">
      <div className="am-header">
        <div>
          <h2>Notifications</h2>
          <p className="am-sub">System and user notifications relevant to your account</p>
        </div>

        <div className="am-header-actions">
          <div className="am-stat">
            <div className="am-stat-number">{notifications.length}</div>
            <div className="am-stat-label">Shown</div>
          </div>
          <div className="am-stat">
            <div className="am-stat-number">{unreadCount}</div>
            <div className="am-stat-label">Unread</div>
          </div>
          <button className="am-btn am-btn-ghost" onClick={handleRefresh} aria-label="Refresh notifications">
            Refresh
          </button>
        </div>
      </div>

      <div className="am-toolbar modern-toolbar">
        <div className="toolbar-left">
          <button
            className={`am-btn ${onlyUnread ? 'am-btn-primary' : 'am-btn-secondary'}`}
            onClick={() => { setOnlyUnread(v => !v); setPage(1); }}
          >
            {onlyUnread ? 'Showing unread' : 'Show unread'}
          </button>

          <button
            className="am-btn"
            onClick={() => markAllRead()}
            disabled={bulkLoading || unreadCount === 0}
            title="Mark all visible notifications as read"
          >
            {bulkLoading ? 'Marking…' : 'Mark all read'}
          </button>
        </div>

        <div className="toolbar-right">
          <div className="search-wrap">
            <input
              type="search"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search notifications"
            />
            {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')} aria-label="Clear search">✕</button>}
          </div>

          <div className="pagination-controls">
            <button className="am-btn" onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <div className="page-indicator">Page {page}</div>
            <button className="am-btn" onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      <div className="am-table-container modern-list" style={{ marginTop: 12 }}>
        {error && <div className="am-error">{error}</div>}

        {loading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
                <div className="skeleton-line long" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="am-no-data">No notifications found.</div>
        ) : (
          <div className="notification-grid">
            {filtered.map(n => (
              <article key={n.id} className={`notification-card ${n.read ? 'read' : 'unread'}`} aria-live="polite">
                <div className="notification-left">
                  <div className="notification-type">{(n.notif_type || 'info').toUpperCase()}</div>
                </div>

                <div className="notification-body-area">
                  <div className="notification-row-top">
                    <h3 className="notification-title">{n.title || (n.text ? n.text.slice(0, 80) : 'Notification')}</h3>
                    <div className="notification-meta">{formatDate(n.created_at)}</div>
                  </div>

                  <p className="notification-excerpt">{n.text ? n.text.slice(0, 220) : <em>No details</em>}</p>

                  <div className="notification-actions">
                    <button className="am-btn am-btn-link" onClick={() => openDetail(n.id)}>View</button>
                    {n.link && (
                      <button className="am-btn" onClick={() => {
                        if (n.link.startsWith('http')) window.open(n.link, '_blank');
                        else window.location.href = n.link;
                      }}>Open link</button>
                    )}
                    {!n.read ? (
                      <button className="am-btn am-btn-secondary" onClick={() => { markReadLocal(n.id); markAsRead(n.id); }}>Mark read</button>
                    ) : (
                      <button className="am-btn" onClick={() => markAsUnread(n.id)}>Mark unread</button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Inline right-side detail drawer */}
      <aside className={`notification-drawer ${detailOpen ? 'open' : ''}`} role="dialog" aria-label="Notification details">
        <div className="drawer-header">
          <div className="drawer-actions">
            <button className="am-btn" onClick={closeDetail}>Close</button>
          </div>
        </div>

        <div className="drawer-content">
          {detailLoading ? (
            <div className="drawer-loading">Loading…</div>
          ) : !selected ? (
            <div className="drawer-empty">Select a notification to view details.</div>
          ) : (
            <div className="drawer-body">
              <div className="drawer-title-row">
                <h3 className="drawer-title">{selected.title || selected.text || 'Notification'}</h3>
                <div className="drawer-meta">{formatDate(selected.created_at)}</div>
              </div>

              <div className="drawer-type">Type: <strong>{(selected.notif_type || 'info').toUpperCase()}</strong></div>

              <div className="drawer-text" dangerouslySetInnerHTML={{ __html: (selected.body || selected.text || '').replace(/\n/g, '<br/>') }} />

              {selected.link && (
                <div className="drawer-link">
                  <a href={selected.link} target="_blank" rel="noreferrer">Open related link</a>
                </div>
              )}

              <div className="drawer-cta">
                {!selected.read ? (
                  <button className="am-btn am-btn-primary" onClick={() => { markReadLocal(selected.id); markAsRead(selected.id); setSelected(prev => prev ? { ...prev, read: true } : prev); }}>Mark read</button>
                ) : (
                  <button className="am-btn" onClick={() => { markAsUnread(selected.id); setSelected(prev => prev ? { ...prev, read: false } : prev); }}>Mark unread</button>
                )}

                <button className="am-btn am-btn-ghost" onClick={() => { navigator.clipboard?.writeText(selected.link || '') }}>Copy link</button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Drawer overlay */}
      <div className={`drawer-overlay ${detailOpen ? 'visible' : ''}`} onClick={closeDetail} aria-hidden={!detailOpen} />
    </div>
  );
};

export default AdminNotifications;