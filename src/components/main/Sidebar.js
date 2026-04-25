import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiHome, FiBook, FiCpu, FiCompass, FiZap,
  FiMessageCircle, FiCamera, FiCalendar,
  FiShield, FiX, FiGrid
} from 'react-icons/fi';
import './Sidebar.css';

const navItems = [
  { path: '/',          label: 'Dashboard',       icon: FiHome,          proverb: 'Knowledge is like a baobab tree; no one can encompass it with their hands.' },
  { path: '/handbook',  label: 'Handbook',         icon: FiBook,          proverb: 'When you follow in the path of your father, you learn to walk like him.' },
  { path: '/assistant', label: 'AI Assistant',     icon: FiCpu,           proverb: 'A single conversation with a wise man is better than ten years of study.' },
  { path: '/pathfinder',label: 'Pathfinder',       icon: FiCompass,       proverb: 'If you want to go far, go together.' },
  { path: '/innovation',label: 'Innovation Hub',   icon: FiZap,           proverb: 'Those who plant trees knowing they will never sit in their shade understand life.' },
  { path: '/feedback',  label: 'Feedback',         icon: FiMessageCircle, proverb: 'Your voice is the engine of change.' },
  { path: '/showcase',  label: 'Campus Showcase',  icon: FiCamera,        proverb: 'Let your light shine so others may see your good works.' },
  { path: '/calendar',  label: 'Calendar',         icon: FiCalendar,      proverb: 'Time waits for no one, but a wise person makes use of every moment.' },
];

const Sidebar = ({ sidebarOpen, onClose, onNavClick }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const currentProverb =
    navItems.find(n => n.path === pathname)?.proverb ||
    navItems[0].proverb;

  const handleNav = (path) => {
    navigate(path);
    onNavClick?.();
  };

  return (
    <aside
      className={`sidebar${sidebarOpen ? ' open' : ''}`}
      aria-label="Main navigation"
    >
      {/* Kente stripe identity mark */}
      <div className="sidebar-kente" aria-hidden="true" />

      {/* Brand */}
      <div className="sidebar-brand" role="banner">
        <div className="sidebar-brand-icon" aria-hidden="true">🎓</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">
            PKF<span>Connect</span>
          </span>
          <span className="sidebar-brand-sub">PKFokam Institute</span>
        </div>

        {/* Mobile close */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          <FiX />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" role="navigation" aria-label="Site pages">
        <span className="nav-section-label">Navigation</span>

        {navItems.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            className={`nav-item${pathname === path ? ' active' : ''}`}
            onClick={() => handleNav(path)}
            aria-current={pathname === path ? 'page' : undefined}
          >
            <Icon className="nav-item-icon" aria-hidden="true" />
            <span className="nav-item-label">{label}</span>
          </button>
        ))}

        {/* Admin section — only for admin users */}
        {currentUser?.role === 'admin' && (
          <>
            <div className="sidebar-divider" aria-hidden="true" />
            <span className="nav-section-label">Administration</span>
            <button
              className={`nav-item${pathname.startsWith('/admin') ? ' active' : ''}`}
              onClick={() => handleNav('/admin')}
              aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
            >
              <FiGrid className="nav-item-icon" aria-hidden="true" />
              <span className="nav-item-label">Admin Panel</span>
            </button>
          </>
        )}
      </nav>

      {/* Footer: proverb + admin shortcuts */}
      <div className="sidebar-footer">
        <blockquote className="sidebar-proverb" aria-label="African proverb">
          "{currentProverb}"
        </blockquote>

        {currentUser?.role === 'admin' && (
          <a
            href="http://127.0.0.1:8000/admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-admin-btn"
            aria-label="Open Django admin panel in new tab"
          >
            <FiShield aria-hidden="true" />
            Django Admin
          </a>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
