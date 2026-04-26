import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import {
  FiBell, FiSearch, FiSun, FiMoon, FiUser,
  FiLogOut, FiMenu, FiChevronDown, FiSettings, FiX,
  FiCheckCircle, FiArrowRight,
} from 'react-icons/fi';

const pageMeta = {
  '/':               { title: 'Dashboard',         desc: 'Access resources, announcements and campus updates' },
  '/handbook':       { title: 'Digital Handbook',   desc: 'Policies, procedures and institutional resources' },
  '/assistant':      { title: 'AI Assistant',       desc: 'Instant answers about PKFokam — powered by AI' },
  '/pathfinder':     { title: 'Program Pathfinder', desc: 'Discover the academic path that matches your strengths' },
  '/innovation':     { title: 'Innovation Hub',     desc: 'Where ideas take flight and creativity meets technology' },
  '/feedback':       { title: 'Feedback',           desc: 'Your voice matters — help us improve PKFIE-Hub' },
  '/showcase':       { title: 'Campus Showcase',    desc: 'Relive vibrant PKFokam moments' },
  '/calendar':       { title: 'Calendar',           desc: 'Events, deadlines and academic schedule' },
  '/profile':        { title: 'Profile',            desc: 'Manage your account and preferences' },
  '/notifications':  { title: 'Notifications',      desc: 'Your alerts and campus updates' },
  '/settings':       { title: 'Settings',           desc: 'Manage your preferences and account' },
  '/announcements':  { title: 'Announcements',      desc: 'All campus notices and updates' },
  '/search':         { title: 'Search',             desc: 'Find anything across PKFIE-Hub' },
};

const Header = ({ theme, setTheme, onMenuToggle, sidebarOpen }) => {
  const { pathname } = useLocation();
  const { currentUser, logout } = useAuth();
  const { notifications, loading: loadingNotif, unreadCount, markRead, markAllRead, fetchNotifications } = useNotifications();
  const navigate = useNavigate();

  const [search,        setSearch]        = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [markingAll,    setMarkingAll]    = useState(false);

  const notifRef  = useRef(null);
  const menuRef   = useRef(null);
  const searchRef = useRef(null);

  const page = pathname.startsWith('/programs/')
    ? { title: 'Program Details', desc: 'Explore a PKFokam academic program in depth' }
    : (pageMeta[pathname] || pageMeta['/']);

  // Refresh when panel opens
  useEffect(() => {
    if (notifOpen) fetchNotifications(true);
  }, [notifOpen, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllRead();
    setMarkingAll(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // '/' keyboard shortcut focuses search
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

  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/media/${currentUser.profile.profile_picture}`)
    : null;

  const initials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const fmtTime = (iso) => {
    if (!iso) return '';
    const d    = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-10 flex items-center h-16 px-4 gap-3
        bg-navy-900/95 backdrop-blur-md border-b border-navy-700/40
        shadow-navy-md"
    >
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen}
        aria-controls="main-sidebar"
        className="flex-shrink-0 p-2 rounded-lg text-navy-300 hover:text-gold
          hover:bg-navy-700/60 transition-all duration-200 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-gold"
      >
        <FiMenu size={20} aria-hidden="true" />
      </button>

      {/* Page title */}
      <div className="hidden sm:block flex-1 min-w-0">
        <h1 className="text-sm font-bold text-white truncate leading-tight">{page.title}</h1>
        <p className="text-[11px] text-navy-400 truncate">{page.desc}</p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 ml-auto">

        {/* Search */}
        <form
          onSubmit={handleSearch}
          role="search"
          className={[
            'relative flex items-center transition-all duration-300',
            searchFocused ? 'w-56' : 'w-36',
          ].join(' ')}
        >
          <FiSearch size={14} aria-hidden="true" className="absolute left-3 text-navy-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search  [/]"
            aria-label="Search PKFIE-Hub"
            className="w-full pl-8 pr-3 py-2 rounded-xl text-xs
              bg-navy-800 border border-navy-600/50 text-white placeholder-navy-400
              focus:border-gold/60 focus:ring-1 focus:ring-gold/40 focus:outline-none
              transition-all duration-200"
          />
        </form>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notifOpen}
            aria-haspopup="true"
            className="relative p-2 rounded-xl text-navy-300 hover:text-gold
              hover:bg-navy-700/60 transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <FiBell size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 min-w-[16px] h-4 px-1
                  bg-gold text-navy-900 text-[9px] font-black rounded-full
                  flex items-center justify-center leading-none"
              >
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl
                bg-navy-800 border border-navy-600/50 shadow-navy-lg
                animate-scale-in overflow-hidden"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700/40">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markingAll}
                      title="Mark all as read"
                      className="p-1.5 rounded-lg text-navy-400 hover:text-gold transition-colors disabled:opacity-40"
                    >
                      <FiCheckCircle size={14} aria-hidden="true" />
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications"
                    className="p-1.5 rounded-lg text-navy-400 hover:text-white transition-colors"
                  >
                    <FiX size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {loadingNotif ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-navy-600 border-t-gold rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-navy-400 text-xs">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={async () => {
                        if (!n.read) await markRead(n.id);
                        if (n.link) window.open(n.link, '_blank');
                      }}
                      onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}
                      className={[
                        'flex items-start gap-3 px-4 py-3 cursor-pointer',
                        'border-b border-navy-700/30 last:border-0',
                        'hover:bg-navy-700/40 transition-colors',
                        n.read ? 'opacity-60' : '',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${n.read ? 'bg-navy-600' : 'bg-gold'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white leading-snug truncate">
                          {n.text || n.title || n.message}
                        </p>
                        {n.created_at && (
                          <p className="text-[10px] text-navy-400 mt-0.5">{fmtTime(n.created_at)}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer: view all */}
              <div className="px-4 py-2.5 border-t border-navy-700/40">
                <button
                  onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                  className="flex items-center gap-1.5 text-xs font-bold text-gold hover:opacity-80 transition-opacity group w-full"
                >
                  View all notifications
                  <FiArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl
            text-xs font-medium text-navy-300 hover:text-gold
            hover:bg-navy-700/60 border border-navy-700/40
            transition-all duration-200 focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-gold"
        >
          {theme === 'light'
            ? <><FiMoon size={14} aria-hidden="true" /><span className="hidden sm:inline">Dark</span></>
            : <><FiSun  size={14} aria-hidden="true" /><span className="hidden sm:inline">Light</span></>
          }
        </button>

        {/* Profile menu */}
        {currentUser && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Open user menu"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl
                hover:bg-navy-700/60 transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-gold/40 flex-shrink-0">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full bg-gold flex items-center justify-center">
                      <span className="text-navy-900 text-xs font-black">{initials}</span>
                    </div>
                  )
                }
                <span aria-hidden="true" className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-navy-900" />
              </div>
              <span className="hidden sm:block text-xs font-semibold text-white max-w-[80px] truncate">
                {currentUser.first_name}
              </span>
              <FiChevronDown
                size={12}
                aria-hidden="true"
                className={`text-navy-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div
                role="dialog"
                aria-label="User menu"
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl
                  bg-navy-800 border border-navy-600/50 shadow-navy-lg
                  animate-scale-in overflow-hidden"
              >
                {/* User info */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-700/40">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gold/30 flex-shrink-0">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full bg-gold flex items-center justify-center">
                          <span className="text-navy-900 text-sm font-black">{initials}</span>
                        </div>
                      )
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {currentUser.first_name} {currentUser.last_name}
                    </p>
                    <p className="text-[10px] text-navy-400 truncate">{currentUser.email}</p>
                  </div>
                </div>

                <div className="py-1.5">
                  {[
                    { icon: FiUser,     label: 'View Profile', action: () => { navigate('/profile');  setMenuOpen(false); } },
                    { icon: FiSettings, label: 'Settings',     action: () => { navigate('/settings'); setMenuOpen(false); } },
                  ].map(({ icon: Icon, label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="w-full flex items-center gap-3 px-4 py-2.5
                        text-xs text-navy-300 hover:text-white hover:bg-navy-700/50
                        transition-colors duration-150"
                    >
                      <Icon size={14} aria-hidden="true" />
                      {label}
                    </button>
                  ))}

                  <div className="my-1 border-t border-navy-700/40" />

                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5
                      text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10
                      transition-colors duration-150"
                  >
                    <FiLogOut size={14} aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
