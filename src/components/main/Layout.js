import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const Layout = ({ children, theme, setTheme }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close sidebar on route change or Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeSidebar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSidebar]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <>
      {/* Skip to main content — WCAG 2.4.1 */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="app-shell">
        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />

        <Sidebar
          sidebarOpen={sidebarOpen}
          onClose={closeSidebar}
          onNavClick={closeSidebar}
        />

        <main className="main-content" id="main-content" tabIndex={-1}>
          <Header
            theme={theme}
            setTheme={setTheme}
            onMenuToggle={() => setSidebarOpen(v => !v)}
            sidebarOpen={sidebarOpen}
          />
          <div className="main-content-inner">
            {children}
          </div>
        </main>
      </div>

      <footer className="app-footer">
        <span>© {new Date().getFullYear()} PKFe-Hub — PKFokam Institute of Excellence</span>
        <span>A student-led initiative for transparency and excellence</span>
      </footer>
    </>
  );
};

export default Layout;
