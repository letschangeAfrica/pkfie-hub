import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationsContext';
import {
  FiMenu, FiSearch, FiBell, FiChevronDown,
  FiUser, FiLogOut, FiCheckCircle,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const TYPE_DOT = {
  warning: 'bg-amber-400',
  error:   'bg-red-400',
  success: 'bg-emerald-400',
  info:    'bg-sky-400',
  message: 'bg-violet-400',
};

const fmtRelative = (iso) => {
  if (!iso) return '';
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function AdminHeader({ onToggleSidebar }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading: loadingNotif,
    markRead,
    markAllRead,
    fetchNotifications,
  } = useNotifications();

  const [menuOpen,   setMenuOpen]   = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [search,     setSearch]     = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const menuRef        = useRef(null);
  const notifRef       = useRef(null);
  const searchInputRef = useRef(null);

  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `${BASE_URL}${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
    : null;

  const initials =
    (currentUser?.first_name?.charAt(0) || '') +
    (currentUser?.last_name?.charAt(0)  || '');

  // Unread first, then newest; show up to 10 in dropdown
  const dropdownItems = [...notifications]
    .sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .slice(0, 10);

  // Refresh from server whenever the dropdown is opened
  useEffect(() => {
    if (notifOpen) fetchNotifications(true);
  }, [notifOpen, fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // '/' shortcut to focus search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goTo = (path) => {
    try { navigate(path); } catch { window.location.href = path; }
  };

  const handleNotifClick = async (n) => {
    if (!n.read) await markRead(n.id);
    setNotifOpen(false);
    if (n.link) {
      n.link.startsWith('http') ? window.open(n.link, '_blank', 'noopener,noreferrer') : goTo(n.link);
    } else {
      goTo('/admin/notifications');
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllRead();
    setMarkingAll(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    goTo(`/admin/search?q=${encodeURIComponent(search.trim())}`);
    setSearch('');
    searchInputRef.current?.blur();
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    goTo('/admin/login');
  };

  const previewText = (n) => {
    if (!n) return 'Notification';
    if (n.title?.trim()) return n.title;
    if (n.text?.trim())  return n.text.length > 70 ? n.text.slice(0, 67) + '…' : n.text;
    return 'Notification';
  };

  return (
    <header
      className="flex items-center justify-between h-16 px-5 flex-shrink-0 border-b border-gold/10"
      style={{ background: '#001020' }}
    >

      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="w-9 h-9 rounded-xl flex items-center justify-center
            text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <FiMenu size={18} aria-hidden="true" />
        </button>
        <span className="text-sm font-black text-white hidden sm:block">Admin Panel</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center">
          <div className="relative">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search admin… /"
              aria-label="Search admin"
              className="w-52 pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/8
                text-white text-xs placeholder-white/30 focus:outline-none focus:border-gold/30
                transition-colors"
            />
          </div>
        </form>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center
              text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <FiBell size={16} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold text-navy-900
                text-[9px] font-black flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-11 w-80 rounded-2xl shadow-xl z-50
                bg-navy-900 border border-navy-700/60 overflow-hidden"
              role="dialog"
              aria-label="Notifications"
            >
              {/* Dropdown header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700/40">
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wide">Notifications</p>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-navy-400 mt-0.5">{unreadCount} unread</p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black
                      text-navy-900 disabled:opacity-50 transition-all hover:-translate-y-px"
                    style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFEE55 50%, #FFD700 100%)' }}
                  >
                    <FiCheckCircle size={10} />
                    {markingAll ? 'Marking…' : 'Mark all read'}
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-72 overflow-y-auto divide-y divide-navy-700/30">
                {loadingNotif ? (
                  <div className="px-4 py-6 text-center text-xs text-navy-500">Loading…</div>
                ) : dropdownItems.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <FiBell size={24} className="mx-auto mb-2 text-navy-700" />
                    <p className="text-xs text-navy-500">No notifications</p>
                  </div>
                ) : (
                  dropdownItems.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-navy-700/30 transition-colors flex items-start gap-3
                        ${!n.read ? 'bg-gold/5' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                        ${!n.read ? (TYPE_DOT[n.notif_type] || 'bg-gold') : 'bg-navy-700'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-snug truncate ${!n.read ? 'font-bold text-white' : 'text-navy-300'}`}>
                          {previewText(n)}
                        </p>
                        {n.text && n.title && (
                          <p className="text-[10px] text-navy-500 mt-0.5 truncate">{n.text}</p>
                        )}
                        <p className="text-[10px] text-navy-600 mt-0.5">{fmtRelative(n.created_at)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-navy-700/40">
                <button
                  onClick={() => { goTo('/admin/notifications'); setNotifOpen(false); }}
                  className="text-xs font-bold text-gold hover:text-gold/80 transition-colors"
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl
              hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-navy-700 flex-shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-[10px] font-black text-gold">{initials || 'A'}</span>
              }
            </div>
            <span className="hidden sm:block text-xs font-bold text-white/80">
              {currentUser?.first_name || 'Admin'}
            </span>
            <FiChevronDown size={12} className="text-white/40" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-11 w-52 rounded-2xl shadow-xl z-50
                bg-navy-900 border border-navy-700/60 overflow-hidden"
              role="menu"
            >
              <div className="px-4 py-3 border-b border-navy-700/40">
                <p className="text-xs font-black text-white">
                  {currentUser?.first_name} {currentUser?.last_name}
                </p>
                <p className="text-[11px] text-gold/70 capitalize mt-0.5">
                  {currentUser?.role || 'Administrator'}
                </p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { goTo('/profile'); setMenuOpen(false); }}
                  role="menuitem"
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold
                    text-navy-300 hover:text-white hover:bg-navy-700/40 transition-colors"
                >
                  <FiUser size={13} aria-hidden="true" />
                  View Profile
                </button>
                <button
                  onClick={handleLogout}
                  role="menuitem"
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold
                    text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <FiLogOut size={13} aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
