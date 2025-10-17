import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminHeader.css';

const AdminHeader = ({ onToggleSidebar }) => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Avatar logic
  const avatarUrl = currentUser?.profile?.profile_picture
    ? (currentUser.profile.profile_picture.startsWith('http')
        ? currentUser.profile.profile_picture
        : `http://localhost:8000${currentUser.profile.profile_picture.startsWith('/') ? '' : '/media/'}${currentUser.profile.profile_picture}`)
    : null;

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // This is the key line to ensure you navigate to the admin search results page
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim().length === 0) return;
    navigate(`/admin/AdminDashboard/search?q=${encodeURIComponent(search.trim())}`);
    setSearch('');
  };

  return (
    <header className="adm-hdr">
      <div className="adm-hdr-left">
        <button className="adm-hdr-toggle" onClick={onToggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <h1>Admin Panel</h1>
      </div>
      <div className="adm-hdr-right">
        <form
          className="adm-hdr-search"
          onSubmit={handleSearchSubmit}
          role="search"
          autoComplete="off"
        >
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search admin..."
            aria-label="Search"
          />
          <i className="fas fa-search"></i>
        </form>
        <div className="adm-hdr-actions">
          <button className="adm-hdr-btn" title="Notifications">
            <i className="fas fa-bell"></i>
            <span className="adm-hdr-badge">3</span>
          </button>
          <button className="adm-hdr-btn" title="Messages">
            <i className="fas fa-envelope"></i>
            <span className="adm-hdr-badge">7</span>
          </button>
          <div className="adm-hdr-user" ref={menuRef}>
            <div className="adm-hdr-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" />
              ) : (
                <i className="fas fa-user-circle"></i>
              )}
            </div>
            <span className="adm-hdr-name">
              {currentUser ? `${currentUser.first_name}` : "Admin"}
            </span>
            <i
              className="fas fa-chevron-down"
              style={{ cursor: 'pointer' }}
              onClick={() => setMenuOpen(v => !v)}
            />
            {menuOpen && (
              <div className="adm-hdr-dropdown">
                <div className="adm-hdr-dropdown-top">
                  <div className="adm-hdr-avatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" />
                    ) : (
                      <i className="fas fa-user-circle"></i>
                    )}
                  </div>
                  <div>
                    <div className="adm-hdr-dropdown-name">
                      {currentUser?.first_name} {currentUser?.last_name}
                    </div>
                    <div className="adm-hdr-dropdown-role">
                      {currentUser?.role
                        ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
                        : "Administrator"}
                    </div>
                  </div>
                </div>
                <hr className="adm-hdr-dropdown-divider" />
                <button
                  className="adm-hdr-dropdown-btn"
                  type="button"
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
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;