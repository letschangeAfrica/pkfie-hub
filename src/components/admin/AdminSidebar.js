import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AdminSidebar.css';

const AdminSidebar = ({ collapsed }) => {
  const { currentUser } = useAuth();

  // Reduced menu: removed Search and Notifications entries
  const menuItems = [
    { path: '/admin', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { path: '/admin/users', icon: 'fas fa-users', label: 'User Management' },
    { path: '/admin/documents', icon: 'fas fa-file', label: 'Documents' },
    { path: '/admin/announcements', icon: 'fas fa-bullhorn', label: 'Announcements' },
    { path: '/admin/events', icon: 'fas fa-calendar', label: 'Events' },
    { path: '/admin/feedback', icon: 'fas fa-comments', label: 'Feedback' },
    { path: '/admin/ai-model', icon: 'fas fa-robot', label: 'AI Model' },
    { path: '/admin/settings', icon: 'fas fa-cog', label: 'Settings' },
    // removed: /admin/search and /admin/notifications from sidebar
  ];

  const isActive = (path) => {
    return window.location.pathname === path || window.location.pathname.startsWith(path + '/');
  };

  return (
    <div className={`adm-sb ${collapsed ? 'adm-sb-collapsed' : ''}`}>
      <div className="adm-sb-header">
        {!collapsed ? <h2>PKFIE-Hub Admin</h2> : <div className="adm-sb-logo-mini">PKF</div>}
      </div>

      <nav className="adm-sb-nav">
        <ul>
          {menuItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive: navIsActive }) =>
                  `adm-sb-item ${navIsActive || isActive(item.path) ? 'adm-sb-active' : ''}`
                }
              >
                <i className={item.icon} />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && <div className="adm-sb-tooltip">{item.label}</div>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="adm-sb-footer">
        {!collapsed ? (
          <div className="adm-sb-user">
            <div className="adm-sb-avatar">
              {currentUser?.profile?.profile_picture ? (
                <img
                  src={currentUser.profile.profile_picture.startsWith('http')
                    ? currentUser.profile.profile_picture
                    : `http://localhost:8000${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`
                  }
                  alt="User avatar"
                  className="adm-sb-avatar-img"
                />
              ) : (
                <i className="fas fa-user-circle" />
              )}
            </div>
            <div className="adm-sb-details">
              <h4>{currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin User'}</h4>
              <p>{currentUser ? (currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Administrator') : 'Administrator'}</p>
            </div>
          </div>
        ) : (
          <div className="adm-sb-user-mini">
            {currentUser?.profile?.profile_picture ? (
              <img
                src={currentUser.profile.profile_picture.startsWith('http')
                  ? currentUser.profile.profile_picture
                  : `http://localhost:8000${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`
                }
                alt="User avatar"
                className="adm-sb-avatar-img"
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <i className="fas fa-user-circle" />
            )}
          </div>
        )}

        {currentUser?.role === 'admin' && !collapsed && (
          <button
            className="adm-sb-switch-btn"
            onClick={() => window.location.href = '/'}
            title="Switch to Main App"
          >
            <i className="fas fa-home" /> Main App
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;