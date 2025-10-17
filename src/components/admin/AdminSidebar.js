import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // adjust the path if needed
import './AdminSidebar.css';

const AdminSidebar = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Get the profile picture URL, similar to your Header
  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `http://localhost:8000${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
    : null;

  const menuItems = [
    { path: '/admin/AdminDashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { path: '/admin/AdminDashboard/users', icon: 'fas fa-users', label: 'User Management' },
    { path: '/admin/AdminDashboard/documents', icon: 'fas fa-file', label: 'Documents' },
    { path: '/admin/AdminDashboard/announcements', icon: 'fas fa-bullhorn', label: 'Announcements' },
    { path: '/admin/AdminDashboard/events', icon: 'fas fa-calendar', label: 'Events' },
    { path: '/admin/AdminDashboard/feedback', icon: 'fas fa-comments', label: 'Feedback' },
    { path: '/admin/AdminDashboard/ai-model', icon: 'fas fa-robot', label: 'AI Model' },
    { path: '/admin/AdminDashboard/settings', icon: 'fas fa-cog', label: 'Settings' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className={`adm-sb ${collapsed ? 'adm-sb-collapsed' : ''}`}>
      <div className="adm-sb-header">
        {!collapsed && <h2>PKFConnect Admin</h2>}
        {collapsed && <div className="adm-sb-logo-mini">PKF</div>}
      </div>
      
      <nav className="adm-sb-nav">
        <ul>
          {menuItems.map(item => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                className={`adm-sb-item ${isActive(item.path) ? 'adm-sb-active' : ''}`}
              >
                <i className={item.icon}></i>
                {!collapsed && <span>{item.label}</span>}
                {collapsed && <div className="adm-sb-tooltip">{item.label}</div>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="adm-sb-footer">
        {!collapsed && (
          <div className="adm-sb-user">
            <div className="adm-sb-avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="User avatar"
                  className="adm-sb-avatar-img"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <i className="fas fa-user-circle"></i>
              )}
            </div>
            <div className="adm-sb-details">
              <h4>
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Admin User"}
              </h4>
              <p>{currentUser ? (currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : "Administrator") : "Administrator"}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="adm-sb-user-mini">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User avatar"
                className="adm-sb-avatar-img"
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <i className="fas fa-user-circle"></i>
            )}
          </div>
        )}

        {/* Modern Switch to Main App button */}
        {currentUser?.role === 'admin' && (
          <button
            className="adm-sb-switch-btn"
            onClick={() => navigate('/')}
            style={{
              margin: collapsed ? '8px' : '16px',
              width: collapsed ? '40px' : '90%',
              background: '#fff',
              border: '1px solid #2979ff',
              color: '#2979ff',
              borderRadius: '6px',
              cursor: 'pointer',
              padding: collapsed ? '6px' : '8px 12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            title="Switch to Main App"
          >
            <i className="fas fa-home"></i>
            {!collapsed && 'Main App'}
          </button>
        )}

      </div>
    </div>
  );
};

export default AdminSidebar;