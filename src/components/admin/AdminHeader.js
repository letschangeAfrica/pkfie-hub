import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminHeader.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const AdminHeader = ({ onToggleSidebar }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const [search, setSearch] = useState('');

  const menuRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Avatar helper
  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `${BASE_URL}${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
    : null;

  // simple normalizer for responses (paginated or not)
  const normalizeResponseList = (res) => {
    if (!res || !res.data) return [];
    return res.data.results || res.data || [];
  };

  // Fetch notifications when opened
  useEffect(() => {
    let cancel;
    const fetchNotifications = async () => {
      setLoadingNotif(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${BASE_URL}/api/notifications/`, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
          params: { ordering: '-created_at', page_size: 12, unread: false },
          cancelToken: new axios.CancelToken(c => (cancel = c)),
        });
        const list = normalizeResponseList(res);
        const deduped = Array.from(new Map(list.map(i => [i.id, i])).values()).slice(0, 12);
        setNotifications(deduped);
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.warn('Failed to fetch notifications', err);
        setNotifications([]);
      } finally {
        setLoadingNotif(false);
      }
    };

    if (notifOpen) fetchNotifications();
    return () => cancel && cancel();
  }, [notifOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target) && !e.target.closest('.adm-hdr-notif-btn')) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard "/" focuses the admin search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !menuOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  // navigation helper
  const goTo = (path) => {
    try {
      navigate(path);
      setTimeout(() => {
        if (window.location.pathname !== path) window.location.href = path;
      }, 120);
    } catch (e) {
      window.location.href = path;
    }
  };

  // Mark notification read (PATCH) then navigate to list or link
  const handleNotificationClick = async (n) => {
    if (!n) return;
    if (!n.read) {
      try {
        const token = localStorage.getItem('token');
        await axios.patch(`${BASE_URL}/api/notifications/${n.id}/`, { read: true }, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
      } catch (err) {
        console.warn('markNotifAsRead failed', err);
      }
    }
    setNotifOpen(false);
    if (n.link) {
      if (n.link.startsWith('http')) window.open(n.link, '_blank');
      else goTo(n.link);
    } else {
      goTo('/admin/notifications');
    }
  };

  // Admin search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    goTo(`/admin/search?q=${encodeURIComponent(search.trim())}`);
    setSearch('');
    searchInputRef.current?.blur();
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    goTo('/admin/login');
  };

  // Preview fallback text
  const previewText = (item) => {
    if (!item) return '';
    if (item.title && item.title.trim()) return item.title;
    if (item.text && item.text.trim()) return item.text.length > 120 ? item.text.slice(0, 117) + '...' : item.text;
    if (item.created_at) return new Date(item.created_at).toLocaleString();
    return 'No details';
  };

  return (
    <header className="adm-hdr">
      <div className="adm-hdr-left">
        <button className="adm-hdr-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <i className="fas fa-bars" />
        </button>
        <h1 className="adm-hdr-title">Admin Panel</h1>
      </div>

      <div className="adm-hdr-right">
        <form className="adm-hdr-search" onSubmit={handleSearchSubmit} role="search" autoComplete="off">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search admin..."
            aria-label="Search admin"
          />
          <button type="submit" aria-label="Search">
            <i className="fas fa-search" />
          </button>
        </form>

        <div className="adm-hdr-actions">
          {/* Notifications */}
          <div className="adm-hdr-notif" ref={notifDropdownRef}>
            <button
              className="adm-hdr-btn adm-hdr-notif-btn"
              title="Notifications"
              onClick={() => setNotifOpen(v => !v)}
              aria-expanded={notifOpen}
            >
              <i className="fas fa-bell" />
              {unreadNotifCount > 0 && <span className="adm-hdr-badge">{unreadNotifCount}</span>}
            </button>

            {notifOpen && (
              <div className="adm-hdr-dropdown adm-hdr-notif-dropdown" role="dialog" aria-label="Notifications list">
                <div className="adm-hdr-dropdown-header">Notifications</div>

                {loadingNotif ? (
                  <div className="adm-hdr-dropdown-empty">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="adm-hdr-dropdown-empty">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`adm-hdr-item ${n.read ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="adm-hdr-item-text">{previewText(n)}</div>
                      <div className="adm-hdr-item-meta">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                    </div>
                  ))
                )}

                <div className="adm-hdr-dropdown-footer">
                  <button onClick={() => { goTo('/admin/notifications'); setNotifOpen(false); }} className="adm-hdr-dropdown-link">View all</button>
                </div>
              </div>
            )}
          </div>

          {/* User/Profile */}
          <div className="adm-hdr-user" ref={menuRef}>
            <div
              className="adm-hdr-user-btn"
              onClick={() => setMenuOpen(v => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <div className="adm-hdr-avatar">
                {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : <i className="fas fa-user-circle" />}
              </div>
              <span className="adm-hdr-name">{currentUser ? `${currentUser.first_name || currentUser.username}` : 'Admin'}</span>
              <i className="fas fa-chevron-down" />
            </div>

            {menuOpen && (
              <div className="adm-hdr-dropdown" role="menu" aria-label="User menu">
                <div className="adm-hdr-dropdown-top">
                  <div className="adm-hdr-avatar">
                    {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : <i className="fas fa-user-circle" />}
                  </div>
                  <div>
                    <div className="adm-hdr-dropdown-name">{currentUser?.first_name} {currentUser?.last_name}</div>
                    <div className="adm-hdr-dropdown-role">{currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Administrator'}</div>
                  </div>
                </div>

                <hr className="adm-hdr-dropdown-divider" />

                <button
                  className="adm-hdr-dropdown-btn"
                  type="button"
                  onClick={() => {
                    goTo('/profile');
                    setMenuOpen(false);
                  }}
                >
                  <i className="fas fa-user" /> View Profile
                </button>

                <button
                  className="adm-hdr-dropdown-btn"
                  type="button"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;