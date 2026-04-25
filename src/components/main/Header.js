import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  FiBell, FiSearch, FiSun, FiMoon, FiUser,
  FiLogOut, FiMenu, FiChevronDown, FiSettings
} from 'react-icons/fi';
import './Header.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const pageMeta = {
  '/':           { title: 'Dashboard',        desc: 'Access resources, announcements and campus updates' },
  '/handbook':   { title: 'Digital Handbook',  desc: 'Policies, procedures and institutional resources' },
  '/assistant':  { title: 'AI Assistant',      desc: 'Instant answers about PKFokam — powered by AI' },
  '/pathfinder': { title: 'Program Pathfinder',desc: 'Discover the academic path that matches your strengths' },
  '/innovation': { title: 'Innovation Hub',    desc: 'Where ideas take flight and creativity meets technology' },
  '/feedback':   { title: 'Feedback',          desc: 'Your voice matters — help us improve PKFConnect' },
  '/showcase':   { title: 'Campus Showcase',   desc: 'Relive vibrant PKFokam moments' },
  '/calendar':   { title: 'Calendar',          desc: 'Events, deadlines and academic schedule' },
  '/profile':    { title: 'Profile',           desc: 'Manage your account and preferences' },
  '/search':     { title: 'Search',            desc: 'Find anything across PKFConnect' },
};

const Header = ({ theme, setTheme, onMenuToggle, sidebarOpen }) => {
  const { pathname } = useLocation();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch]       = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif]   = useState(true);

  const notifRef  = useRef(null);
  const menuRef   = useRef(null);
  const searchRef = useRef(null);

  const page = pathname.startsWith('/programs/')
    ? { title: 'Program Details', desc: 'Explore a PKFokam academic program in depth' }
    : (pageMeta[pathname] || pageMeta['/']);

  /* Notifications */
  const fetchNotifications = useCallback(async () => {
    setLoadingNotif(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${BASE_URL}/api/notifications/?ordering=-created_at&page_size=8`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(res.data.results || res.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen, fetchNotifications]);

  const markRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${BASE_URL}/api/notifications/${id}/`,
        { read: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  /* Outside click */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* "/" shortcut to focus search */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    setSearch('');
    searchRef.current?.blur();
  };

  /* Avatar */
  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `${BASE_URL}/media/${currentUser.profile.profile_picture}`)
    : null;

  const initials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <header className="app-header" role="banner">
      {/* Left: hamburger + page info */}
      <div className="header-left">
        <button
          className="hamburger-btn"
          onClick={onMenuToggle}
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={sidebarOpen}
          aria-controls="main-sidebar"
        >
          <FiMenu aria-hidden="true" />
        </button>

        <div className="header-page-info">
          <div className="header-page-title">{page.title}</div>
          <div className="header-page-desc">{page.desc}</div>
        </div>
      </div>

      {/* Right: search, notif, theme, profile */}
      <div className="header-right">
        {/* Search */}
        <form className="header-search" onSubmit={handleSearch} role="search">
          <FiSearch className="header-search-icon" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            className="header-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search PKFConnect"
          />
        </form>

        {/* Notifications */}
        <div className="notif-wrap" ref={notifRef}>
          <button
            className="header-icon-btn"
            onClick={() => setNotifOpen(v => !v)}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notifOpen}
            aria-haspopup="true"
          >
            <FiBell aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="header-badge" aria-hidden="true">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown" role="dialog" aria-label="Notifications">
              <div className="notif-header-row">
                <span className="notif-title">Notifications</span>
                {unreadCount > 0 && <span>{unreadCount} unread</span>}
              </div>
              <div className="notif-list">
                {loadingNotif ? (
                  <div className="notif-empty">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`notif-item${n.read ? ' read' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={async () => {
                        if (!n.read) await markRead(n.id);
                        if (n.link) window.open(n.link, '_blank');
                      }}
                      onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}
                    >
                      <div className="notif-dot" aria-hidden="true" />
                      <div>
                        <div className="notif-text">{n.text || n.title || n.message}</div>
                        {n.created_at && (
                          <div className="notif-date">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light'
            ? <><FiMoon aria-hidden="true" /><span>Dark</span></>
            : <><FiSun  aria-hidden="true" /><span>Light</span></>}
        </button>

        {/* Profile */}
        {currentUser && (
          <div className="header-profile-wrap" ref={menuRef}>
            <button
              className="profile-btn"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Open user menu"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <div className="profile-avatar">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" aria-hidden="true" />
                  : <span aria-hidden="true">{initials}</span>
                }
                <span className="profile-online" aria-hidden="true" />
              </div>
              <span className="profile-name">{currentUser.first_name}</span>
              <FiChevronDown className="profile-chevron" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div className="profile-dropdown" role="dialog" aria-label="User menu">
                <div className="profile-dropdown-top">
                  <div className="profile-dropdown-avatar">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" />
                      : <span>{initials}</span>
                    }
                  </div>
                  <div className="profile-dropdown-info">
                    <div className="profile-dropdown-name">
                      {currentUser.first_name} {currentUser.last_name}
                    </div>
                    <div className="profile-dropdown-role">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <button
                  className="profile-dropdown-item"
                  onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                >
                  <FiUser aria-hidden="true" /> View Profile
                </button>

                <button
                  className="profile-dropdown-item"
                  onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                >
                  <FiSettings aria-hidden="true" /> Settings
                </button>

                <div className="profile-dropdown-divider" aria-hidden="true" />

                <button
                  className="profile-dropdown-item danger"
                  onClick={() => { logout(); setMenuOpen(false); }}
                >
                  <FiLogOut aria-hidden="true" /> Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
