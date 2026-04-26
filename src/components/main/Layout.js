import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import {
  FiHome, FiBook, FiCpu, FiCalendar, FiMenu,
} from 'react-icons/fi';

const MOBILE_TABS = [
  { path: '/',          icon: FiHome,     label: 'Home' },
  { path: '/handbook',  icon: FiBook,     label: 'Handbook' },
  { path: '/assistant', icon: FiCpu,      label: 'AI' },
  { path: '/calendar',  icon: FiCalendar, label: 'Calendar' },
];

const Layout = ({ children, theme, setTheme }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );

  const { pathname } = useLocation();
  const navigate     = useNavigate();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(v => {
      localStorage.setItem('sidebar_collapsed', String(!v));
      return !v;
    });
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Escape closes sidebar
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeSidebar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSidebar]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <>
      {/* Skip to main content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50
          focus:px-4 focus:py-2 focus:rounded-lg focus:bg-gold focus:text-navy-900
          focus:font-bold focus:text-sm focus:shadow-gold-md focus:outline-none"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen bg-slate-50 dark:bg-navy-950">

        <Sidebar
          sidebarOpen={sidebarOpen}
          onClose={closeSidebar}
          onNavClick={closeSidebar}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />

        {/* Main area — offset by sidebar width */}
        <div className={[
          'flex flex-col flex-1 min-h-screen transition-[margin] duration-300 ease-smooth',
          collapsed ? 'lg:ml-16' : 'lg:ml-64',
        ].join(' ')}>

          <main id="main-content" tabIndex={-1} className="flex flex-col flex-1 outline-none">
            <Header
              theme={theme}
              setTheme={setTheme}
              onMenuToggle={() => setSidebarOpen(v => !v)}
              sidebarOpen={sidebarOpen}
            />
            {/* pb-20 on mobile so content isn't hidden behind bottom tab bar */}
            <div className="flex-1 p-5 sm:p-8 pb-24 lg:pb-8">
              {children}
            </div>
          </main>

          <footer className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1
            px-8 py-4 bg-navy-900 border-t border-navy-700/40
            text-[11px] text-white/50 font-medium">
            <span>&copy; {new Date().getFullYear()} PKFe-Hub — PKFokam Institute of Excellence</span>
            <div className="flex items-center gap-4 text-white/30">
              <button className="hover:text-white/60 transition-colors">Privacy Policy</button>
              <button className="hover:text-white/60 transition-colors">Contact</button>
              <button className="hover:text-white/60 transition-colors">About</button>
              <span>A student-led initiative for transparency and excellence</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile bottom tab bar — hidden on lg+ */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-20 h-16 lg:hidden
          bg-navy-900 border-t border-navy-700/40
          flex items-center justify-around px-1"
      >
        {MOBILE_TABS.map(({ path, icon: Icon, label }) => {
          const isActive = pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl mx-0.5',
                'text-[10px] font-bold transition-all duration-200',
                isActive
                  ? 'text-gold'
                  : 'text-navy-400 hover:text-white',
              ].join(' ')}
            >
              <Icon
                size={20}
                aria-hidden="true"
                className={isActive ? 'drop-shadow-[0_0_6px_rgba(255,215,0,.8)]' : ''}
              />
              {label}
            </button>
          );
        })}

        {/* More / Menu button opens full sidebar */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open full navigation menu"
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl mx-0.5
            text-[10px] font-bold text-navy-400 hover:text-white transition-colors"
        >
          <FiMenu size={20} aria-hidden="true" />
          Menu
        </button>
      </nav>
    </>
  );
};

export default Layout;
