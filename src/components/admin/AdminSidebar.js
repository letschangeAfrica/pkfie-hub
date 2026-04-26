import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiGrid, FiUsers, FiFile, FiBell, FiCalendar,
  FiMessageSquare, FiCpu, FiSettings, FiHome,
} from 'react-icons/fi';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const MENU = [
  { path: '/admin',              icon: FiGrid,         label: 'Dashboard',       end: true },
  { path: '/admin/users',        icon: FiUsers,        label: 'User Management'           },
  { path: '/admin/documents',    icon: FiFile,         label: 'Documents'                 },
  { path: '/admin/announcements',icon: FiBell,         label: 'Announcements'             },
  { path: '/admin/events',       icon: FiCalendar,     label: 'Events'                    },
  { path: '/admin/feedback',     icon: FiMessageSquare,label: 'Feedback'                  },
  { path: '/admin/ai-model',     icon: FiCpu,          label: 'AI Model'                  },
  { path: '/admin/settings',     icon: FiSettings,     label: 'Settings'                  },
];

export default function AdminSidebar({ collapsed }) {
  const { currentUser } = useAuth();

  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `${BASE_URL}${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
    : null;

  const initials =
    (currentUser?.first_name?.charAt(0) || '') +
    (currentUser?.last_name?.charAt(0)  || '');

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ background: '#001020', borderRight: '1px solid rgba(255,215,0,.08)' }}
    >
      {/* Logo */}
      <div className={`flex items-center border-b h-16 flex-shrink-0
        ${collapsed ? 'justify-center px-0' : 'gap-3 px-5'}
        border-gold/10`}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,215,0,.15)', border: '1px solid rgba(255,215,0,.25)' }}>
          <span className="text-xs font-black text-gold">PK</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-black text-white tracking-tight whitespace-nowrap">
            PKFIE-Hub <span className="text-gold">Admin</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {MENU.map(({ path, icon: Icon, label, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl transition-all duration-150
               ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
               ${isActive
                 ? 'bg-gold/15 text-gold'
                 : 'text-white/60 hover:bg-white/5 hover:text-white'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={`flex-shrink-0 ${isActive ? 'text-gold' : ''}`}
                />
                {!collapsed && (
                  <span className="text-sm font-semibold truncate">{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gold/10 py-3 flex-shrink-0
        ${collapsed ? 'px-2' : 'px-3'}`}>
        {/* User info */}
        <div className={`flex items-center gap-3 mb-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center bg-navy-700">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-xs font-black text-gold">{initials || 'A'}</span>
            }
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin User'}
              </p>
              <p className="text-[10px] text-gold/70 capitalize">
                {currentUser?.role || 'Administrator'}
              </p>
            </div>
          )}
        </div>

        {/* Switch to main app */}
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => { window.location.href = '/'; }}
            title="Switch to Main App"
            className={`flex items-center gap-2 w-full rounded-xl text-xs font-bold text-white/50
              hover:text-white hover:bg-white/5 transition-colors py-2
              ${collapsed ? 'justify-center px-0' : 'px-3'}`}
          >
            <FiHome size={13} aria-hidden="true" className="flex-shrink-0" />
            {!collapsed && 'Main App'}
          </button>
        )}
      </div>
    </aside>
  );
}
