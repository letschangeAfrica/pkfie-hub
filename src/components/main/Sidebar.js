import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiHome, FiBook, FiCpu, FiCompass, FiZap,
  FiMessageCircle, FiCamera, FiCalendar,
  FiShield, FiX, FiGrid, FiChevronRight,
} from 'react-icons/fi';
import PKFLogo from '../PKFLogo';

const navItems = [
  { path: '/',           label: 'Dashboard',      icon: FiHome,          proverb: 'Knowledge is like a baobab tree; no one can encompass it with their hands.' },
  { path: '/handbook',   label: 'Handbook',        icon: FiBook,          proverb: 'When you follow in the path of your father, you learn to walk like him.' },
  { path: '/assistant',  label: 'AI Assistant',    icon: FiCpu,           proverb: 'A single conversation with a wise man is better than ten years of study.' },
  { path: '/pathfinder', label: 'Pathfinder',      icon: FiCompass,       proverb: 'If you want to go far, go together.' },
  { path: '/innovation', label: 'Innovation Hub',  icon: FiZap,           proverb: 'Those who plant trees knowing they will never sit in their shade understand life.' },
  { path: '/feedback',   label: 'Feedback',        icon: FiMessageCircle, proverb: 'Your voice is the engine of change.' },
  { path: '/showcase',   label: 'Campus Showcase', icon: FiCamera,        proverb: 'Let your light shine so others may see your good works.' },
  { path: '/calendar',   label: 'Calendar',        icon: FiCalendar,      proverb: 'Time waits for no one, but a wise person makes use of every moment.' },
];

const Sidebar = ({ sidebarOpen, onClose, onNavClick }) => {
  const { pathname } = useLocation();
  const navigate    = useNavigate();
  const { currentUser } = useAuth();

  const currentProverb =
    navItems.find(n => n.path === pathname)?.proverb || navItems[0].proverb;

  const handleNav = (path) => {
    navigate(path);
    onNavClick?.();
  };

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
          'fixed top-0 left-0 z-30 h-full w-64 flex flex-col',
          'bg-navy-900 border-r border-navy-700/40',
          'transition-transform duration-300 ease-spring',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Kente stripe */}
        <div className="kente-stripe" aria-hidden="true" />

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-700/40">
          <div className="relative flex-shrink-0 animate-glow rounded-full p-0.5">
            <div className="bg-navy-800 rounded-full p-1.5">
              <PKFLogo size={36} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-gold leading-tight text-base truncate">
              PKFIE<span className="text-white">-Hub</span>
            </p>
            <p className="text-[10px] text-navy-300 font-medium tracking-widest uppercase truncate">
              PKFokam Institute
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden flex-shrink-0 p-1.5 rounded-lg text-navy-300 hover:text-gold hover:bg-navy-700/50 transition-colors"
          >
            <FiX size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3" aria-label="Site pages">
          <p className="px-3 mb-2 text-[10px] font-bold tracking-widest uppercase text-navy-400 select-none">
            Navigation
          </p>

          <ul role="list" className="space-y-0.5">
            {navItems.map(({ path, label, icon: Icon }, idx) => {
              const isActive = pathname === path;
              return (
                <li key={path} style={{ animationDelay: `${idx * 40}ms` }} className="animate-slide-left">
                  <button
                    onClick={() => handleNav(path)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
                      'text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gold text-navy-900 shadow-gold-sm shimmer'
                        : 'text-navy-300 hover:text-white hover:bg-navy-700/60',
                    ].join(' ')}
                  >
                    {/* Active pulse ring */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-xl ring-2 ring-gold/60 animate-pulse-ring pointer-events-none"
                      />
                    )}

                    <span className={[
                      'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-navy-900/20 text-navy-900'
                        : 'bg-navy-700/50 text-gold group-hover:bg-gold/20 group-hover:text-gold',
                    ].join(' ')}>
                      <Icon size={16} aria-hidden="true" />
                    </span>

                    <span className="flex-1 text-left">{label}</span>

                    {isActive && (
                      <FiChevronRight
                        size={14}
                        aria-hidden="true"
                        className="flex-shrink-0 text-navy-900/60"
                      />
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
              <p className="px-3 mb-2 text-[10px] font-bold tracking-widest uppercase text-navy-400 select-none">
                Administration
              </p>
              <ul role="list">
                <li>
                  <button
                    onClick={() => handleNav('/admin')}
                    aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                    className={[
                      'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
                      'text-sm font-medium transition-all duration-200',
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
                    <span className="flex-1 text-left">Admin Panel</span>
                  </button>
                </li>
              </ul>
            </>
          )}
        </nav>

        {/* Footer: proverb + django admin */}
        <div className="px-4 py-4 border-t border-navy-700/40 space-y-3">
          <blockquote
            aria-label="African proverb"
            className="text-[11px] leading-relaxed text-navy-400 italic border-l-2 border-gold/40 pl-3"
          >
            "{currentProverb}"
          </blockquote>

          {currentUser?.role === 'admin' && (
            <a
              href="http://127.0.0.1:8000/admin/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Django admin panel in new tab"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
                bg-navy-700/50 hover:bg-navy-700 border border-navy-600/40
                text-[11px] font-medium text-navy-300 hover:text-gold
                transition-all duration-200"
            >
              <FiShield size={13} aria-hidden="true" />
              Django Admin
            </a>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
