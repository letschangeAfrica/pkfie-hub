import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const pageInfo = {
  '/': {
    proverb: "Knowledge is like a baobab tree; no one can encompass it with their hands."
  },
  '/handbook': {
    proverb: "When you follow in the path of your father, you learn to walk like him."
  },
  '/assistant': {
    proverb: "A single conversation with a wise man is better than ten years of study."
  },
  '/pathfinder': {
    proverb: "If you want to go quickly, go alone. If you want to go far, go together."
  },
  '/innovation': {
    proverb: "The one who plants trees, knowing that he will never sit in their shade, has at least started to understand the meaning of life."
  },
  '/feedback': {
    proverb: "A single conversation with a wise man is better than ten years of study."
  },
  '/showcase': {
    proverb: "Let your light shine so that others may see your good works."
  },
  '/calendar': {
    proverb: "Time waits for no one, but a wise person makes use of every moment."
  }
};

const pages = [
  { path: '/', name: 'Dashboard', icon: 'fas fa-home' },
  { path: '/handbook', name: 'Handbook', icon: 'fas fa-book' },
  { path: '/assistant', name: 'Assistant', icon: 'fas fa-robot' },
  { path: '/pathfinder', name: 'Pathfinder', icon: 'fas fa-compass' },
  { path: '/innovation', name: 'Innovation Hub', icon: 'fas fa-lightbulb' },
  { path: '/feedback', name: 'Feedback', icon: 'fas fa-comment-dots' },
  { path: '/showcase', name: 'Campus Showcase', icon: 'fas fa-photo-video' },
  { path: '/calendar', name: 'Calendar', icon: 'fas fa-calendar-alt' }
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { pathname } = location;

  const handleNavigation = (e, path) => {
    e.preventDefault();
    navigate(path);
  };

  // Show proverb for current page, fallback to dashboard proverb
  const proverb = pageInfo[pathname]?.proverb || pageInfo['/'].proverb;

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon animate-pulse">⚱</div>
        <h1>
          PKF<span>Connect</span>
        </h1>
      </div>
      
      <div className="cultural-divider">
        <div className="adinkra-symbol animate-spin">⚜</div>
      </div>
      
      <nav className="main-nav-grid">
        {pages.map(page => (
          <a
            key={page.path}
            href={page.path}
            className={`nav-item-grid${pathname === page.path ? ' active' : ''} animate-nav`}
            onClick={(e) => handleNavigation(e, page.path)}
            tabIndex={0}
          >
            <i className={page.icon}></i>
            <span className="nav-label">{page.name}</span>
          </a>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="proverb animate-fade-in">"{proverb}"</div>
        {currentUser?.role === 'admin' && (
          <>
            <button
              className="sidebar-admin-btn animate-btn"
              onClick={() => navigate('/admin/AdminDashboard')}
              title="Go to Admin Panel"
            >
              <i className="fas fa-shield-alt"></i>
              <span>Admin Panel</span>
            </button>
            <button
              className="sidebar-admin-btn animate-btn"
              onClick={() => window.open('http://127.0.0.1:8000/admin/', '_blank')}
              title="Go to Django Admin"
              style={{
                background: "#222",
                color: "#FFD700",
                border: "1.5px solid #FFD700",
                marginTop: "0.7em"
              }}
            >
              <i className="fas fa-user-cog"></i>
              <span>Django Admin</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;