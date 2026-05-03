import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import {
  FiGrid, FiUsers, FiFile, FiBell, FiCalendar, FiClock,
  FiMessageSquare, FiCpu, FiSettings, FiHome, FiInbox,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const MENU = [
  { path: '/admin',               icon: FiGrid,          label: 'Dashboard',       end: true  },
  { path: '/admin/users',         icon: FiUsers,         label: 'User Management'             },
  { path: '/admin/documents',     icon: FiFile,          label: 'Documents'                   },
  { path: '/admin/announcements', icon: FiBell,          label: 'Announcements'               },
  { path: '/admin/events',        icon: FiCalendar,      label: 'Events'                      },
  { path: '/admin/calendar',      icon: FiClock,         label: 'Calendar'                    },
  { path: '/admin/feedback',      icon: FiMessageSquare, label: 'Feedback'                    },
  { path: '/admin/notifications', icon: FiInbox,         label: 'Notifications', badgeKey: 'notif' },
  { path: '/admin/ai-model',      icon: FiCpu,           label: 'AI Model'                    },
  { path: '/admin/settings',      icon: FiSettings,      label: 'Settings'                    },
];

export default function AdminSidebar({ collapsed, mobileOpen, onClose }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { unreadCount: notifCount } = useNotifications();

  const badges = { notif: notifCount };

  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `${BASE_URL}${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
    : null;

  const initials =
    (currentUser?.first_name?.charAt(0) || '') +
    (currentUser?.last_name?.charAt(0)  || '');

  const handleNavClick = () => {
    // Close the mobile drawer when a nav item is tapped
    if (window.innerWidth < 1024) onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop — only rendered when drawer is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 w-64',
          // Mobile: slide in/out; desktop: always visible
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          // Desktop width only
          collapsed ? 'lg:w-16' : 'lg:w-64',
        ].join(' ')}
        style={{ background: '#001020', borderRight: '1px solid rgba(255,215,0,.08)' }}
      >

        {/* Logo */}
        <div
          className={[
            'flex items-center border-b h-16 flex-shrink-0 border-gold/10 gap-3 px-5',
            collapsed ? 'lg:justify-center lg:px-0 lg:gap-0' : '',
          ].join(' ')}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,215,0,.15)', border: '1px solid rgba(255,215,0,.25)' }}
          >
            <span className="text-xs font-black text-gold">PK</span>
          </div>
          <span className={`text-sm font-black text-white tracking-tight whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
            PKFIE-Hub <span className="text-gold">Admin</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {MENU.map(({ path, icon: Icon, label, end, badgeKey }) => {
            const badgeCount = badgeKey ? (badges[badgeKey] ?? 0) : 0;
            return (
              <NavLink
                key={path}
                to={path}
                end={end}
                title={collapsed ? label : undefined}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl transition-all duration-150 py-2.5 px-3',
                    collapsed ? 'lg:justify-center lg:px-0' : '',
                    isActive
                      ? 'bg-gold/15 text-gold'
                      : 'text-white/60 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex-shrink-0">
                      <Icon
                        size={16}
                        aria-hidden="true"
                        className={isActive ? 'text-gold' : ''}
                      />
                      {/* Collapsed badge dot (desktop only) */}
                      {collapsed && badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold lg:block hidden" />
                      )}
                    </div>

                    {/* Label — always visible on mobile, hidden when collapsed on desktop */}
                    <span className={`text-sm font-semibold truncate flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                      {label}
                    </span>

                    {/* Full badge count — visible when expanded */}
                    {badgeCount > 0 && (
                      <span
                        className={[
                          'text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                          isActive ? 'bg-navy-900/30 text-gold' : 'bg-gold/20 text-gold',
                          collapsed ? 'lg:hidden' : '',
                        ].join(' ')}
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={[
            'border-t border-gold/10 py-3 flex-shrink-0',
            collapsed ? 'lg:px-2 px-3' : 'px-3',
          ].join(' ')}
        >
          {/* User info */}
          <div
            className={[
              'flex items-center gap-3 mb-2',
              collapsed ? 'lg:justify-center' : '',
            ].join(' ')}
          >
            <div className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center bg-navy-700">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-xs font-black text-gold">{initials || 'A'}</span>
              }
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-xs font-bold text-white truncate">
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin User'}
              </p>
              <p className="text-[10px] text-gold/70 capitalize">
                {currentUser?.role || 'Administrator'}
              </p>
            </div>
          </div>

          {/* Switch to main app */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => { navigate('/'); onClose?.(); }}
              title="Switch to Main App"
              className={[
                'flex items-center gap-2 w-full rounded-xl text-xs font-bold text-white/50',
                'hover:text-white hover:bg-white/5 transition-colors py-2 px-3',
                collapsed ? 'lg:justify-center lg:px-0' : '',
              ].join(' ')}
            >
              <FiHome size={13} aria-hidden="true" className="flex-shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>Main App</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
