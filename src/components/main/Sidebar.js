import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import {
  FiHome, FiBook, FiCpu, FiCompass, FiZap,
  FiMessageCircle, FiCamera, FiCalendar, FiBell,
  FiShield, FiX, FiGrid, FiChevronRight,
  FiChevronLeft, FiMic,
} from 'react-icons/fi';
import PKFLogo from '../PKFLogo';
import { NAV_PROVERBS } from '../../data/proverbs';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const navItems = [
  { path: '/',               label: 'Dashboard',      icon: FiHome,          roles: null        },
  { path: '/handbook',       label: 'Handbook',        icon: FiBook,          roles: null        },
  { path: '/assistant',      label: 'AI Assistant',    icon: FiCpu,           roles: null        },
  { path: '/pathfinder',     label: 'Pathfinder',      icon: FiCompass,       roles: ['student'] },
  { path: '/innovation',     label: 'Innovation Hub',  icon: FiZap,           roles: ['student'] },
  { path: '/feedback',       label: 'Feedback',        icon: FiMessageCircle, roles: null        },
  { path: '/showcase',       label: 'Campus Showcase', icon: FiCamera,        roles: null        },
  { path: '/calendar',       label: 'Calendar',        icon: FiCalendar,      roles: null        },
  { path: '/announcements',  label: 'Announcements',   icon: FiMic,           roles: null        },
  { path: '/notifications',  label: 'Notifications',   icon: FiBell,          roles: null        },
];

const DEFAULT_PROVERB = { text: 'Ubuntu: I am because we are.', people: 'Nguni', region: 'Southern Africa' };

const Sidebar = ({ sidebarOpen, onClose, onNavClick, collapsed, onToggleCollapse }) => {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { currentUser } = useAuth();
  const { unreadCount }  = useNotifications();

  const currentProverb = NAV_PROVERBS[pathname] || DEFAULT_PROVERB;

  const handleNav = (path) => {
    navigate(path);
    onNavClick?.();
  };

  const djangoAdminUrl = `${BASE_URL.replace('/api', '')}/admin/`;

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-navy-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="main-sidebar"
        aria-label="Main navigation"
        className={[
          'fixed top-0 left-0 z-30 h-full flex flex-col',
          'bg-navy-900 border-r border-navy-700/40',
          'transition-all duration-300 ease-spring',
          collapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Kente stripe */}
        <div className="kente-stripe" aria-hidden="true" />

        {/* Brand */}
        <div className={[
          'flex items-center border-b border-navy-700/40 transition-all duration-300',
          collapsed ? 'px-3 py-5 justify-center' : 'gap-3 px-5 py-5',
        ].join(' ')}>
          <div className="relative flex-shrink-0 animate-glow rounded-full p-0.5">
            <div className="bg-navy-800 rounded-full p-1.5">
              <PKFLogo size={36} />
            </div>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-gold leading-tight text-base truncate">
                PKFIE<span className="text-white">-Hub</span>
              </p>
              <p className="text-[10px] text-navy-300 font-medium tracking-widest uppercase truncate">
                PKFokam Institute
              </p>
            </div>
          )}
          {/* Mobile close — only when expanded */}
          {!collapsed && (
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="lg:hidden flex-shrink-0 p-1.5 rounded-lg text-navy-300 hover:text-gold hover:bg-navy-700/50 transition-colors"
            >
              <FiX size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2" aria-label="Site pages">
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-bold tracking-widest uppercase text-navy-400 select-none">
              Navigation
            </p>
          )}

          <ul role="list" className="space-y-0.5">
            {navItems
              .filter(item => !item.roles || item.roles.includes(currentUser?.role))
              .map(({ path, label, icon: Icon }, idx) => {
                const isActive = pathname === path;
                const isNotif  = path === '/notifications';
                return (
                  <li key={path} style={{ animationDelay: `${idx * 40}ms` }} className="animate-slide-left">
                    <button
                      onClick={() => handleNav(path)}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? label : undefined}
                      className={[
                        'group relative w-full flex items-center rounded-xl',
                        'text-sm font-medium transition-all duration-200',
                        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-gold text-navy-900 shadow-gold-sm shimmer'
                          : 'text-navy-300 hover:text-white hover:bg-navy-700/60',
                      ].join(' ')}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-xl ring-2 ring-gold/60 animate-pulse-ring pointer-events-none"
                        />
                      )}

                      {/* Icon + optional notification badge */}
                      <span className="relative flex-shrink-0">
                        <span className={[
                          'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-navy-900/20 text-navy-900'
                            : 'bg-navy-700/50 text-gold group-hover:bg-gold/20 group-hover:text-gold',
                        ].join(' ')}>
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        {isNotif && unreadCount > 0 && (
                          <span
                            aria-label={`${unreadCount} unread`}
                            className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5
                              bg-gold text-navy-900 text-[8px] font-black rounded-full
                              flex items-center justify-center leading-none"
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </span>

                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{label}</span>
                          {/* Inline badge in expanded mode */}
                          {isNotif && unreadCount > 0 && (
                            <span className={[
                              'text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                              isActive ? 'bg-navy-900/30 text-navy-900' : 'bg-gold text-navy-900',
                            ].join(' ')}>
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                          {isActive && (
                            <FiChevronRight size={14} aria-hidden="true" className="flex-shrink-0 text-navy-900/60" />
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>

          {/* Admin section */}
          {currentUser?.role === 'admin' && (
            <>
              <div className="my-4 border-t border-navy-700/40" aria-hidden="true" />
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold tracking-widest uppercase text-navy-400 select-none">
                  Administration
                </p>
              )}
              <ul role="list">
                <li>
                  <button
                    onClick={() => handleNav('/admin')}
                    aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                    title={collapsed ? 'Admin Panel' : undefined}
                    className={[
                      'group relative w-full flex items-center rounded-xl',
                      'text-sm font-medium transition-all duration-200',
                      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                      pathname.startsWith('/admin')
                        ? 'bg-gold text-navy-900 shadow-gold-sm shimmer'
                        : 'text-navy-300 hover:text-white hover:bg-navy-700/60',
                    ].join(' ')}
                  >
                    <span className={[
                      'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all',
                      pathname.startsWith('/admin')
                        ? 'bg-navy-900/20 text-navy-900'
                        : 'bg-navy-700/50 text-gold group-hover:bg-gold/20',
                    ].join(' ')}>
                      <FiGrid size={16} aria-hidden="true" />
                    </span>
                    {!collapsed && <span className="flex-1 text-left">Admin Panel</span>}
                  </button>
                </li>
              </ul>
            </>
          )}

          {/* Collapse toggle — desktop only */}
          <div className="hidden lg:flex mt-4 px-1">
            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
              className={[
                'flex items-center gap-2 w-full rounded-xl px-3 py-2',
                'text-[11px] font-bold text-navy-400 hover:text-white hover:bg-navy-700/50',
                'transition-all duration-200',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              {collapsed
                ? <FiChevronRight size={14} aria-hidden="true" />
                : <><FiChevronLeft size={14} aria-hidden="true" /><span>Collapse</span></>
              }
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className={[
          'border-t border-navy-700/40 space-y-3',
          collapsed ? 'px-2 py-4' : 'px-4 py-4',
        ].join(' ')}>
          {!collapsed && (
            <blockquote
              aria-label="African proverb"
              className="border-l-2 border-gold/40 pl-3 space-y-1"
            >
              <p className="text-[11px] leading-relaxed text-navy-400 italic">
                "{currentProverb.text}"
              </p>
              <p className="text-[9px] text-navy-600 font-semibold">
                — {currentProverb.people}, {currentProverb.region}
              </p>
            </blockquote>
          )}

          {currentUser?.role === 'admin' && (
            <a
              href={djangoAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Django admin panel in new tab"
              title={collapsed ? 'Django Admin' : undefined}
              className={[
                'flex items-center gap-2 w-full px-3 py-2 rounded-lg',
                'bg-navy-700/50 hover:bg-navy-700 border border-navy-600/40',
                'text-[11px] font-medium text-navy-300 hover:text-gold',
                'transition-all duration-200',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              <FiShield size={13} aria-hidden="true" />
              {!collapsed && 'Django Admin'}
            </a>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
