import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { FaBell } from "react-icons/fa";
import './Header.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const pageTitles = {
  '/': {
    title: "PKFConnect Dashboard",
    description: "Access resources, get answers, and explore programs"
  },
  '/handbook': {
    title: "PKFokam Digital Handbook", 
    description: "Complete guide to policies, procedures, and resources"
  },
  '/assistant': {
    title: "PKFConnect AI Assistant",
    description: "Get instant answers to your questions about PKFokam"
  },
  '/pathfinder': {
    title: "Program Pathfinder",
    description: "Discover which field of study aligns with your passions and skills"
  },
  '/innovation': {
    title: "Innovation Hub",
    description: "Where ideas take flight and creativity meets technology"
  },
  '/feedback': {
    title: "Feedback & Suggestions",
    description: "Your voice matters - help us improve PKFConnect"
  },
  '/profile': {
    title: "User Profile",
    description: "Manage your profile and preferences"
  },
  '/search': {
    title: "Search",
    description: "Find programs and resources across PKFConnect"
  },
  '/showcase': {
    title: "Campus Showcase",
    description: "Watch, relive, and share vibrant PKFokam moments"
  }
};

const Header = ({ theme, setTheme }) => {
  const location = useLocation();
  const { pathname } = location;
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [search, setSearch] = useState('');
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch notifications from API
  useEffect(() => {
    async function fetchNotifications() {
      setLoadingNotif(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `${BASE_URL}/api/notifications/?ordering=-created_at&page=1&page_size=8`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotifications(res.data.results || res.data || []);
      } catch (e) {
        setNotifications([]);
      } finally {
        setLoadingNotif(false);
      }
    }
    if (notifOpen) fetchNotifications();
  }, [notifOpen]);

  // Mark notification as read
  const markAsRead = async (notifId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${BASE_URL}/api/notifications/${notifId}/`,
        { read: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((n) => n.id === notifId ? { ...n, read: true } : n)
      );
    } catch (e) {
      // ignore error
    }
  };

  // Unread notifications count
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target) &&
        !event.target.closest('.notif-btn')
      ) {
        setNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // PATCH: Detect /programs/:code and show a program detail header
  let page;
  if (pathname.startsWith('/programs/')) {
    page = {
      title: "Program Details",
      description: "Explore a PKFokam academic program in depth"
    };
  } else {
    page = pageTitles[pathname] || pageTitles['/'] || {
      title: "PKFConnect",
      description: "Welcome to PKFConnect"
    };
  }

  // Helper for avatar (optional fallback)
  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `http://localhost:8000${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
    : null;

  // --- SEARCH HANDLERS ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim().length === 0) return;
    navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    setSearch('');
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Optionally, autofocus the search bar when "/" is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !menuOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  // Personalized Greeting
  const greeting = currentUser
    ? `Welcome back, ${currentUser.first_name || currentUser.username || "User"}!`
    : "Welcome to PKFConnect";

  return (
    <header className="content-header">
      <div className="welcome">
        <h2>{greeting}</h2>
        <p>{page.description}</p>
      </div>
      <div className="header-right">
        {/* Search bar */}
        <form className="search-bar" onSubmit={handleSearchSubmit} role="search" autoComplete="off">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for information..."
            aria-label="Search"
          />
          <button type="submit" aria-label="Search">
            <i className="fas fa-search"></i>
          </button>
        </form>
        {/* Notification Button */}
        <div className="header-notif">
          <button
            className="notif-btn"
            aria-label="Notifications"
            onClick={() => setNotifOpen(v => !v)}
          >
            <FaBell />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
          {notifOpen && (
            <div className="notif-dropdown" ref={notifDropdownRef}>
              <div className="notif-header">Notifications</div>
              {loadingNotif ? (
                <div className="notif-empty">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">No notifications</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`notif-item${n.read ? " read" : ""}`}
                    onClick={async () => {
                      if (!n.read) await markAsRead(n.id);
                      if (n.link) window.open(n.link, '_blank');
                    }}
                  >
                    {n.text || n.title || n.message}
                    <span className="notif-date" style={{ display: "block", fontSize: "0.8em", color: "var(--color-gray)" }}>
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {/* Theme Toggle Button */}
        <button
          className="theme-toggle-btn"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
        {/* User profile dropdown */}
        {currentUser && (
          <div className="header-profile" ref={menuRef}>
            <button
              className="header-profile-btn wow-profile-btn"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Open user menu"
            >
              <span className="wow-avatar-wrapper">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User avatar"
                    className="header-avatar wow-avatar"
                  />
                ) : (
                  <i className="fas fa-user-circle header-avatar wow-avatar"></i>
                )}
                <span className="wow-status-dot"></span>
              </span>
              <span className="header-profile-name wow-profile-name">
                {currentUser.first_name}
              </span>
              <i className="fas fa-chevron-down wow-chevron"></i>
            </button>
            {menuOpen && (
              <div className="header-profile-dropdown wow-dropdown">
                <div className="wow-dropdown-top">
                  <div className="wow-avatar-lg">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="User avatar"
                        className="wow-avatar wow-avatar-lg"
                      />
                    ) : (
                      <i className="fas fa-user-circle wow-avatar wow-avatar-lg"></i>
                    )}
                  </div>
                  <div className="wow-dropdown-userinfo">
                    <div className="wow-dropdown-name">
                      {currentUser.first_name} {currentUser.last_name}
                    </div>
                    <div className="wow-dropdown-role">
                      {currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1)}
                    </div>
                  </div>
                </div>
                <hr className="wow-dropdown-divider" />
                <button
                  className="wow-dropdown-btn"
                  onClick={() => {
                    navigate('/profile');
                    setMenuOpen(false);
                  }}
                >
                  <i className="fas fa-user"></i> View Profile
                </button>
                <button
                  className="wow-dropdown-btn"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                >
                  <i className="fas fa-sign-out-alt"></i> Logout
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